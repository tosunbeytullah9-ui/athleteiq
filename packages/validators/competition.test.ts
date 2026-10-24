import { describe, expect, it } from "vitest";
import {
  COMPETITION_STAGE_VALUES,
  competitionLastDate,
  isCompetitionStage,
  isFinalStage,
  normalizeStages,
  stageLabel,
  stageShort,
  stagesForEntry,
} from "./competition";

describe("competition stages", () => {
  it("keeps the canonical order", () => {
    expect(COMPETITION_STAGE_VALUES).toEqual([
      "qualification",
      "apparatus_final",
      "team_final",
      "all_around_final",
    ]);
  });

  it("recognises only known stages", () => {
    expect(isCompetitionStage("team_final")).toBe(true);
    expect(isCompetitionStage("final")).toBe(false);
    expect(isCompetitionStage(null)).toBe(false);
  });

  it("labels and short codes", () => {
    expect(stageLabel("all_around_final")).toBe("All-Around Final");
    expect(stageShort("apparatus_final")).toBe("AF");
    expect(isFinalStage("qualification")).toBe(false);
    expect(isFinalStage("team_final")).toBe(true);
  });
});

describe("normalizeStages", () => {
  it("drops unknown values, dedupes and sorts", () => {
    expect(
      normalizeStages([
        "all_around_final",
        "x",
        "qualification",
        "all_around_final",
        3,
      ])
    ).toEqual(["qualification", "all_around_final"]);
  });

  it("handles null", () => {
    expect(normalizeStages(null)).toEqual([]);
  });
});

describe("stagesForEntry", () => {
  it("intersects with the competition's stages", () => {
    expect(
      stagesForEntry(
        ["qualification", "team_final"],
        ["qualification", "all_around_final"]
      )
    ).toEqual(["qualification"]);
  });
});

describe("competitionLastDate", () => {
  it("returns the latest of competition and stage dates", () => {
    expect(
      competitionLastDate("2026-07-08", ["2026-07-10", null, "2026-07-09"])
    ).toBe("2026-07-10");
  });

  it("falls back to the competition date", () => {
    expect(competitionLastDate("2026-07-08", [])).toBe("2026-07-08");
  });

  it("returns null when nothing is dated", () => {
    expect(competitionLastDate(null, [null, ""])).toBeNull();
  });
});
