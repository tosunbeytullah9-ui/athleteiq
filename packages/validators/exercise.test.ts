import { describe, expect, it } from "vitest";
import { normalizeExerciseName, toSafeHttpUrl } from "./exercise";

describe("normalizeExerciseName", () => {
  it("transliterates Turkish characters (case-sensitive map applied before lowercasing)", () => {
    expect(normalizeExerciseName("Ayı Yürüyüşü")).toBe("ayi yuruyusu");
  });

  it("folds the capital dotted İ correctly (not to i̇ combining-dot form)", () => {
    expect(normalizeExerciseName("İnverted Row")).toBe("inverted row");
  });

  it("is case-insensitive for plain ASCII names", () => {
    expect(normalizeExerciseName("Bench Press")).toBe(normalizeExerciseName("bench press"));
  });

  it("trims leading/trailing whitespace and collapses internal runs", () => {
    expect(normalizeExerciseName("  Back   Squat  ")).toBe("back squat");
  });

  it("produces the same key for differently-cased/spaced variants of the same lift", () => {
    const variants = ["Inverted Row", "inverted  row", "INVERTED ROW", " Inverted Row "];
    const normalized = new Set(variants.map(normalizeExerciseName));
    expect(normalized.size).toBe(1);
  });
});

describe("toSafeHttpUrl", () => {
  it("accepts http(s) links", () => {
    expect(toSafeHttpUrl("https://www.youtube.com/shorts/hWbUlkb5Ms4")).toBe(
      "https://www.youtube.com/shorts/hWbUlkb5Ms4"
    );
    expect(toSafeHttpUrl("  https://youtube.com/watch?v=aclHkVaku9U ")).toBe(
      "https://youtube.com/watch?v=aclHkVaku9U"
    );
  });

  it("rejects empty, malformed and non-http schemes", () => {
    expect(toSafeHttpUrl(null)).toBeNull();
    expect(toSafeHttpUrl("")).toBeNull();
    expect(toSafeHttpUrl("youtube.com/watch")).toBeNull();
    expect(toSafeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(toSafeHttpUrl("data:text/html,hi")).toBeNull();
  });
});
