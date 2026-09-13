import type { DbClient } from "./_client";
import type { TablesInsert, TablesUpdate } from "../types";

type Provider = "whoop" | "polar";

export async function getWearableConnection(
  client: DbClient,
  athleteId: string,
  provider: Provider
) {
  const { data, error } = await client
    .from("wearable_connections")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("provider", provider)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertWearableConnection(
  client: DbClient,
  connection: TablesInsert<"wearable_connections">
) {
  const { data, error } = await client
    .from("wearable_connections")
    .upsert(connection, { onConflict: "athlete_id,provider" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWearableTokens(
  client: DbClient,
  athleteId: string,
  provider: Provider,
  tokens: Pick<
    TablesUpdate<"wearable_connections">,
    "access_token" | "refresh_token" | "token_expires_at"
  >
) {
  const { data, error } = await client
    .from("wearable_connections")
    .update({ ...tokens, last_synced_at: new Date().toISOString() })
    .eq("athlete_id", athleteId)
    .eq("provider", provider)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWearableMetrics(
  client: DbClient,
  athleteId: string,
  provider: Provider,
  from: string,
  to: string
) {
  const { data, error } = await client
    .from("wearable_daily_metrics")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("provider", provider)
    .gte("metric_date", from)
    .lte("metric_date", to)
    .order("metric_date");

  if (error) throw error;
  return data;
}

export async function getWorkouts(
  client: DbClient,
  athleteId: string,
  from: string,
  to: string
) {
  const { data, error } = await client
    .from("whoop_workouts")
    .select("*")
    .eq("athlete_id", athleteId)
    .gte("start_time", from)
    .lte("start_time", to)
    .order("start_time", { ascending: false });

  if (error) throw error;
  return data;
}

export async function upsertWearableMetrics(
  client: DbClient,
  metrics: TablesInsert<"wearable_daily_metrics">
) {
  const { data, error } = await client
    .from("wearable_daily_metrics")
    .upsert(metrics, { onConflict: "athlete_id,provider,metric_date" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export interface WearableConnectionRow {
  athlete_id: string;
  provider: string;
  is_active: boolean | null;
  last_synced_at: string | null;
}

// Org'daki tüm aktif wearable bağlantılarını çek (durum görüntüleme için).
// athletes!inner ile RLS org/team izolasyonunu uygular.
export async function getWearableConnections(
  client: DbClient,
  orgId: string
): Promise<WearableConnectionRow[]> {
  const { data, error } = await client
    .from("wearable_connections")
    .select("athlete_id, provider, is_active, last_synced_at, athletes!inner(org_id)")
    .eq("athletes.org_id", orgId)
    .eq("is_active", true);

  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    athlete_id: r.athlete_id as string,
    provider: r.provider as string,
    is_active: r.is_active as boolean | null,
    last_synced_at: r.last_synced_at as string | null,
  }));
}
