import type { DbClient } from "./_client";
import type { TablesInsert, TablesUpdate } from "../types";

export async function getPrograms(client: DbClient, orgId: string) {
  const { data, error } = await client
    .from("training_programs")
    .select(
      `*, training_sessions(*, exercises(*, exercise_sets(*)))`
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProgramById(client: DbClient, id: string) {
  const { data, error } = await client
    .from("training_programs")
    .select(`*, training_sessions(*, exercises(*, exercise_sets(*)))`)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/** Bir bloktaki tüm haftaları (tam ağaçlarıyla), hafta sırasına göre çeker — çok haftalı düzenleme sekmeleri için. */
export async function getProgramsByBlockId(client: DbClient, blockId: string) {
  const { data, error } = await client
    .from("training_programs")
    .select(`*, training_sessions(*, exercises(*, exercise_sets(*)))`)
    .eq("block_id", blockId)
    .order("week_index_in_block", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Verilen program id'lerinden hangilerinde sporcunun girdiği veri (session_rpe,
 * athlete_session_notes, exercises.completed_at) var — update_program_week/
 * propagate_week_to_future bu programların training_sessions'ını silip yeniden
 * kurduğu için, kaydetmeden/yaymadan önce bu id'leri kontrol edip koça uyarı
 * göstermek gerekir (bkz. PROGRESS.md Parti 10).
 */
export async function getProgramIdsWithAthleteData(
  client: DbClient,
  programIds: string[]
): Promise<Set<string>> {
  if (programIds.length === 0) return new Set();

  const { data, error } = await client
    .from("training_sessions")
    .select("program_id, session_rpe, athlete_session_notes, exercises(completed_at)")
    .in("program_id", programIds);

  if (error) throw error;

  const result = new Set<string>();
  for (const row of data ?? []) {
    const hasData =
      row.session_rpe != null ||
      row.athlete_session_notes != null ||
      (row.exercises ?? []).some((e: { completed_at: string | null }) => e.completed_at != null);
    if (hasData) result.add(row.program_id);
  }
  return result;
}

/** Bir bloktaki tüm haftaların yayın durumunu tek seferde değiştirir. */
export async function setBlockPublished(client: DbClient, blockId: string, isPublished: boolean) {
  const { error } = await client
    .from("training_programs")
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq("block_id", blockId);

  if (error) throw error;
}

export async function createProgram(
  client: DbClient,
  program: TablesInsert<"training_programs">
) {
  const { data, error } = await client
    .from("training_programs")
    .insert(program)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function publishProgram(client: DbClient, id: string) {
  const { data, error } = await client
    .from("training_programs")
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProgram(
  client: DbClient,
  id: string,
  updates: TablesUpdate<"training_programs">
) {
  const { data, error } = await client
    .from("training_programs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Sporcunun/takımının en güncel yayınlanmış programının id'si — mobil program/[day] akışlarının paylaşılan ilk aşaması. */
export async function getActiveProgramId(
  client: DbClient,
  params: { athleteId: string; teamId: string }
): Promise<string | null> {
  const { data, error } = await client
    .from("training_programs")
    .select("id")
    .or(`athlete_id.eq.${params.athleteId},team_id.eq.${params.teamId}`)
    .eq("is_published", true)
    .order("start_date", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0]?.id ?? null;
}

/** Bir veya birden fazla programın arşiv durumunu tek seferde değiştirir (blok kapsamlı işlemler için). */
export async function setProgramsArchived(
  client: DbClient,
  ids: string[],
  isArchived: boolean
): Promise<void> {
  const { error } = await client
    .from("training_programs")
    .update({ is_archived: isArchived, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) throw error;
}

/** Verilen programları kalıcı olarak siler — cascade zinciri training_sessions/exercises/exercise_sets'i de temizler. */
export async function deletePrograms(client: DbClient, ids: string[]): Promise<void> {
  const { error } = await client.from("training_programs").delete().in("id", ids);
  if (error) throw error;
}

/**
 * Bir programın bloğunu siler — yalnızca bloğun TÜM haftaları (deletePrograms ile)
 * silindikten sonra çağrılmalı. block_id -> program_blocks FK'si "on delete set null"
 * yönünde, yani training_programs satırlarını silmek program_blocks satırını otomatik
 * temizlemiyor; bu fonksiyon o yetim satırı kaldırır.
 */
export async function deleteProgramBlock(client: DbClient, blockId: string): Promise<void> {
  const { error } = await client.from("program_blocks").delete().eq("id", blockId);
  if (error) throw error;
}

/** Bir programın belirli bir haftanın gününe düşen seanslarını, egzersizlerini ve setlerini çeker. */
export async function getDaySessions(client: DbClient, programId: string, dayOfWeek: number) {
  const { data, error } = await client
    .from("training_sessions")
    .select(`*, exercises(*, exercise_sets(*))`)
    .eq("program_id", programId)
    .eq("day_of_week", dayOfWeek)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
