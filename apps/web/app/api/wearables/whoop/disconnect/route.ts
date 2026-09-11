import { revokeAccess } from "@athleteiq/integrations/whoop";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sporcu kendi WHOOP bağlantısını web'den keser. RLS ("wearable_own", for all)
// sporcunun yalnızca kendi wearable_connections satırına yazmasına izin verir,
// bu yüzden anon+cookie client yeterli — service role gerekmez.
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
    .eq("provider", "whoop")
    .eq("is_active", true)
    .maybeSingle();

  if (connection?.access_token) {
    try {
      await revokeAccess(connection.access_token);
    } catch (err) {
      // WHOOP tarafı iptali başarısız olsa bile yerel bağlantıyı kapatmaya devam et
      console.error("WHOOP revokeAccess error:", err);
    }
  }

  // access_token kolonu NOT NULL — WHOOP tarafında zaten iptal edildiği için
  // (revokeAccess) olduğu gibi bırakılır, yalnızca is_active kapatılır ve
  // refresh_token (nullable) temizlenir.
  const { error } = await supabase
    .from("wearable_connections")
    .update({
      is_active: false,
      refresh_token: null,
    })
    .eq("athlete_id", athlete.id)
    .eq("provider", "whoop");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
