// Web'in takvim yardımcıları — web ve sunucuda "bugün" HER ZAMAN İstanbul takvimidir
// (todayInIstanbul, packages/validators/date.ts). Vercel UTC'de çalışır; tarayıcının
// ya da sunucunun yerel tarihi kullanılırsa Türkiye'de 00:00–03:00 arası dün seçilir.
// DB'deki day_of_week 1–7 (Pazartesi–Pazar) — ISO numaralandırma.
import {
  addDaysYmd,
  dayOfWeekInIstanbul,
  daysBetweenYmd,
  todayInIstanbul,
} from "@athleteiq/validators/date";

/** Bugünün (İstanbul) içinde bulunduğu haftanın Pazartesi–Pazar aralığı, YYYY-MM-DD. */
export function getWeekRange(now: Date = new Date()): { start: string; end: string } {
  const start = addDaysYmd(todayInIstanbul(now), -(dayOfWeekInIstanbul(now) - 1));
  return { start, end: addDaysYmd(start, 6) };
}

/** Bugünden (İstanbul) verilen tarihe kaç gün kaldığı — geçmiş tarihler için negatif. */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  return daysBetweenYmd(todayInIstanbul(now), isoDate.slice(0, 10));
}
