import { describe, expect, it } from "vitest";
import { buildLoginIdentifier, resolveLoginIdentifier, toLoginIdentifier } from "./auth";

describe("resolveLoginIdentifier", () => {
  it("rejects a bare username (no org shorthand) — email login/global domain no longer supported", () => {
    expect(resolveLoginIdentifier("ibrahim.colak")).toEqual({
      ok: false,
      reason: "missing_org",
    });
  });

  it("expands an org-scoped shorthand (username@slug) to the full synthetic email, lowercased", () => {
    expect(resolveLoginIdentifier("Ahmet.Yilmaz@TGF")).toEqual({
      ok: true,
      email: "ahmet.yilmaz@tgf.athleteiq.app",
    });
  });

  it("expands a lowercase org-scoped shorthand unchanged", () => {
    expect(resolveLoginIdentifier("ahmet.yilmaz@tgf")).toEqual({
      ok: true,
      email: "ahmet.yilmaz@tgf.athleteiq.app",
    });
  });

  it("rejects a real email address — email login was removed", () => {
    expect(resolveLoginIdentifier("tosunbeytullah9@gmail.com")).toEqual({
      ok: false,
      reason: "email_rejected",
    });
  });

  it("rejects an already-complete synthetic email — only the short form is accepted now", () => {
    expect(resolveLoginIdentifier("ahmet.yilmaz@tgf.athleteiq.app")).toEqual({
      ok: false,
      reason: "email_rejected",
    });
  });

  it("rejects the legacy global synthetic email — the global domain fallback was removed", () => {
    expect(resolveLoginIdentifier("ibrahim.colak@athleteiq.app")).toEqual({
      ok: false,
      reason: "email_rejected",
    });
  });
});

// Arayüzde gösterilen / kopyalatılan giriş kimliği (Parti 18E): sentetik e-posta değil,
// "kullanici@slug" — ve bu değer gerçekten girişe çözülmeli.
describe("login identifier display", () => {
  it("builds the username@slug shorthand that resolveLoginIdentifier accepts", () => {
    const shown = buildLoginIdentifier("Ahmet.Yilmaz", "tgf");
    expect(shown).toBe("ahmet.yilmaz@tgf");
    expect(resolveLoginIdentifier(shown)).toEqual({
      ok: true,
      email: "ahmet.yilmaz@tgf.athleteiq.app",
    });
  });

  it("converts a synthetic email back to the shorthand (round-trip)", () => {
    const email = "beytullah.tosun@koc-universitesi.athleteiq.app";
    const shown = toLoginIdentifier(email);
    expect(shown).toBe("beytullah.tosun@koc-universitesi");
    expect(resolveLoginIdentifier(shown)).toEqual({ ok: true, email });
  });

  it("leaves a non-synthetic address unchanged", () => {
    expect(toLoginIdentifier("someone@example.com")).toBe("someone@example.com");
  });

  it("the full synthetic email itself is NOT a valid login identifier", () => {
    expect(resolveLoginIdentifier("ahmet.yilmaz@tgf.athleteiq.app")).toEqual({
      ok: false,
      reason: "email_rejected",
    });
  });
});
