import type { DbClient } from "./_client";
import type { TablesInsert, TablesUpdate } from "../types";

export async function createOrganization(
  client: DbClient,
  org: TablesInsert<"organizations">
) {
  const { data, error } = await client
    .from("organizations")
    .insert(org)
    .select("id, name, slug")
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrganization(
  client: DbClient,
  id: string,
  updates: TablesUpdate<"organizations">
) {
  const { data, error } = await client
    .from("organizations")
    .update(updates)
    .eq("id", id)
    .select("id, name, slug, plan, logo_url")
    .single();

  if (error) throw error;
  return data;
}
