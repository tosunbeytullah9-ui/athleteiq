import { z } from "zod";

export const PolarTokensSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  x_user_id: z.number(),
});

// GERÇEK AccessLink v3 şeması — www.polar.com/accesslink-api/swagger.yaml
// dosyasından birebir alındı (2026-09-13, canlı testte iki YANLIŞ varsayımdan
// sonra doğrulandı: önce WHOOP tarzı flat snake_case alanlar hayal edilmişti,
// sonra yanlışlıkla "Dynamic API v4"ün camelCase/iç-içe şemasına geçilmişti —
// nightly-recharge/sleep aslında AYRI bir v4 ürünü DEĞİL, klasik v3'ün parçası).
// Zorunlu olmayan/az kullanılan alanlar risksiz olsun diye .optional() bırakıldı.
export const PolarNightlyRechargeSchema = z.object({
  polar_user: z.string().optional(),
  date: z.string(),
  heart_rate_avg: z.number().nullable().optional(),
  beat_to_beat_avg: z.number().nullable().optional(),
  heart_rate_variability_avg: z.number().nullable().optional(),
  breathing_rate_avg: z.number().nullable().optional(),
  nightly_recharge_status: z.number().nullable().optional(), // 1 (çok kötü) – 6 (çok iyi)
  ans_charge: z.number().nullable().optional(), // -10.0 .. +10.0
  ans_charge_status: z.number().nullable().optional(), // 1 (çok düşük) – 5 (çok yüksek)
  hrv_samples: z.unknown().optional(),
  breathing_samples: z.unknown().optional(),
});

export const PolarSleepResultSchema = z.object({
  polar_user: z.string().optional(),
  date: z.string(),
  sleep_start_time: z.string().optional(),
  sleep_end_time: z.string().optional(),
  device_id: z.string().optional(),
  continuity: z.number().nullable().optional(), // 1.0 – 5.0
  continuity_class: z.number().nullable().optional(),
  light_sleep: z.number().nullable().optional(), // saniye
  deep_sleep: z.number().nullable().optional(), // saniye
  rem_sleep: z.number().nullable().optional(), // saniye
  unrecognized_sleep_stage: z.number().nullable().optional(), // saniye
  sleep_score: z.number().nullable().optional(), // 1 – 100
  total_interruption_duration: z.number().nullable().optional(), // saniye
  sleep_charge: z.number().nullable().optional(), // 1 (çok düşük) – 5 (çok yüksek)
  sleep_goal: z.number().nullable().optional(), // saniye
  sleep_rating: z.number().nullable().optional(), // 0-5, kullanıcının kendi değerlendirmesi
  short_interruption_duration: z.number().nullable().optional(),
  long_interruption_duration: z.number().nullable().optional(),
  sleep_cycles: z.number().nullable().optional(),
  group_duration_score: z.number().nullable().optional(),
  group_solidity_score: z.number().nullable().optional(),
  group_regeneration_score: z.number().nullable().optional(),
  hypnogram: z.unknown().optional(),
  heart_rate_samples: z.unknown().optional(),
});

export const PolarExerciseSchema = z.object({
  id: z.string(),
  upload_time: z.string(),
  polar_user: z.string(),
  device: z.string(),
  start_time: z.string(),
  start_time_utc_offset: z.number(),
  duration: z.string(),
  calories: z.number(),
  distance: z.number().optional(),
  heart_rate: z
    .object({
      average: z.number(),
      maximum: z.number(),
    })
    .optional(),
  training_load: z.number().optional(),
  sport: z.string(),
  has_route: z.boolean(),
  detailed_sport_info: z.string().optional(),
});

export type PolarTokens = z.infer<typeof PolarTokensSchema>;
export type PolarNightlyRecharge = z.infer<typeof PolarNightlyRechargeSchema>;
export type PolarSleepResult = z.infer<typeof PolarSleepResultSchema>;
export type PolarExercise = z.infer<typeof PolarExerciseSchema>;
