import { describe, expect, it } from "vitest";
import {
  addDaysYmd,
  ageOnYmd,
  compareYmd,
  dayOfWeekInIstanbul,
  dayOfWeekLocal,
  dayOfWeekYmd,
  daysBetweenYmd,
  formatYmdTr,
  istanbulDateOffset,
  parseYmd,
  todayInIstanbul,
  todayLocal,
} from "./date";

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

describe("todayLocal / dayOfWeekLocal", () => {
  it("cihazın yerel takvim bileşenlerini kullanır", () => {
    // Yerel 2026-10-26 09:00 (hangi saat diliminde çalışırsa çalışsın yerel bileşenlerle kurulur)
    const now = new Date(2026, 9, 26, 9, 0, 0);
    expect(todayLocal(now)).toBe("2026-10-26");
    expect(dayOfWeekLocal(now)).toBe(1);
  });

  it("yerel gece yarısından hemen önce/sonra", () => {
    expect(todayLocal(new Date(2026, 9, 25, 23, 59, 59))).toBe("2026-10-25");
    expect(todayLocal(new Date(2026, 9, 26, 0, 0, 0))).toBe("2026-10-26");
    expect(dayOfWeekLocal(new Date(2026, 10, 1, 12))).toBe(7);
  });

  it("Tokyo Pazartesi 05:00 = İstanbul Pazar 23:00 — bilinçli olarak farklı", () => {
    const now = new Date("2026-10-26T05:00:00+09:00");
    expect(todayInIstanbul(now)).toBe("2026-10-25");
    expect(dayOfWeekInIstanbul(now)).toBe(7);
    if (process.env.TZ === "Asia/Tokyo") {
      expect(todayLocal(now)).toBe("2026-10-26");
      expect(dayOfWeekLocal(now)).toBe(1);
    }
  });
});

describe("parseYmd", () => {
  it("geçerli / geçersiz", () => {
    expect(parseYmd("2026-11-15")).toEqual({ y: 2026, m: 11, d: 15 });
    expect(parseYmd("2026-11-15T00:00:00Z")).toEqual({ y: 2026, m: 11, d: 15 });
    expect(parseYmd("2026-02-29")).toBeNull();
    expect(parseYmd("2028-02-29")).toEqual({ y: 2028, m: 2, d: 29 });
    expect(parseYmd("2026-13-01")).toBeNull();
    expect(parseYmd("15.11.2026")).toBeNull();
    expect(parseYmd("")).toBeNull();
    expect(parseYmd(null)).toBeNull();
  });
});

describe("addDaysYmd / daysBetweenYmd / dayOfWeekYmd / compareYmd", () => {
  it("demo yarışması: 27 Ekim → 16 Kasım = 20 gün", () => {
    expect(daysBetweenYmd("2026-10-27", "2026-11-16")).toBe(20);
    expect(daysBetweenYmd("2026-11-16", "2026-10-27")).toBe(-20);
    expect(daysBetweenYmd("2026-10-27", "2026-10-27")).toBe(0);
  });

  it("ay/yıl sınırı ve artık yıl", () => {
    expect(addDaysYmd("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysYmd("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysYmd("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetweenYmd("2026-03-28", "2026-03-30")).toBe(2); // ABD/AB yaz saati geçişi civarı
  });

  it("haftanın günü", () => {
    expect(dayOfWeekYmd("2026-10-26")).toBe(1);
    expect(dayOfWeekYmd("2026-11-15")).toBe(7);
  });

  it("string karşılaştırması takvim sırasıdır", () => {
    expect(compareYmd("2026-11-15", "2026-11-16")).toBe(-1);
    expect(["2026-11-15", "2026-02-01", "2026-10-30"].sort(compareYmd)).toEqual([
      "2026-02-01",
      "2026-10-30",
      "2026-11-15",
    ]);
    expect("2026-11-15" >= "2026-11-15").toBe(true);
  });
});

describe("ageOnYmd", () => {
  it("doğum gününden bir gün önce / doğum günü", () => {
    expect(ageOnYmd("2004-11-15", "2026-11-14")).toBe(21);
    expect(ageOnYmd("2004-11-15", "2026-11-15")).toBe(22);
    expect(ageOnYmd("bozuk", "2026-11-15")).toBeNull();
  });
});

describe("formatYmdTr", () => {
  it("saat diliminden bağımsız: 15 Kasım 2026", () => {
    expect(formatYmdTr("2026-11-15")).toBe("15 Kasım 2026");
  });

  it("stiller", () => {
    expect(formatYmdTr("2026-11-05", { style: "numeric" })).toBe("05.11.2026");
    expect(formatYmdTr("2026-11-05", { style: "numeric", withYear: false })).toBe("05.11");
    expect(formatYmdTr("2026-11-05", { style: "short", withYear: false })).toBe("5 Kas");
    expect(formatYmdTr("2026-11-15", { withYear: false })).toBe("15 Kasım");
    expect(formatYmdTr("2026-11-05", { style: "short", withYear: false, padDay: true })).toBe("05 Kas");
  });

  it("gün adı", () => {
    expect(formatYmdTr("2026-11-15", { withYear: false, withWeekday: true })).toBe("Pazar, 15 Kasım");
    expect(formatYmdTr("2026-11-16", { style: "short", withYear: false, withWeekday: true })).toBe(
      "Pzt, 16 Kas"
    );
  });

  it("geçersiz girdi boş string", () => {
    expect(formatYmdTr(null)).toBe("");
    expect(formatYmdTr("abc")).toBe("");
  });
});

describe("yarışma yaklaşan/geçmiş (string karşılaştırma)", () => {
  it("bugünkü yarışma yaklaşan", () => {
    const today = "2026-10-27";
    expect("2026-10-27" >= today).toBe(true);
    expect("2026-10-26" >= today).toBe(false);
  });
});
