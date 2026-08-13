import { describe, expect, it } from "vitest";
import { resolveLoginIdentifier } from "./auth";

describe("resolveLoginIdentifier", () => {
  it("appends the legacy global synthetic domain to a bare username", () => {
    expect(resolveLoginIdentifier("ibrahim.colak")).toBe("ibrahim.colak@athleteiq.app");
  });

  it("lowercases a bare username before appending the domain", () => {
    expect(resolveLoginIdentifier("Ibrahim.Colak")).toBe("ibrahim.colak@athleteiq.app");
  });

  it("expands an org-scoped shorthand (username@slug) to the full synthetic email", () => {
    expect(resolveLoginIdentifier("ahmet.yilmaz@tgf")).toBe("ahmet.yilmaz@tgf.athleteiq.app");
  });

  it("passes a real email through unchanged", () => {
    expect(resolveLoginIdentifier("tosunbeytullah9@gmail.com")).toBe("tosunbeytullah9@gmail.com");
  });

  it("passes an already-complete synthetic email through unchanged", () => {
    expect(resolveLoginIdentifier("ahmet.yilmaz@tgf.athleteiq.app")).toBe(
      "ahmet.yilmaz@tgf.athleteiq.app"
    );
  });

  it("passes the legacy global synthetic email through unchanged", () => {
    expect(resolveLoginIdentifier("ibrahim.colak@athleteiq.app")).toBe(
      "ibrahim.colak@athleteiq.app"
    );
  });
});
