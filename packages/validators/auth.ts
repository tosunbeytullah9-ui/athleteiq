import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "E-posta veya kullanıcı adı girin"),
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

// Login formundaki serbest metin girdiyi gerçek/sentetik bir email'e çözer.
// Üç durum:
//  1) "@" yok (bare username) → eski global sentetik domain: "athleteiq.app"
//     (mevcut athletes.username tabanlı hesaplar için, Parti 16 öncesi davranış korunur)
//  2) "@" var ama domain kısmında "." yok (örn. "ahmet.yilmaz@tgf") → org-scoped
//     kısayol, ".athleteiq.app" eklenir → "ahmet.yilmaz@tgf.athleteiq.app"
//  3) "@" var ve domain kısmında "." var (gerçek email veya zaten tam sentetik email)
//     → değiştirilmeden kullanılır
export function resolveLoginIdentifier(raw: string): string {
  if (!raw.includes("@")) return `${raw.toLowerCase()}@athleteiq.app`;
  const parts = raw.split("@");
  const domain = parts[1];
  const isOrgShorthand = parts.length === 2 && !!domain && !domain.includes(".");
  return isOrgShorthand ? `${raw}.athleteiq.app` : raw;
}
