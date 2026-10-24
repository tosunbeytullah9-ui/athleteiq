import { describe, expect, it } from "vitest";
import { demoRequestSchema, isHoneypotFilled } from "./demo-request";

const valid = {
  full_name: "Ayşe Yılmaz",
  organization: "Örnek Spor Kulübü",
  role: "coach",
  email: "Ayse@Example.com ",
  kvkk_consent: true,
} as const;

describe("demoRequestSchema", () => {
  it("zorunlu alanlarla geçer, e-postayı küçültüp kırpar", () => {
    const r = demoRequestSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ayse@example.com");
  });

  it("boş opsiyonel alanlar undefined olur (DB'ye null gider)", () => {
    const r = demoRequestSchema.safeParse({ ...valid, discipline: "  ", phone: "", message: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.discipline).toBeUndefined();
      expect(r.data.phone).toBeUndefined();
      expect(r.data.message).toBeUndefined();
    }
  });

  it("KVKK onayı olmadan reddeder", () => {
    expect(demoRequestSchema.safeParse({ ...valid, kvkk_consent: false }).success).toBe(false);
  });

  it("geçersiz e-posta ve rolü reddeder", () => {
    expect(demoRequestSchema.safeParse({ ...valid, email: "abc" }).success).toBe(false);
    expect(demoRequestSchema.safeParse({ ...valid, role: "ceo" }).success).toBe(false);
  });

  it("DB sınırlarını aşan değerleri reddeder", () => {
    expect(demoRequestSchema.safeParse({ ...valid, full_name: "A" }).success).toBe(false);
    expect(demoRequestSchema.safeParse({ ...valid, message: "x".repeat(1001) }).success).toBe(false);
    expect(demoRequestSchema.safeParse({ ...valid, athlete_count: "5" }).success).toBe(false);
  });

  it("telefon biçimini doğrular", () => {
    expect(demoRequestSchema.safeParse({ ...valid, phone: "+90 (532) 000-00-00" }).success).toBe(true);
    expect(demoRequestSchema.safeParse({ ...valid, phone: "ara beni" }).success).toBe(false);
  });

  it("eksik zorunlu alanlarda Türkçe mesaj döner", () => {
    const r = demoRequestSchema.safeParse({});
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = Object.values(r.error.flatten().fieldErrors).flat();
      expect(msgs).not.toContain("Required");
    }
  });

  it("honeypot doluysa yakalanır", () => {
    expect(isHoneypotFilled({ website: "http://spam" })).toBe(true);
    expect(isHoneypotFilled({ website: "" })).toBe(false);
    expect(isHoneypotFilled({})).toBe(false);
  });
});
