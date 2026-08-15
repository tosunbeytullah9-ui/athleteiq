import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { NewProgramClient } from "./new-program-client";
import {
  getPlatformExercises,
  getOrgExercises,
  getOrgCategories,
  getAthleteMaxes,
} from "@athleteiq/db/queries/exercises";

export default async function NewProgramPage() {
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

  const [teamsResult, athletesResult, platformExercises, orgExercises, categories] = await Promise.all([
    supabase.from("teams").select("id, name").eq("org_id", orgId).order("name"),
    supabase
      .from("athletes")
      .select("id, full_name, team_id")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("full_name"),
    getPlatformExercises(supabase),
    getOrgExercises(supabase, orgId),
    getOrgCategories(supabase, orgId),
  ]);

  const athletes: { id: string; full_name: string; team_id: string | null }[] =
    athletesResult.data ?? [];
  // getAthleteMaxes tek bir athleteId alıyor (org-wide eşdeğeri yok) —
  // her sporcu için ayrı çağrılıp birleştiriliyor (bkz. PROGRESS.md Parti 2.2.E).
  const athleteMaxesLists = await Promise.all(
    athletes.map((a) => getAthleteMaxes(supabase, a.id))
  );
  const athleteMaxes = athleteMaxesLists.flat();

  return (
    <NewProgramClient
      orgId={orgId}
      teams={teamsResult.data ?? []}
      athletes={athletes}
      platformExercises={platformExercises}
      orgExercises={orgExercises}
      categories={categories}
      athleteMaxes={athleteMaxes}
    />
  );
}
