import type { Tables } from "@athleteiq/db/types";
import { buildMaxLookup, resolveOneRepMaxKg } from "@athleteiq/db/queries/exercises";

export { buildMaxLookup };

type ExerciseSetRow = Tables<"exercise_sets">;
type ExerciseWithSets = Tables<"exercises"> & { exercise_sets: ExerciseSetRow[] };
type SessionWithExercises = Tables<"training_sessions"> & { exercises: ExerciseWithSets[] };

export interface TonnageSummary {
  /** Kg tipi ve çözülebilen %1RM setlerinin toplamı (reps × kg). */
  totalKg: number;
  /** %1RM seti var ama sporcunun bu egzersiz için 1RM kaydı yok — tonaja dahil edilemedi. */
  excludedSetCount: number;
  /** Vücut ağırlığı/direnç bandı setlerinin tekrar toplamı (kg değil, ayrı sayılır). */
  bodyweightRepCount: number;
}

const EMPTY: TonnageSummary = { totalKg: 0, excludedSetCount: 0, bodyweightRepCount: 0 };

function sumTonnage(a: TonnageSummary, b: TonnageSummary): TonnageSummary {
  return {
    totalKg: a.totalKg + b.totalKg,
    excludedSetCount: a.excludedSetCount + b.excludedSetCount,
    bodyweightRepCount: a.bodyweightRepCount + b.bodyweightRepCount,
  };
}

function calculateSetTonnage(
  set: ExerciseSetRow,
  exerciseName: string,
  maxLookup: Map<string, number>
): TonnageSummary {
  const reps = set.reps ?? 0;

  if (set.is_bodyweight || set.band_resistance) {
    return { ...EMPTY, bodyweightRepCount: reps };
  }
  if (set.load_kg != null) {
    return { ...EMPTY, totalKg: reps * set.load_kg };
  }
  if (set.percent_1rm != null) {
    const resolvedKg = resolveOneRepMaxKg(exerciseName, set.percent_1rm, maxLookup);
    if (resolvedKg == null) {
      return { ...EMPTY, excludedSetCount: 1 };
    }
    return { ...EMPTY, totalKg: reps * resolvedKg };
  }
  return EMPTY;
}

export function calculateExerciseTonnage(
  exercise: ExerciseWithSets,
  maxLookup: Map<string, number>
): TonnageSummary {
  return (exercise.exercise_sets ?? []).reduce(
    (acc, set) => sumTonnage(acc, calculateSetTonnage(set, exercise.name, maxLookup)),
    EMPTY
  );
}

export function calculateSessionTonnage(
  session: SessionWithExercises,
  maxLookup: Map<string, number>
): TonnageSummary {
  return (session.exercises ?? []).reduce(
    (acc, exercise) => sumTonnage(acc, calculateExerciseTonnage(exercise, maxLookup)),
    EMPTY
  );
}

export function calculateProgramTonnage(
  sessions: SessionWithExercises[],
  maxLookup: Map<string, number>
): TonnageSummary {
  return sessions.reduce((acc, session) => sumTonnage(acc, calculateSessionTonnage(session, maxLookup)), EMPTY);
}
