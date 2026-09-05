import { z } from "zod";

export const createProgramSchema = z
  .object({
    title: z.string().min(1, "Program başlığı gerekli"),
    team_id: z.string().uuid().optional(),
    athlete_id: z.string().uuid().optional(),
    week_number: z.number().int().min(1).max(52).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    phase: z
      .enum(["preparation", "competition", "transition", "peak"])
      .optional(),
    notes: z.string().optional(),
    training_group: z.string().optional(),
  })
  .refine((data) => data.team_id ?? data.athlete_id, {
    message: "Takım veya sporcu seçilmeli",
    path: ["team_id"],
  })
  .refine((data) => !(data.team_id && data.athlete_id), {
    message: "Takım ve sporcu aynı anda seçilemez",
    path: ["athlete_id"],
  });

export const exerciseSchema = z.object({
  name: z.string().min(1, "Egzersiz adı gerekli"),
  category: z.string().optional(),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  duration_sec: z.number().int().positive().optional(),
  load_kg: z.number().positive().optional(),
  load_percent: z.number().min(0).max(100).optional(),
  rest_sec: z.number().int().positive().optional(),
  unit: z.enum(["kg", "lb", "%", "bodyweight"]).default("kg"),
  notes: z.string().optional(),
  order_index: z.number().int().default(0),
});

export const sessionSchema = z.object({
  day_of_week: z.number().int().min(1).max(7),
  session_type: z
    .enum(["strength", "conditioning", "technical", "recovery", "competition"])
    .optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  duration_min: z.number().int().positive().optional(),
  order_index: z.number().int().default(0),
  exercises: z.array(exerciseSchema).default([]),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type ExerciseInput = z.infer<typeof exerciseSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
