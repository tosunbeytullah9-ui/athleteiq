import { describe, it, expect } from "vitest";
import {
  createAnnualPlanSchema,
  annualPlanWeekSchema,
  weekStartDate,
  weekDateRange,
  weekIndexForDate,
  MAX_PLAN_WEEKS,
} from "./annual-plan";

/**
 * Hafta↔tarih eşlemesi özelliğin çekirdeği: yarışmalar (competitions.competition_date)
 * bu fonksiyonla ızgara sütununa düşürülüyor. Bir gün kayması, yarışmayı yanlış
 * haftada gösterir ve koç yanlış haftayı taperler.
 */
describe("weekStartDate / weekDateRange", () => {
  it("1. hafta sezon başlangıcının kendisidir", () => {
    expect(weekStartDate("2026-08-10", 1)).toBe("2026-08-10");
  });

  it("her hafta 7 gün ileri gider", () => {
    expect(weekStartDate("2026-08-10", 2)).toBe("2026-08-17");
    expect(weekStartDate("2026-08-10", 5)).toBe("2026-09-07");
    expect(weekStartDate("2026-08-10", 53)).toBe("2027-08-09");
  });

  it("ay ve yıl sınırlarını doğru aşar", () => {
    expect(weekStartDate("2026-12-28", 2)).toBe("2027-01-04");
  });

  it("artık yıl Şubatını doğru geçer", () => {
    // 2028 artık yıl — 29 Şubat var.
    expect(weekStartDate("2028-02-21", 2)).toBe("2028-02-28");
    expect(weekStartDate("2028-02-21", 3)).toBe("2028-03-06");
  });

  it("aralık 7 günlüktür (bitiş dahil)", () => {
    expect(weekDateRange("2026-08-10", 1)).toEqual({
      start: "2026-08-10",
      end: "2026-08-16",
    });
  });

  it("bozuk tarih biçiminde çökmez", () => {
    expect(weekStartDate("gecersiz", 3)).toBe("gecersiz");
  });
});

describe("weekIndexForDate", () => {
  const seasonStart = "2026-08-10";
  const totalWeeks = 52;

  it("sezon başlangıcı 1. haftadır", () => {
    expect(weekIndexForDate(seasonStart, totalWeeks, "2026-08-10")).toBe(1);
  });

  it("haftanın son günü hâlâ aynı haftadır", () => {
    expect(weekIndexForDate(seasonStart, totalWeeks, "2026-08-16")).toBe(1);
  });

  it("ertesi gün bir sonraki haftaya geçer", () => {
    expect(weekIndexForDate(seasonStart, totalWeeks, "2026-08-17")).toBe(2);
  });

  it("sezon başlangıcından önceki tarih null döner", () => {
    expect(weekIndexForDate(seasonStart, totalWeeks, "2026-08-09")).toBeNull();
  });

  it("plan aralığının sonundaki gün dahildir", () => {
    // 52. hafta: 2027-08-02 → 2027-08-08
    expect(weekIndexForDate(seasonStart, totalWeeks, "2027-08-08")).toBe(52);
  });

  it("plan aralığından sonraki tarih null döner", () => {
    expect(weekIndexForDate(seasonStart, totalWeeks, "2027-08-09")).toBeNull();
  });

  it("weekStartDate ile karşılıklı tutarlıdır", () => {
    for (const week of [1, 2, 13, 27, 52]) {
      const start = weekStartDate(seasonStart, week);
      expect(weekIndexForDate(seasonStart, totalWeeks, start)).toBe(week);
    }
  });

  it("bozuk tarihte null döner", () => {
    expect(weekIndexForDate(seasonStart, totalWeeks, "2026/08/10")).toBeNull();
  });
});

describe("createAnnualPlanSchema", () => {
  const base = {
    title: "2026-2027 Sezonu",
    season_start: "2026-08-10",
    total_weeks: 52,
  };

  it("takım planını kabul eder", () => {
    const r = createAnnualPlanSchema.safeParse({
      ...base,
      team_id: "11111111-1111-1111-1111-111111111111",
    });
    expect(r.success).toBe(true);
  });

  it("sporcu planını kabul eder", () => {
    const r = createAnnualPlanSchema.safeParse({
      ...base,
      athlete_id: "22222222-2222-2222-2222-222222222222",
    });
    expect(r.success).toBe(true);
  });

  // DB'deki annual_plans_scope_check ile birebir aynı kısıt — istemci tarafı
  // bunu taklit etmezse kullanıcı ancak sunucu hatasıyla öğrenir.
  it("hem takım hem sporcu verilirse reddeder (XOR)", () => {
    const r = createAnnualPlanSchema.safeParse({
      ...base,
      team_id: "11111111-1111-1111-1111-111111111111",
      athlete_id: "22222222-2222-2222-2222-222222222222",
    });
    expect(r.success).toBe(false);
  });

  it("ikisi de yoksa reddeder", () => {
    expect(createAnnualPlanSchema.safeParse(base).success).toBe(false);
  });

  it("hafta sınırını aşarsa reddeder", () => {
    const r = createAnnualPlanSchema.safeParse({
      ...base,
      team_id: "11111111-1111-1111-1111-111111111111",
      total_weeks: MAX_PLAN_WEEKS + 1,
    });
    expect(r.success).toBe(false);
  });

  it("hatalı tarih biçimini reddeder", () => {
    const r = createAnnualPlanSchema.safeParse({
      ...base,
      team_id: "11111111-1111-1111-1111-111111111111",
      season_start: "10.08.2026",
    });
    expect(r.success).toBe(false);
  });
});

describe("annualPlanWeekSchema", () => {
  it("boş yoğunluğu kabul eder (hafta işaretlenmemiş olabilir)", () => {
    const r = annualPlanWeekSchema.safeParse({ week_index: 3, intensity_pct: null });
    expect(r.success).toBe(true);
  });

  // Supramaksimal/eksantrik çalışmada %100+ gerçek bir reçete — kasıtlı olarak serbest.
  it("%100 üstü yoğunluğa izin verir", () => {
    expect(annualPlanWeekSchema.safeParse({ week_index: 3, intensity_pct: 110 }).success).toBe(
      true
    );
  });

  it("negatif yoğunluğu reddeder", () => {
    expect(annualPlanWeekSchema.safeParse({ week_index: 3, intensity_pct: -1 }).success).toBe(
      false
    );
  });

  it("%200 üstünü reddeder (DB check ile aynı sınır)", () => {
    expect(annualPlanWeekSchema.safeParse({ week_index: 3, intensity_pct: 201 }).success).toBe(
      false
    );
  });
});
