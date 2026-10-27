import { z } from "zod";
import { addDaysYmd } from "./date";

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

// checkin_date istemciden HER ZAMAN açıkça gönderilir (DB varsayılanına bırakılmaz):
// mobil `todayLocal()` (telefonun takvim günü), web `todayInIstanbul()` — bkz.
// packages/validators/date.ts. toISOString() (UTC) asla "bugün" için kullanılmaz.

// Bugünden geriye, ardışık günlerde check-in yapılmış gün sayısı — sporcu
// Ana Sayfa'daki "streak" rozeti için. checkinDates sırasız (Set) verilebilir;
// bugün henüz check-in yapılmamışsa dünden geriye sayılır (bugünün henüz
// bitmemiş olması seriyi bozmaz). `today` YYYY-MM-DD, çağıran verir.
export function computeCheckinStreak(checkinDates: Iterable<string>, today: string): number {
  const dates = new Set(checkinDates);
  let streak = 0;
  let cursor = dates.has(today) ? today : addDaysYmd(today, -1);
  while (dates.has(cursor)) {
    streak++;
    cursor = addDaysYmd(cursor, -1);
  }
  return streak;
}
