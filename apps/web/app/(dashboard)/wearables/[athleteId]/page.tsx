import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
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

  const [connection, metrics, workouts] = await Promise.all([
    getWearableConnection(supabase, athlete.id, "whoop"),
    getWearableMetrics(supabase, athlete.id, "whoop", rangeStart, today),
    getWorkouts(supabase, athlete.id, `${rangeStart}T00:00:00`, `${today}T23:59:59`),
  ]);

  return (
    <AthleteWearableDetailClient
      athlete={athlete}
      connection={connection}
      metrics={metrics}
      workouts={workouts ?? []}
    />
  );
}
