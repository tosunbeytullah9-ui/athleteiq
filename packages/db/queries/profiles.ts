import type { DbClient } from "./_client";

export async function getProfile(client: DbClient, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProfilesByOrg(client: DbClient, orgId: string) {
  const { data, error } = await client.from("profiles").select("*").eq("org_id", orgId);

  if (error) throw error;
  return data;
}
