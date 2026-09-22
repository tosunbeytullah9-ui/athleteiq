import { describe, expect, it } from "vitest";
import {
  ATHLETE_USERNAME_RE,
  generateTempPassword,
  matchesTrainingGroup,
  suggestUsername,
  trFold,
} from "./athlete";

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

// Bu blok, public.matches_training_group SQL fonksiyonuyla BİREBİR aynı
// senaryoları kapsar (044_position_vs_training_group.sql). Senaryolar canlı DB'de
// de doğrulandı — ikisi ayrışırsa sporcu, koçun gördüğünden farklı bir program
// listesi görür, bu yüzden ikizlik test altında tutulur.
describe("trFold", () => {
  it("folds Turkish dotted capital I, which lower() alone cannot", () => {
    expect(trFold("ARTİSTİK CİMNASTİK")).toBe(trFold("Artistik Cimnastik"));
  });

  it("trims surrounding whitespace", () => {
    expect(trFold("  Hücum Hattı ")).toBe("hucum hatti");
  });

  it("returns null for null/undefined", () => {
    expect(trFold(null)).toBeNull();
    expect(trFold(undefined)).toBeNull();
  });
});

describe("matchesTrainingGroup", () => {
  it("matches every athlete when the program has no group", () => {
    expect(matchesTrainingGroup("Hücum Hattı", "TE", null)).toBe(true);
    expect(matchesTrainingGroup(null, null, null)).toBe(true);
    expect(matchesTrainingGroup(null, null, "")).toBe(true);
  });

  it("matches on the athlete's explicit group", () => {
    expect(matchesTrainingGroup("Hücum Hattı", "TE", "Hücum Hattı")).toBe(true);
  });

  it("also matches on position, so a grouped TE still sees a TE-only program", () => {
    expect(matchesTrainingGroup("Hücum Hattı", "TE", "TE")).toBe(true);
  });

  it("falls back to position when the athlete has no group", () => {
    expect(matchesTrainingGroup(null, "TE", "TE")).toBe(true);
    expect(matchesTrainingGroup(null, "RB", "TE")).toBe(false);
  });

  it("excludes athletes in a different group", () => {
    expect(matchesTrainingGroup("Hücum Hattı", "TE", "Skill")).toBe(false);
  });

  it("excludes athletes with neither group nor position", () => {
    expect(matchesTrainingGroup(null, null, "TE")).toBe(false);
  });

  it("is case- and whitespace-insensitive, Turkish included", () => {
    expect(matchesTrainingGroup("hücum hattı", "te", "HÜCUM HATTI")).toBe(true);
    expect(matchesTrainingGroup("  TE ", null, "te")).toBe(true);
  });
});
