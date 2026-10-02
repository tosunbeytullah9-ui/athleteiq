import { describe, expect, it } from "vitest";
import { addDays, dateRangesOverlap, defaultCopyStartDate, planBlockCopy } from "./program-copy";

describe("addDays", () => {
  it("ay ve yıl sınırını aşar", () => {
    expect(addDays("2026-09-28", 7)).toBe("2026-10-05");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("planBlockCopy — copy_program_block RPC ile aynı kural", () => {
  it("ardışık haftalar yeni başlangıçtan 7'şer gün ilerler", () => {
    // Canlı DB testinde RPC'nin ürettiği tarihlerle birebir (6 haftalık blok → 2026-12-07).
    const plan = planBlockCopy(
      ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"],
      "2026-12-07"
    );
    expect(plan.map((w) => w.start)).toEqual([
      "2026-12-07",
      "2026-12-14",
      "2026-12-21",
      "2026-12-28",
      "2027-01-04",
      "2027-01-11",
    ]);
    expect(plan[0]).toEqual({ weekIndex: 1, start: "2026-12-07", end: "2026-12-13" });
  });

  it("kaynaktaki boşluk (atlanan hafta) korunur", () => {
    const plan = planBlockCopy(["2026-09-07", "2026-09-21"], "2026-11-02");
    expect(plan.map((w) => w.start)).toEqual(["2026-11-02", "2026-11-16"]);
  });

  it("tarihi olmayan haftada (i-1)*7 kullanılır", () => {
    const plan = planBlockCopy([null, null], "2026-11-02");
    expect(plan.map((w) => w.start)).toEqual(["2026-11-02", "2026-11-09"]);
  });
});

describe("defaultCopyStartDate", () => {
  it("son haftadan hemen sonraki hafta", () => {
    expect(defaultCopyStartDate(["2026-09-28", "2026-10-05"])).toBe("2026-10-12");
    expect(defaultCopyStartDate([null])).toBeNull();
  });
});

describe("dateRangesOverlap", () => {
  it("kesişme ve uç değerler", () => {
    expect(dateRangesOverlap("2026-10-05", "2026-10-11", "2026-10-11", "2026-10-17")).toBe(true);
    expect(dateRangesOverlap("2026-10-05", "2026-10-11", "2026-10-12", "2026-10-18")).toBe(false);
  });
});
