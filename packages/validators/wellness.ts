import { z } from "zod";

export const wellnessCheckinSchema = z.object({
  sleep_quality: z.number().int().min(1).max(5),
  soreness: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  fatigue: z.number().int().min(1).max(5),
  mood: z.number().int().min(1).max(5),
  sleep_hours: z.number().min(0).max(24).optional().nullable(),
  notes: z.string().max(1000).optional(),
});

export type WellnessCheckinInput = z.infer<typeof wellnessCheckinSchema>;

// wellness_total (5-25) is a Postgres generated column (sleep_quality + soreness +
// stress + fatigue + mood) — never send it in an insert/update payload, Postgres
// will reject it. This is a pure UI-preview helper only (live running total while
// the form is being filled).
export function computeWellnessTotal(items: {
  sleep_quality: number;
  soreness: number;
  stress: number;
  fatigue: number;
  mood: number;
}): number {
  return (
    items.sleep_quality + items.soreness + items.stress + items.fatigue + items.mood
  );
}

// checkin_date must always be the device/browser's LOCAL calendar date, never the
// DB default (CURRENT_DATE, which is UTC) — Turkey is UTC+3, so a submission made
// after midnight local time but before UTC midnight would otherwise land on the
// wrong day. Uses local Date components, never toISOString() (that's UTC).
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
