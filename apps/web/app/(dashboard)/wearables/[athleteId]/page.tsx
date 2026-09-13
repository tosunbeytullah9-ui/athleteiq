import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getPolarExercises,
  getWearableConnection,
  getWearableMetrics,
  getWorkouts,
} from "@athleteiq/db/queries/wearables";
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

  const today = toLocalDateString(new Date());
  const rangeStart = toLocalDateString(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000));
  const rangeStartIso = `${rangeStart}T00:00:00`;
  const rangeEndIso = `${today}T23:59:59`;

  const [whoopConnection, whoopMetrics, workouts, polarConnection, polarMetrics, polarExercises] =
    await Promise.all([
      getWearableConnection(supabase, athlete.id, "whoop"),
      getWearableMetrics(supabase, athlete.id, "whoop", rangeStart, today),
      getWorkouts(supabase, athlete.id, rangeStartIso, rangeEndIso),
      getWearableConnection(supabase, athlete.id, "polar"),
      getWearableMetrics(supabase, athlete.id, "polar", rangeStart, today),
      getPolarExercises(supabase, athlete.id, rangeStartIso, rangeEndIso),
    ]);

  return (
    <AthleteWearableDetailClient
      athlete={athlete}
      whoop={{ connection: whoopConnection, metrics: whoopMetrics, workouts: workouts ?? [] }}
      polar={{ connection: polarConnection, metrics: polarMetrics, exercises: polarExercises ?? [] }}
    />
  );
}
