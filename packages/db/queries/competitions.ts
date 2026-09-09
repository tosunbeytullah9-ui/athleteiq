import type { DbClient } from "./_client";
import type { TablesInsert, TablesUpdate } from "../types";

export async function getCompetitions(client: DbClient, orgId: string) {
  const { data, error } = await client
    .from("competitions")
    .select(
      `*, competition_results(*, athletes(full_name, avatar_url)), competition_entries(*, athletes(id, full_name, team_id))`
    )
    .eq("org_id", orgId)
    .order("competition_date", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createCompetition(
  client: DbClient,
  competition: TablesInsert<"competitions">
) {
  const { data, error } = await client
    .from("competitions")
    .insert(competition)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCompetition(
  client: DbClient,
  id: string,
  updates: TablesUpdate<"competitions">
) {
  // competitions tablosunda updated_at kolonu yok — updateProgram'daki gibi otomatik
  // spread yapılmaz.
  const { data, error } = await client
    .from("competitions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCompetition(client: DbClient, id: string): Promise<void> {
  const { error } = await client.from("competitions").delete().eq("id", id);
  if (error) throw error;
}

export async function addCompetitionResult(
  client: DbClient,
  result: TablesInsert<"competition_results">
) {
  const { data, error } = await client
    .from("competition_results")
    .insert(result)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Bir yarışmaya kayıtlı sporcu listesini (roster/giriş) TAM OLARAK verilen
 * athleteIds kümesine eşitler — mevcut satırlardan kümede olmayanlar silinir,
 * kümede olup mevcutta olmayanlar eklenir. competition_results (SONUÇ) ile
 * karıştırılmasın: bu, yarışma ÖNCESİ "kim gidiyor" kaydı.
 */
export async function syncCompetitionEntries(
  client: DbClient,
  competitionId: string,
  athleteIds: string[]
): Promise<void> {
  const { data: existing, error: fetchError } = await client
    .from("competition_entries")
    .select("athlete_id")
    .eq("competition_id", competitionId);

  if (fetchError) throw fetchError;

  const existingIds = new Set<string>(
    (existing ?? []).map((e: { athlete_id: string }) => e.athlete_id)
  );
  const nextIds = new Set<string>(athleteIds);

  const toRemove: string[] = [...existingIds].filter((id) => !nextIds.has(id));
  const toAdd: string[] = [...nextIds].filter((id) => !existingIds.has(id));

  if (toRemove.length > 0) {
    const { error } = await client
      .from("competition_entries")
      .delete()
      .eq("competition_id", competitionId)
      .in("athlete_id", toRemove);
    if (error) throw error;
  }

  if (toAdd.length > 0) {
    const { error } = await client
      .from("competition_entries")
      .insert(toAdd.map((athlete_id) => ({ competition_id: competitionId, athlete_id })));
    if (error) throw error;
  }
}

/**
 * Bir sporcunun kayıtlı olduğu yarışmaları (yaklaşan + geçmiş) döner —
 * sporcu detay sayfasında "Yarışmalar" sekmesi için.
 */
export async function getAthleteCompetitionEntries(client: DbClient, athleteId: string) {
  const { data, error } = await client
    .from("competition_entries")
    .select("id, notes, competitions(id, name, competition_date, location, level)")
    .eq("athlete_id", athleteId)
    .order("competitions(competition_date)", { ascending: true });

  if (error) throw error;
  return data;
}
