import { buildAuthUrl, createOAuthState } from "@athleteiq/integrations/whoop";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sporcu (web) tarafından tarayıcı navigasyonuyla çağrılır — /wearables
// sayfasındaki "WHOOP ile Bağlan" linki buraya işaret eder. Mobildeki
// /api/wearables/whoop/authorize'ın aksine cookie tabanlı oturum kullanır
// (aynı tarayıcı sekmesi), bu yüzden Bearer header gerekmez. State'e
// platform: "web" gömülür ki callback doğru yere (deep link değil, /wearables)
// geri dönsün — bkz. callback/route.ts.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!athlete) {
    const url = new URL("/wearables", request.url);
    url.searchParams.set("status", "error");
    return NextResponse.redirect(url);
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    const url = new URL("/wearables", request.url);
    url.searchParams.set("status", "error");
    return NextResponse.redirect(url);
  }

  const state = await createOAuthState(athlete.id, clientSecret, 10 * 60 * 1000, "web");
  return NextResponse.redirect(buildAuthUrl(clientId, redirectUri, state));
}
