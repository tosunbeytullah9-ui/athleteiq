import type { Tables } from "@athleteiq/db/types";
import {
  resolveOneRepMaxKgForDate,
  type Athlete1RMRecord,
} from "@athleteiq/db/queries/exercises";

// program-detail-client.tsx ve athlete-program-view.tsx arasında paylaşılan
// egzersiz/set formatlama yardımcıları — tek kaynaktan tutarlı gösterim.
export const BAND_LABELS: Record<string, string> = {
  soft: "Yumuşak",
  medium: "Orta",
  hard: "Sert",
};

export const SESSION_TYPE_LABELS: Record<string, string> = {
  strength: "Kuvvet",
  conditioning: "Kondisyon",
  technical: "Teknik",
  recovery: "Toparlanma",
  competition: "Müsabaka",
};

export const DAY_LABELS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

export function formatSetReps(set: Tables<"exercise_sets">): string {
  if (set.duration_sec != null) return `${set.duration_sec} sn`;
  if (set.reps != null) return `${set.reps} tekrar`;
  return "—";
}

export function formatSetLoad(
  set: Tables<"exercise_sets">,
  exerciseName: string,
  maxHistoryLookup: Map<string, Athlete1RMRecord[]>,
  programStartDate: string | null
): string {
  if (set.band_resistance)
    return `${BAND_LABELS[set.band_resistance] ?? set.band_resistance} bant`;
  if (set.is_bodyweight) return "Vücut ağırlığı";
  if (set.percent_1rm != null) {
    const resolvedKg = resolveOneRepMaxKgForDate(
      exerciseName,
      set.percent_1rm,
      maxHistoryLookup,
      programStartDate
    );
    return resolvedKg != null
      ? `%${set.percent_1rm} 1RM (${resolvedKg.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} kg)`
      : `%${set.percent_1rm} 1RM`;
  }
  if (set.load_kg != null) return `${set.load_kg} kg`;
  return "—";
}

export function formatTonnage(kg: number): string {
  return `${kg.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} kg`;
}
