import { TR_CHAR_MAP } from "./athlete";

// 1RM kaydı ↔ program egzersizi ↔ katalog eşleştirmesi için TEK normalizasyon
// kaynağı (packages/db/queries/exercises.ts buildMaxLookup/resolveOneRepMaxKg ve
// ExercisePickerModal arama filtresi bunu kullanır). Türkçe karakterler
// toLowerCase()'den ÖNCE case-sensitive map edilir — suggestUsername'deki "İ" bug'ı
// (bkz. athlete.ts) tekrar yaşanmasın diye aynı desen.
export function normalizeExerciseName(name: string): string {
  const mapped = name.replace(/[İIıÇçĞğÖöŞşÜü]/g, (ch) => TR_CHAR_MAP[ch] ?? ch);
  return mapped.toLowerCase().trim().replace(/\s+/g, " ");
}

// Egzersiz kütüphanesindeki demo_url serbest metindir (koç/admin yazar) —
// sporcuya tıklanabilir link olarak gösterilmeden önce yalnızca http(s)
// adreslerine izin verilir (javascript: vb. şemalar elenir).
export function toSafeHttpUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}
