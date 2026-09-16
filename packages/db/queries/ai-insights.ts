import type { DbClient } from "./_client";
import type { Tables } from "../types";

export type AthleteAiInsightRow = Tables<"athlete_ai_insights">;

// RLS (athlete_ai_insights_select_super_admin) yalnızca is_super_admin() true
// ise satır döndürür — çağıran süper admin değilse boş dizi gelir, hata değil.
export async function getAthleteAiInsightHistory(
  client: DbClient,
  athleteId: string,
  limit = 10
): Promise<AthleteAiInsightRow[]> {
  const { data, error } = await client
    .from("athlete_ai_insights")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
