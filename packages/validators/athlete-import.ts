/**
 * Sporcu listesi içe aktarma — SAF ayrıştırma + doğrulama katmanı.
 *
 * Bu dosya hiçbir şey YAZMAZ: CSV/TSV metnini alır, her satırı `athletes`
 * tablosuna yazılmaya hazır bir taslağa çevirir ve satır bazında hata/uyarı
 * üretir. Asıl yazma işini web tarafı yapar (kadro satırları RLS ile doğrudan
 * insert, giriş hesabı istenen satırlar create-athlete-account Edge Function'ı
 * üzerinden) — böylece içe aktarma, elle "Sporcu Ekle" formunun geçtiği aynı
 * yetki yollarından geçer, yeni bir ayrıcalıklı yol açılmaz.
 *
 * Doğrulama kuralları `createAthleteSchema` (athlete.ts) ile aynı hizada
 * tutulur; kullanıcı adı kuralı ATHLETE_USERNAME_RE'den, şifre üretimi
 * generateTempPassword'den yeniden kullanılır — ikinci bir kural seti
 * İCAT EDİLMEZ.
 */

import {
  ATHLETE_USERNAME_RE,
  generateTempPassword,
  suggestUsername,
  trFold,
} from "./athlete";
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

export type AthleteImportField =
  | "full_name"
  | "team"
  | "birth_date"
  | "gender"
  | "height_cm"
  | "weight_kg"
  | "position"
  | "training_group"
  | "notes"
  | "username"
  | "password";

/**
 * Başlık eşanlamlıları. normalizeHeaderKey uygulandığı için büyük/küçük harf,
 * Türkçe karakter ve ayırıcı işaretleri önemsizdir — "Ad Soyad", "ad_soyad" ve
 * "AD-SOYAD" aynı sütuna düşer.
 */
export const ATHLETE_IMPORT_ALIASES: Record<AthleteImportField, readonly string[]> = {
  full_name: ["ad soyad", "adsoyad", "ad", "isim", "ad ve soyad", "full_name", "name", "sporcu"],
  team: ["takim", "takım", "team", "takim adi", "takım adı"],
  birth_date: ["dogum tarihi", "doğum tarihi", "dogumtarihi", "birth_date", "dob", "tarih"],
  gender: ["cinsiyet", "gender", "sex"],
  height_cm: ["boy", "boy cm", "height", "height_cm", "boy (cm)"],
  weight_kg: ["kilo", "kilo kg", "agirlik", "ağırlık", "weight", "weight_kg", "kilo (kg)"],
  position: ["mevki", "pozisyon", "position"],
  training_group: ["antrenman grubu", "grup", "training_group", "group"],
  notes: ["not", "notlar", "notes", "aciklama", "açıklama"],
  username: ["kullanici adi", "kullanıcı adı", "kullanici", "username", "kullanici_adi"],
  password: ["sifre", "şifre", "parola", "password"],
};

/** Zorunlu sütunlar — dosyada yoksa hiçbir satır işlenemez. */
const REQUIRED_COLUMNS: { field: AthleteImportField; label: string }[] = [
  { field: "full_name", label: "Ad Soyad" },
];

export type ImportGender = "male" | "female" | "other";

export interface AthleteImportRow {
  /** Dosyadaki 1 tabanlı satır numarası (başlık satırı 1'dir). */
  line: number;
  full_name: string;
  /** Çözümlenmiş takım; çözümlenemediyse null ve errors dolu olur. */
  team_id: string | null;
  /** Kullanıcıya gösterilecek takım etiketi (çözümlendiyse takım adı, aksi halde ham metin). */
  team_label: string;
  birth_date: string | null;
  gender: ImportGender | null;
  height_cm: number | null;
  weight_kg: number | null;
  position: string | null;
  training_group: string | null;
  notes: string | null;
  /** Giriş hesabı istenen satırlarda dolu; aksi halde null. */
  username: string | null;
  /** username doluyken her zaman dolu (dosyada yoksa otomatik üretilir). */
  password: string | null;
  /** Şifre dosyada verilmeyip burada üretildiyse true — sonuç ekranı bunu ayrıca vurgular. */
  password_generated: boolean;
  /** Satır bir auth hesabı da oluşturacak mı. */
  create_login: boolean;
  /** Satır içe aktarılamaz (kırmızı) — en az bir hata varsa. */
  errors: string[];
  /** Satır aktarılır ama dikkat gerektirir (sarı). */
  warnings: string[];
}

export interface AthleteImportResult {
  rows: AthleteImportRow[];
  /** Hiçbir kanonik alana eşlenemeyen başlıklar — sessizce yok sayıldıkları bildirilir. */
  unknownColumns: string[];
  /** Dosyada bulunamayan zorunlu sütun etiketleri. Doluysa rows boştur. */
  missingColumns: string[];
  /** Dosya hiç okunamadıysa (boş / başlıksız) tek cümlelik sebep. */
  fatalError: string | null;
  validCount: number;
  errorCount: number;
  loginCount: number;
}

export interface AthleteImportContext {
  teams: { id: string; name: string }[];
  /** "Takım" sütunu olmayan satırlar buraya düşer. null ise takım sütunu zorunlu olur. */
  defaultTeamId: string | null;
  /** Aynı isimde sporcu zaten var mı uyarısı için — org'un mevcut kadrosu. */
  existingAthletes?: { full_name: string; team_id: string | null }[];
  /** Zaten alınmış kullanıcı adları (profiles/athletes) — çakışma önceden yakalanır. */
  existingUsernames?: string[];
}

const GENDER_MAP: Record<string, ImportGender> = {
  erkek: "male",
  e: "male",
  male: "male",
  m: "male",
  bay: "male",
  kadin: "female",
  k: "female",
  female: "female",
  f: "female",
  bayan: "female",
  kiz: "female",
  diger: "other",
  other: "other",
  o: "other",
};

function parseGender(raw: string): ImportGender | null | undefined {
  const key = trFold(raw);
  if (!key) return null;
  // undefined = "yazılmış ama tanınmadı" (hata), null = "boş bırakılmış" (sorun değil).
  return GENDER_MAP[key.replace(/[^a-z]/g, "")] ?? undefined;
}

function nonEmpty(value: string): string | null {
  return value === "" ? null : value;
}

function resolveTeam(
  raw: string,
  ctx: AthleteImportContext
): { id: string | null; label: string; error: string | null } {
  if (raw === "") {
    if (ctx.defaultTeamId) {
      const name = ctx.teams.find((t) => t.id === ctx.defaultTeamId)?.name ?? "";
      return { id: ctx.defaultTeamId, label: name, error: null };
    }
    return { id: null, label: "", error: "Takım boş — dosyada takım sütunu yok ve hedef takım seçilmedi" };
  }

  const folded = trFold(raw);
  const match = ctx.teams.find((t) => trFold(t.name) === folded);
  if (match) return { id: match.id, label: match.name, error: null };

  const known = ctx.teams.map((t) => t.name).join(", ");
  return {
    id: null,
    label: raw,
    error: `"${raw}" adında bir takım yok${known ? ` (mevcut: ${known})` : ""}`,
  };
}

function readRow(
  line: number,
  read: (field: AthleteImportField) => string,
  ctx: AthleteImportContext,
  hasUsernameColumn: boolean
): AthleteImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const full_name = read("full_name");
  if (full_name.length < 2) {
    errors.push("Ad Soyad boş veya çok kısa (en az 2 karakter)");
  }

  const team = resolveTeam(read("team"), ctx);
  if (team.error) errors.push(team.error);

  const birthRaw = read("birth_date");
  const birth_date = parseDate(birthRaw);
  if (birthRaw !== "" && birth_date === null) {
    errors.push(`Doğum tarihi okunamadı: "${birthRaw}" (GG.AA.YYYY veya YYYY-AA-GG bekleniyor)`);
  }

  const genderRaw = read("gender");
  const genderParsed = parseGender(genderRaw);
  if (genderParsed === undefined) {
    errors.push(`Cinsiyet okunamadı: "${genderRaw}" (Erkek / Kadın / Diğer bekleniyor)`);
  }

  const heightRaw = read("height_cm");
  const height_cm = parseNumber(heightRaw);
  if (heightRaw !== "" && height_cm === null) {
    errors.push(`Boy sayı değil: "${heightRaw}"`);
  } else if (height_cm !== null && (height_cm < 80 || height_cm > 250)) {
    warnings.push(`Boy alışılmadık: ${height_cm} cm`);
  }

  const weightRaw = read("weight_kg");
  const weight_kg = parseNumber(weightRaw);
  if (weightRaw !== "" && weight_kg === null) {
    errors.push(`Kilo sayı değil: "${weightRaw}"`);
  } else if (weight_kg !== null && (weight_kg < 20 || weight_kg > 250)) {
    warnings.push(`Kilo alışılmadık: ${weight_kg} kg`);
  }

  // --- Giriş hesabı (opsiyonel) -------------------------------------------
  // Kural: yalnızca "kullanıcı adı" sütunu dolu olan satır için hesap açılır.
  // Sütun hiç yoksa dosyanın tamamı kadro-only'dir.
  let username: string | null = null;
  let password: string | null = null;
  let password_generated = false;

  const usernameRaw = read("username");
  const passwordRaw = read("password");

  if (hasUsernameColumn && usernameRaw !== "") {
    const candidate = usernameRaw.toLowerCase();
    if (!ATHLETE_USERNAME_RE.test(candidate)) {
      const suggestion = suggestUsername(usernameRaw) || suggestUsername(full_name);
      errors.push(
        `Kullanıcı adı geçersiz: "${usernameRaw}" — yalnızca küçük harf, rakam, nokta, alt çizgi (3-30)` +
          (suggestion ? `. Öneri: ${suggestion}` : "")
      );
    } else {
      username = candidate;
      if ((ctx.existingUsernames ?? []).some((u) => u.toLowerCase() === candidate)) {
        errors.push(`Kullanıcı adı zaten alınmış: ${candidate}`);
      }
    }

    if (passwordRaw === "") {
      password = generateTempPassword();
      password_generated = true;
    } else if (passwordRaw.length < 6) {
      errors.push("Şifre en az 6 karakter olmalı");
    } else {
      password = passwordRaw;
    }
  } else if (passwordRaw !== "") {
    warnings.push("Şifre yazılmış ama kullanıcı adı boş — giriş hesabı oluşturulmayacak");
  }

  const create_login = username !== null && password !== null;

  // Aynı isimde mevcut sporcu — engel değil, uyarı (aynı adlı iki sporcu olabilir).
  const foldedName = trFold(full_name);
  const duplicate = (ctx.existingAthletes ?? []).some(
    (a) => trFold(a.full_name) === foldedName && a.team_id === team.id
  );
  if (duplicate) {
    warnings.push("Bu takımda aynı isimde bir sporcu zaten var — yine de eklenecek");
  }

  return {
    line,
    full_name,
    team_id: team.id,
    team_label: team.label,
    birth_date,
    gender: genderParsed ?? null,
    height_cm,
    weight_kg,
    position: nonEmpty(read("position")),
    training_group: nonEmpty(read("training_group")),
    notes: nonEmpty(read("notes")),
    username,
    password,
    password_generated,
    create_login,
    errors,
    warnings,
  };
}

export function parseAthleteImport(
  text: string,
  ctx: AthleteImportContext,
  delimiter?: Delimiter
): AthleteImportResult {
  const empty = (fatalError: string | null, missingColumns: string[] = []): AthleteImportResult => ({
    rows: [],
    unknownColumns: [],
    missingColumns,
    fatalError,
    validCount: 0,
    errorCount: 0,
    loginCount: 0,
  });

  if (text.trim() === "") return empty("Dosya boş.");

  const table = parseTable(text, delimiter);
  if (table.headers.length === 0) return empty("Dosyada okunabilir bir başlık satırı yok.");

  const mapping: ColumnMapping<AthleteImportField> = mapColumns(
    table.headers,
    ATHLETE_IMPORT_ALIASES
  );

  const missingColumns = REQUIRED_COLUMNS.filter(
    (c) => mapping.index[c.field] === undefined
  ).map((c) => c.label);

  if (missingColumns.length > 0) {
    return empty(null, missingColumns);
  }

  if (table.rows.length === 0) {
    return empty("Başlık satırı var ama hiç veri satırı yok.");
  }

  const hasUsernameColumn = mapping.index.username !== undefined;

  const rows = table.rows.map((row) =>
    readRow(row.line, (field) => cell(row, mapping, field), ctx, hasUsernameColumn)
  );

  // Dosya İÇİNDEKİ tekrarlar — aynı kullanıcı adı iki satırda olursa ikincisi
  // Edge Function'da 409 alırdı; önceden hata olarak işaretlenir.
  const seenUsernames = new Map<string, number>();
  const seenNames = new Map<string, number>();
  for (const row of rows) {
    if (row.username) {
      const first = seenUsernames.get(row.username);
      if (first !== undefined) {
        row.errors.push(`Kullanıcı adı dosyada tekrar ediyor (ilk kullanım: satır ${first})`);
      } else {
        seenUsernames.set(row.username, row.line);
      }
    }
    const nameKey = `${trFold(row.full_name)}|${row.team_id ?? ""}`;
    const firstName = seenNames.get(nameKey);
    if (firstName !== undefined) {
      row.warnings.push(`Aynı isim dosyada tekrar ediyor (satır ${firstName})`);
    } else {
      seenNames.set(nameKey, row.line);
    }
  }

  const errorCount = rows.filter((r) => r.errors.length > 0).length;

  return {
    rows,
    unknownColumns: mapping.unknown,
    missingColumns: [],
    fatalError: null,
    validCount: rows.length - errorCount,
    errorCount,
    loginCount: rows.filter((r) => r.errors.length === 0 && r.create_login).length,
  };
}

/** İndirilebilir örnek dosya — kullanıcı sütun adlarını buradan görür. */
export function athleteImportTemplateCsv(delimiter: Delimiter = ";"): string {
  return toCsv(
    [
      [
        "Ad Soyad",
        "Takım",
        "Doğum Tarihi",
        "Cinsiyet",
        "Boy",
        "Kilo",
        "Mevki",
        "Antrenman Grubu",
        "Notlar",
        "Kullanıcı Adı",
        "Şifre",
      ],
      [
        "Ahmet Yılmaz",
        "ACE",
        "12.04.2004",
        "Erkek",
        "182",
        "84,5",
        "Tight End",
        "Hücum Hattı",
        "",
        "ahmet.yilmaz",
        "",
      ],
      ["Elif Demir", "ACE", "2006-09-01", "Kadın", "168", "57", "Skill", "", "", "", ""],
    ],
    delimiter
  );
}
