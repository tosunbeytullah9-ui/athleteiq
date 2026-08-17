import { describe, expect, it } from "vitest";
import { resolveLoginIdentifier } from "./auth";

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
