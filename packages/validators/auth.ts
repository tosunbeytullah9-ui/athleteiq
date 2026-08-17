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
  return { ok: true, email: `${trimmed.toLowerCase()}.athleteiq.app` };
}
