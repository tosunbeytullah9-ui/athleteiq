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

// CrossFit tarzı (WOD) seans etiketleri — bkz. plan "expressive-weaving-candy".
export const WORKOUT_FORMAT_LABELS: Record<string, string> = {
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For Time",
  tabata: "Tabata",
  rounds_for_time: "Tur Bazlı (RFT)",
  chipper: "Chipper",
};

interface WodSessionSummaryInput {
  workout_format: string | null;
  time_cap_sec: number | null;
  rounds: number | null;
  work_sec: number | null;
  interval_rest_sec: number | null;
}

/** "AMRAP · 12 dk", "EMOM · 20 tur (60 sn)", "Tabata · 8 tur (20/10 sn)" gibi kısa bir özet üretir. */
export function formatWodSummary(session: WodSessionSummaryInput): string {
  const label = WORKOUT_FORMAT_LABELS[session.workout_format ?? ""] ?? session.workout_format ?? "WOD";
  const parts: string[] = [];

  if (session.workout_format === "tabata") {
    if (session.rounds != null) parts.push(`${session.rounds} tur`);
    if (session.work_sec != null && session.interval_rest_sec != null) {
      parts.push(`(${session.work_sec}/${session.interval_rest_sec} sn)`);
    }
  } else if (session.workout_format === "emom") {
    if (session.rounds != null) parts.push(`${session.rounds} tur`);
    if (session.work_sec != null) parts.push(`(${session.work_sec} sn)`);
  } else if (session.workout_format === "rounds_for_time") {
    if (session.rounds != null) parts.push(`${session.rounds} tur`);
  } else if (
    session.workout_format === "amrap" ||
    session.workout_format === "for_time" ||
    session.workout_format === "chipper"
  ) {
    if (session.time_cap_sec != null) parts.push(`${Math.round(session.time_cap_sec / 60)} dk`);
  }

  return parts.length > 0 ? `${label} · ${parts.join(" ")}` : label;
}
