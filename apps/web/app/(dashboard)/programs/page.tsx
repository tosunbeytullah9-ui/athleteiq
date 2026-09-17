import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getPrograms, getProgramBlocks } from "@athleteiq/db/queries/programs";
import { getAthleteMaxHistory, getExercise1RMRatios } from "@athleteiq/db/queries/exercises";
import { getAthleteFeedbackHistory } from "@athleteiq/db/queries/session-feedback";
import { getLocalDateString } from "@athleteiq/validators/wellness";
import type { Tables } from "@athleteiq/db/types";
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

  // Sporcu rolü gruplu görünümü hiç kullanmıyor (AthleteProgramView'a düşüyor) —
  // blok üst verisini yalnızca koç/admin için çekiyoruz.
  const [programs, teamsResult, athletesResult, blocks] = await Promise.all([
    getPrograms(supabase, orgId),
    supabase.from("teams").select("id, name").eq("org_id", orgId).order("name"),
    supabase
      .from("athletes")
      .select("id, full_name, team_id")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("full_name"),
    role === "athlete" ? Promise.resolve([]) : getProgramBlocks(supabase, orgId),
  ]);

  // Sporcu için %1RM çözümlemesi (formatSetLoad) amacıyla kendi 1RM geçmişi de
  // çekilir — RLS zaten yalnızca kendi kaydına izin veriyor.
  let athleteMaxHistory: Awaited<ReturnType<typeof getAthleteMaxHistory>> = [];
  let ratios: Awaited<ReturnType<typeof getExercise1RMRatios>> = [];
  let athleteId: string | null = null;
  let feedback: Tables<"session_feedback">[] = [];
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
      athleteId = athlete.id;
      // 60 gün: düzenleme penceresi 7 gün ama geçmiş seansların koç yanıtları
      // da görünsün (salt-okunur).
      const to = getLocalDateString();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 60);
      [athleteMaxHistory, ratios, feedback] = await Promise.all([
        getAthleteMaxHistory(supabase, athlete.id),
        getExercise1RMRatios(supabase),
        getAthleteFeedbackHistory(
          supabase,
          athlete.id,
          getLocalDateString(fromDate),
          to
        ) as Promise<Tables<"session_feedback">[]>,
      ]);
    }
  }

  return (
    <ProgramsClient
      programs={programs}
      teams={teamsResult.data ?? []}
      athletes={athletesResult.data ?? []}
      blocks={blocks}
      athleteMaxHistory={athleteMaxHistory}
      ratios={ratios}
      athleteId={athleteId}
      feedback={feedback}
    />
  );
}
