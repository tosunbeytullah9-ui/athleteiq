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
