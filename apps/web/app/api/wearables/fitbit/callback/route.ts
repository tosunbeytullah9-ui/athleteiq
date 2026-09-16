import { createClient } from "@supabase/supabase-js";
import { exchangeCode, verifyOAuthState } from "@athleteiq/integrations/fitbit";
import { upsertWearableConnection } from "@athleteiq/db/queries/wearables";
import { NextRequest, NextResponse } from "next/server";

// Fitbit'in yönlendirdiği tarayıcı isteği (web-only). Cookie tabanlı oturum
// TAŞIMAZ, hangi sporcu olduğu state parametresinden çözülür — whoop/polar
// callback'leriyle aynı desen.
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

  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  const redirectUri = process.env.FITBIT_REDIRECT_URI;

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

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Token exchange yanıtı zaten user_id içeriyor — WHOOP'taki gibi ayrı bir
    // profil çağrısına gerek yok.
    await upsertWearableConnection(admin, {
      athlete_id: statePayload.athleteId,
      provider: "fitbit",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      provider_user_id: tokens.user_id,
      scopes: tokens.scope ? tokens.scope.split(" ") : null,
      is_active: true,
    });

    return buildRedirect("success", request.url);
  } catch (err) {
    console.error("Fitbit OAuth callback error:", err);
    return buildRedirect("error", request.url);
  }
}
