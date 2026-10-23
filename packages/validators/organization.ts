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

/** Giriş kimliğinin alan adı parçası ({username}@{slug}.athleteiq.app). */
export const ORG_SLUG_RE = /^[a-z0-9-]{2,40}$/;

export const ORG_PLANS = ["free", "pro", "enterprise"] as const;

export const updateOrgSlugPlanSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(ORG_SLUG_RE, "Slug 2–40 karakter olmalı; yalnızca küçük harf, rakam ve tire (-)"),
  plan: z.enum(ORG_PLANS),
});

export type UpdateOrgSlugPlanInput = z.infer<typeof updateOrgSlugPlanSchema>;
