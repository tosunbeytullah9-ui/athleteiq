// CrossFit tarzı (WOD) seans etiketleri — web'deki apps/web/lib/exercise-format.ts
// (WORKOUT_FORMAT_LABELS/formatWodSummary) ile aynı mantık, mobile kendi
// paylaşım mekanizmasına sahip olmadığı için ayrı dosyada tutuluyor.

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
