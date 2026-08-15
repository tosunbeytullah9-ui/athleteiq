import { z } from "zod";

export const createOrgSchema = z.object({
  name: z.string().min(2, "Organizasyon adı en az 2 karakter olmalı"),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;

export const updateOrgSchema = z.object({
  name: z.string().min(2, "Organizasyon adı en az 2 karakter olmalı"),
  logo_url: z
    .string()
    .trim()
    .url("Geçerli bir URL girin")
    .optional()
    .or(z.literal("")),
});

export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;

export const updateOrgSlugPlanSchema = z.object({
  slug: z.string().min(2, "Slug en az 2 karakter olmalı"),
  plan: z.enum(["free", "pro", "enterprise"]),
});

export type UpdateOrgSlugPlanInput = z.infer<typeof updateOrgSlugPlanSchema>;
