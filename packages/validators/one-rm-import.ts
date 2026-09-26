/**
 * 1RM (bir tekrar maksimum) kayıtlarının içe aktarılması — SAF ayrıştırma +
 * doğrulama katmanı. athlete-import.ts / program-import.ts ile aynı desen.
 *
 * Çıktı `athlete_1rm_records` satırlarına birebir karşılık gelir; yazma işini
 * web tarafı RLS altında (`1rm_insert`, 031_1rm_team_scoped_rls.sql) yapar —
 * elle "Yeni Kayıt Ekle" formunun geçtiği aynı yol, ayrıcalıklı toplu-yazma
 * endpoint'i yok.
 *
 * KRİTİK — egzersiz adı KATALOGDAN gelmek ZORUNDA. `%1RM` çözümlemesi
 * (`buildMaxLookup`, packages/db/queries/exercises.ts) kaydı `exercise_id` ile
 * DEĞİL, `normalizeExerciseName(exercise_name)` ile arar. Serbest metin bir ad
 * ("Bak Squat") tabloya yazılabilirdi ama program builder'daki hiçbir egzersizle
 * eşleşmez ve %1RM yükleri SESSİZCE boş kalırdı. Bu yüzden katalogda bulunmayan
 * egzersiz bir HATADIR (yakın adlar öneri olarak gösterilir) — elle form da
 * zaten yalnızca katalogdan seçtiriyor, içe aktarma onun yapamayacağı bir veriyi
 * üretmemeli.
 */

import { trFold } from "./athlete";
import {
  cell,
  mapColumns,
  parseDate,
  parseNumber,
  parseTable,
  toCsv,
  type ColumnMapping,
  type Delimiter,
} from "./csv";
import { normalizeExerciseName } from "./exercise";

export type OneRmImportField =
  | "athlete"
  | "team"
  | "exercise"
  | "weight_kg"
  | "test_date"
  | "notes";

export const ONE_RM_IMPORT_ALIASES: Record<OneRmImportField, readonly string[]> = {
  athlete: ["sporcu", "ad soyad", "adsoyad", "isim", "athlete", "sporcu adi", "sporcu adı"],
  team: ["takim", "takım", "team"],
  exercise: ["egzersiz", "hareket", "exercise", "egzersiz adi", "egzersiz adı"],
  // "1RM (kg)" → normalizeHeaderKey → "1rmkg"; parantezli/birimli yazımlar ayrı
  // eşanlamlı olarak listelenmeli, aksi halde sütun bulunamaz (şablonun kendi
  // başlığı da bu biçimde).
  weight_kg: [
    "1rm",
    "1rm kg",
    "1rm (kg)",
    "agirlik",
    "ağırlık",
    "agirlik kg",
    "kg",
    "weight",
    "weight_kg",
    "deger",
    "değer",
    "yuk",
    "yük",
    "max",
    "maks",
  ],
  test_date: ["tarih", "test tarihi", "test_date", "date", "olcum tarihi", "ölçüm tarihi"],
  notes: ["not", "notlar", "notes", "aciklama", "açıklama"],
};

const REQUIRED_COLUMNS: { field: OneRmImportField; label: string }[] = [
  { field: "athlete", label: "Sporcu" },
  { field: "exercise", label: "Egzersiz" },
  { field: "weight_kg", label: "1RM (kg)" },
];

export type ExerciseSource = "platform" | "org";

export interface OneRmImportRow {
  /** Dosyadaki 1 tabanlı satır numarası (başlık satırı 1'dir). */
  line: number;
  athlete_id: string | null;
  /** Kullanıcıya gösterilecek etiket (çözümlendiyse kayıtlı ad, aksi halde ham metin). */
  athlete_label: string;
  exercise_id: string | null;
  exercise_source: ExerciseSource | null;
  /** Katalogdaki KANONİK ad — dosyadaki yazım değil (bkz. dosya başlığındaki not). */
  exercise_name: string;
  weight_kg: number | null;
  test_date: string | null;
  notes: string | null;
  errors: string[];
  warnings: string[];
}

export interface OneRmImportResult {
  rows: OneRmImportRow[];
  /**
   * 1RM hücresi boş (veya yalnızca "-") olduğu için ATLANAN satırların
   * numaraları. Bilinmeyen bir max (örn. sakatlık yüzünden hiç test edilmemiş
   * Back Squat) hata değildir — yazılacak bir değer yoktur, satır sessizce
   * değil ama engellemeden geçilir. `rows` bu satırları İÇERMEZ.
   */
  skippedLines: number[];
  unknownColumns: string[];
  missingColumns: string[];
  fatalError: string | null;
  validCount: number;
  errorCount: number;
}

export interface OneRmImportContext {
  athletes: { id: string; full_name: string; team_id: string | null }[];
  teams: { id: string; name: string }[];
  exercises: { id: string; name: string; source: ExerciseSource }[];
  /** "Tarih" sütunu olmayan veya boş bırakılan satırlar bu tarihe düşer. */
  defaultTestDate: string;
  /** Mevcut 1RM kayıtları — tekrar ve "daha güncel kayıt var" uyarıları için. */
  existingRecords?: { athlete_id: string; exercise_name: string; test_date: string }[];
}

/** Excel'de "bilinmiyor" anlamında sık kullanılan tire yazımları da boş sayılır. */
const EMPTY_VALUE_RE = /^[-–—]*$/;

function fold(raw: string): string {
  return (trFold(raw) ?? "").replace(/\s+/g, " ").trim();
}

/** Eşleşmeyen bir isim için en yakın 3 aday — kullanıcı doğru yazımı görsün. */
function suggest(query: string, candidates: string[]): string[] {
  const q = fold(query);
  if (q === "") return [];
  const tokens = q.split(" ").filter((t) => t.length >= 3);
  const scored = candidates
    .map((name) => {
      const folded = fold(name);
      if (folded.startsWith(q) || q.startsWith(folded)) return { name, score: 3 };
      if (folded.includes(q)) return { name, score: 2 };
      if (tokens.some((t) => folded.includes(t))) return { name, score: 1 };
      return { name, score: 0 };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, 3).map((s) => s.name);
}

function resolveAthlete(
  raw: string,
  teamRaw: string,
  ctx: OneRmImportContext
): { id: string | null; label: string; error: string | null } {
  if (raw === "") return { id: null, label: "", error: "Sporcu adı boş" };

  // Takım sütunu varsa önce onunla daraltılır — aynı isimli iki sporcu
  // olduğunda ayırt etmenin dosya içinden tek yolu bu.
  let pool = ctx.athletes;
  if (teamRaw !== "") {
    const team = ctx.teams.find((t) => fold(t.name) === fold(teamRaw));
    if (!team) {
      const known = ctx.teams.map((t) => t.name).join(", ");
      return {
        id: null,
        label: raw,
        error: `"${teamRaw}" adında bir takım yok${known ? ` (mevcut: ${known})` : ""}`,
      };
    }
    pool = ctx.athletes.filter((a) => a.team_id === team.id);
  }

  const target = fold(raw);
  const matches = pool.filter((a) => fold(a.full_name) === target);

  if (matches.length === 1) {
    const found = matches[0]!;
    return { id: found.id, label: found.full_name, error: null };
  }

  if (matches.length > 1) {
    return {
      id: null,
      label: raw,
      error: `"${raw}" adında ${matches.length} sporcu var — ayırt etmek için dosyaya "Takım" sütunu ekleyin`,
    };
  }

  const near = suggest(raw, pool.map((a) => a.full_name));
  return {
    id: null,
    label: raw,
    error:
      `"${raw}" adında kayıtlı bir sporcu yok` +
      (near.length > 0 ? ` — bunu mu demek istediniz: ${near.join(", ")}?` : ""),
  };
}

function resolveExercise(
  raw: string,
  ctx: OneRmImportContext
): { id: string | null; source: ExerciseSource | null; name: string; error: string | null } {
  if (raw === "") return { id: null, source: null, name: "", error: "Egzersiz adı boş" };

  const target = normalizeExerciseName(raw);
  const matches = ctx.exercises.filter((e) => normalizeExerciseName(e.name) === target);

  // Aynı ad hem org hem platform kütüphanesindeyse org kazanır — org kaydı
  // platform egzersizinin bilinçli olarak fork'lanmış/özelleştirilmiş halidir.
  const picked = matches.find((e) => e.source === "org") ?? matches[0];

  if (picked) {
    return { id: picked.id, source: picked.source, name: picked.name, error: null };
  }

  const near = suggest(raw, ctx.exercises.map((e) => e.name));
  return {
    id: null,
    source: null,
    name: raw,
    error:
      `"${raw}" egzersiz kütüphanesinde yok` +
      (near.length > 0
        ? ` — bunu mu demek istediniz: ${near.join(", ")}?`
        : " — önce Egzersizler sayfasından ekleyin"),
  };
}

export function parseOneRmImport(
  text: string,
  ctx: OneRmImportContext,
  delimiter?: Delimiter
): OneRmImportResult {
  const empty = (fatalError: string | null, missingColumns: string[] = []): OneRmImportResult => ({
    rows: [],
    skippedLines: [],
    unknownColumns: [],
    missingColumns,
    fatalError,
    validCount: 0,
    errorCount: 0,
  });

  if (text.trim() === "") return empty("Dosya boş.");

  const table = parseTable(text, delimiter);
  if (table.headers.length === 0) return empty("Dosyada okunabilir bir başlık satırı yok.");

  const mapping: ColumnMapping<OneRmImportField> = mapColumns(table.headers, ONE_RM_IMPORT_ALIASES);

  const missingColumns = REQUIRED_COLUMNS.filter((c) => mapping.index[c.field] === undefined).map(
    (c) => c.label
  );
  if (missingColumns.length > 0) return empty(null, missingColumns);

  if (table.rows.length === 0) return empty("Başlık satırı var ama hiç veri satırı yok.");

  // Mevcut kayıtlar: (sporcu, normalize egzersiz) → en güncel tarih.
  const latestExisting = new Map<string, string>();
  const existingExact = new Set<string>();
  for (const rec of ctx.existingRecords ?? []) {
    const key = `${rec.athlete_id}|${normalizeExerciseName(rec.exercise_name)}`;
    const current = latestExisting.get(key);
    if (!current || rec.test_date > current) latestExisting.set(key, rec.test_date);
    existingExact.add(`${key}|${rec.test_date}`);
  }

  // 1RM hücresi boş satır = "bu sporcunun bu egzersizde bilinen maxı yok".
  // Hata sayılsaydı tek bir eksik ölçüm tüm listeyi kilitlerdi.
  const skippedLines: number[] = [];
  const dataRows = table.rows.filter((row) => {
    const isEmpty = EMPTY_VALUE_RE.test(cell(row, mapping, "weight_kg"));
    if (isEmpty) skippedLines.push(row.line);
    return !isEmpty;
  });

  const rows: OneRmImportRow[] = dataRows.map((row) => {
    const read = (field: OneRmImportField) => cell(row, mapping, field);
    const errors: string[] = [];
    const warnings: string[] = [];

    const athlete = resolveAthlete(read("athlete"), read("team"), ctx);
    if (athlete.error) errors.push(athlete.error);

    const exercise = resolveExercise(read("exercise"), ctx);
    if (exercise.error) errors.push(exercise.error);

    const weightRaw = read("weight_kg");
    const weight_kg = parseNumber(weightRaw);
    if (weight_kg === null) {
      errors.push(`1RM sayı değil: "${weightRaw}"`);
    } else if (weight_kg <= 0) {
      errors.push(`1RM pozitif olmalı: "${weightRaw}"`);
    } else if (weight_kg > 500) {
      warnings.push(`1RM alışılmadık derecede yüksek: ${weight_kg} kg`);
    }

    const dateRaw = read("test_date");
    let test_date: string | null = ctx.defaultTestDate;
    if (dateRaw !== "") {
      const parsed = parseDate(dateRaw);
      if (parsed === null) {
        errors.push(`Tarih okunamadı: "${dateRaw}" (GG.AA.YYYY veya YYYY-AA-GG bekleniyor)`);
        test_date = null;
      } else {
        test_date = parsed;
        if (parsed > ctx.defaultTestDate) warnings.push(`Test tarihi gelecekte: ${parsed}`);
      }
    }

    // "Daha güncel kayıt var" uyarısı: %1RM çözümlemesi her egzersiz için
    // yalnızca EN GÜNCEL tarihli kaydı kullanır (dedupeLatestMaxes), yani eski
    // tarihli bir satır yazılır ama yüklere hiç yansımaz. Sessiz kalmamalı.
    if (athlete.id && exercise.id && test_date) {
      const key = `${athlete.id}|${normalizeExerciseName(exercise.name)}`;
      if (existingExact.has(`${key}|${test_date}`)) {
        warnings.push("Aynı sporcu/egzersiz/tarih için kayıt zaten var — ikinci bir satır eklenecek");
      } else {
        const latest = latestExisting.get(key);
        if (latest && latest > test_date) {
          warnings.push(
            `Bu egzersiz için daha güncel bir kayıt var (${latest}) — bu satır %1RM hesaplarında kullanılmayacak`
          );
        }
      }
    }

    return {
      line: row.line,
      athlete_id: athlete.id,
      athlete_label: athlete.label,
      exercise_id: exercise.id,
      exercise_source: exercise.source,
      exercise_name: exercise.name,
      weight_kg,
      test_date,
      notes: read("notes") || null,
      errors,
      warnings,
    };
  });

  // Dosya İÇİNDEKİ tekrarlar.
  const seen = new Map<string, number>();
  for (const row of rows) {
    if (!row.athlete_id || !row.exercise_id || !row.test_date) continue;
    const key = `${row.athlete_id}|${normalizeExerciseName(row.exercise_name)}|${row.test_date}`;
    const first = seen.get(key);
    if (first !== undefined) {
      row.warnings.push(`Aynı sporcu/egzersiz/tarih dosyada tekrar ediyor (satır ${first})`);
    } else {
      seen.set(key, row.line);
    }
  }

  const errorCount = rows.filter((r) => r.errors.length > 0).length;

  return {
    rows,
    skippedLines,
    unknownColumns: mapping.unknown,
    missingColumns: [],
    fatalError: null,
    validCount: rows.length - errorCount,
    errorCount,
  };
}

/** İndirilebilir örnek dosya — kullanıcı sütun adlarını buradan görür. */
export function oneRmImportTemplateCsv(delimiter: Delimiter = ";"): string {
  return toCsv(
    [
      ["Sporcu", "Takım", "Egzersiz", "1RM (kg)", "Tarih", "Not"],
      ["Ahmet Yılmaz", "ACE", "Back Squat", "142,5", "12.04.2026", ""],
      ["Ahmet Yılmaz", "ACE", "Bench Press", "95", "12.04.2026", ""],
      ["Elif Demir", "ACE", "Deadlift", "120", "2026-04-12", "Kemersiz"],
    ],
    delimiter
  );
}
