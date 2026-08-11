import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrgWellnessCheckins } from "@athleteiq/db/queries/wellness";
import { ReadinessClient } from "./readiness-client";

export default async function ReadinessPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  // Sunucu saati UTC'ye yakın; Türkiye'nin gerçek "bugün"ünü güvenle kapsamak
  // için ±1 gün paylı bir pencere çekiyoruz. Asıl "bugün" ayrımı client'ta
  // (tarayıcının yerel saatiyle) yapılıyor — bkz. readiness-client.tsx.
  const now = new Date();
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() + 1);

  const [athletesResult, checkins] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, full_name")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("full_name"),
    getOrgWellnessCheckins(
      supabase,
      orgId,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10)
    ),
  ]);

  return (
    <ReadinessClient athletes={athletesResult.data ?? []} checkins={checkins} />
  );
}
