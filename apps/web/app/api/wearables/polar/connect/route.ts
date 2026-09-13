import { buildAuthUrl, createOAuthState } from "@athleteiq/integrations/polar";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sporcu (web) tarafından tarayıcı navigasyonuyla çağrılır — /wearables
// sayfasındaki "Polar ile Bağlan" linki buraya işaret eder. whoop/connect'in
// birebir aynısı — web-only olduğu için platform state'i taşımaya gerek yok.
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

  const clientId = process.env.POLAR_CLIENT_ID;
  const clientSecret = process.env.POLAR_CLIENT_SECRET;
  const redirectUri = process.env.POLAR_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    const url = new URL("/wearables", request.url);
    url.searchParams.set("status", "error");
    return NextResponse.redirect(url);
  }

  const state = await createOAuthState(athlete.id, clientSecret, 10 * 60 * 1000);
  return NextResponse.redirect(buildAuthUrl(clientId, redirectUri, state));
}
