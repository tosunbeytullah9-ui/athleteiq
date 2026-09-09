import type { DbClient } from "./_client";
import type { TablesInsert, TablesUpdate } from "../types";

export async function getAthletes(
  client: DbClient,
  orgId: string,
  opts: { includeInactive?: boolean } = {}
) {
  let query = client.from("athletes").select("*").eq("org_id", orgId);
  if (!opts.includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query.order("full_name");

  if (error) throw error;
  return data;
}

export async function getAthleteById(client: DbClient, id: string) {
  const { data, error } = await client
    .from("athletes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createAthlete(
  client: DbClient,
  athlete: TablesInsert<"athletes">
) {
  const { data, error } = await client
    .from("athletes")
    .insert(athlete)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAthlete(
  client: DbClient,
  id: string,
  updates: TablesUpdate<"athletes">
) {
  const { data, error } = await client
    .from("athletes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Kalıcı silme — yalnızca 20260909070021_athlete_delete_and_competition_entries.sql'deki
// athletes_delete RLS politikasıyla izinli (admin org geneli, coach kendi takımı).
// UI, hard-delete'i yalnızca getAthleteImpact() sıfır dönerse sunmalı — aksi halde
// on delete cascade tüm program/ACWR/test/1RM/wellness/yoklama geçmişini SİLER.
export async function deleteAthlete(client: DbClient, id: string): Promise<void> {
  const { error } = await client.from("athletes").delete().eq("id", id);
  if (error) throw error;
}

export interface AthleteImpact {
  programs: number;
  acwrLogs: number;
  testResults: number;
  competitionResults: number;
  oneRmRecords: number;
  wellnessCheckins: number;
  attendanceRecords: number;
  hasLogin: boolean;
}

/**
 * Bir sporcuya bağlı geçmiş kayıt sayıları + giriş erişimi olup olmadığı —
 * DeleteAthleteDialog bunu kullanarak hard-delete'i mi (hiçbir bağlı kayıt/giriş
 * yoksa) yoksa yalnızca pasife almayı mı (is_active=false, geri alınabilir) sunacağına
 * karar verir. getTeamCounts (teams.ts) ile aynı "tek seferde say" deseni.
 */
export async function getAthleteImpact(client: DbClient, id: string): Promise<AthleteImpact> {
  const [
    athleteRes,
    programsRes,
    acwrRes,
    testResultsRes,
    competitionResultsRes,
    oneRmRes,
    wellnessRes,
    attendanceRes,
  ] = await Promise.all([
    client.from("athletes").select("user_id").eq("id", id).single(),
    client.from("training_programs").select("id", { count: "exact", head: true }).eq("athlete_id", id),
    client.from("acwr_logs").select("id", { count: "exact", head: true }).eq("athlete_id", id),
    client.from("test_results").select("id", { count: "exact", head: true }).eq("athlete_id", id),
    client.from("competition_results").select("id", { count: "exact", head: true }).eq("athlete_id", id),
    client.from("athlete_1rm_records").select("id", { count: "exact", head: true }).eq("athlete_id", id),
    client.from("wellness_checkins").select("id", { count: "exact", head: true }).eq("athlete_id", id),
    client.from("attendance_records").select("id", { count: "exact", head: true }).eq("athlete_id", id),
  ]);

  if (athleteRes.error) throw athleteRes.error;
  if (programsRes.error) throw programsRes.error;
  if (acwrRes.error) throw acwrRes.error;
  if (testResultsRes.error) throw testResultsRes.error;
  if (competitionResultsRes.error) throw competitionResultsRes.error;
  if (oneRmRes.error) throw oneRmRes.error;
  if (wellnessRes.error) throw wellnessRes.error;
  if (attendanceRes.error) throw attendanceRes.error;

  return {
    programs: programsRes.count ?? 0,
    acwrLogs: acwrRes.count ?? 0,
    testResults: testResultsRes.count ?? 0,
    competitionResults: competitionResultsRes.count ?? 0,
    oneRmRecords: oneRmRes.count ?? 0,
    wellnessCheckins: wellnessRes.count ?? 0,
    attendanceRecords: attendanceRes.count ?? 0,
    hasLogin: athleteRes.data?.user_id != null,
  };
}
