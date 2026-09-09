import { z } from "zod";
import { ATHLETE_USERNAME_RE } from "./athlete";

// supabase/functions/create-org-user/index.ts (USERNAME_RE) ile birebir aynı
// kural — org kullanıcıları athlete'lerle aynı username charset'ini paylaşıyor.
const createOrgUserBaseSchema = z.object({
  org_id: z.string().uuid(),
  full_name: z.string().min(2, "Ad en az 2 karakter olmalı"),
  username: z
    .string()
    .regex(
      ATHLETE_USERNAME_RE,
      "Kullanıcı adı yalnızca küçük harf, rakam, nokta ve alt çizgi içerebilir (3-30 karakter)"
    ),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  role: z.enum(["admin", "coach", "athlete"]),
  team_id: z.string().uuid().optional(),
  athlete_fields: z
    .object({
      birth_date: z.string().optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      height_cm: z.number().optional(),
      weight_kg: z.number().optional(),
      position: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export const createOrgUserSchema = createOrgUserBaseSchema.superRefine((data, ctx) => {
  if ((data.role === "coach" || data.role === "athlete") && !data.team_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["team_id"],
      message:
        data.role === "coach" ? "Koç için takım seçimi zorunludur" : "Sporcu için takım seçimi zorunludur",
    });
  }
  if (data.role === "admin" && data.team_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["team_id"], message: "Admin için takım seçilemez" });
  }
});

export type CreateOrgUserInput = z.infer<typeof createOrgUserSchema>;

export const resetUserPasswordSchema = z.object({
  user_id: z.string().uuid(),
  new_password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;

// profiles tablosunu doğrudan (RLS: profiles_update, 032_profiles.sql) günceller —
// create-org-user'ın aksine service-role Edge Function gerekmez, admin/super_admin
// zaten profiles üzerinde UPDATE yetkisine sahip.
export const updateOrgUserSchema = z.object({
  full_name: z.string().min(2, "Ad en az 2 karakter olmalı"),
  username: z
    .string()
    .regex(
      ATHLETE_USERNAME_RE,
      "Kullanıcı adı yalnızca küçük harf, rakam, nokta ve alt çizgi içerebilir (3-30 karakter)"
    ),
});

export type UpdateOrgUserInput = z.infer<typeof updateOrgUserSchema>;

export const deleteOrgUserSchema = z.object({
  user_id: z.string().uuid(),
});

export type DeleteOrgUserInput = z.infer<typeof deleteOrgUserSchema>;
