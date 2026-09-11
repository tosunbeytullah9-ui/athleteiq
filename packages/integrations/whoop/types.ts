import { z } from "zod";

export const WHOOPTokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string().optional(),
});

// v2: sleep kaynağı UUID tabanlı kimlik kullanır (v1'de integer'dı).
// Bir recovery, ilişkili uykunun (sleep) UUID'siyle referanslanır.
export const WHOOPRecoverySchema = z.object({
  cycle_id: z.number(),
  sleep_id: z.string(),
  user_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  score_state: z.enum(["SCORED", "PENDING_SCORE", "UNSCORABLE"]),
  score: z
    .object({
      user_calibrating: z.boolean(),
      recovery_score: z.number(),
      resting_heart_rate: z.number(),
      hrv_rmssd_milli: z.number(),
      spo2_percentage: z.number().optional(),
      skin_temp_celsius: z.number().optional(),
    })
    .nullable(),
});

export const WHOOPSleepSchema = z.object({
  id: z.string(),
  v1_id: z.number().optional(),
  user_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  start: z.string(),
  end: z.string(),
  timezone_offset: z.string(),
  nap: z.boolean(),
  score_state: z.enum(["SCORED", "PENDING_SCORE", "UNSCORABLE"]),
  score: z
    .object({
      stage_summary: z.object({
        total_in_bed_time_milli: z.number(),
        total_awake_time_milli: z.number(),
        total_no_data_time_milli: z.number(),
        total_light_sleep_time_milli: z.number(),
        total_slow_wave_sleep_time_milli: z.number(),
        total_rem_sleep_time_milli: z.number(),
        sleep_cycle_count: z.number(),
        disturbance_count: z.number(),
      }),
      sleep_needed: z.object({
        baseline_milli: z.number(),
        need_from_sleep_debt_milli: z.number(),
        need_from_recent_strain_milli: z.number(),
        need_from_recent_nap_milli: z.number(),
      }),
      respiratory_rate: z.number().optional(),
      sleep_performance_percentage: z.number().optional(),
      sleep_consistency_percentage: z.number().optional(),
      sleep_efficiency_percentage: z.number().optional(),
    })
    .nullable(),
});

export const WHOOPCycleSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  start: z.string(),
  end: z.string().nullable(),
  timezone_offset: z.string(),
  score_state: z.enum(["SCORED", "PENDING_SCORE", "UNSCORABLE"]),
  score: z
    .object({
      strain: z.number(),
      kilojoule: z.number(),
      average_heart_rate: z.number(),
      max_heart_rate: z.number(),
    })
    .nullable(),
});

export const WHOOPWorkoutSchema = z.object({
  id: z.string(),
  v1_id: z.number().optional(),
  user_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  start: z.string(),
  end: z.string(),
  timezone_offset: z.string(),
  sport_name: z.string(),
  score_state: z.enum(["SCORED", "PENDING_SCORE", "UNSCORABLE"]),
  score: z
    .object({
      strain: z.number(),
      average_heart_rate: z.number(),
      max_heart_rate: z.number(),
      kilojoule: z.number(),
      percent_recorded: z.number(),
      distance_meter: z.number().optional(),
      altitude_gain_meter: z.number().optional(),
    })
    .nullable(),
});

export const WHOOPProfileSchema = z.object({
  user_id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
});

// Webhook payload — bkz. developer.whoop.com/docs/developing/webhooks.
// Create event'ler ayrı bir tip olarak gelmez, "updated" olarak yayınlanır.
export const WHOOPWebhookEventSchema = z.object({
  user_id: z.number(),
  id: z.union([z.number(), z.string()]),
  type: z.enum([
    "workout.updated",
    "workout.deleted",
    "sleep.updated",
    "sleep.deleted",
    "recovery.updated",
    "recovery.deleted",
  ]),
  trace_id: z.string().optional(),
});

export type WHOOPTokens = z.infer<typeof WHOOPTokensSchema>;
export type WHOOPRecovery = z.infer<typeof WHOOPRecoverySchema>;
export type WHOOPSleep = z.infer<typeof WHOOPSleepSchema>;
export type WHOOPCycle = z.infer<typeof WHOOPCycleSchema>;
export type WHOOPWorkout = z.infer<typeof WHOOPWorkoutSchema>;
export type WHOOPProfile = z.infer<typeof WHOOPProfileSchema>;
export type WHOOPWebhookEvent = z.infer<typeof WHOOPWebhookEventSchema>;
