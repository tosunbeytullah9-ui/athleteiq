import { z } from "zod";
import { addDaysYmd, parseYmd } from "./date";

/**
 * Sporcu → koç seans geri bildirimi (supabase/migrations/20260917072700_session_feedback.sql).
 *
 * `status` neden var: boş bir RPE'nin "antrenmanı yapmadım" mı "girmeyi unuttum" mu
 * olduğu koç için ASLA belirsiz kalmamalı. 'skipped' seçildiğinde rpe/duration
 * DB check constraint'i (session_feedback_load_shape) gereği null olmak ZORUNDA —
 * bu şema o kısıtı istemci tarafında birebir taklit eder.
 */
export const SESSION_FEEDBACK_STATUSES = ["completed", "partial", "skipped"] as const;
export type SessionFeedbackStatus = (typeof SESSION_FEEDBACK_STATUSES)[number];

export const SESSION_FEEDBACK_STATUS_LABELS: Record<SessionFeedbackStatus, string> = {
  completed: "Tamamladım",
  partial: "Eksik yaptım",
  skipped: "Yapmadım",
};

/**
 * Foster CR-10 (session RPE) çapaları. 0 bilinçli olarak YOK — "yaptım ama hiç
 * zorlanmadım" anlamlı bir girdi değil, onun yerine status='skipped' kullanılır.
 */
export const RPE_LABELS: Record<number, string> = {
  1: "Çok çok kolay",
  2: "Kolay",
  3: "Orta",
  4: "Biraz zor",
  5: "Zor",
  6: "Oldukça zor",
  7: "Çok zor",
  8: "Çok çok zor",
  9: "Neredeyse maksimum",
  10: "Maksimum",
};

/** Ağrı bayrağı işaretlendiğinde sunulan hazır bölgeler (serbest metin de kabul edilir). */
export const PAIN_AREAS = [
  "Omuz",
  "Sırt",
  "Bel",
  "Kalça",
  "Diz",
  "Ayak bileği",
  "El bileği",
  "Dirsek",
  "Boyun",
  "Kas (genel)",
  "Diğer",
] as const;

export const sessionFeedbackSchema = z
  .object({
    status: z.enum(SESSION_FEEDBACK_STATUSES),
    rpe: z.number().int().min(1).max(10).nullable().optional(),
    duration_min: z.number().int().min(0).max(600).nullable().optional(),
    has_pain: z.boolean().default(false),
    pain_area: z.string().max(120).nullable().optional(),
    note: z.string().max(2000).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.status === "skipped") {
      // DB: (status = 'skipped' and rpe is null and duration_min is null)
      if (v.rpe != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rpe"],
          message: "Yapılmayan antrenmana RPE girilmez.",
        });
      }
      if (v.duration_min != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["duration_min"],
          message: "Yapılmayan antrenmana süre girilmez.",
        });
      }
      return;
    }
    // DB: (status <> 'skipped' and rpe is not null and duration_min is not null)
    if (v.rpe == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rpe"],
        message: "Zorluk (RPE) seçin.",
      });
    }
    if (v.duration_min == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["duration_min"],
        message: "Antrenman süresini girin.",
      });
    }
  });

export type SessionFeedbackInput = z.infer<typeof sessionFeedbackSchema>;

/**
 * sRPE = RPE × süre. acwr_logs.session_load ve session_feedback.session_load
 * generated kolonlarıyla AYNI formül — bu yalnızca form önizlemesi içindir,
 * asla insert payload'ına konmaz (Postgres generated kolona yazmayı reddeder).
 */
export function computeSessionLoad(
  rpe: number | null | undefined,
  durationMin: number | null | undefined
): number | null {
  if (rpe == null || durationMin == null) return null;
  return rpe * durationMin;
}

/**
 * Bir seansın takvim tarihi: program başlangıcı + (haftanın günü - 1).
 * DB tarafında set_session_feedback_date() trigger'ı AYNI hesabı yapar ve
 * istemciden gelen session_date'i EZER — bu fonksiyon yalnızca UI'da
 * "hangi gün" göstermek ve düzenleme penceresini hesaplamak içindir.
 */
export function resolveSessionDate(
  programStartDate: string | null | undefined,
  dayOfWeek: number | null | undefined
): string | null {
  if (!programStartDate || !parseYmd(programStartDate)) return null;
  return addDaysYmd(programStartDate, (dayOfWeek ?? 1) - 1);
}

/**
 * RLS `session_feedback_update_athlete` politikası düzenlemeyi
 * `session_date >= current_date - 7` ile sınırlar (current_date = UTC). Kaydedilemeyecek
 * bir formu hiç açmamak için istemci de aynı pencereyi bilir.
 *
 * `today` HER ZAMAN `todayInIstanbul()` olmalı — mobilde de (`todayLocal()` DEĞİL):
 * İstanbul tarihi UTC tarihinden hiçbir zaman geride değildir, dolayısıyla bu pencere
 * DB'ninkinden asla geniş olmaz. Cihaz tarihiyle hesaplansaydı ABD'de akşam saatlerinde
 * form 7. günü "düzenlenebilir" gösterir, DB ise UPDATE'i sessizce 0 satıra düşürürdü.
 */
export const FEEDBACK_EDIT_WINDOW_DAYS = 7;

export function isFeedbackEditable(
  sessionDate: string | null | undefined,
  today: string
): boolean {
  if (!sessionDate) return true; // tarih çözülemediyse DB bugüne atar → düzenlenebilir
  return sessionDate >= addDaysYmd(today, -FEEDBACK_EDIT_WINDOW_DAYS);
}
