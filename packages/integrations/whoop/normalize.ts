import type { WHOOPRecovery, WHOOPSleep, WHOOPCycle } from "./types";

export interface DailyMetrics {
  athleteId: string;
  provider: "whoop" | "polar" | "fitbit";
  metricDate: string;
  recoveryScore: number | null;
  hrvRmssd: number | null;
  restingHr: number | null;
  spo2: number | null;
  sleepScore: number | null;
  totalSleepMin: number | null;
  deepSleepMin: number | null;
  remSleepMin: number | null;
  sleepEfficiency: number | null;
  strainScore: number | null;
  muscleLoad: number | null;
  activeCalories: number | null;
}

export function normalizeWHOOPRecovery(
  athleteId: string,
  recovery: WHOOPRecovery,
  sleep: WHOOPSleep | null,
  cycle: WHOOPCycle | null
): DailyMetrics {
  const metricDate = new Date(recovery.created_at).toISOString().slice(0, 10);

  const totalSleepMin = sleep?.score
    ? Math.round(
        (sleep.score.stage_summary.total_in_bed_time_milli -
          sleep.score.stage_summary.total_awake_time_milli) /
          60000
      )
    : null;

  const deepSleepMin = sleep?.score
    ? Math.round(
        sleep.score.stage_summary.total_slow_wave_sleep_time_milli / 60000
      )
    : null;

  const remSleepMin = sleep?.score
    ? Math.round(sleep.score.stage_summary.total_rem_sleep_time_milli / 60000)
    : null;

  return {
    athleteId,
    provider: "whoop",
    metricDate,
    recoveryScore: recovery.score?.recovery_score ?? null,
    hrvRmssd: recovery.score?.hrv_rmssd_milli ?? null,
    restingHr: recovery.score?.resting_heart_rate ?? null,
    spo2: recovery.score?.spo2_percentage ?? null,
    sleepScore: sleep?.score?.sleep_performance_percentage ?? null,
    totalSleepMin,
    deepSleepMin,
    remSleepMin,
    sleepEfficiency: sleep?.score?.sleep_efficiency_percentage ?? null,
    strainScore: cycle?.score?.strain ?? null,
    muscleLoad: null,
    activeCalories: cycle?.score
      ? Math.round(cycle.score.kilojoule / 4.184)
      : null,
  };
}
