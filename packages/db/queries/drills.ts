import { normalizeExerciseName } from "@athleteiq/validators/exercise";
import { parseDrillDiagram, type DrillDiagram, type DrillUnit } from "@athleteiq/validators/drill";
import type { DbClient } from "./_client";

/**
 * Drill (koni) diyagramı — bir org egzersizine 1:1 bağlı (drill_diagrams,
 * 20261005122102_drill_diagrams.sql). RLS yalnızca koç/admin'e açar; sporcu
 * için bu sorgular her zaman boş döner.
 */
export type DrillDiagramRecord = {
  id: string;
  org_id: string;
  org_exercise_id: string;
  unit: DrillUnit;
  diagram: DrillDiagram;
  setup_notes: string | null;
  created_by: string | null;
  updated_at: string;
  /** Bağlı egzersizin adları — programda isimden çözüm için. */
  exercise_name: string;
  exercise_name_tr: string | null;
};

type Row = {
  id: string;
  org_id: string;
  org_exercise_id: string;
  unit: string;
  diagram: unknown;
  setup_notes: string | null;
  created_by: string | null;
  updated_at: string;
  org_exercises: { name: string; name_tr: string | null } | null;
};

const SELECT = "id, org_id, org_exercise_id, unit, diagram, setup_notes, created_by, updated_at, org_exercises(name, name_tr)";

function toRecord(row: Row): DrillDiagramRecord | null {
  const diagram = parseDrillDiagram(row.diagram);
  if (!diagram || !row.org_exercises) return null;
  return {
    id: row.id,
    org_id: row.org_id,
    org_exercise_id: row.org_exercise_id,
    unit: row.unit === "yd" ? "yd" : "m",
    diagram,
    setup_notes: row.setup_notes,
    created_by: row.created_by,
    updated_at: row.updated_at,
    exercise_name: row.org_exercises.name,
    exercise_name_tr: row.org_exercises.name_tr,
  };
}

/** Org'un tüm drill diyagramları. Şemadan geçmeyen (bozuk) satırlar atlanır. */
export async function getDrillDiagrams(client: DbClient, orgId: string): Promise<DrillDiagramRecord[]> {
  const { data, error } = await client.from("drill_diagrams").select(SELECT).eq("org_id", orgId);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toRecord).filter((r): r is DrillDiagramRecord => r !== null);
}

/**
 * Program egzersizi adı → diyagram (normalizeExerciseName anahtarlı, Türkçe ad
 * da anahtar). getExerciseDemoLinks ile aynı isim-bazlı eşleşme modeli; düz
 * nesne döner ki server → client prop olarak serileştirilebilsin.
 */
export function buildDrillLookup(records: DrillDiagramRecord[]): Record<string, DrillDiagramRecord> {
  const lookup: Record<string, DrillDiagramRecord> = {};
  for (const r of records) {
    for (const n of [r.exercise_name, r.exercise_name_tr]) {
      if (n) lookup[normalizeExerciseName(n)] = r;
    }
  }
  return lookup;
}

export function findDrill(
  lookup: Record<string, DrillDiagramRecord>,
  exerciseName: string | null | undefined
): DrillDiagramRecord | null {
  if (!exerciseName) return null;
  return lookup[normalizeExerciseName(exerciseName)] ?? null;
}

export interface SaveDrillDiagramInput {
  orgId: string;
  orgExerciseId: string;
  unit: DrillUnit;
  diagram: DrillDiagram;
  setupNotes: string | null;
  userId: string;
}

/** Egzersizin diyagramı varsa günceller, yoksa oluşturur (org_exercise_id unique). */
export async function saveDrillDiagram(client: DbClient, input: SaveDrillDiagramInput): Promise<DrillDiagramRecord> {
  const { data: existing, error: findError } = await client
    .from("drill_diagrams")
    .select("id")
    .eq("org_exercise_id", input.orgExerciseId)
    .maybeSingle();
  if (findError) throw findError;

  const fields = {
    unit: input.unit,
    diagram: input.diagram,
    setup_notes: input.setupNotes?.trim() || null,
  };

  const query = existing
    ? client
        .from("drill_diagrams")
        .update({ ...fields, updated_by: input.userId })
        .eq("id", (existing as { id: string }).id)
    : client.from("drill_diagrams").insert({
        ...fields,
        org_id: input.orgId,
        org_exercise_id: input.orgExerciseId,
        created_by: input.userId,
      });

  const { data, error } = await query.select(SELECT).single();
  if (error) throw error;
  const record = toRecord(data as Row);
  if (!record) throw new Error("Kaydedilen diyagram okunamadı.");
  return record;
}

export async function deleteDrillDiagram(client: DbClient, id: string): Promise<void> {
  const { error } = await client.from("drill_diagrams").delete().eq("id", id);
  if (error) throw error;
}
