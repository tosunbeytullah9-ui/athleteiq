import { z } from "zod";

/**
 * Yıllık (sezonluk) periyodizasyon planı — Zod şemaları.
 *
 * Kaynak ızgara: "RAMS 2026-2027 SEZONU KUVVET&KONDİSYON YILLIK PLAN.xlsx".
 * Sütun = sezon haftası, satır = antrenman sistemi, hücre = o hafta kaç seans.
 * Şema/RLS: supabase/migrations/20260921081206_annual_plans.sql
 */

/**
 * Excel'deki 11 sabit satır. Burada yalnızca YENİ bir organizasyonun
 * kütüphanesini tohumlamak için kullanılır — kaydedildikten sonra org kendi
 * listesini düzenler (annual_plan_methods tablosu). Kod bu listeye göre
 * hiçbir yerde dallanmaz; isimler serbest metindir.
 *
 * Renkler yalnızca ızgarada satır rozetini boyar (dataviz paleti değil —
 * amaç 11 satırı birbirinden ayırt etmek).
 */
export const DEFAULT_ANNUAL_PLAN_METHODS: readonly {
  name: string;
  color: string;
}[] = [
  { name: "Contrast Training", color: "#7c3aed" },
  { name: "Fonksiyonel Kuvvet", color: "#2563eb" },
  { name: "Aerobik Dayanıklılık", color: "#0891b2" },
  { name: "Anaerobik Dayanıklılık", color: "#0d9488" },
  { name: "Genel Kuvvet", color: "#65a30d" },
  { name: "Deload (Geçiş)", color: "#94a3b8" },
  { name: "Kuvvette Devamlılık", color: "#ca8a04" },
  { name: "Pliometrik", color: "#ea580c" },
  { name: "Hız/Hızlanma/Çeviklik", color: "#dc2626" },
  { name: "Hipertrofi", color: "#db2777" },
  { name: "Max", color: "#4f46e5" },
] as const;

/** Bir hücrede en fazla kaç seans — DB check constraint'iyle birebir. */
export const MAX_SESSIONS_PER_CELL = 14;
/** Bir planın en fazla kaç haftası olabilir — DB check constraint'iyle birebir. */
export const MAX_PLAN_WEEKS = 104;

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG biçiminde olmalı");

export const annualPlanMethodSchema = z.object({
  name: z.string().trim().min(1, "Sistem adı gerekli").max(80, "Sistem adı en fazla 80 karakter"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Renk #rrggbb biçiminde olmalı")
    .optional()
    .nullable(),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

/**
 * Plan oluşturma. team_id XOR athlete_id — DB'deki annual_plans_scope_check
 * ile birebir aynı kısıt (training_programs/program_blocks ile aynı desen).
 */
export const createAnnualPlanSchema = z
  .object({
    title: z.string().trim().min(1, "Plan adı gerekli").max(120, "Plan adı en fazla 120 karakter"),
    team_id: z.string().uuid().optional().nullable(),
    athlete_id: z.string().uuid().optional().nullable(),
    season_start: isoDateSchema,
    total_weeks: z
      .number()
      .int()
      .min(1, "En az 1 hafta")
      .max(MAX_PLAN_WEEKS, `En fazla ${MAX_PLAN_WEEKS} hafta`),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((v) => Boolean(v.team_id) !== Boolean(v.athlete_id), {
    message: "Plan ya bir takıma ya da bir sporcuya atanmalı (ikisi birden olamaz)",
    path: ["team_id"],
  });

export const updateAnnualPlanSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  season_start: isoDateSchema.optional(),
  total_weeks: z.number().int().min(1).max(MAX_PLAN_WEEKS).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

/** Hafta bağlamı — Excel'in CYCLES/LOADS + HOME/AWAY satırları. */
export const annualPlanWeekSchema = z.object({
  week_index: z.number().int().min(1),
  // Excel 0.55 tutuyordu; burada yüzde (55). %100 üstü kasıtlı olarak serbest —
  // supramaksimal/eksantrik çalışmada %100+ gerçek bir reçetedir.
  intensity_pct: z
    .number()
    .min(0, "Yoğunluk negatif olamaz")
    .max(200, "Yoğunluk en fazla %200")
    .optional()
    .nullable(),
  phase: z.string().trim().max(80).optional().nullable(),
  location: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

/**
 * Izgara hücresi. sessions = 0 GEÇERLİDİR ama bir satır YAZMAZ — çağıran
 * katman 0'ı silme olarak yorumlar (tablo seyrek tutulur, bkz. migration).
 * DB check'i `sessions >= 1` olduğu için 0'ı insert etmek hata verir.
 */
export const annualPlanCellSchema = z.object({
  method_id: z.string().uuid(),
  week_index: z.number().int().min(1),
  sessions: z
    .number()
    .int()
    .min(0)
    .max(MAX_SESSIONS_PER_CELL, `En fazla ${MAX_SESSIONS_PER_CELL} seans`),
});

export type AnnualPlanMethodInput = z.infer<typeof annualPlanMethodSchema>;
export type CreateAnnualPlanInput = z.infer<typeof createAnnualPlanSchema>;
export type UpdateAnnualPlanInput = z.infer<typeof updateAnnualPlanSchema>;
export type AnnualPlanWeekInput = z.infer<typeof annualPlanWeekSchema>;
export type AnnualPlanCellInput = z.infer<typeof annualPlanCellSchema>;

/**
 * Hafta numarasından (1-tabanlı) o haftanın başlangıç tarihini hesaplar.
 * Excel'de TARİH satırı `B3+7` zinciriydi; burada aynı şey türetilmiş olarak
 * yaşıyor, DB'de hafta başına tarih kolonu TUTULMAZ.
 *
 * Saat dilimi tuzağı: `new Date("2026-08-10")` UTC gece yarısı olarak ayrışır,
 * yerel saatte geri günü gösterebilir. Bu yüzden tarih parçalara ayrılıp
 * UTC'de toplanır ve yine YYYY-AA-GG olarak döndürülür.
 */
/**
 * YYYY-AA-GG → UTC epoch ms. Biçim bozuksa NaN döner (çağıranlar bunu
 * kontrol eder) — tsconfig'te noUncheckedIndexedAccess açık olduğu için
 * dizi destructuring yerine açık indeksleme kullanılır.
 */
function isoToUtcMs(iso: string): number {
  const parts = iso.split("-");
  if (parts.length !== 3) return Number.NaN;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return Number.NaN;
  return Date.UTC(y, m - 1, d);
}

export function weekStartDate(seasonStart: string, weekIndex: number): string {
  const base = isoToUtcMs(seasonStart);
  if (Number.isNaN(base)) return seasonStart;
  return new Date(base + (weekIndex - 1) * 7 * 86_400_000).toISOString().slice(0, 10);
}

/** Haftanın kapsadığı [başlangıç, bitiş] aralığı (bitiş dahil, 7. gün). */
export function weekDateRange(
  seasonStart: string,
  weekIndex: number
): { start: string; end: string } {
  const start = weekStartDate(seasonStart, weekIndex);
  const startMs = isoToUtcMs(start);
  if (Number.isNaN(startMs)) return { start, end: start };
  return { start, end: new Date(startMs + 6 * 86_400_000).toISOString().slice(0, 10) };
}

/**
 * Bir tarihin plandaki hafta numarasını verir; plan aralığı dışındaysa null.
 * Yarışmaları (competitions.competition_date) doğru sütuna düşürmek için.
 */
export function weekIndexForDate(
  seasonStart: string,
  totalWeeks: number,
  date: string
): number | null {
  const startMs = isoToUtcMs(seasonStart);
  const dateMs = isoToUtcMs(date);
  if (Number.isNaN(startMs) || Number.isNaN(dateMs)) return null;

  const diffDays = Math.floor((dateMs - startMs) / 86_400_000);
  if (diffDays < 0) return null;

  const index = Math.floor(diffDays / 7) + 1;
  return index > totalWeeks ? null : index;
}
