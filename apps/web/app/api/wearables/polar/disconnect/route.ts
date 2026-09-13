import { deregisterUser } from "@athleteiq/integrations/polar";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sporcu kendi Polar bağlantısını web'den keser. RLS ("wearable_own", for all)
// sporcunun yalnızca kendi wearable_connections satırına yazmasına izin verir,
// bu yüzden anon+cookie client yeterli — service role gerekmez (whoop/disconnect
// ile birebir aynı desen).
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
    .select("access_token, provider_user_id")
    .eq("athlete_id", athlete.id)
    .eq("provider", "polar")
    .eq("is_active", true)
    .maybeSingle();

  if (connection?.access_token && connection.provider_user_id) {
    try {
      await deregisterUser(connection.access_token, connection.provider_user_id);
    } catch (err) {
      // Polar tarafı kaydı kaldırma başarısız olsa bile yerel bağlantıyı kapatmaya devam et
      console.error("Polar deregisterUser error:", err);
    }
  }

  // access_token kolonu NOT NULL — Polar tarafında zaten kayıt kaldırıldığı için
  // olduğu gibi bırakılır, yalnızca is_active kapatılır.
  const { error } = await supabase
    .from("wearable_connections")
    .update({ is_active: false })
    .eq("athlete_id", athlete.id)
    .eq("provider", "polar");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
