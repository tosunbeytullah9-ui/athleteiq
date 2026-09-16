import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getFitbitActivities,
  getPolarExercises,
  getWearableConnection,
  getWearableMetrics,
  getWorkouts,
} from "@athleteiq/db/queries/wearables";
import { getAthleteAiInsightHistory } from "@athleteiq/db/queries/ai-insights";
import { toLocalDateString } from "@/lib/date";
import { AthleteWearableDetailClient } from "./athlete-wearable-detail-client";

interface PageProps {
  params: Promise<{ athleteId: string }>;
}

export default async function AthleteWearableDetailPage({ params }: PageProps) {
  const { athleteId } = await params;
  const supabase = await createClient();

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, full_name")
    .eq("id", athleteId)
    .maybeSingle();

  if (!athlete) notFound();

  // Parti 21-AI — AiInsightPanel yalnızca süper admin için render edilir;
  // değilse geçmiş hiç çekilmez (RLS de zaten engeller, bkz. CLAUDE.md §4).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSuperAdmin = user?.app_metadata?.["platform_role"] === "super_admin";
  const aiInsightHistory = isSuperAdmin
    ? await getAthleteAiInsightHistory(supabase, athlete.id, 10)
    : [];

  const today = toLocalDateString(new Date());
  const rangeStart = toLocalDateString(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000));
  const rangeStartIso = `${rangeStart}T00:00:00`;
  const rangeEndIso = `${today}T23:59:59`;

  const [
    whoopConnection,
    whoopMetrics,
    workouts,
    polarConnection,
    polarMetrics,
    polarExercises,
    fitbitConnection,
    fitbitMetrics,
    fitbitActivities,
  ] = await Promise.all([
    getWearableConnection(supabase, athlete.id, "whoop"),
    getWearableMetrics(supabase, athlete.id, "whoop", rangeStart, today),
    getWorkouts(supabase, athlete.id, rangeStartIso, rangeEndIso),
    getWearableConnection(supabase, athlete.id, "polar"),
    getWearableMetrics(supabase, athlete.id, "polar", rangeStart, today),
    getPolarExercises(supabase, athlete.id, rangeStartIso, rangeEndIso),
    getWearableConnection(supabase, athlete.id, "fitbit"),
    getWearableMetrics(supabase, athlete.id, "fitbit", rangeStart, today),
    getFitbitActivities(supabase, athlete.id, rangeStartIso, rangeEndIso),
  ]);

  return (
    <AthleteWearableDetailClient
      athlete={athlete}
      whoop={{ connection: whoopConnection, metrics: whoopMetrics, workouts: workouts ?? [] }}
      polar={{ connection: polarConnection, metrics: polarMetrics, exercises: polarExercises ?? [] }}
      fitbit={{
        connection: fitbitConnection,
        metrics: fitbitMetrics,
        activities: fitbitActivities ?? [],
      }}
      isSuperAdmin={isSuperAdmin}
      aiInsightHistory={aiInsightHistory}
    />
  );
}
