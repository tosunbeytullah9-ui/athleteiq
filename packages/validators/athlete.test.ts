import { describe, expect, it } from "vitest";
import { ATHLETE_USERNAME_RE, generateTempPassword, suggestUsername } from "./athlete";

describe("suggestUsername", () => {
  it("transliterates Turkish characters (case-sensitive map applied before lowercasing)", () => {
    expect(suggestUsername("İBRAHİM ÇOLAK")).toBe("ibrahim.colak");
  });

  it("handles multi-word names by joining with dots", () => {
    expect(suggestUsername("Mehmet Ayberk Koşak")).toBe("mehmet.ayberk.kosak");
  });

  it("returns empty string for names shorter than 3 characters after normalization", () => {
    expect(suggestUsername("A")).toBe("");
  });

  it("every non-empty suggestion matches ATHLETE_USERNAME_RE", () => {
    const names = [
      "İBRAHİM ÇOLAK",
      "Mehmet Ayberk Koşak",
      "Şükrü Öztürk",
      "Ümit Güneş",
      "A",
      "Ali",
      "  Extra   Spaces  ",
    ];
    for (const name of names) {
      const suggestion = suggestUsername(name);
      if (suggestion.length > 0) {
        expect(ATHLETE_USERNAME_RE.test(suggestion)).toBe(true);
      }
    }
  });
});

describe("generateTempPassword", () => {
  it("generates a 10-character password", () => {
    expect(generateTempPassword()).toHaveLength(10);
  });

  it("never includes ambiguous characters (0 O o 1 l I)", () => {
    const password = generateTempPassword();
    expect(password).not.toMatch(/[0Oo1lI]/);
  });

  it("is above the Edge Function's MIN_PASSWORD_LENGTH (6)", () => {
    expect(generateTempPassword().length).toBeGreaterThanOrEqual(6);
  });
});
