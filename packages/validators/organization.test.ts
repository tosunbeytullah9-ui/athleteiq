import { describe, expect, it } from "vitest";
import { updateOrgSlugPlanSchema } from "./organization";

describe("updateOrgSlugPlanSchema", () => {
  it("küçük harf, rakam ve tireden oluşan slug'ı kabul eder", () => {
    expect(updateOrgSlugPlanSchema.safeParse({ slug: "koc-universitesi", plan: "free" }).success).toBe(true);
    expect(updateOrgSlugPlanSchema.safeParse({ slug: "tgf", plan: "pro" }).success).toBe(true);
  });

  it("büyük harf, Türkçe karakter, nokta ve boşluğu reddeder", () => {
    for (const slug of ["TGF", "koç", "a.b", "a b", "a@b", "x"]) {
      expect(updateOrgSlugPlanSchema.safeParse({ slug, plan: "free" }).success).toBe(false);
    }
  });

  it("40 karakterden uzun slug'ı ve bilinmeyen planı reddeder", () => {
    expect(updateOrgSlugPlanSchema.safeParse({ slug: "a".repeat(41), plan: "free" }).success).toBe(false);
    expect(updateOrgSlugPlanSchema.safeParse({ slug: "abc", plan: "gold" }).success).toBe(false);
  });
});
