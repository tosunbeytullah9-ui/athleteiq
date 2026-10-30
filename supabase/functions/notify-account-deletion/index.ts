import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Yeni hesap silme talebini platform sahibine (süper admin) e-postayla bildirir (Parti 18B-ek).
// Mobil, request_account_deletion başarılı olduktan sonra fire-and-forget çağırır — bu
// fonksiyonun sonucu talep akışını hiçbir şekilde etkilemez. Koç/sporcu hesaplarının
// e-postaları sentetik (@{slug}.athleteiq.app) olduğundan bildirim yalnızca
// ACCOUNT_DELETION_NOTIFY_EMAIL adresine gider.
//
// Girdi yok: yalnızca ÇAĞIRANIN kendi bekleyen, henüz bildirilmemiş talebi aranır — başka
// birinin talebi tetiklenemez. notified_at dolunca ikinci çağrı no-op (idempotent).
//
// E-postaya ve loglara ad, kullanıcı adı, talep notu GİRMEZ — yalnızca kurum adı, rol ve
// tarihler. Loglarda yalnızca talep id'si ve sonuç kodu.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ROLE_LABELS: Record<string, string> = {
  athlete: "Sporcu",
  coach: "Koç",
  admin: "Yönetici",
};

const SEND_TIMEOUT_MS = 10000;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// gg.aa.yyyy — Europe/Istanbul takvim günü.
function formatDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let requestId: string | undefined;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Yetkilendirme başlığı eksik" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      return json({ error: "Geçersiz oturum" }, 401);
    }

    // Kişi başına tek açık talep (partial unique index) — en fazla bir satır.
    const { data: request, error: requestError } = await supabaseAdmin
      .from("account_deletion_requests")
      .select("id, org_id, role, requested_at, due_at")
      .eq("user_id", caller.id)
      .eq("status", "pending")
      .is("notified_at", null)
      .maybeSingle();

    if (requestError) {
      console.error("notify-account-deletion: lookup failed", { code: requestError.code });
      return json({ error: "Talep okunamadı" }, 500);
    }
    if (!request) {
      return json({ notified: false, reason: "nothing_to_notify" }, 200);
    }
    requestId = request.id;

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const to = Deno.env.get("ACCOUNT_DELETION_NOTIFY_EMAIL");
    if (!apiKey || !to) {
      console.log("notify-account-deletion: not_configured", { requestId });
      return json({ notified: false, reason: "not_configured" }, 200);
    }
    const from =
      Deno.env.get("ACCOUNT_DELETION_FROM_EMAIL") || "Loadwell <onboarding@resend.dev>";
    const siteUrl = Deno.env.get("APP_SITE_URL")?.replace(/\/+$/, "");

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", request.org_id)
      .maybeSingle();

    const orgName: string = org?.name ?? "Bilinmeyen kurum";
    const roleLabel = ROLE_LABELS[request.role] ?? request.role;
    const requestedAt = formatDate(request.requested_at);
    const dueAt = formatDate(request.due_at);
    const usersUrl = siteUrl ? `${siteUrl}/settings/users` : null;

    const rows: [string, string][] = [
      ["Kurum", orgName],
      ["Rol", roleLabel],
      ["Talep tarihi", requestedAt],
      ["Son tarih", dueAt],
    ];

    const text = [
      "Yeni bir hesap silme talebi alındı.",
      "",
      ...rows.map(([k, v]) => `${k}: ${v}`),
      "",
      "Talep en geç son tarihe kadar işlenmelidir (KVKK — 30 gün).",
      usersUrl ? `Silme talepleri: ${usersUrl}` : "Web panelinde Kullanıcılar → Silme Talepleri.",
    ].join("\n");

    const html = `
    <h2 style="margin:0 0 12px;font-family:sans-serif">Yeni hesap silme talebi</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${k}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`
        )
        .join("")}
    </table>
    <p style="font-family:sans-serif;font-size:14px">Talep en geç son tarihe kadar işlenmelidir (KVKK — 30 gün).<br/>${
      usersUrl
        ? `<a href="${escapeHtml(usersUrl)}">Silme talepleri</a>`
        : "Web panelinde Kullanıcılar → Silme Talepleri."
    }</p>`;

    let sent = false;
    let status = 0;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          subject: `Yeni hesap silme talebi — ${orgName} (son tarih ${dueAt})`,
          text,
          html,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      status = res.status;
      sent = res.ok;
    } catch (_err) {
      sent = false;
    }

    if (!sent) {
      console.error("notify-account-deletion: send_failed", { requestId, status });
      return json({ notified: false, reason: "send_failed" }, 200);
    }

    // notified_at hâlâ boşsa doldur — eşzamanlı ikinci çağrı aynı satırı ezmesin.
    const { error: updateError } = await supabaseAdmin
      .from("account_deletion_requests")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", request.id)
      .is("notified_at", null);

    if (updateError) {
      console.error("notify-account-deletion: mark failed", { requestId });
    }

    console.log("notify-account-deletion: sent", { requestId });
    return json({ notified: true }, 200);
  } catch (err) {
    console.error("notify-account-deletion error", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return json({ error: "Beklenmeyen bir hata oluştu" }, 500);
  }
});
