import { assert, assertEquals, assertAlmostEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeFeatures, istanbulDateString, type DailyMetricRow, type WorkoutRow, type WellnessRow } from "./features.ts";

const athlete = { birth_date: "2008-05-01", gender: "female", discipline: "ARTİSTİK CİMNASTİK" };

function metricRow(overrides: Partial<DailyMetricRow> & { metric_date: string }): DailyMetricRow {
  return {
    recovery_score: null,
    hrv_rmssd: null,
    resting_hr: null,
    spo2: null,
    total_sleep_min: null,
    sleep_score: null,
    sleep_efficiency: null,
    deep_sleep_min: null,
    rem_sleep_min: null,
    strain_score: null,
    raw_data: null,
    ...overrides,
  };
}

// -----------------------------------------------------------------------
// Test 1 — Kısa seri fixture (5 gün, baseline n=4 < 7)
// -----------------------------------------------------------------------
Deno.test("kisa seri: BASELINE_YETERSIZ ve RECOVERY_KIRMIZI aktif, z-skorlari null, confidence dusuk", () => {
  const insightDate = "2026-09-14";
  const dates = ["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14"];
  const recovery = [35, 38, 41, 38, 16];
  const hrv = [39.25, 41.36, 42.21, 40.9, 28.39];
  const rhr = [74, 72, 73, 72, 76];

  const dailyMetrics: DailyMetricRow[] = dates.map((d, i) =>
    metricRow({
      metric_date: d,
      recovery_score: recovery[i],
      hrv_rmssd: hrv[i],
      resting_hr: rhr[i],
      total_sleep_min: 420,
    })
  );

  const features = computeFeatures({
    insightDate,
    dailyMetrics,
    workouts: [],
    wellness: [],
    athlete,
  });

  assertEquals(features.insufficient, false);
  assertEquals(features.baseline.n, 4);
  assertEquals(features.z_scores.ln_rmssd, null);
  assertEquals(features.z_scores.resting_hr, null);
  assertEquals(features.z_scores.resp_rate, null);
  assertEquals(features.confidence_cap, "dusuk");

  const flagIds = features.flags.map((f) => f.id);
  assert(flagIds.includes("BASELINE_YETERSIZ"));
  assert(flagIds.includes("RECOVERY_KIRMIZI"));
});

// -----------------------------------------------------------------------
// Test 2 — 20 gunluk sentetik seri: z-skoru matematigi + HRV_DUSUK/COKLU_SINYAL
// -----------------------------------------------------------------------
Deno.test("20 gunluk seri: z-skoru hesaplama ve HRV_DUSUK/RHR_YUKSEK/COKLU_SINYAL", () => {
  const insightDate = "2026-09-30";

  // Baseline: 20 gun, hrv 35/45 alternating, resting_hr 60/70 alternating.
  const dailyMetrics: DailyMetricRow[] = [];
  for (let offset = -20; offset <= -1; offset++) {
    const idx = offset + 20; // 0..19
    const [y, m, d] = insightDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + offset);
    const date = dt.toISOString().slice(0, 10);
    const isEven = idx % 2 === 0;
    dailyMetrics.push(
      metricRow({
        metric_date: date,
        hrv_rmssd: isEven ? 35 : 45,
        resting_hr: isEven ? 60 : 70,
        recovery_score: 70,
        total_sleep_min: 420,
      })
    );
  }

  // Bugun: hrv çok düşük (z <= -1.5), resting_hr çok yüksek (z >= 1.5)
  dailyMetrics.push(
    metricRow({
      metric_date: insightDate,
      hrv_rmssd: 20,
      resting_hr: 80,
      recovery_score: 70,
      total_sleep_min: 420,
    })
  );

  const features = computeFeatures({
    insightDate,
    dailyMetrics,
    workouts: [],
    wellness: [],
    athlete,
  });

  assertEquals(features.baseline.n, 20);
  assertEquals(features.confidence_cap, "orta");

  // resting_hr: baseline mean=65, population sd=5 (tam sayılar, kesin hesap)
  assertAlmostEquals(features.baseline.resting_hr.mean!, 65, 1e-9);
  assertAlmostEquals(features.baseline.resting_hr.sd!, 5, 1e-9);
  assertAlmostEquals(features.z_scores.resting_hr!, (80 - 65) / 5, 1e-9);

  // ln_rmssd: baseline mean=(ln35+ln45)/2, sd=|ln35-mean| (simetrik iki değer)
  const lnMean = (Math.log(35) + Math.log(45)) / 2;
  const lnSd = Math.abs(Math.log(35) - lnMean);
  assertAlmostEquals(features.baseline.ln_rmssd.mean!, lnMean, 1e-9);
  assertAlmostEquals(features.baseline.ln_rmssd.sd!, lnSd, 1e-9);
  assertAlmostEquals(features.z_scores.ln_rmssd!, (Math.log(20) - lnMean) / lnSd, 1e-9);

  assert(features.z_scores.ln_rmssd! <= -1.5);
  assert(features.z_scores.resting_hr! >= 1.5);

  const flagIds = features.flags.map((f) => f.id);
  assert(flagIds.includes("HRV_DUSUK"));
  assert(flagIds.includes("RHR_YUKSEK"));
  assert(flagIds.includes("COKLU_SINYAL"));
  assert(!flagIds.includes("BASELINE_YETERSIZ"));
});

// -----------------------------------------------------------------------
// Test 3 — Europe/Istanbul gun sinirlari
// -----------------------------------------------------------------------
Deno.test("Europe/Istanbul gun siniri: 21:30 UTC baslangicli workout ertesi gune yazilir", () => {
  assertEquals(istanbulDateString("2026-09-14T21:30:00.000Z"), "2026-09-15");
});

Deno.test("load_7d: gun sinirina gore dogru relatif gune gruplanir", () => {
  const insightDate = "2026-09-15";
  const workouts: WorkoutRow[] = [
    {
      start_time: "2026-09-14T21:30:00.000Z", // Istanbul'da 2026-09-15 00:30 -> "bugun"
      end_time: "2026-09-14T22:00:00.000Z",
      sport_name: "Artistik Cimnastik",
      strain_score: 8,
      raw_data: null,
    },
  ];

  const features = computeFeatures({
    insightDate,
    dailyMetrics: [metricRow({ metric_date: insightDate, recovery_score: 70, total_sleep_min: 420 })],
    workouts,
    wellness: [],
    athlete,
  });

  assertEquals(features.load_7d.days.length, 1);
  assertEquals(features.load_7d.days[0].day, "bugun");
  assertEquals(features.load_7d.total_sessions, 1);
});

// -----------------------------------------------------------------------
// Test 4 — Eksik gunun yonetimi
// -----------------------------------------------------------------------
Deno.test("data_quality: aradaki bos gun eksik gun olarak yansir", () => {
  const insightDate = "2026-09-20";
  // Son 7 gun: 09-14..09-20. 09-17 kasitli olarak eksik birakildi.
  const presentDates = ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-18", "2026-09-19", "2026-09-20"];
  const dailyMetrics: DailyMetricRow[] = presentDates.map((d) =>
    metricRow({ metric_date: d, recovery_score: 70, hrv_rmssd: 40, resting_hr: 60, total_sleep_min: 420 })
  );

  const features = computeFeatures({
    insightDate,
    dailyMetrics,
    workouts: [],
    wellness: [],
    athlete,
  });

  assertEquals(features.data_quality.days_with_data_7d, 6);
  assertEquals(features.data_quality.missing_days_7d, ["gun_-3"]);
  assertEquals(features.insufficient, false);
});

Deno.test("wellness: gun etiketi goreli olmali, kayit yoksa WELLNESS_YOK", () => {
  const insightDate = "2026-09-20";
  const wellness: WellnessRow[] = [
    {
      checkin_date: "2026-09-19",
      sleep_quality: 4,
      soreness: 4,
      stress: 4,
      fatigue: 4,
      mood: 4,
      sleep_hours: 8,
      wellness_total: 20,
    },
  ];

  const features = computeFeatures({
    insightDate,
    dailyMetrics: [metricRow({ metric_date: insightDate, recovery_score: 70, total_sleep_min: 420 })],
    workouts: [],
    wellness,
    athlete,
  });

  assertEquals(features.wellness.last_date, "gun_-1");
  assertEquals(features.wellness.days_since, 1);
  assertEquals(features.wellness.recent[0].day, "gun_-1");
  // days_since=1 <= 3, bu yuzden WELLNESS_YOK tetiklenmemeli
  assert(!features.flags.some((f) => f.id === "WELLNESS_YOK"));
});

Deno.test("insufficient: insight_date icin gunluk satir yoksa insufficient=true", () => {
  const features = computeFeatures({
    insightDate: "2026-09-20",
    dailyMetrics: [metricRow({ metric_date: "2026-09-19", recovery_score: 70 })],
    workouts: [],
    wellness: [],
    athlete,
  });

  assertEquals(features.insufficient, true);
  assertEquals(features.today.recovery_score, null);
});
