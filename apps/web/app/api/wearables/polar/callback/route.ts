import { createClient } from "@supabase/supabase-js";
import { exchangeCode, registerUser, verifyOAuthState } from "@athleteiq/integrations/polar";
import { upsertWearableConnection } from "@athleteiq/db/queries/wearables";
import { NextRequest, NextResponse } from "next/server";

// Polar'ın yönlendirdiği tarayıcı isteği (web-only — whoop/callback'teki mobil
// deep-link dalı burada yok). Cookie tabanlı oturum TAŞIMAZ, hangi sporcu
// olduğu state parametresinden (connect/route.ts'te imzalanmış) çözülür.
function buildRedirect(status: "success" | "error" | "denied", requestUrl: string) {
  const url = new URL("/wearables", requestUrl);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const clientId = process.env.POLAR_CLIENT_ID;
  const clientSecret = process.env.POLAR_CLIENT_SECRET;
  const redirectUri = process.env.POLAR_REDIRECT_URI;

  if (error) {
    return buildRedirect("denied", request.url);
  }
  if (!code || !state || !clientSecret) {
    return buildRedirect("error", request.url);
  }

  const statePayload = await verifyOAuthState(state, clientSecret);
  if (!statePayload) {
    return buildRedirect("error", request.url);
  }
  if (!clientId || !redirectUri) {
    return buildRedirect("error", request.url);
  }

  try {
    const tokens = await exchangeCode(code, clientId, clientSecret, redirectUri);

    // Polar üzerinde bu üyeyi kayıt et — bir bağlantı ilk kurulduğunda ZORUNLU
    // (bkz. CLAUDE.md §5.2), 409 (zaten kayıtlı) sessizce yutulur.
    await registerUser(tokens.access_token, statePayload.athleteId);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Polar access token'ları sona ermez — refresh_token/token_expires_at yok.
    await upsertWearableConnection(admin, {
      athlete_id: statePayload.athleteId,
      provider: "polar",
      access_token: tokens.access_token,
      refresh_token: null,
      token_expires_at: null,
      provider_user_id: String(tokens.x_user_id),
      is_active: true,
    });

    return buildRedirect("success", request.url);
  } catch (err) {
    console.error("Polar OAuth callback error:", err);
    return buildRedirect("error", request.url);
  }
}
