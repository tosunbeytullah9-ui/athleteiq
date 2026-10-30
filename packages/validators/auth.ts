import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Kullanıcı adı girin"),
  password: z.string().min(1, "Şifre girin"),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  role: z.enum(["admin", "coach", "athlete"]),
  team_id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export type ResolvedIdentifier =
  | { ok: true; email: string }
  | { ok: false; reason: "missing_org" | "email_rejected" };

// Sentetik e-postanın alan adı eki — dahili kimliktir, marka değişse de (Parti 18E,
// AthleteIQ → Loadwell) bilinçli olarak korunur: tüm auth.users kayıtları bu biçimde.
const SYNTHETIC_EMAIL_SUFFIX = ".athleteiq.app";

// Login formundaki serbest metin girdiyi sentetik email'e çözer.
// Tek geçerli biçim: "kullanici@slug" (org kısayolu) → "kullanici@slug.athleteiq.app".
// İki ret durumu:
//  - "missing_org": "@" yok (bare username) → hangi org olduğu belirsiz, artık desteklenmiyor
//    (Parti 18 öncesi eski global "athleteiq.app" domain fallback'i buradaydı, kaldırıldı).
//  - "email_rejected": domain kısmında "." var → gerçek e-posta veya tam yazılmış sentetik
//    email (ör. "kullanici@slug.athleteiq.app") — e-posta ile giriş kalıcı olarak kapatıldı,
//    tek kabul edilen biçim kısayoldur.
export function resolveLoginIdentifier(raw: string): ResolvedIdentifier {
  const trimmed = raw.trim();
  if (!trimmed.includes("@")) return { ok: false, reason: "missing_org" };
  const parts = trimmed.split("@");
  const domain = parts[1];
  if (parts.length !== 2 || !domain) return { ok: false, reason: "missing_org" };
  if (domain.includes(".")) return { ok: false, reason: "email_rejected" };
  return { ok: true, email: `${trimmed.toLowerCase()}${SYNTHETIC_EMAIL_SUFFIX}` };
}

// Kullanıcıya gösterilen / kopyalatılan giriş kimliği: "kullanici@slug". Sentetik
// e-posta hiçbir arayüzde gösterilmez — resolveLoginIdentifier onu reddeder.
export function buildLoginIdentifier(username: string, orgSlug: string): string {
  return `${username.trim().toLowerCase()}@${orgSlug.trim().toLowerCase()}`;
}

// Sentetik e-postayı ("kullanici@slug.athleteiq.app") giriş kimliğine çevirir.
// Sentetik olmayan bir adres (eski/elle oluşturulmuş hesap) olduğu gibi döner.
export function toLoginIdentifier(email: string): string {
  const lower = email.trim().toLowerCase();
  return lower.endsWith(SYNTHETIC_EMAIL_SUFFIX)
    ? lower.slice(0, -SYNTHETIC_EMAIL_SUFFIX.length)
    : email;
}
