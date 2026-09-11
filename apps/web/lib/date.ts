// Saf tarih yardımcıları — sporcu Ana Sayfa/Programlar widget'ları için.
// DB'deki day_of_week 1–7 (Pazartesi–Pazar) — JS Date.getDay()'in 0–6
// (Pazar–Cumartesi) sırasıyla UYUŞMUYOR, dönüşüm burada yapılır.
// getLocalDateString (packages/validators/wellness.ts) ile aynı ilkeyi
// izler: her zaman TARAYICININ yerel tarihi, toISOString() (UTC) DEĞİL —
// Türkiye UTC+3 olduğundan gece yarısından sonraki bir istek UTC'de hâlâ
// bir önceki günde olabilir.
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Bugünün day_of_week değeri (1=Pazartesi … 7=Pazar). */
export function getTodayDayOfWeek(date: Date = new Date()): number {
  const jsDay = date.getDay(); // 0=Pazar…6=Cumartesi
  return jsDay === 0 ? 7 : jsDay;
}

/** Verilen tarihin (varsayılan bugün) içinde bulunduğu haftanın Pazartesi–Pazar aralığı, yerel tarih string'leriyle. */
export function getWeekRange(date: Date = new Date()): {
  start: string;
  end: string;
} {
  const dow = getTodayDayOfWeek(date); // 1..7
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dow - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toLocalDateString(monday), end: toLocalDateString(sunday) };
}

/** Bugünden (yerel tarih) verilen ISO tarihe kaç gün kaldığı — geçmiş tarihler için negatif. */
export function daysUntil(isoDate: string, from: Date = new Date()): number {
  const today = new Date(toLocalDateString(from) + "T00:00:00");
  const target = new Date(isoDate + "T00:00:00");
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export { toLocalDateString };
