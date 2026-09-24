/**
 * Antrenman programı içe aktarma — SAF ayrıştırma + doğrulama katmanı.
 *
 * Giriş biçimi: SATIR BAŞINA BİR SET (kullanıcı kararı). Aynı egzersizin
 * setleri ardışık satırlarda yazılır; her setin kendi tekrarı/yükü/RPE'si
 * olabilir:
 *
 *   hafta;gun;seans;egzersiz;set;tekrar;yuk;yuk_tipi;rpe
 *   1;1;Alt Vücut;Back Squat;1;8;60;%1RM;6
 *   1;1;Alt Vücut;Back Squat;2;6;70;%1RM;7
 *
 * Çıktı, create_program_with_weeks / update_program_week RPC'lerinin
 * p_sessions jsonb'siyle BİREBİR aynı şekildedir (bkz. apps/web/lib/program-rpc.ts
 * buildSessionsPayload) — web tarafı çıktıyı dönüştürmeden RPC'ye geçer, yani
 * içe aktarma program builder'la aynı sunucu yolundan ve aynı yetki
 * kontrollerinden geçer.
 *
 * KAPSAM DIŞI (bilinçli): CrossFit/WOD formatındaki seanslar (workout_format
 * + movement_detail). O model "set başına satır" ile çelişir — WOD hareketinin
 * seti yoktur. WOD seansları program builder'dan girilmeye devam eder.
 */

import { trFold } from "./athlete";
import {
  cell,
  mapColumns,
  parseInteger,
  parseNumber,
  parseTable,
  toCsv,
  type ColumnMapping,
  type Delimiter,
  type DelimitedRow,
} from "./csv";

export type ProgramImportField =
  | "week"
  | "day"
  | "session_title"
  | "session_type"
  | "session_duration"
  | "exercise"
  | "category"
  | "set_no"
  | "reps"
  | "duration_sec"
  | "load"
  | "load_type"
  | "rpe"
  | "rest_sec"
  | "superset"
  | "notes"
  | "set_notes";

export const PROGRAM_IMPORT_ALIASES: Record<ProgramImportField, readonly string[]> = {
  week: ["hafta", "week", "hafta no", "hafta_no"],
  day: ["gun", "gün", "day", "gun no", "haftanin gunu"],
  session_title: ["seans", "seans basligi", "seans başlığı", "session", "baslik", "başlık", "antrenman"],
  session_type: ["seans tipi", "tip", "session_type", "tur", "tür"],
  session_duration: ["seans suresi", "seans süresi", "sure dk", "süre dk", "duration_min", "seans dk"],
  exercise: ["egzersiz", "hareket", "exercise", "egzersiz adi", "egzersiz adı"],
  category: ["kategori", "category"],
  set_no: ["set", "set no", "set_no", "set sira", "set sırası", "set_number"],
  reps: ["tekrar", "tekrar sayisi", "reps", "rep"],
  duration_sec: ["sure sn", "süre sn", "saniye", "duration_sec", "sure saniye"],
  load: ["yuk", "yük", "load", "agirlik", "ağırlık", "kg"],
  load_type: ["yuk tipi", "yük tipi", "load_type", "yuk birimi", "birim"],
  rpe: ["rpe", "zorluk"],
  rest_sec: ["dinlenme", "dinlenme sn", "rest", "rest_sec", "dinlenme saniye"],
  superset: ["superset", "süperset", "superset grubu", "süperset grubu", "superset_group"],
  notes: ["not", "notlar", "notes", "aciklama", "açıklama", "egzersiz notu"],
  set_notes: ["set notu", "set_notu", "set notes", "set aciklama"],
};

const REQUIRED_COLUMNS: { field: ProgramImportField; label: string }[] = [
  { field: "day", label: "Gün" },
  { field: "exercise", label: "Egzersiz" },
];

// --- RPC payload şekli (insert_sessions_tree'nin okuduğu anahtarlar) --------

export type ImportedSet = {
  set_number: number;
  reps: number | null;
  duration_sec: number | null;
  load_kg: number | null;
  percent_1rm: number | null;
  rpe: number | null;
  is_bodyweight: boolean;
  band_resistance: string | null;
  notes: string | null;
};

export type ImportedExercise = {
  name: string;
  category: string | null;
  rest_sec: number | null;
  notes: string | null;
  order_index: number;
  superset_group: string | null;
  superset_order: number;
  movement_detail: null;
  sets: ImportedSet[];
};

export type ImportedSession = {
  day_of_week: number;
  session_type: string | null;
  title: string | null;
  description: null;
  duration_min: number | null;
  order_index: number;
  workout_format: null;
  time_cap_sec: null;
  rounds: null;
  work_sec: null;
  interval_rest_sec: null;
  exercises: ImportedExercise[];
};

export interface ImportedWeek {
  /** Blok içindeki sıra, her zaman 1..N ve aralıksız. */
  week: number;
  /** Dosyada yazan hafta numarası — atlanmış hafta varsa kullanıcıya gösterilir. */
  source_week: number;
  sessions: ImportedSession[];
}

export interface ProgramRowIssue {
  line: number;
  errors: string[];
  warnings: string[];
}

export interface ProgramImportResult {
  weeks: ImportedWeek[];
  rowIssues: ProgramRowIssue[];
  unknownColumns: string[];
  missingColumns: string[];
  fatalError: string | null;
  /** Dosya seviyesi uyarılar (hafta atlaması, tekrar eden set no vb.). */
  warnings: string[];
  errorCount: number;
  totals: { weeks: number; sessions: number; exercises: number; sets: number };
}

// --- Değer sözlükleri ------------------------------------------------------

const DAY_MAP: Record<string, number> = {
  pazartesi: 1, pzt: 1, pt: 1, monday: 1, mon: 1,
  sali: 2, sal: 2, tuesday: 2, tue: 2,
  carsamba: 3, car: 3, wednesday: 3, wed: 3,
  persembe: 4, per: 4, thursday: 4, thu: 4,
  cuma: 5, cum: 5, friday: 5, fri: 5,
  cumartesi: 6, cmt: 6, saturday: 6, sat: 6,
  pazar: 7, paz: 7, sunday: 7, sun: 7,
};

const SESSION_TYPE_MAP: Record<string, string> = {
  kuvvet: "strength", strength: "strength", guc: "strength",
  kondisyon: "conditioning", conditioning: "conditioning", dayaniklilik: "conditioning", kardiyo: "conditioning",
  teknik: "technical", technical: "technical",
  toparlanma: "recovery", recovery: "recovery", rejenerasyon: "recovery",
  musabaka: "competition", competition: "competition", mac: "competition", yarisma: "competition",
};

type LoadKind = "kg" | "percent_1rm" | "bodyweight" | "band";

const LOAD_TYPE_MAP: Record<string, LoadKind> = {
  kg: "kg", kilo: "kg", agirlik: "kg", absolute: "kg", mutlak: "kg",
  "1rm": "percent_1rm", percent: "percent_1rm", yuzde: "percent_1rm", yuzde1rm: "percent_1rm",
  vucutagirligi: "bodyweight", va: "bodyweight", bw: "bodyweight", bodyweight: "bodyweight", serbest: "bodyweight",
  bant: "band", band: "band", lastik: "band", direncbandi: "band",
};

const BAND_MAP: Record<string, string> = {
  yumusak: "soft", soft: "soft", hafif: "soft", ince: "soft",
  orta: "medium", medium: "medium", normal: "medium",
  sert: "hard", hard: "hard", kalin: "hard", agir: "hard",
};

function fold(raw: string): string {
  return (trFold(raw) ?? "").replace(/[^a-z0-9]/g, "");
}

function parseDay(raw: string): number | null {
  if (raw === "") return null;
  const n = parseInteger(raw);
  if (n !== null && n >= 1 && n <= 7) return n;
  return DAY_MAP[fold(raw)] ?? null;
}

function parseSessionType(raw: string): string | null | undefined {
  if (raw === "") return null;
  return SESSION_TYPE_MAP[fold(raw)];
}

/**
 * Yük hücresini exercise_sets kolonlarına çevirir. Tip sütunu boşsa değerin
 * kendisinden çıkarılır: "%70" → 1RM yüzdesi, "60" → kg, "vücut ağırlığı" →
 * bodyweight, "orta" → direnç bandı. Hiç yük yazılmamışsa hepsi null kalır
 * (exercise_sets'te yük kolonlarının tamamı nullable — yüksüz set geçerlidir).
 */
function parseLoad(
  loadRaw: string,
  typeRaw: string
): { columns: Pick<ImportedSet, "load_kg" | "percent_1rm" | "is_bodyweight" | "band_resistance">; error: string | null } {
  const none = { load_kg: null, percent_1rm: null, is_bodyweight: false, band_resistance: null };

  let kind: LoadKind | null = null;
  if (typeRaw !== "") {
    kind = LOAD_TYPE_MAP[fold(typeRaw)] ?? null;
    if (kind === null) {
      return { columns: none, error: `Yük tipi tanınmadı: "${typeRaw}" (kg / %1RM / Vücut Ağırlığı / Bant)` };
    }
  }

  if (loadRaw === "") {
    // Tip "vücut ağırlığı" ise değer beklenmiyor; diğerlerinde yük yok demektir.
    if (kind === "bodyweight") return { columns: { ...none, is_bodyweight: true }, error: null };
    return { columns: none, error: null };
  }

  const foldedLoad = fold(loadRaw);
  if (kind === null) {
    if (loadRaw.includes("%")) kind = "percent_1rm";
    else if (LOAD_TYPE_MAP[foldedLoad] === "bodyweight") kind = "bodyweight";
    else if (BAND_MAP[foldedLoad]) kind = "band";
    else kind = "kg";
  }

  if (kind === "bodyweight") {
    return { columns: { ...none, is_bodyweight: true }, error: null };
  }

  if (kind === "band") {
    const band = BAND_MAP[foldedLoad];
    if (!band) {
      return { columns: none, error: `Direnç bandı seviyesi tanınmadı: "${loadRaw}" (Yumuşak / Orta / Sert)` };
    }
    return { columns: { ...none, band_resistance: band }, error: null };
  }

  const value = parseNumber(loadRaw);
  if (value === null) {
    return { columns: none, error: `Yük sayı değil: "${loadRaw}"` };
  }
  if (kind === "percent_1rm") {
    if (value <= 0 || value > 100) {
      return { columns: none, error: `1RM yüzdesi 0-100 aralığında olmalı: "${loadRaw}"` };
    }
    return { columns: { ...none, percent_1rm: value }, error: null };
  }
  if (value <= 0) {
    return { columns: none, error: `Yük pozitif olmalı: "${loadRaw}"` };
  }
  return { columns: { ...none, load_kg: value }, error: null };
}

// --- Satır okuma -----------------------------------------------------------

interface ParsedRow {
  line: number;
  week: number;
  day: number;
  sessionTitle: string;
  sessionType: string | null;
  sessionDuration: number | null;
  exercise: string;
  category: string | null;
  setNo: number | null;
  set: Omit<ImportedSet, "set_number">;
  restSec: number | null;
  superset: string | null;
  exerciseNotes: string | null;
}

function readRow(
  row: DelimitedRow,
  mapping: ColumnMapping<ProgramImportField>
): { parsed: ParsedRow | null; issue: ProgramRowIssue } {
  const read = (field: ProgramImportField) => cell(row, mapping, field);
  const errors: string[] = [];
  const warnings: string[] = [];

  const weekRaw = read("week");
  let week = 1;
  if (weekRaw !== "") {
    const w = parseInteger(weekRaw);
    if (w === null || w < 1) errors.push(`Hafta geçersiz: "${weekRaw}"`);
    else week = w;
  }

  const dayRaw = read("day");
  const day = parseDay(dayRaw);
  if (day === null) {
    errors.push(`Gün okunamadı: "${dayRaw}" (1-7 veya Pzt/Sal/Çar/Per/Cum/Cmt/Paz)`);
  }

  const sessionTypeParsed = parseSessionType(read("session_type"));
  if (sessionTypeParsed === undefined) {
    errors.push(
      `Seans tipi tanınmadı: "${read("session_type")}" (Kuvvet / Kondisyon / Teknik / Toparlanma / Müsabaka)`
    );
  }

  const durationRaw = read("session_duration");
  const sessionDuration = parseInteger(durationRaw);
  if (durationRaw !== "" && sessionDuration === null) {
    errors.push(`Seans süresi sayı değil: "${durationRaw}"`);
  }

  const exercise = read("exercise");
  if (exercise === "") errors.push("Egzersiz adı boş");

  const setNoRaw = read("set_no");
  let setNo: number | null = null;
  if (setNoRaw !== "") {
    const s = parseInteger(setNoRaw);
    if (s === null || s < 1) errors.push(`Set no geçersiz: "${setNoRaw}"`);
    else setNo = s;
  }

  const repsRaw = read("reps");
  const reps = parseInteger(repsRaw);
  if (repsRaw !== "" && (reps === null || reps < 1)) {
    errors.push(`Tekrar geçersiz: "${repsRaw}"`);
  }

  const durSecRaw = read("duration_sec");
  const durationSec = parseInteger(durSecRaw);
  if (durSecRaw !== "" && (durationSec === null || durationSec < 1)) {
    errors.push(`Süre (sn) geçersiz: "${durSecRaw}"`);
  }

  // exercise-list.tsx'teki exerciseSchema ile aynı kural: her setin ya tekrarı
  // ya süresi olmalı — ikisi de boşsa program builder da reddederdi.
  if (repsRaw === "" && durSecRaw === "") {
    errors.push("Tekrar veya Süre (sn) sütunlarından biri dolu olmalı");
  } else if (reps !== null && durationSec !== null) {
    warnings.push("Hem tekrar hem süre yazılmış — tekrar kullanılacak");
  }

  const load = parseLoad(read("load"), read("load_type"));
  if (load.error) errors.push(load.error);

  const rpeRaw = read("rpe");
  const rpe = parseNumber(rpeRaw);
  if (rpeRaw !== "" && (rpe === null || rpe < 1 || rpe > 10)) {
    errors.push(`RPE 1-10 aralığında olmalı: "${rpeRaw}"`);
  }

  const restRaw = read("rest_sec");
  const restSec = parseInteger(restRaw);
  if (restRaw !== "" && (restSec === null || restSec < 0)) {
    errors.push(`Dinlenme (sn) geçersiz: "${restRaw}"`);
  }

  const issue: ProgramRowIssue = { line: row.line, errors, warnings };
  if (errors.length > 0 || day === null) {
    return { parsed: null, issue };
  }

  return {
    issue,
    parsed: {
      line: row.line,
      week,
      day,
      sessionTitle: read("session_title"),
      sessionType: sessionTypeParsed ?? null,
      sessionDuration,
      exercise,
      category: read("category") || null,
      setNo,
      restSec,
      superset: read("superset") || null,
      exerciseNotes: read("notes") || null,
      set: {
        // Tekrar varsa süre alanı boşaltılır — exercise_sets'te ikisi birden
        // dolduğunda hangisinin geçerli olduğu belirsiz kalırdı.
        reps: reps ?? null,
        duration_sec: reps !== null ? null : durationSec,
        rpe: rpe ?? null,
        notes: read("set_notes") || null,
        ...load.columns,
      },
    },
  };
}

// --- Ağaç kurulumu ---------------------------------------------------------

function buildWeeks(rows: ParsedRow[], warnings: string[]): ImportedWeek[] {
  const byWeek = new Map<number, ParsedRow[]>();
  for (const row of rows) {
    const list = byWeek.get(row.week);
    if (list) list.push(row);
    else byWeek.set(row.week, [row]);
  }

  const sourceWeeks = Array.from(byWeek.keys()).sort((a, b) => a - b);
  const expected = sourceWeeks.map((_, i) => i + 1);
  if (sourceWeeks.some((w, i) => w !== expected[i])) {
    warnings.push(
      `Hafta numaraları ardışık değil (${sourceWeeks.join(", ")}) — blokta sırasıyla ${expected.join(
        ", "
      )}. hafta olarak oluşturulacak.`
    );
  }

  return sourceWeeks.map((sourceWeek, weekIdx) => ({
    week: weekIdx + 1,
    source_week: sourceWeek,
    sessions: buildSessions(byWeek.get(sourceWeek) ?? [], warnings),
  }));
}

function buildSessions(rows: ParsedRow[], warnings: string[]): ImportedSession[] {
  // Seans kimliği = (gün, seans başlığı). Başlık sütunu yoksa günde tek seans.
  const order: string[] = [];
  const groups = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    const key = `${row.day}|${fold(row.sessionTitle)}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else {
      groups.set(key, [row]);
      order.push(key);
    }
  }

  // Aynı gün içindeki seanslar dosyadaki sırayı korur; günler arası sıralama
  // haftanın gününe göredir (program builder'ın gösterdiği sıra).
  // Dosya sırası ÖNCE sabitlenir — `order` yerinde sıralandığı için
  // karşılaştırıcının içinde indexOf çağırmak kendi girdisini bozardı.
  const fileOrder = new Map(order.map((key, i) => [key, i]));
  const sortedKeys = [...order].sort((a, b) => {
    const dayA = Number(a.split("|")[0]);
    const dayB = Number(b.split("|")[0]);
    if (dayA !== dayB) return dayA - dayB;
    return (fileOrder.get(a) ?? 0) - (fileOrder.get(b) ?? 0);
  });

  return sortedKeys.flatMap((key, sessionIdx) => {
    const group = groups.get(key);
    const first = group?.[0];
    // Anahtarlar groups'tan türediği için grup her zaman doludur; bu kontrol
    // yalnızca tip daraltması (noUncheckedIndexedAccess) içindir.
    if (!group || !first) return [];
    return [{
      day_of_week: first.day,
      session_type: first.sessionType,
      title: first.sessionTitle || null,
      description: null,
      duration_min: first.sessionDuration,
      order_index: sessionIdx,
      workout_format: null,
      time_cap_sec: null,
      rounds: null,
      work_sec: null,
      interval_rest_sec: null,
      exercises: buildExercises(group, warnings),
    }];
  });
}

function buildExercises(rows: ParsedRow[], warnings: string[]): ImportedExercise[] {
  // ARDIŞIK aynı-isimli satırlar tek egzersizdir. Aynı isim seansın ilerisinde
  // tekrar geçerse (örn. süperset turu) AYRI bir egzersiz olarak eklenir —
  // koçun dosyada yazdığı sıra korunur.
  const exercises: ImportedExercise[] = [];
  let current: { key: string; first: ParsedRow; rows: ParsedRow[] } | null = null;

  for (const row of rows) {
    const key = fold(row.exercise);
    if (current && current.key === key) {
      current.rows.push(row);
    } else {
      if (current) exercises.push(toExercise(current.first, current.rows, exercises.length, warnings));
      current = { key, first: row, rows: [row] };
    }
  }
  if (current) exercises.push(toExercise(current.first, current.rows, exercises.length, warnings));

  return exercises;
}

function toExercise(
  first: ParsedRow,
  rows: ParsedRow[],
  orderIndex: number,
  warnings: string[]
): ImportedExercise {
  const seenSetNos = new Set<number>();
  const sets: ImportedSet[] = rows.map((row, i) => {
    let setNumber = row.setNo ?? i + 1;
    if (seenSetNos.has(setNumber)) {
      warnings.push(
        `Satır ${row.line}: "${first.exercise}" için ${setNumber}. set tekrar ediyor — ${i + 1}. set olarak alındı.`
      );
      setNumber = i + 1;
    }
    seenSetNos.add(setNumber);
    return { set_number: setNumber, ...row.set };
  });

  return {
    name: first.exercise,
    category: first.category,
    // Dinlenme/not/süperset egzersiz seviyesindedir — ilk setin satırından alınır.
    rest_sec: rows.find((r) => r.restSec !== null)?.restSec ?? null,
    notes: rows.find((r) => r.exerciseNotes !== null)?.exerciseNotes ?? null,
    order_index: orderIndex,
    superset_group: first.superset,
    superset_order: 0,
    movement_detail: null,
    sets,
  };
}

// --- Genel giriş noktası ---------------------------------------------------

export function parseProgramImport(text: string, delimiter?: Delimiter): ProgramImportResult {
  const empty = (
    fatalError: string | null,
    missingColumns: string[] = []
  ): ProgramImportResult => ({
    weeks: [],
    rowIssues: [],
    unknownColumns: [],
    missingColumns,
    fatalError,
    warnings: [],
    errorCount: 0,
    totals: { weeks: 0, sessions: 0, exercises: 0, sets: 0 },
  });

  if (text.trim() === "") return empty("Dosya boş.");

  const table = parseTable(text, delimiter);
  if (table.headers.length === 0) return empty("Dosyada okunabilir bir başlık satırı yok.");

  const mapping: ColumnMapping<ProgramImportField> = mapColumns(
    table.headers,
    PROGRAM_IMPORT_ALIASES
  );

  const missingColumns = REQUIRED_COLUMNS.filter((c) => mapping.index[c.field] === undefined).map(
    (c) => c.label
  );
  if (missingColumns.length > 0) return empty(null, missingColumns);

  if (table.rows.length === 0) return empty("Başlık satırı var ama hiç veri satırı yok.");

  const rowIssues: ProgramRowIssue[] = [];
  const parsedRows: ParsedRow[] = [];

  for (const row of table.rows) {
    const { parsed, issue } = readRow(row, mapping);
    if (issue.errors.length > 0 || issue.warnings.length > 0) rowIssues.push(issue);
    if (parsed) parsedRows.push(parsed);
  }

  const errorCount = rowIssues.filter((i) => i.errors.length > 0).length;
  const warnings: string[] = [];

  // Hatalı satır varsa ağaç yine de kurulur — önizleme "hatalar düzeltilirse ne
  // olacağını" değil, ELDEKİ GEÇERLİ satırların karşılığını gösterir; UI hata
  // varken içe aktarmayı engeller.
  const weeks = parsedRows.length > 0 ? buildWeeks(parsedRows, warnings) : [];

  const totals = weeks.reduce(
    (acc, w) => {
      acc.sessions += w.sessions.length;
      for (const s of w.sessions) {
        acc.exercises += s.exercises.length;
        for (const e of s.exercises) acc.sets += e.sets.length;
      }
      return acc;
    },
    { weeks: weeks.length, sessions: 0, exercises: 0, sets: 0 }
  );

  return {
    weeks,
    rowIssues,
    unknownColumns: mapping.unknown,
    missingColumns: [],
    fatalError: null,
    warnings,
    errorCount,
    totals,
  };
}

/**
 * İki haftanın içeriği birebir aynı mı. create_program_with_weeks tek bir
 * p_sessions'ı N haftaya klonlar; haftalar farklıysa 2..N için ayrıca
 * update_program_week çağrılması gerekir. Bu karşılaştırma o kararı verir.
 */
export function sessionsEqual(a: ImportedSession[], b: ImportedSession[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** İndirilebilir örnek dosya — kullanıcı sütun adlarını buradan görür. */
export function programImportTemplateCsv(delimiter: Delimiter = ";"): string {
  return toCsv(
    [
      [
        "Hafta",
        "Gün",
        "Seans",
        "Seans Tipi",
        "Egzersiz",
        "Set",
        "Tekrar",
        "Süre (sn)",
        "Yük",
        "Yük Tipi",
        "RPE",
        "Dinlenme (sn)",
        "Süperset",
        "Not",
      ],
      ["1", "1", "Alt Vücut", "Kuvvet", "Back Squat", "1", "8", "", "60", "%1RM", "6", "120", "", ""],
      ["1", "1", "Alt Vücut", "Kuvvet", "Back Squat", "2", "6", "", "70", "%1RM", "7", "120", "", ""],
      ["1", "1", "Alt Vücut", "Kuvvet", "Back Squat", "3", "4", "", "80", "%1RM", "8,5", "120", "", "Son set patlayıcı"],
      ["1", "1", "Alt Vücut", "Kuvvet", "Romanian Deadlift", "1", "10", "", "60", "kg", "", "90", "A", ""],
      ["1", "3", "Üst Vücut", "Kuvvet", "Bench Press", "1", "5", "", "80", "%1RM", "8", "180", "", ""],
      ["1", "5", "Kondisyon", "Kondisyon", "Plank", "1", "", "45", "", "Vücut Ağırlığı", "", "60", "", ""],
      ["2", "1", "Alt Vücut", "Kuvvet", "Back Squat", "1", "6", "", "75", "%1RM", "7", "120", "", ""],
    ],
    delimiter
  );
}
