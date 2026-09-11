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

// Bugünden geriye, ardışık günlerde check-in yapılmış gün sayısı — sporcu
// Ana Sayfa'daki "streak" rozeti için. checkinDates sırasız (Set) verilebilir;
// bugün henüz check-in yapılmamışsa dünden geriye sayılır (bugünün henüz
// bitmemiş olması seriyi bozmaz).
export function computeCheckinStreak(
  checkinDates: Iterable<string>,
  today: string = getLocalDateString()
): number {
  const dates = new Set(checkinDates);
  let streak = 0;
  const cursor = new Date(today + "T00:00:00");
  if (!dates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const cursorStr = getLocalDateString(cursor);
    if (!dates.has(cursorStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
