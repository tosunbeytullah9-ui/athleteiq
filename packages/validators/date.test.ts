import { describe, expect, it } from "vitest";
import { dayOfWeekInIstanbul, istanbulDateOffset, todayInIstanbul } from "./date";

describe("todayInIstanbul", () => {
  it("UTC Pazar 22:30 → İstanbul Pazartesi", () => {
    const now = new Date("2026-10-25T22:30:00Z"); // Pazar
    expect(todayInIstanbul(now)).toBe("2026-10-26");
    expect(dayOfWeekInIstanbul(now)).toBe(1);
  });

  it("UTC 20:59 hâlâ aynı gün, 21:00 ertesi gün", () => {
    expect(todayInIstanbul(new Date("2026-10-27T20:59:59Z"))).toBe("2026-10-27");
    expect(todayInIstanbul(new Date("2026-10-27T21:00:00Z"))).toBe("2026-10-28");
  });

  it("yıl sınırı", () => {
    expect(todayInIstanbul(new Date("2026-12-31T21:30:00Z"))).toBe("2027-01-01");
  });

  it("cihaz saat diliminden bağımsız (Date anı üzerinden)", () => {
    // Pasifik 2026-10-26 17:00 (UTC-7) = UTC 2026-10-27 00:00 = İstanbul 03:00 Salı
    const now = new Date("2026-10-26T17:00:00-07:00");
    expect(todayInIstanbul(now)).toBe("2026-10-27");
    expect(dayOfWeekInIstanbul(now)).toBe(2);
  });
});

describe("dayOfWeekInIstanbul", () => {
  it("Pazar = 7", () => {
    expect(dayOfWeekInIstanbul(new Date("2026-11-01T09:00:00Z"))).toBe(7);
  });
});

describe("istanbulDateOffset", () => {
  it("7 gün öncesi İstanbul takvimiyle", () => {
    expect(istanbulDateOffset(-7, new Date("2026-10-25T22:30:00Z"))).toBe("2026-10-19");
  });
});
