import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getTests } from "@athleteiq/db/queries/tests";
import {
  getPlatformExercises,
  getOrgExercises,
  getAthleteMaxes,
} from "@athleteiq/db/queries/exercises";
import { TestsClient, type TestRow } from "./tests-client";

export default async function TestResultsPage() {
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

  const [tests, athletesResult, platformExercises, orgExercises] =
    await Promise.all([
      getTests(supabase, orgId),
      supabase
        .from("athletes")
        .select("id, full_name, team_id, teams(name)")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("full_name"),
      getPlatformExercises(supabase),
      getOrgExercises(supabase, orgId),
    ]);

  const athletes = (athletesResult.data ?? []).map((a) => ({
    id: a.id,
    full_name: a.full_name,
    team_id: a.team_id,
    team_name: a.teams?.name ?? null,
  }));
  // getAthleteMaxes tek bir athleteId alıyor (org-wide eşdeğeri yok) —
  // her sporcu için ayrı çağrılıp birleştiriliyor (bkz. PROGRESS.md Parti 2.2.E).
  const athleteMaxesLists = await Promise.all(
    athletes.map((a) => getAthleteMaxes(supabase, a.id))
  );
  const athleteMaxes = athleteMaxesLists.flat();

  return (
    <TestsClient
      orgId={orgId}
      tests={(tests ?? []) as TestRow[]}
      athletes={athletes}
      platformExercises={platformExercises}
      orgExercises={orgExercises}
      athleteMaxes={athleteMaxes}
    />
  );
}
