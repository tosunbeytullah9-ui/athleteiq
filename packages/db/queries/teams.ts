import type { DbClient } from "./_client";
import type { TablesInsert, TablesUpdate } from "../types";

export async function getTeams(client: DbClient, orgId: string) {
  const { data, error } = await client
    .from("teams")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (error) throw error;
  return data;
}

export async function getTeamById(client: DbClient, id: string) {
  const { data, error } = await client
    .from("teams")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createTeam(client: DbClient, team: TablesInsert<"teams">) {
  const { data, error } = await client
    .from("teams")
    .insert(team)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTeam(
  client: DbClient,
  id: string,
  updates: TablesUpdate<"teams">
) {
  const { data, error } = await client
    .from("teams")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTeam(client: DbClient, id: string) {
  const { error } = await client.from("teams").delete().eq("id", id);
  if (error) throw error;
}

export interface TeamCounts {
  athletes: number;
  members: number;
  programs: number;
  competitions: number;
}

/**
 * Org'daki her takım için sporcu/üye/program/yarışma sayılarını tek seferde
 * çeker — takım listesi ve silme onay diyaloğu için ortak kaynak.
 */
export async function getTeamCounts(
  client: DbClient,
  orgId: string
): Promise<Map<string, TeamCounts>> {
  const [athletesRes, membershipsRes, programsRes, competitionsRes] = await Promise.all([
    client.from("athletes").select("team_id").eq("org_id", orgId),
    client.from("memberships").select("team_id").eq("org_id", orgId),
    client.from("training_programs").select("team_id").eq("org_id", orgId),
    client.from("competitions").select("team_id").eq("org_id", orgId),
  ]);

  if (athletesRes.error) throw athletesRes.error;
  if (membershipsRes.error) throw membershipsRes.error;
  if (programsRes.error) throw programsRes.error;
  if (competitionsRes.error) throw competitionsRes.error;

  const counts = new Map<string, TeamCounts>();
  const bump = (teamId: string | null, key: keyof TeamCounts) => {
    if (!teamId) return;
    const existing = counts.get(teamId) ?? {
      athletes: 0,
      members: 0,
      programs: 0,
      competitions: 0,
    };
    existing[key]++;
    counts.set(teamId, existing);
  };

  for (const row of athletesRes.data ?? []) bump(row.team_id, "athletes");
  for (const row of membershipsRes.data ?? []) bump(row.team_id, "members");
  for (const row of programsRes.data ?? []) bump(row.team_id, "programs");
  for (const row of competitionsRes.data ?? []) bump(row.team_id, "competitions");

  return counts;
}
