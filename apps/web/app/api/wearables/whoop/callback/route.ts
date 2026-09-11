import { createClient } from "@supabase/supabase-js";
import { exchangeCode, verifyOAuthState } from "@athleteiq/integrations/whoop";
import { upsertWearableConnection } from "@athleteiq/db/queries/wearables";
import { NextRequest, NextResponse } from "next/server";

// WHOOP'un yönlendirdiği tarayıcı isteği. İki çağıran var:
//  - Mobil: WebBrowser.openAuthSessionAsync ile açılır, işlem bitince
//    "athleteiq://wearables/callback" deep link'ine yönlendirilir (bkz.
//    apps/mobile connect-whoop.tsx).
//  - Web: /api/wearables/whoop/connect (sporcu kendi web oturumuyla) ile
//    açılır, işlem bitince "/wearables" sayfasına yönlendirilir.
// Bu route cookie tabanlı oturum TAŞIMAZ (WHOOP'un kendi sunucusu çağırır) —
// hangi sporcu VE hangi platform olduğu state parametresinden (authorize/connect
// route'unda imzalanmış) çözülür.
function buildRedirect(
  status: "success" | "error" | "denied",
  platform: "web" | "mobile" | undefined,
  requestUrl: string
) {
  if (platform === "web") {
    const url = new URL("/wearables", requestUrl);
    url.searchParams.set("status", status);
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(`athleteiq://wearables/callback?status=${status}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;

  // WHOOP hata durumunda da state'i geri yansıtır — platformu (varsa)
  // erken çıkışlarda da doğru yönlendirebilmek için önce state'i çözmeyi dene.
  const statePayload =
    state && clientSecret ? await verifyOAuthState(state, clientSecret) : null;
  const platform = statePayload?.platform;

  if (error) {
    return buildRedirect("denied", platform, request.url);
  }
  if (!code || !state || !statePayload) {
    return buildRedirect("error", platform, request.url);
  }
  if (!clientId || !clientSecret || !redirectUri) {
    return buildRedirect("error", platform, request.url);
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

    return buildRedirect("success", platform, request.url);
  } catch (err) {
    console.error("WHOOP OAuth callback error:", err);
    return buildRedirect("error", platform, request.url);
  }
}
