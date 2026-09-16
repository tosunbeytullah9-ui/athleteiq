import { z } from "zod";

export const FitbitTokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  user_id: z.string(),
  scope: z.string().optional(),
});

// dev.fitbit.com — GET /1.2/user/-/sleep/date/{start}/{end}.json
export const FitbitSleepLogSchema = z.object({
  logId: z.number(),
  dateOfSleep: z.string(), // YYYY-MM-DD
  startTime: z.string(),
  endTime: z.string(),
  duration: z.number(), // ms
  efficiency: z.number().nullable().optional(), // 0-100
  minutesAsleep: z.number().nullable().optional(),
  minutesAwake: z.number().nullable().optional(),
  isMainSleep: z.boolean().optional(),
  levels: z
    .object({
      summary: z
        .object({
          deep: z.object({ minutes: z.number() }).optional(),
          light: z.object({ minutes: z.number() }).optional(),
          rem: z.object({ minutes: z.number() }).optional(),
          wake: z.object({ minutes: z.number() }).optional(),
        })
        .passthrough()
        .optional(),
    })
    .optional(),
});

// GET /1/user/-/activities/heart/date/{date}/{period}.json → "activities-heart"[]
export const FitbitHeartRateDaySchema = z.object({
  dateTime: z.string(),
  value: z.object({
    restingHeartRate: z.number().nullable().optional(),
    heartRateZones: z.array(z.unknown()).optional(),
  }),
});

// GET /1/user/-/hrv/date/{start}/{end}.json → hrv[]
export const FitbitHrvDaySchema = z.object({
  dateTime: z.string(),
  value: z.object({
    dailyRmssd: z.number().nullable().optional(),
    deepRmssd: z.number().nullable().optional(),
  }),
});

// GET /1/user/-/activities/list.json → activities[]
export const FitbitActivityLogEntrySchema = z.object({
  logId: z.number(),
  activityName: z.string().optional(),
  duration: z.number().nullable().optional(), // ms
  activeDuration: z.number().nullable().optional(), // ms
  calories: z.number().nullable().optional(),
  averageHeartRate: z.number().nullable().optional(),
  startTime: z.string(),
  distance: z.number().nullable().optional(),
});

export type FitbitTokens = z.infer<typeof FitbitTokensSchema>;
export type FitbitSleepLog = z.infer<typeof FitbitSleepLogSchema>;
export type FitbitHeartRateDay = z.infer<typeof FitbitHeartRateDaySchema>;
export type FitbitHrvDay = z.infer<typeof FitbitHrvDaySchema>;
export type FitbitActivityLogEntry = z.infer<typeof FitbitActivityLogEntrySchema>;
