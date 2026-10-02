// =============================================
// Blok kopyalama — tarih planı. copy_program_block RPC'sinin
// (20261002113316_endurance_sessions_and_block_copy.sql) hafta tarihi
// kuralının TS ikizi: kopya haftaları kaynaktaki GÖRELİ aralıklarını korur
// (kaynak hafta başı − kaynağın ilk hafta başı), tarihi olmayan haftada
// (i-1)*7 kullanılır. UI önizlemesi ve çakışma uyarısı bunu kullanır —
// biri değişirse diğeri de değişmelidir.
// =============================================

/** YYYY-MM-DD + gün (UTC, saat dilimi kayması yok). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000
  );
}

export interface PlannedWeek {
  weekIndex: number;
  start: string;
  end: string;
}

/**
 * Kaynak haftaların başlangıç tarihleri (hafta sırasıyla) + yeni başlangıç →
 * kopya haftalarının tarihleri.
 */
export function planBlockCopy(sourceStarts: readonly (string | null)[], newStart: string): PlannedWeek[] {
  const known = sourceStarts.filter((s): s is string => !!s);
  const first = known.length > 0 ? known.reduce((min, s) => (s < min ? s : min)) : null;
  return sourceStarts.map((src, i) => {
    const start = src && first ? addDays(newStart, diffDays(src, first)) : addDays(newStart, i * 7);
    return { weekIndex: i + 1, start, end: addDays(start, 6) };
  });
}

/** Varsayılan kopya başlangıcı: kaynağın son haftasından hemen sonraki hafta. */
export function defaultCopyStartDate(sourceStarts: readonly (string | null)[]): string | null {
  const known = sourceStarts.filter((s): s is string => !!s);
  if (known.length === 0) return null;
  const last = known.reduce((max, s) => (s > max ? s : max));
  return addDays(last, 7);
}

/** İki kapalı tarih aralığı kesişiyor mu (YYYY-MM-DD karşılaştırması). */
export function dateRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
