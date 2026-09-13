import type { PolarNightlyRecharge, PolarSleepResult } from "./types";
import type { DailyMetrics } from "../whoop/normalize";

// GERÇEK AccessLink v3 alanlarına göre (2026-09-13, bkz. types.ts'teki not).
// nightly_recharge_status 1 (çok kötü) – 6 (çok iyi) skalasını 0-100'e
// (WHOOP'un recovery_score'uyla aynı ölçek) doğrusal olarak dönüştürüyoruz.
// sleep_efficiency için gerçek API'de doğrudan bir "efficiency" alanı yok
// (en yakın kavram "continuity" 1.0-5.0, farklı bir ölçek) — bilinçli olarak
// null bırakıldı, yanlış bir dönüşüm uydurmak yerine.
export function normalizePolarMetrics(
  athleteId: string,
  recharge: PolarNightlyRecharge,
  sleep: PolarSleepResult | null
): DailyMetrics {
  const recoveryScore =
    recharge.nightly_recharge_status != null
      ? Math.round(((recharge.nightly_recharge_status - 1) / 5) * 100)
      : null;

  const totalSleepMin =
    sleep?.light_sleep != null && sleep?.deep_sleep != null && sleep?.rem_sleep != null
      ? Math.round((sleep.light_sleep + sleep.deep_sleep + sleep.rem_sleep) / 60)
      : null;

  return {
    athleteId,
    provider: "polar",
    metricDate: recharge.date,
    recoveryScore,
    hrvRmssd: recharge.heart_rate_variability_avg ?? null,
    restingHr: recharge.heart_rate_avg ?? null,
    spo2: null,
    sleepScore: sleep?.sleep_score ?? null,
    totalSleepMin,
    deepSleepMin: sleep?.deep_sleep != null ? Math.round(sleep.deep_sleep / 60) : null,
    remSleepMin: sleep?.rem_sleep != null ? Math.round(sleep.rem_sleep / 60) : null,
    sleepEfficiency: null,
    strainScore: null,
    muscleLoad: null,
    activeCalories: null,
  };
}
