// Takvim günü yardımcıları — web, mobil ve sunucunun TEK kaynağı (Parti 18P, 18T).
//
// Veritabanındaki tarih kolonları (competition_date, start_date, metric_date,
// birth_date, checkin_date, log_date …) SAATSİZ takvim günüdür: "2026-11-15".
// Bunlar ASLA `new Date(str)` ile okunmaz — JavaScript bu biçimi UTC gece yarısı
// olarak ayrıştırır ve UTC'nin batısındaki bir cihazda (ör. ABD'deki App Review)
// tarih bir gün önce görünür. Karşılaştırma string olarak yapılır (YYYY-MM-DD
// sözlük sırası = takvim sırası), gün farkı `daysBetweenYmd`, gösterim
// `formatYmdTr` ile — hiçbiri cihazın saat dilimine dokunmaz.
//
// "Bugün" iki farklı kaynaktan gelir (bilinçli ürün kararı, Parti 18T):
//   - MOBİL: `todayLocal()` — telefonun yerel takvim günü. Yarışma/kamp için yurt
//     dışındaki sporcu kendi gününü görür (Tokyo'da Pazartesi sabahı Pazartesi seansı).
//   - WEB ve SUNUCU: `todayInIstanbul()` — Türkiye takvimi. Vercel UTC'de çalışır;
//     `toISOString()` Türkiye'de 00:00–03:00 arası DÜNÜ verir.
//   - Sunucunun kuralını taklit eden pencere hesapları (geri bildirim / wellness
//     düzenleme penceresi, RLS `current_date` ile) mobilde de `todayInIstanbul()`
//     kullanır: İstanbul tarihi UTC tarihinden hiçbir zaman geride değildir, bu yüzden
//     istemci veritabanının reddedeceği bir kaydı "düzenlenebilir" göstermez.
//
// Türkiye 2016'dan beri kalıcı olarak UTC+3 (yaz saati yok). Intl'in `timeZone`
// desteğine (Hermes/Android ICU) bağımlı olmamak için sabit ofset kullanılır.
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function istanbulShifted(date: Date): Date {
  return new Date(date.getTime() + ISTANBUL_OFFSET_MS);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdFromUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** ISO numaralandırma: 1 = Pazartesi … 7 = Pazar (training_sessions.day_of_week ile aynı). */
function isoDow(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

// ---------------------------------------------------------------------------
// "Bugün"
// ---------------------------------------------------------------------------

/** İstanbul'daki takvim günü, YYYY-MM-DD. Web, sunucu ve sunucu-kuralı pencereleri. */
export function todayInIstanbul(now: Date = new Date()): string {
  return istanbulShifted(now).toISOString().slice(0, 10);
}

/** İstanbul'daki haftanın günü, 1 = Pazartesi … 7 = Pazar. */
export function dayOfWeekInIstanbul(now: Date = new Date()): number {
  return isoDow(istanbulShifted(now).getUTCDay());
}

/** İstanbul takvimine göre `days` gün önceki/sonraki gün, YYYY-MM-DD. */
export function istanbulDateOffset(days: number, now: Date = new Date()): string {
  return addDaysYmd(todayInIstanbul(now), days);
}

/** Cihazın yerel takvim günü, YYYY-MM-DD — yalnızca MOBİL "bugün"ü. Yerel Date
 * bileşenleriyle okunur; Intl ve toISOString (UTC) KULLANILMAZ. */
export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Cihazın yerel haftanın günü, 1 = Pazartesi … 7 = Pazar — yalnızca MOBİL. */
export function dayOfWeekLocal(now: Date = new Date()): number {
  return isoDow(now.getDay());
}

// ---------------------------------------------------------------------------
// Saatsiz takvim günü (YYYY-MM-DD) — saat diliminden bağımsız
// ---------------------------------------------------------------------------

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** YYYY-MM-DD doğrulayıcı (yalnızca ilk 10 karakter okunur — "2026-11-15T…" de kabul). */
export function parseYmd(s: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!s) return null;
  const match = YMD_RE.exec(s.slice(0, 10));
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

function utcMs(s: string): number {
  const p = parseYmd(s);
  if (!p) throw new RangeError(`Geçersiz tarih: ${s}`);
  return Date.UTC(p.y, p.m - 1, p.d);
}

/** `ymd`'den `days` gün sonrası (negatifse öncesi), YYYY-MM-DD. */
export function addDaysYmd(ymd: string, days: number): string {
  return ymdFromUtcDate(new Date(utcMs(ymd) + days * DAY_MS));
}

/** `b - a`, tam takvim günü. `daysBetweenYmd(bugün, yarışma)` = kalan gün. */
export function daysBetweenYmd(a: string, b: string): number {
  return Math.round((utcMs(b) - utcMs(a)) / DAY_MS);
}

/** Tarihin haftanın günü, 1 = Pazartesi … 7 = Pazar. */
export function dayOfWeekYmd(ymd: string): number {
  return isoDow(new Date(utcMs(ymd)).getUTCDay());
}

/** Karşılaştırma: YYYY-MM-DD string'leri doğrudan `<`, `>=` ile karşılaştırılabilir
 * (sözlük sırası takvim sırasıdır). Bu fonksiyon yalnızca sort() için kolaylıktır. */
export function compareYmd(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Doğum tarihinden `today` itibarıyla tam yaş. */
export function ageOnYmd(birthDate: string, today: string): number | null {
  const b = parseYmd(birthDate);
  const t = parseYmd(today);
  if (!b || !t) return null;
  let age = t.y - b.y;
  if (t.m < b.m || (t.m === b.m && t.d < b.d)) age--;
  return age;
}

const MONTHS_LONG = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
/** Kısa Türkçe ay adları ("Kas") — takvim kutucuğu gibi yalnızca ay gösteren yerler için. */
export const MONTHS_SHORT_TR = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];
// ISO sırası: index 0 = Pazartesi
const WEEKDAYS_LONG = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const WEEKDAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export type FormatYmdTrOptions = {
  /**
   * "long" → "15 Kasım 2026" (varsayılan) · "short" → "15 Kas 2026" ·
   * "numeric" → "15.11.2026" (web'in `toLocaleDateString("tr-TR")` görünümü).
   */
  style?: "long" | "short" | "numeric";
  /** Yılı göster (varsayılan true). */
  withYear?: boolean;
  /** Gün adını başa ekle: "Pazar, 15 Kasım" (long) / "Paz, 15 Kas" (short). */
  withWeekday?: boolean | "short";
  /** long/short stilde günü iki haneli yaz: "05 Kas" (varsayılan false → "5 Kas"). */
  padDay?: boolean;
};

/**
 * Saatsiz tarihi Türkçe gösterir — sabit ay/gün adı dizileriyle, cihazın saat
 * dilimine ve Intl/ICU desteğine dokunmadan. Geçersiz girdide "" döner.
 */
export function formatYmdTr(s: string | null | undefined, opts: FormatYmdTrOptions = {}): string {
  const p = parseYmd(s);
  if (!p) return "";
  const { style = "long", withYear = true, withWeekday = false, padDay = false } = opts;

  let body: string;
  if (style === "numeric") {
    body = `${pad2(p.d)}.${pad2(p.m)}` + (withYear ? `.${p.y}` : "");
  } else {
    const month = (style === "short" ? MONTHS_SHORT_TR : MONTHS_LONG)[p.m - 1];
    body = `${padDay ? pad2(p.d) : p.d} ${month}` + (withYear ? ` ${p.y}` : "");
  }

  if (!withWeekday) return body;
  const dow = dayOfWeekYmd(s as string);
  const names = withWeekday === "short" || style === "short" ? WEEKDAYS_SHORT : WEEKDAYS_LONG;
  return `${names[dow - 1]}, ${body}`;
}
