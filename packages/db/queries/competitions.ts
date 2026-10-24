import type { DbClient } from "./_client";
import type { TablesInsert, TablesUpdate } from "../types";

export async function getCompetitions(client: DbClient, orgId: string) {
  const { data, error } = await client
    .from("competitions")
    .select(
      `*, competition_results(*, athletes(full_name, avatar_url)), competition_entries(*, athletes(id, full_name, team_id)), competition_stages(*)`
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

export async function deleteCompetition(
  client: DbClient,
  id: string
): Promise<void> {
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
 *
 * stagesByAthlete verilirse her sporcunun yarıştığı aşamalar
 * (competition_entries.stages) da yazılır — mevcut sporcular dahil, böylece
 * finale kalan sporcunun etiketi sonradan eklenebilir. Verilmezse aşamalara
 * dokunulmaz (eski davranış).
 */
export async function syncCompetitionEntries(
  client: DbClient,
  competitionId: string,
  athleteIds: string[],
  stagesByAthlete?: Record<string, string[]>
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

  if (stagesByAthlete) {
    if (nextIds.size > 0) {
      const { error } = await client.from("competition_entries").upsert(
        [...nextIds].map((athlete_id) => ({
          competition_id: competitionId,
          athlete_id,
          stages: stagesByAthlete[athlete_id] ?? [],
        })),
        { onConflict: "competition_id,athlete_id" }
      );
      if (error) throw error;
    }
    return;
  }

  if (toAdd.length > 0) {
    const { error } = await client.from("competition_entries").insert(
      toAdd.map((athlete_id) => ({
        competition_id: competitionId,
        athlete_id,
      }))
    );
    if (error) throw error;
  }
}

/**
 * Yarışmanın aşamalarını (competition_stages) TAM OLARAK verilen listeye eşitler —
 * listede olmayan aşamalar silinir, kalanlar (competition_id, stage) üzerinden
 * upsert edilir. stage_date null = yarışma tarihiyle aynı gün.
 */
export async function syncCompetitionStages(
  client: DbClient,
  competitionId: string,
  stages: { stage: string; stage_date: string | null }[]
) {
  const keep = stages.map((s) => s.stage);

  let del = client
    .from("competition_stages")
    .delete()
    .eq("competition_id", competitionId);
  if (keep.length > 0) del = del.not("stage", "in", `(${keep.join(",")})`);
  const { error: delError } = await del;
  if (delError) throw delError;

  if (stages.length === 0) return [];

  const { data, error } = await client
    .from("competition_stages")
    .upsert(
      stages.map((s) => ({
        competition_id: competitionId,
        stage: s.stage,
        stage_date: s.stage_date,
      })),
      { onConflict: "competition_id,stage" }
    )
    .select();
  if (error) throw error;
  return data;
}

/**
 * Bir sporcunun kayıtlı olduğu yarışmaları (yaklaşan + geçmiş) döner —
 * sporcu detay sayfasında "Yarışmalar" sekmesi için.
 */
export type AthleteCompetitionEntry = {
  id: string;
  notes: string | null;
  stages: string[];
  competitions: {
    id: string;
    name: string;
    competition_date: string | null;
    location: string | null;
    level: string | null;
    team_id: string | null;
    competition_stages: { stage: string; stage_date: string | null }[];
  } | null;
};

export async function getAthleteCompetitionEntries(
  client: DbClient,
  athleteId: string
): Promise<AthleteCompetitionEntry[]> {
  const { data, error } = await client
    .from("competition_entries")
    .select(
      "id, notes, stages, competitions(id, name, competition_date, location, level, team_id, competition_stages(stage, stage_date))"
    )
    .eq("athlete_id", athleteId)
    .order("competitions(competition_date)", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AthleteCompetitionEntry[];
}

/**
 * Bir sporcunun kayıtlı geçmiş yarışma SONUÇLARINI döner (competition_results —
 * competition_entries'ten farklı, bkz. üstteki not). Sporcunun kendi "Müsabakalar"
 * ekranındaki "Sonuçlar" sekmesi için — gerçek rank/score, uydurulmuş veri yok.
 */
export async function getAthleteCompetitionResults(
  client: DbClient,
  athleteId: string
) {
  const { data, error } = await client
    .from("competition_results")
    .select(
      "id, event, score, rank, notes, competitions(id, name, competition_date, location, level, team_id)"
    )
    .eq("athlete_id", athleteId)
    .order("competitions(competition_date)", { ascending: false });

  if (error) throw error;
  return data;
}
