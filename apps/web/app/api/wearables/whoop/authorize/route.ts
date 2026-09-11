import { createClient } from "@supabase/supabase-js";
import { buildAuthUrl, createOAuthState } from "@athleteiq/integrations/whoop";
import { NextRequest, NextResponse } from "next/server";

// Mobil uygulama (sporcu) tarafından çağrılır — WHOOP OAuth ekranını açmadan
// önce, hangi sporcunun bağlandığını taşıyan imzalı bir "state" ile WHOOP
// authorize URL'sini üretir. Cookie tabanlı oturum YOK (mobil web session'ı
// paylaşmaz) — Authorization: Bearer <supabase access token> header'ı ile
// çağrılır, tıpkı supabase/functions/*'ın çağrıldığı gibi (bkz. §4.3).
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Yetkilendirme başlığı eksik" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Geçersiz oturum" }, { status: 401 });
  }

  const { data: athlete, error: athleteError } = await admin
    .from("athletes")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (athleteError || !athlete) {
    return NextResponse.json({ error: "Sporcu profili bulunamadı" }, { status: 404 });
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "WHOOP entegrasyonu yapılandırılmamış (env eksik)" },
      { status: 503 }
    );
  }

  const state = await createOAuthState(athlete.id, clientSecret);
  const url = buildAuthUrl(clientId, redirectUri, state);

  return NextResponse.json({ url });
}
