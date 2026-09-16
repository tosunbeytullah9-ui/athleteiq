import type { FitbitSleepLog, FitbitHeartRateDay, FitbitHrvDay } from "./types";
import type { DailyMetrics } from "../whoop/normalize";

// dev.fitbit.com'da doğrulanan gerçek alanlara göre (2026-09-13). Fitbit'in
// public Web API'sinde WHOOP/Polar'daki gibi bir "recovery_score" veya sayısal
// "sleep_score" YOK (Fitbit'in "Daily Readiness Score"u ayrı/premium bir ürün) —
// bunlar tahmin edilmeye çalışılmadan dürüstçe null bırakılıyor; en yakın kavram
// olan `efficiency` (0-100) sleep_score'a değil sleep_efficiency'e eşleniyor.
export function normalizeFitbitMetrics(
  athleteId: string,
  date: string,
  sleep: FitbitSleepLog | null,
  heartRateDay: FitbitHeartRateDay | null,
  hrvDay: FitbitHrvDay | null
): DailyMetrics {
  return {
    athleteId,
    provider: "fitbit",
    metricDate: date,
    recoveryScore: null,
    hrvRmssd: hrvDay?.value.dailyRmssd ?? null,
    restingHr: heartRateDay?.value.restingHeartRate ?? null,
    spo2: null,
    sleepScore: null,
    totalSleepMin: sleep?.minutesAsleep ?? null,
    deepSleepMin: sleep?.levels?.summary?.deep?.minutes ?? null,
    remSleepMin: sleep?.levels?.summary?.rem?.minutes ?? null,
    sleepEfficiency: sleep?.efficiency ?? null,
    strainScore: null,
    muscleLoad: null,
    activeCalories: null,
  };
}
