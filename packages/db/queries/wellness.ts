import type { DbClient } from "./_client";
import type { TablesInsert } from "../types";

// wellness_total is a Postgres generated column (see supabase/migrations/012_wellness.sql) —
// Postgres rejects any client-supplied value for it. id/created_at/updated_at are
// DB-managed (updated_at via the wellness_updated_at trigger).
export type WellnessCheckinUpsertInput = Omit<
  TablesInsert<"wellness_checkins">,
  "wellness_total" | "id" | "created_at" | "updated_at"
>;

export async function getWellnessCheckin(
  client: DbClient,
  athleteId: string,
  date: string
) {
  const { data, error } = await client
    .from("wellness_checkins")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("checkin_date", date)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAthleteWellnessHistory(
  client: DbClient,
  athleteId: string,
  from: string,
  to: string
) {
  const { data, error } = await client
    .from("wellness_checkins")
    .select("*")
    .eq("athlete_id", athleteId)
    .gte("checkin_date", from)
    .lte("checkin_date", to)
    .order("checkin_date", { ascending: false });

  if (error) throw error;
  return data;
}

// Safe to upsert on (athlete_id, checkin_date): unlike acwr_logs (which has no
// UPDATE RLS policy and silently fails on a same-day re-submit), wellness_checkins
// has a wellness_update policy (012_wellness.sql), so the ON CONFLICT DO UPDATE
// branch of this upsert is actually permitted.
export async function upsertWellnessCheckin(
  client: DbClient,
  checkin: WellnessCheckinUpsertInput
) {
  const { data, error } = await client
    .from("wellness_checkins")
    .upsert(checkin, { onConflict: "athlete_id,checkin_date" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export interface OrgWellnessCheckinRow {
  athlete_id: string;
  checkin_date: string;
  wellness_total: number | null;
  sleep_hours: number | null;
  submitted_at: string | null;
}

// Org-wide (RLS-narrows-coach-to-team) check-in rows for a date window — used by
// the web coach view. wellness_checkins has no org_id column, so join through
// athletes!inner like getWearableConnections/getTests do.
export async function getOrgWellnessCheckins(
  client: DbClient,
  orgId: string,
  from: string,
  to: string
): Promise<OrgWellnessCheckinRow[]> {
  const { data, error } = await client
    .from("wellness_checkins")
    .select(
      "athlete_id, checkin_date, wellness_total, sleep_hours, submitted_at, athletes!inner(org_id)"
    )
    .eq("athletes.org_id", orgId)
    .gte("checkin_date", from)
    .lte("checkin_date", to);

  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    athlete_id: r.athlete_id as string,
    checkin_date: r.checkin_date as string,
    wellness_total: r.wellness_total as number | null,
    sleep_hours: r.sleep_hours as number | null,
    submitted_at: r.submitted_at as string | null,
  }));
}
