import { createClient } from "@supabase/supabase-js";
import { exchangeCode, verifyOAuthState } from "@athleteiq/integrations/whoop";
import { upsertWearableConnection } from "@athleteiq/db/queries/wearables";
import { NextRequest, NextResponse } from "next/server";

// WHOOP'un yönlendirdiği tarayıcı isteği — mobil uygulama WebBrowser.openAuthSessionAsync
// ile bu URL'yi açar; işlem bitince "athleteiq://wearables/callback" deep link'ine
// yönlendirilir ve WebBrowser bunu yakalayıp kapatır (bkz. apps/mobile connect-whoop.tsx).
// Bu route cookie tabanlı oturum TAŞIMAZ — sporcu kimliği state parametresinden
// (authorize route'unda imzalanmış) çözülür.
function redirectToApp(status: "success" | "error" | "denied") {
  return NextResponse.redirect(`athleteiq://wearables/callback?status=${status}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return redirectToApp("denied");
  }
  if (!code || !state) {
    return redirectToApp("error");
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirectToApp("error");
  }

  const statePayload = await verifyOAuthState(state, clientSecret);
  if (!statePayload) {
    return redirectToApp("error");
  }

  try {
    const tokens = await exchangeCode(code, clientId, clientSecret, redirectUri);

    const profileRes = await fetch(
      "https://api.prod.whoop.com/developer/v2/user/profile/basic",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (!profileRes.ok) {
      throw new Error(`WHOOP profile fetch failed: ${profileRes.status}`);
    }
    const profile = (await profileRes.json()) as { user_id: number };

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    await upsertWearableConnection(admin, {
      athlete_id: statePayload.athleteId,
      provider: "whoop",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      provider_user_id: String(profile.user_id),
      scopes: tokens.scope ? tokens.scope.split(" ") : null,
      is_active: true,
    });

    return redirectToApp("success");
  } catch (err) {
    console.error("WHOOP OAuth callback error:", err);
    return redirectToApp("error");
  }
}
