import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getPlatformExercises, getOrgExercises } from "@athleteiq/db/queries/exercises";
import { OneRmImportClient } from "./one-rm-import-client";

export default async function OneRmImportPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;

  if (!orgId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  const [athletesResult, { data: teams }, platformExercises, orgExercises] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, full_name, team_id")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("full_name"),
    supabase.from("teams").select("id, name").eq("org_id", orgId).order("name"),
    getPlatformExercises(supabase),
    getOrgExercises(supabase, orgId),
  ]);

  const athletes: { id: string; full_name: string; team_id: string | null }[] =
    athletesResult.data ?? [];

  // Mevcut kayıtlar yalnızca UYARI üretmek için (tekrar / "daha güncel kayıt
  // var"). tests/page.tsx sporcu başına ayrı getAthleteMaxes çağırıyor; burada
  // tek sorgu yeterli çünkü dedup/sıralama gerekmiyor, sadece (sporcu, egzersiz,
  // tarih) üçlüsü okunuyor.
  const athleteIds = athletes.map((a) => a.id);
  const { data: existingRecords } =
    athleteIds.length > 0
      ? await supabase
          .from("athlete_1rm_records")
          .select("athlete_id, exercise_name, test_date")
          .in("athlete_id", athleteIds)
      : { data: [] };

  return (
    <OneRmImportClient
      athletes={athletes}
      teams={teams ?? []}
      exercises={[
        ...orgExercises.map((e) => ({ id: e.id, name: e.name, source: "org" as const })),
        ...platformExercises.map((e) => ({ id: e.id, name: e.name, source: "platform" as const })),
      ]}
      existingRecords={existingRecords ?? []}
    />
  );
}
