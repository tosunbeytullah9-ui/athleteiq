import { z } from "zod";

/**
 * Landing'deki "Demo isteyin" formu. Sınırlar demo_requests tablosunun check
 * constraint'leriyle (20261023144302_demo_requests.sql) aynıdır — form ve
 * /api/demo-request aynı şemayı kullanır, DB'ye geçersiz bir satır ulaşmaz.
 */

export const DEMO_REQUEST_ROLES = ["coach", "org_admin", "athlete", "other"] as const;
export type DemoRequestRole = (typeof DEMO_REQUEST_ROLES)[number];

export const DEMO_REQUEST_ROLE_LABELS: Record<DemoRequestRole, string> = {
  coach: "Antrenör / K&K koçu",
  org_admin: "Federasyon / kulüp yöneticisi",
  athlete: "Sporcu",
  other: "Diğer",
};

export const DEMO_ATHLETE_COUNTS = ["1-10", "11-30", "31-100", "100+"] as const;

export const DEMO_REQUEST_STATUSES = ["new", "contacted", "onboarded", "rejected"] as const;
export type DemoRequestStatus = (typeof DEMO_REQUEST_STATUSES)[number];

export const DEMO_REQUEST_STATUS_LABELS: Record<DemoRequestStatus, string> = {
  new: "Yeni",
  contacted: "İletişime geçildi",
  onboarded: "Hesap açıldı",
  rejected: "Uygun değil",
};

/** Boş string'i "girilmedi" (undefined) say — opsiyonel alanlar DB'ye null gider. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v ? v : undefined));

export const demoRequestSchema = z.object({
  full_name: z
    .string({ required_error: "Adınızı ve soyadınızı yazın" })
    .trim()
    .min(2, "Adınızı ve soyadınızı yazın")
    .max(120, "En fazla 120 karakter"),
  organization: z
    .string({ required_error: "Kurum veya kulüp adını yazın" })
    .trim()
    .min(2, "Kurum veya kulüp adını yazın")
    .max(160, "En fazla 160 karakter"),
  role: z.enum(DEMO_REQUEST_ROLES, { errorMap: () => ({ message: "Rolünüzü seçin" }) }),
  discipline: optionalText(80, "En fazla 80 karakter"),
  athlete_count: z.enum(DEMO_ATHLETE_COUNTS).optional(),
  email: z
    .string({ required_error: "E-posta adresinizi yazın" })
    .trim()
    .toLowerCase()
    .max(254, "E-posta adresi çok uzun")
    .email("Geçerli bir e-posta adresi yazın"),
  phone: optionalText(40, "En fazla 40 karakter").refine(
    (v) => v === undefined || /^[+0-9 ()-]{7,40}$/.test(v),
    "Telefon numarası yalnızca rakam, boşluk ve + ( ) - içerebilir"
  ),
  message: optionalText(1000, "En fazla 1000 karakter"),
  kvkk_consent: z.literal(true, {
    errorMap: () => ({ message: "Devam etmek için aydınlatma metnini onaylayın" }),
  }),
  /** Bot tuzağı: görünmeyen alan. Doluysa istek sessizce yok sayılır. */
  website: z.string().max(200).optional(),
});

export type DemoRequestInput = z.input<typeof demoRequestSchema>;
export type DemoRequest = z.output<typeof demoRequestSchema>;

export function isHoneypotFilled(input: { website?: string }): boolean {
  return Boolean(input.website && input.website.trim().length > 0);
}

/** Saatlik hız sınırı — aynı IP'den bu sayıdan fazla talep 429 alır. */
export const DEMO_REQUEST_HOURLY_LIMIT = 3;
