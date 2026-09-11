import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getPrograms } from "@athleteiq/db/queries/programs";
import { getAthleteMaxHistory } from "@athleteiq/db/queries/exercises";
import { ProgramsClient } from "./programs-client";

export default async function ProgramsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;
  const role = cookieStore.get("aiq_role")?.value;

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  const [programs, teamsResult, athletesResult] = await Promise.all([
    getPrograms(supabase, orgId),
    supabase.from("teams").select("id, name").eq("org_id", orgId).order("name"),
    supabase
      .from("athletes")
      .select("id, full_name, team_id")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("full_name"),
  ]);

  // Sporcu için %1RM çözümlemesi (formatSetLoad) amacıyla kendi 1RM geçmişi de
  // çekilir — RLS zaten yalnızca kendi kaydına izin veriyor.
  let athleteMaxHistory: Awaited<ReturnType<typeof getAthleteMaxHistory>> = [];
  if (role === "athlete") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: athlete } = user
      ? await supabase
          .from("athletes")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };
    if (athlete) {
      athleteMaxHistory = await getAthleteMaxHistory(supabase, athlete.id);
    }
  }

  return (
    <ProgramsClient
      programs={programs}
      teams={teamsResult.data ?? []}
      athletes={athletesResult.data ?? []}
      athleteMaxHistory={athleteMaxHistory}
    />
  );
}
