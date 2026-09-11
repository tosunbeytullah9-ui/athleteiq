import type { DbClient } from "./_client";
import type { TablesInsert } from "../types";

export async function getAcwrLogs(
  client: DbClient,
  athleteId: string,
  from: string,
  to: string
) {
  const { data, error } = await client
    .from("acwr_logs")
    .select("*")
    .eq("athlete_id", athleteId)
    .gte("log_date", from)
    .lte("log_date", to)
    .order("log_date");

  if (error) throw error;
  return data;
}

export async function upsertAcwrLog(
  client: DbClient,
  log: TablesInsert<"acwr_logs">
) {
  const { data, error } = await client
    .from("acwr_logs")
    .upsert(log, { onConflict: "athlete_id,log_date" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export interface LatestAcwrRow {
  athlete_id: string;
  full_name: string;
  team_id: string | null;
  log_date: string;
  acwr_ratio: number | null;
}

/**
 * Org'daki (RLS coach'u kendi takımına daraltır — getOrgWellnessCheckins/
 * getWearableConnections'la AYNI athletes!inner deseni) her aktif sporcu için
 * EN GÜNCEL acwr_logs satırı. Son 45 günü çekip athlete_id başına ilk (en
 * yeni) satırı JS'te seçiyoruz — Supabase query builder'da DISTINCT ON yok.
 * Dashboard "risk sporcu" sayısı, Sporcular listesi "Son ACWR" kolonu ve ACWR
 * sayfasındaki risk dağılımı/sıralama widget'ları bu tek fonksiyonu paylaşır.
 */
export async function getLatestAcwrByOrg(
  client: DbClient,
  orgId: string
): Promise<LatestAcwrRow[]> {
  const cutoff = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;

  const { data, error } = await client
    .from("acwr_logs")
    .select(
      "athlete_id, log_date, acwr_ratio, athletes!inner(id, full_name, team_id, org_id, is_active)"
    )
    .eq("athletes.org_id", orgId)
    .eq("athletes.is_active", true)
    .gte("log_date", cutoff)
    .order("log_date", { ascending: false });

  if (error) throw error;

  const latest = new Map<string, LatestAcwrRow>();
  for (const row of (data ?? []) as unknown as {
    athlete_id: string;
    log_date: string;
    acwr_ratio: number | null;
    athletes: { full_name: string; team_id: string | null } | null;
  }[]) {
    if (latest.has(row.athlete_id) || !row.athletes) continue;
    latest.set(row.athlete_id, {
      athlete_id: row.athlete_id,
      full_name: row.athletes.full_name,
      team_id: row.athletes.team_id,
      log_date: row.log_date,
      acwr_ratio: row.acwr_ratio,
    });
  }
  return [...latest.values()];
}
