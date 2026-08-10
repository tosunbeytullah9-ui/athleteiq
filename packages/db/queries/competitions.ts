import type { DbClient } from "./_client";
import type { TablesInsert, TablesUpdate } from "../types";

export async function getCompetitions(client: DbClient, orgId: string) {
  const { data, error } = await client
    .from("competitions")
    .select(`*, competition_results(*, athletes(full_name, avatar_url))`)
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
