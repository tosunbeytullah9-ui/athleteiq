import { z } from "zod";

const optionalNumber = z
  .union([z.number(), z.nan()])
  .optional()
  .nullable()
  .transform((v) => (v == null || (typeof v === "number" && isNaN(v)) ? null : v));

// supabase/functions/create-athlete-account/index.ts (USERNAME_RE) ile birebir aynı olmalı.
export const ATHLETE_USERNAME_RE = /^[a-z0-9._]{3,30}$/;

// packages/validators/exercise.ts (normalizeExerciseName) tarafından da yeniden
// kullanılıyor — Türkçe karakter foldlamayı proje genelinde tek yerde tut.
export const TR_CHAR_MAP: Record<string, string> = {
  İ: "i",
  I: "i",
  ı: "i",
  Ç: "c",
  ç: "c",
  Ğ: "g",
  ğ: "g",
  Ö: "o",
  ö: "o",
  Ş: "s",
  ş: "s",
  Ü: "u",
  ü: "u",
};

// Tam adı ATHLETE_USERNAME_RE'yi geçen bir kullanıcı adı önerisine çevirir.
// Türkçe karakterler toLowerCase()'den ÖNCE case-sensitive map edilir — aksi halde
// "İ".toLowerCase() === "i̇" (nokta + combining dot above) gibi beklenmeyen sonuçlar çıkar.
export function suggestUsername(fullName: string): string {
  const mapped = fullName.replace(/[İIıÇçĞğÖöŞşÜü]/g, (ch) => TR_CHAR_MAP[ch] ?? ch);
  const base = mapped
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 30);
  return base.length >= 3 ? base : "";
}

const TEMP_PASSWORD_CHARS =
  "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"; // 0 O o 1 l I hariç (karıştırılabilir)
const TEMP_PASSWORD_LENGTH = 10;

// Koçun sporcuya sözlü ileteceği geçici bir şifre üretir — karıştırılabilir karakterler yok.
export function generateTempPassword(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(TEMP_PASSWORD_LENGTH));
  return Array.from(bytes, (b) => TEMP_PASSWORD_CHARS[b % TEMP_PASSWORD_CHARS.length]).join("");
}

const createAthleteBaseSchema = z.object({
  full_name: z.string().min(2, "Ad en az 2 karakter olmalı"),
  team_id: z.string().uuid("Geçerli takım seçin"),
  birth_date: z.string().optional().transform((v) => v || null),
  gender: z
    .string()
    .optional()
    .transform((v) => (v === "" ? null : v) as "male" | "female" | "other" | null),
  height_cm: optionalNumber,
  weight_kg: optionalNumber,
  position: z.string().optional().transform((v) => v || null),
  notes: z.string().optional().transform((v) => v || null),
  create_login: z.boolean().optional().default(false),
  username: z.string().optional(),
  password: z.string().optional(),
});

// create_login açıkken username/password, Edge Function'ın (create-athlete-account)
// beklediği kurallarla birebir aynı şekilde zorunlu hale gelir.
export const createAthleteSchema = createAthleteBaseSchema.superRefine((data, ctx) => {
  if (!data.create_login) return;

  if (!data.username || !ATHLETE_USERNAME_RE.test(data.username)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["username"],
      message:
        "Kullanıcı adı yalnızca küçük harf, rakam, nokta ve alt çizgi içerebilir (3-30 karakter)",
    });
  }

  if (!data.password || data.password.length < 6) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["password"],
      message: "Şifre en az 6 karakter olmalı",
    });
  }
});

export const updateAthleteSchema = createAthleteBaseSchema.partial();

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>;
export type UpdateAthleteInput = z.infer<typeof updateAthleteSchema>;
