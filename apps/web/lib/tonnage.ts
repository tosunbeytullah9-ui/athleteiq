import type { Tables } from "@athleteiq/db/types";
import { buildMaxLookup, resolveOneRepMaxKg } from "@athleteiq/db/queries/exercises";

export { buildMaxLookup };

type ExerciseSetRow = Tables<"exercise_sets">;
type ExerciseWithSets = Tables<"exercises"> & { exercise_sets: ExerciseSetRow[] };
type SessionWithExercises = Tables<"training_sessions"> & { exercises: ExerciseWithSets[] };

export type UnresolvedReason =
  | "no_1rm_record"
  | "unknown_bodyweight"
  | "no_athlete_context"
  | "band_resistance";

export interface UnresolvedSet {
  reason: UnresolvedReason;
  exerciseName: string;
}

export interface TonnageContext {
  maxLookup: Map<string, number>;
  /** Sporcunun vücut ağırlığı (kg) — bilinmiyorsa null. */
  athleteWeightKg: number | null;
  /** false ise (takım programı) bodyweight/%1RM hiçbir zaman çözümlenemez. */
  hasAthleteContext: boolean;
}

export interface TonnageSummary {
  /** Kg tipi, çözülen bodyweight ve çözülen %1RM setlerinin toplamı (reps × kg). */
  totalKg: number;
  /** Karşılaşılan tüm exercise_sets satırı (süre bazlı ve boş setler dahil). */
  totalSetCount: number;
  /** totalKg'a katkı yapan set sayısı. */
  resolvedSetCount: number;
  /** Reps'i olup da yük çözümlenemeyen her set için bir kayıt. */
  unresolved: UnresolvedSet[];
}

const EMPTY: TonnageSummary = { totalKg: 0, totalSetCount: 0, resolvedSetCount: 0, unresolved: [] };

function sumTonnage(a: TonnageSummary, b: TonnageSummary): TonnageSummary {
  return {
    totalKg: a.totalKg + b.totalKg,
    totalSetCount: a.totalSetCount + b.totalSetCount,
    resolvedSetCount: a.resolvedSetCount + b.resolvedSetCount,
    unresolved: a.unresolved.concat(b.unresolved),
  };
}

function calculateSetTonnage(
  set: ExerciseSetRow,
  exerciseName: string,
  context: TonnageContext
): TonnageSummary {
  const base = { ...EMPTY, totalSetCount: 1 };

  // Süre bazlı set (reps yok) — tonaja hiç dahil edilmez, eksik veri sayılmaz.
  if (set.reps == null) {
    return base;
  }
  const reps = set.reps;

  if (set.load_kg != null) {
    return { ...base, totalKg: reps * set.load_kg, resolvedSetCount: 1 };
  }

  if (set.is_bodyweight) {
    if (!context.hasAthleteContext) {
      return { ...base, unresolved: [{ reason: "no_athlete_context", exerciseName }] };
    }
    if (context.athleteWeightKg == null) {
      return { ...base, unresolved: [{ reason: "unknown_bodyweight", exerciseName }] };
    }
    return { ...base, totalKg: reps * context.athleteWeightKg, resolvedSetCount: 1 };
  }

  if (set.percent_1rm != null) {
    if (!context.hasAthleteContext) {
      return { ...base, unresolved: [{ reason: "no_athlete_context", exerciseName }] };
    }
    const resolvedKg = resolveOneRepMaxKg(exerciseName, set.percent_1rm, context.maxLookup);
    if (resolvedKg == null) {
      return { ...base, unresolved: [{ reason: "no_1rm_record", exerciseName }] };
    }
    return { ...base, totalKg: reps * resolvedKg, resolvedSetCount: 1 };
  }

  if (set.band_resistance) {
    return { ...base, unresolved: [{ reason: "band_resistance", exerciseName }] };
  }

  return base;
}

export function calculateExerciseTonnage(
  exercise: ExerciseWithSets,
  context: TonnageContext
): TonnageSummary {
  return (exercise.exercise_sets ?? []).reduce(
    (acc, set) => sumTonnage(acc, calculateSetTonnage(set, exercise.name, context)),
    EMPTY
  );
}

export function calculateSessionTonnage(
  session: SessionWithExercises,
  context: TonnageContext
): TonnageSummary {
  return (session.exercises ?? []).reduce(
    (acc, exercise) => sumTonnage(acc, calculateExerciseTonnage(exercise, context)),
    EMPTY
  );
}

export function calculateProgramTonnage(
  sessions: SessionWithExercises[],
  context: TonnageContext
): TonnageSummary {
  return sessions.reduce((acc, session) => sumTonnage(acc, calculateSessionTonnage(session, context)), EMPTY);
}

const REASON_LABELS: Record<UnresolvedReason, string> = {
  no_1rm_record: "1RM kaydı yok",
  unknown_bodyweight: "vücut ağırlığı bilinmiyor",
  no_athlete_context: "takım programı — sporcu bağlamı yok",
  band_resistance: "bant direnci ölçülemiyor",
};

export interface UnresolvedGroup {
  reason: UnresolvedReason;
  label: string;
  exerciseNames: string[];
  count: number;
}

/** Çözümlenemeyen setleri sebep bazında grupla, her grup için benzersiz egzersiz adlarını döndür. */
export function summarizeUnresolved(unresolved: UnresolvedSet[]): UnresolvedGroup[] {
  const groups = new Map<UnresolvedReason, { names: Set<string>; count: number }>();
  for (const u of unresolved) {
    const g = groups.get(u.reason) ?? { names: new Set<string>(), count: 0 };
    g.names.add(u.exerciseName);
    g.count += 1;
    groups.set(u.reason, g);
  }
  return Array.from(groups.entries()).map(([reason, g]) => ({
    reason,
    label: REASON_LABELS[reason],
    exerciseNames: Array.from(g.names),
    count: g.count,
  }));
}
