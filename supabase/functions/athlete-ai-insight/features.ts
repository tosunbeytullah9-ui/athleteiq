// Parti 21-AI — saf özellik/bayrak hesaplama katmanı. DB erişimi YOK; index.ts
// zaten çekilmiş satırları geçer. LLM buradaki hiçbir sayıyı hesaplamaz —
// tüm göstergeler burada deterministik olarak üretilir (bkz. CLAUDE.md).

export const ALGORITHM_VERSION = "feat-v1";

export interface DailyMetricRow {
  metric_date: string; // date (YYYY-MM-DD)
  recovery_score: number | null;
  hrv_rmssd: number | null;
  resting_hr: number | null;
  spo2: number | null;
  total_sleep_min: number | null;
  sleep_score: number | null;
  sleep_efficiency: number | null;
  deep_sleep_min: number | null;
  rem_sleep_min: number | null;
  strain_score: number | null;
  // deno-lint-ignore no-explicit-any
  raw_data: Record<string, any> | null;
}

export interface WorkoutRow {
  start_time: string; // timestamptz
  end_time: string | null;
  sport_name: string | null;
  strain_score: number | null;
  // deno-lint-ignore no-explicit-any
  raw_data: Record<string, any> | null;
}

export interface WellnessRow {
  checkin_date: string; // date
  sleep_quality: number;
  soreness: number;
  stress: number;
  fatigue: number;
  mood: number;
  sleep_hours: number | null;
  wellness_total: number;
}

export interface AthleteInfo {
  birth_date: string | null;
  gender: string | null;
  position: string | null;
}

export interface FeaturesInput {
  insightDate: string; // YYYY-MM-DD, Europe/Istanbul
  dailyMetrics: DailyMetricRow[]; // insight_date dahil son 42 gün, provider whoop
  workouts: WorkoutRow[]; // son 8 gün
  wellness: WellnessRow[]; // son 14 gün
  athlete: AthleteInfo;
}

export type FlagId =
  | "HRV_DUSUK"
  | "RHR_YUKSEK"
  | "SOLUNUM_YUKSEK"
  | "RECOVERY_KIRMIZI"
  | "UYKU_KISA"
  | "COKLU_SINYAL"
  | "BASELINE_YETERSIZ"
  | "WELLNESS_YOK";

export interface Flag {
  id: FlagId;
  label_tr: string;
}

export interface TodayFeatures {
  recovery_score: number | null;
  hrv_rmssd: number | null;
  ln_rmssd: number | null;
  resting_hr: number | null;
  spo2: number | null;
  total_sleep_min: number | null;
  sleep_score: number | null;
  sleep_efficiency: number | null;
  deep_sleep_min: number | null;
  rem_sleep_min: number | null;
  resp_rate: number | null;
  skin_temp_c: number | null;
  disturbances: number | null;
  sleep_need_min: number | null;
  recovery_zone: "kirmizi" | "sari" | "yesil" | null;
}

export interface MeanSd {
  mean: number | null;
  sd: number | null;
}

export interface Baseline {
  n: number;
  ln_rmssd: MeanSd;
  resting_hr: MeanSd;
  resp_rate: MeanSd;
  total_sleep_min: MeanSd;
}

export interface ZScores {
  ln_rmssd: number | null;
  resting_hr: number | null;
  resp_rate: number | null;
}

export interface Trend {
  ln_rmssd_7d_mean: number | null;
  ln_rmssd_7d_cv_pct: number | null;
  sleep_7d_avg_min: number | null;
  days_under_6h_7d: number;
}

export interface LoadSession {
  sport: string | null;
  duration_min: number | null;
  strain: number | null;
  zone_min: Record<string, number>;
}

export interface LoadDay {
  day: string;
  sessions: LoadSession[];
}

export interface Load7d {
  days: LoadDay[];
  total_sessions: number;
  total_duration_min: number;
}

export interface WellnessRecent {
  day: string;
  sleep_quality: number;
  soreness: number;
  stress: number;
  fatigue: number;
  mood: number;
  sleep_hours: number | null;
  wellness_total: number;
}

export interface WellnessFeatures {
  last_date: string | null; // göreli gün
  days_since: number | null;
  recent: WellnessRecent[];
}

export interface DataQuality {
  days_with_data_7d: number;
  days_with_data_28d: number;
  missing_days_7d: string[];
  missing_days_28d: string[];
  unfinalized_strain_days: string[];
}

export interface Features {
  insight_date: string;
  insufficient: boolean;
  today: TodayFeatures;
  yesterday_load: { strain: number | null; final: boolean };
  baseline: Baseline;
  z_scores: ZScores;
  trend: Trend;
  load_7d: Load7d;
  wellness: WellnessFeatures;
  data_quality: DataQuality;
  flags: Flag[];
  confidence_cap: "dusuk" | "orta" | "yuksek";
}

// ---------------------------------------------------------------------------
// Saf tarih yardımcıları — hepsi YYYY-MM-DD takvim tarihleriyle çalışır
// (metric_date/checkin_date zaten Postgres `date` kolonu, saat dilimi
// belirsizliği yok). Yalnızca workout.start_time (timestamptz) için
// Europe/Istanbul'a çeviren istanbulDateString kullanılır.
// ---------------------------------------------------------------------------

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function daysBetween(dateStr: string, fromStr: string): number {
  const [y1, m1, d1] = dateStr.split("-").map(Number);
  const [y2, m2, d2] = fromStr.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

export function istanbulDateString(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(
    new Date(isoTimestamp)
  );
}

function relativeDayLabel(dateStr: string, insightDate: string): string {
  const diff = daysBetween(dateStr, insightDate);
  return diff === 0 ? "bugun" : `gun_${diff}`;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Popülasyon standart sapması (n bölen) — bu pencere "tüm mevcut veri" olarak
// ele alınıyor, daha büyük bir popülasyondan örnek değil.
function stdDev(values: number[]): number | null {
  if (values.length === 0) return null;
  const m = mean(values)!;
  const variance = values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function meanSd(values: number[]): MeanSd {
  return { mean: mean(values), sd: stdDev(values) };
}

function zScore(today: number | null, baseline: MeanSd, n: number): number | null {
  if (today === null || n < 7 || baseline.sd === null || baseline.sd <= 0 || baseline.mean === null) {
    return null;
  }
  return (today - baseline.mean) / baseline.sd;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------

function buildToday(row: DailyMetricRow | undefined): TodayFeatures {
  const hrv = row?.hrv_rmssd ?? null;
  const lnRmssd = hrv !== null && hrv > 0 ? Math.log(hrv) : null;

  const respRate = row?.raw_data?.sleep?.score?.respiratory_rate ?? null;
  const skinTempC = row?.raw_data?.recovery?.score?.skin_temp_celsius ?? null;
  const disturbances = row?.raw_data?.sleep?.score?.stage_summary?.disturbance_count ?? null;

  const sleepNeeded = row?.raw_data?.sleep?.score?.sleep_needed;
  let sleepNeedMin: number | null = null;
  if (
    sleepNeeded &&
    typeof sleepNeeded.baseline_milli === "number" &&
    typeof sleepNeeded.need_from_sleep_debt_milli === "number" &&
    typeof sleepNeeded.need_from_recent_strain_milli === "number" &&
    typeof sleepNeeded.need_from_recent_nap_milli === "number"
  ) {
    sleepNeedMin =
      (sleepNeeded.baseline_milli +
        sleepNeeded.need_from_sleep_debt_milli +
        sleepNeeded.need_from_recent_strain_milli +
        sleepNeeded.need_from_recent_nap_milli) /
      60000;
  }

  const recoveryScore = row?.recovery_score ?? null;
  let recoveryZone: TodayFeatures["recovery_zone"] = null;
  if (recoveryScore !== null) {
    recoveryZone = recoveryScore <= 33 ? "kirmizi" : recoveryScore <= 66 ? "sari" : "yesil";
  }

  return {
    recovery_score: recoveryScore,
    hrv_rmssd: hrv,
    ln_rmssd: lnRmssd,
    resting_hr: row?.resting_hr ?? null,
    spo2: row?.spo2 ?? null,
    total_sleep_min: row?.total_sleep_min ?? null,
    sleep_score: row?.sleep_score ?? null,
    sleep_efficiency: row?.sleep_efficiency ?? null,
    deep_sleep_min: row?.deep_sleep_min ?? null,
    rem_sleep_min: row?.rem_sleep_min ?? null,
    resp_rate: respRate,
    skin_temp_c: skinTempC,
    disturbances: disturbances,
    sleep_need_min: sleepNeedMin,
    recovery_zone: recoveryZone,
  };
}

function buildBaseline(dailyMetrics: DailyMetricRow[], insightDate: string): Baseline {
  const windowStart = addDays(insightDate, -28);
  const rows = dailyMetrics.filter(
    (r) => r.metric_date >= windowStart && r.metric_date < insightDate
  );

  const lnRmssdValues = rows
    .map((r) => (r.hrv_rmssd !== null && r.hrv_rmssd > 0 ? Math.log(r.hrv_rmssd) : null))
    .filter((v): v is number => v !== null);
  const restingHrValues = rows
    .map((r) => r.resting_hr)
    .filter((v): v is number => v !== null);
  const respRateValues = rows
    .map((r) => r.raw_data?.sleep?.score?.respiratory_rate ?? null)
    .filter((v): v is number => v !== null);
  const sleepMinValues = rows
    .map((r) => r.total_sleep_min)
    .filter((v): v is number => v !== null);

  return {
    n: rows.length,
    ln_rmssd: meanSd(lnRmssdValues),
    resting_hr: meanSd(restingHrValues),
    resp_rate: meanSd(respRateValues),
    total_sleep_min: meanSd(sleepMinValues),
  };
}

function buildTrend(dailyMetrics: DailyMetricRow[], insightDate: string): Trend {
  const windowStart = addDays(insightDate, -6);
  const rows = dailyMetrics.filter(
    (r) => r.metric_date >= windowStart && r.metric_date <= insightDate
  );

  const lnRmssdValues = rows
    .map((r) => (r.hrv_rmssd !== null && r.hrv_rmssd > 0 ? Math.log(r.hrv_rmssd) : null))
    .filter((v): v is number => v !== null);
  const sleepValues = rows.map((r) => r.total_sleep_min).filter((v): v is number => v !== null);

  const lnMean = mean(lnRmssdValues);
  let cvPct: number | null = null;
  if (lnRmssdValues.length >= 5 && lnMean !== null && lnMean !== 0) {
    const sd = stdDev(lnRmssdValues);
    cvPct = sd !== null ? (sd / Math.abs(lnMean)) * 100 : null;
  }

  return {
    ln_rmssd_7d_mean: lnMean,
    ln_rmssd_7d_cv_pct: cvPct,
    sleep_7d_avg_min: mean(sleepValues),
    days_under_6h_7d: sleepValues.filter((m) => m < 360).length,
  };
}

const ZONE_KEYS: Record<string, string> = {
  zone_zero_milli: "z0",
  zone_one_milli: "z1",
  zone_two_milli: "z2",
  zone_three_milli: "z3",
  zone_four_milli: "z4",
  zone_five_milli: "z5",
};

function buildZoneMin(workout: WorkoutRow): Record<string, number> {
  const durations = workout.raw_data?.score?.zone_durations;
  if (!durations || typeof durations !== "object") return {};
  const result: Record<string, number> = {};
  for (const [key, label] of Object.entries(ZONE_KEYS)) {
    const ms = durations[key];
    if (typeof ms === "number") {
      result[label] = round1(ms / 60000);
    }
  }
  return result;
}

function buildLoad7d(workouts: WorkoutRow[], insightDate: string): Load7d {
  const windowStart = addDays(insightDate, -6);
  const byDay = new Map<string, LoadSession[]>();

  for (const w of workouts) {
    const day = istanbulDateString(w.start_time);
    if (day < windowStart || day > insightDate) continue;

    const durationMin =
      w.end_time !== null
        ? Math.round((new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / 60000)
        : null;

    const session: LoadSession = {
      sport: w.sport_name,
      duration_min: durationMin,
      strain: w.strain_score,
      zone_min: buildZoneMin(w),
    };

    const relDay = relativeDayLabel(day, insightDate);
    const existing = byDay.get(relDay) ?? [];
    existing.push(session);
    byDay.set(relDay, existing);
  }

  const days: LoadDay[] = Array.from(byDay.entries())
    .map(([day, sessions]) => ({ day, sessions }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const allSessions = days.flatMap((d) => d.sessions);
  return {
    days,
    total_sessions: allSessions.length,
    total_duration_min: allSessions.reduce((sum, s) => sum + (s.duration_min ?? 0), 0),
  };
}

function buildWellness(wellness: WellnessRow[], insightDate: string): WellnessFeatures {
  const sorted = [...wellness].sort((a, b) => (a.checkin_date < b.checkin_date ? 1 : -1));
  const last = sorted[0];

  return {
    last_date: last ? relativeDayLabel(last.checkin_date, insightDate) : null,
    days_since: last ? daysBetween(insightDate, last.checkin_date) : null,
    recent: sorted.slice(0, 7).map((r) => ({
      day: relativeDayLabel(r.checkin_date, insightDate),
      sleep_quality: r.sleep_quality,
      soreness: r.soreness,
      stress: r.stress,
      fatigue: r.fatigue,
      mood: r.mood,
      sleep_hours: r.sleep_hours,
      wellness_total: r.wellness_total,
    })),
  };
}

function buildDataQuality(dailyMetrics: DailyMetricRow[], insightDate: string): DataQuality {
  const present = new Set(dailyMetrics.map((r) => r.metric_date));
  const byDate = new Map(dailyMetrics.map((r) => [r.metric_date, r]));

  function windowStats(windowDays: number) {
    const missing: string[] = [];
    let count = 0;
    for (let offset = -(windowDays - 1); offset <= 0; offset++) {
      const date = addDays(insightDate, offset);
      if (present.has(date)) {
        count++;
      } else {
        missing.push(relativeDayLabel(date, insightDate));
      }
    }
    return { count, missing };
  }

  const w7 = windowStats(7);
  const w28 = windowStats(28);

  const unfinalized: string[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const date = addDays(insightDate, offset);
    const row = byDate.get(date);
    if (row && row.strain_score !== null && !row.raw_data?.cycle?.end) {
      unfinalized.push(relativeDayLabel(date, insightDate));
    }
  }

  return {
    days_with_data_7d: w7.count,
    days_with_data_28d: w28.count,
    missing_days_7d: w7.missing,
    missing_days_28d: w28.missing,
    unfinalized_strain_days: unfinalized,
  };
}

function buildFlags(
  today: TodayFeatures,
  zScores: ZScores,
  baseline: Baseline,
  wellness: WellnessFeatures
): Flag[] {
  const flags: Flag[] = [];

  const hrvDusuk = zScores.ln_rmssd !== null && zScores.ln_rmssd <= -1.5;
  const rhrYuksek = zScores.resting_hr !== null && zScores.resting_hr >= 1.5;
  const solunumYuksek = zScores.resp_rate !== null && zScores.resp_rate >= 1.5;

  if (hrvDusuk) flags.push({ id: "HRV_DUSUK", label_tr: "HRV baseline'ın belirgin altında" });
  if (rhrYuksek) flags.push({ id: "RHR_YUKSEK", label_tr: "Dinlenik nabız yüksek" });
  if (solunumYuksek) flags.push({ id: "SOLUNUM_YUKSEK", label_tr: "Solunum hızı yüksek" });

  if (today.recovery_score !== null && today.recovery_score <= 33) {
    flags.push({ id: "RECOVERY_KIRMIZI", label_tr: "Recovery kırmızı bölgede" });
  }
  if (today.total_sleep_min !== null && today.total_sleep_min < 360) {
    flags.push({ id: "UYKU_KISA", label_tr: "Uyku 6 saatin altında" });
  }

  const signalCount = [hrvDusuk, rhrYuksek, solunumYuksek].filter(Boolean).length;
  if (signalCount >= 2) {
    flags.push({ id: "COKLU_SINYAL", label_tr: "Birden fazla fizyolojik sinyal aynı yönde" });
  }

  if (baseline.n < 7) {
    flags.push({ id: "BASELINE_YETERSIZ", label_tr: "Kişisel baseline için veri yetersiz" });
  }

  if (wellness.days_since === null || wellness.days_since > 3) {
    flags.push({ id: "WELLNESS_YOK", label_tr: "Güncel wellness kaydı yok" });
  }

  return flags;
}

function confidenceCap(baseline: Baseline, flags: Flag[]): "dusuk" | "orta" | "yuksek" {
  if (flags.some((f) => f.id === "BASELINE_YETERSIZ")) return "dusuk";
  if (baseline.n <= 20) return "orta";
  return "yuksek";
}

export function computeFeatures(input: FeaturesInput): Features {
  const { insightDate, dailyMetrics, workouts, wellness } = input;

  const todayRow = dailyMetrics.find((r) => r.metric_date === insightDate);
  const insufficient = !todayRow;

  const yesterdayDate = addDays(insightDate, -1);
  const yesterdayRow = dailyMetrics.find((r) => r.metric_date === yesterdayDate);

  const today = buildToday(todayRow);
  const baseline = buildBaseline(dailyMetrics, insightDate);
  const zScores: ZScores = {
    ln_rmssd: zScore(today.ln_rmssd, baseline.ln_rmssd, baseline.n),
    resting_hr: zScore(today.resting_hr, baseline.resting_hr, baseline.n),
    resp_rate: zScore(today.resp_rate, baseline.resp_rate, baseline.n),
  };
  const trend = buildTrend(dailyMetrics, insightDate);
  const load7d = buildLoad7d(workouts, insightDate);
  const wellnessFeatures = buildWellness(wellness, insightDate);
  const dataQuality = buildDataQuality(dailyMetrics, insightDate);
  const flags = buildFlags(today, zScores, baseline, wellnessFeatures);

  return {
    insight_date: insightDate,
    insufficient,
    today,
    yesterday_load: {
      strain: yesterdayRow?.strain_score ?? null,
      final: Boolean(yesterdayRow?.raw_data?.cycle?.end),
    },
    baseline,
    z_scores: zScores,
    trend,
    load_7d: load7d,
    wellness: wellnessFeatures,
    data_quality: dataQuality,
    flags,
    confidence_cap: confidenceCap(baseline, flags),
  };
}
