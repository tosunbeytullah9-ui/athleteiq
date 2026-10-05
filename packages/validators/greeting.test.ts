import { describe, expect, it } from "vitest";
import { getGreetingForHour, getTimeGreeting } from "./greeting";

describe("getGreetingForHour", () => {
  it("maps hour boundaries", () => {
    expect(getGreetingForHour(4)).toBe("İyi geceler");
    expect(getGreetingForHour(5)).toBe("Günaydın");
    expect(getGreetingForHour(11)).toBe("Günaydın");
    expect(getGreetingForHour(12)).toBe("İyi günler");
    expect(getGreetingForHour(17)).toBe("İyi günler");
    expect(getGreetingForHour(18)).toBe("İyi akşamlar");
    expect(getGreetingForHour(21)).toBe("İyi akşamlar");
    expect(getGreetingForHour(22)).toBe("İyi geceler");
    expect(getGreetingForHour(0)).toBe("İyi geceler");
  });
});

describe("getTimeGreeting", () => {
  it("uses the given time zone instead of the host clock", () => {
    // 06:30 UTC = 09:30 İstanbul (UTC+3)
    const d = new Date("2026-10-05T06:30:00Z");
    expect(getTimeGreeting(d, "Europe/Istanbul")).toBe("Günaydın");
    // 16:00 UTC = 19:00 İstanbul
    expect(getTimeGreeting(new Date("2026-10-05T16:00:00Z"), "Europe/Istanbul")).toBe(
      "İyi akşamlar",
    );
    // 21:30 UTC = 00:30 İstanbul
    expect(getTimeGreeting(new Date("2026-10-05T21:30:00Z"), "Europe/Istanbul")).toBe(
      "İyi geceler",
    );
  });
});
