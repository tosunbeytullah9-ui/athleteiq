import { revokeAccess } from "@athleteiq/integrations/fitbit";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sporcu kendi Fitbit bağlantısını web'den keser — whoop/polar disconnect
// route'larıyla aynı desen (RLS "wearable_own" sayesinde anon+cookie client yeterli).
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!athlete) {
    return NextResponse.json({ error: "Sporcu profili bulunamadı" }, { status: 404 });
  }

  const { data: connection } = await supabase
    .from("wearable_connections")
    .select("access_token")
    .eq("athlete_id", athlete.id)
    .eq("provider", "fitbit")
    .eq("is_active", true)
    .maybeSingle();

  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;

  if (connection?.access_token && clientId && clientSecret) {
    try {
      await revokeAccess(connection.access_token, clientId, clientSecret);
    } catch (err) {
      // Fitbit tarafı iptali başarısız olsa bile yerel bağlantıyı kapatmaya devam et
      console.error("Fitbit revokeAccess error:", err);
    }
  }

  const { error } = await supabase
    .from("wearable_connections")
    .update({ is_active: false, refresh_token: null })
    .eq("athlete_id", athlete.id)
    .eq("provider", "fitbit");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
