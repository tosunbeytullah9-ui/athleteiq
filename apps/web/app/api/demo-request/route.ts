import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  DEMO_REQUEST_HOURLY_LIMIT,
  DEMO_REQUEST_ROLE_LABELS,
  demoRequestSchema,
  isHoneypotFilled,
  type DemoRequest,
} from "@athleteiq/validators";
import type { Database } from "@athleteiq/db/types";
import { PRODUCT_NAME } from "@/lib/brand";

/**
 * Landing'deki demo talep formu (oturumsuz). demo_requests'e INSERT politikası
 * yok — tek yazma yolu burası (service role). Bildirim e-postası env ile açılır:
 * RESEND_API_KEY + DEMO_REQUEST_NOTIFY_EMAIL yoksa talep yine kaydedilir ve
 * /admin/demo-requests'te görünür.
 */
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  // Bot tuzağı doluysa başarılıymış gibi davran — bota ipucu verme.
  if (body && typeof body === "object" && isHoneypotFilled(body as { website?: string })) {
    return NextResponse.json({ ok: true });
  }

  const parsed = demoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Form eksik veya hatalı", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const db = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const ipHash = hashIp(clientIp(request));
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await db
    .from("demo_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (countError) {
    console.error("[demo-request] hız sınırı sorgusu başarısız", countError.message);
    return NextResponse.json({ error: "Talep şu an kaydedilemedi" }, { status: 500 });
  }
  if ((count ?? 0) >= DEMO_REQUEST_HOURLY_LIMIT) {
    return NextResponse.json(
      { error: "Kısa sürede çok fazla talep gönderildi. Lütfen daha sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const { data: row, error } = await db
    .from("demo_requests")
    .insert({
      full_name: data.full_name,
      organization: data.organization,
      role: data.role,
      discipline: data.discipline ?? null,
      athlete_count: data.athlete_count ?? null,
      email: data.email,
      phone: data.phone ?? null,
      message: data.message ?? null,
      kvkk_consent: data.kvkk_consent,
      ip_hash: ipHash,
    })
    .select("id")
    .single();
  if (error || !row) {
    console.error("[demo-request] kayıt başarısız", error?.message);
    return NextResponse.json({ error: "Talep şu an kaydedilemedi" }, { status: 500 });
  }

  // Bildirim hatası ziyaretçiye yansımaz — talep zaten kaydedildi.
  const notified = await notify(data, request.nextUrl.origin);
  if (notified) {
    await db.from("demo_requests").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
  }

  return NextResponse.json({ ok: true });
}

async function notify(data: DemoRequest, origin: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DEMO_REQUEST_NOTIFY_EMAIL;
  if (!apiKey || !to) return false;

  const from = process.env.DEMO_REQUEST_FROM_EMAIL || `${PRODUCT_NAME} <onboarding@resend.dev>`;
  const rows: [string, string | undefined][] = [
    ["Ad Soyad", data.full_name],
    ["Kurum", data.organization],
    ["Rol", DEMO_REQUEST_ROLE_LABELS[data.role]],
    ["Branş", data.discipline],
    ["Sporcu sayısı", data.athlete_count],
    ["E-posta", data.email],
    ["Telefon", data.phone],
  ];
  const adminUrl = `${origin}/admin/demo-requests`;
  const text = [
    ...rows.map(([k, v]) => `${k}: ${v ?? "—"}`),
    "",
    data.message ? `Mesaj:\n${data.message}` : "Mesaj: —",
    "",
    `Tüm talepler: ${adminUrl}`,
  ].join("\n");
  const html = `
    <h2 style="margin:0 0 12px;font-family:sans-serif">Yeni demo talebi</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${k}</td><td style="padding:4px 0">${escapeHtml(v ?? "—")}</td></tr>`
        )
        .join("")}
    </table>
    ${data.message ? `<p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap;border-left:3px solid #2563eb;padding-left:12px">${escapeHtml(data.message)}</p>` : ""}
    <p style="font-family:sans-serif;font-size:14px">Yanıtla'ya basarsanız doğrudan talep sahibine gider.<br/><a href="${adminUrl}">Tüm talepler</a></p>`;

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      reply_to: data.email,
      subject: `Yeni demo talebi — ${data.organization}`,
      text,
      html,
    });
    if (error) {
      console.error("[demo-request] bildirim gönderilemedi", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[demo-request] bildirim gönderilemedi", e instanceof Error ? e.message : e);
    return false;
  }
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function hashIp(ip: string): string {
  const salt = process.env.DEMO_REQUEST_IP_SALT || "athleteiq-demo-request";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
