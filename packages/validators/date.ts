// Europe/Istanbul takvim günü — program haftası, "Bugün" vurgusu ve Recovery penceresi
// gibi takvime bağlı seçimlerin TEK kaynağı (Parti 18P). Program haftaları
// (training_programs.start_date/end_date) Türkiye takvimine göre yazılır; cihazın saat
// dilimi (ör. ABD'deki bir App Review cihazı) ya da UTC (`toISOString()`) kullanılırsa
// Pazartesi 00:00–03:00 arası önceki hafta, ABD'de akşam saatlerinde ise ertesi gün
// yanlış seçilir.
//
// Türkiye 2016'dan beri kalıcı olarak UTC+3 (yaz saati yok). Intl'in `timeZone`
// desteğine (Hermes/Android ICU) bağımlı olmamak için sabit ofset kullanılır.
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

function istanbulShifted(date: Date): Date {
  return new Date(date.getTime() + ISTANBUL_OFFSET_MS);
}

/** İstanbul'daki takvim günü, YYYY-MM-DD. */
export function todayInIstanbul(now: Date = new Date()): string {
  return istanbulShifted(now).toISOString().slice(0, 10);
}

/** İstanbul'daki haftanın günü, ISO numaralandırma: 1 = Pazartesi … 7 = Pazar
 * (training_sessions.day_of_week ile aynı). */
export function dayOfWeekInIstanbul(now: Date = new Date()): number {
  const d = istanbulShifted(now).getUTCDay();
  return d === 0 ? 7 : d;
}

/** İstanbul takvimine göre `days` gün önceki/sonraki gün, YYYY-MM-DD. */
export function istanbulDateOffset(days: number, now: Date = new Date()): string {
  return todayInIstanbul(new Date(now.getTime() + days * 24 * 60 * 60 * 1000));
}
