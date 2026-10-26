import { describe, expect, it } from "vitest";
import {
  accountDeletionReasonSchema,
  accountDeletionRejectNoteSchema,
  daysUntilDue,
  deletionConfirmationMatches,
  isDeletionUrgent,
} from "./account-deletion";

describe("daysUntilDue", () => {
  const now = new Date("2026-10-26T12:00:00Z");

  it("tam 30 gün sonrası → 30", () => {
    expect(daysUntilDue("2026-11-25T12:00:00Z", now)).toBe(30);
  });

  it("kısmi günü yukarı yuvarlar", () => {
    expect(daysUntilDue("2026-10-28T13:00:00Z", now)).toBe(3);
  });

  it("son tarih geçtiyse 0 veya negatif", () => {
    expect(daysUntilDue("2026-10-26T11:00:00Z", now)).toBe(0);
    expect(daysUntilDue("2026-10-24T12:00:00Z", now)).toBe(-2);
  });

  it("Date nesnesini de kabul eder", () => {
    expect(daysUntilDue(new Date("2026-11-02T12:00:00Z"), now)).toBe(7);
  });
});

describe("isDeletionUrgent", () => {
  it("7 gün ve altı acil", () => {
    expect(isDeletionUrgent(7)).toBe(true);
    expect(isDeletionUrgent(0)).toBe(true);
    expect(isDeletionUrgent(-3)).toBe(true);
    expect(isDeletionUrgent(8)).toBe(false);
  });
});

describe("accountDeletionReasonSchema", () => {
  it("boş not undefined olur (RPC'ye null gider)", () => {
    expect(accountDeletionReasonSchema.parse("   ")).toBeUndefined();
    expect(accountDeletionReasonSchema.parse(undefined)).toBeUndefined();
  });

  it("500 karakteri aşan notu reddeder", () => {
    expect(accountDeletionReasonSchema.safeParse("a".repeat(500)).success).toBe(true);
    expect(accountDeletionReasonSchema.safeParse("a".repeat(501)).success).toBe(false);
  });
});

describe("accountDeletionRejectNoteSchema", () => {
  it("boş veya yalnızca boşluk gerekçeyi reddeder", () => {
    expect(accountDeletionRejectNoteSchema.safeParse("").success).toBe(false);
    expect(accountDeletionRejectNoteSchema.safeParse("   ").success).toBe(false);
  });

  it("gerekçeyi kırpar", () => {
    expect(accountDeletionRejectNoteSchema.parse("  Sezon sonu  ")).toBe("Sezon sonu");
  });
});

describe("deletionConfirmationMatches", () => {
  it("kullanıcı adı birebir eşleşmeli (kenar boşlukları tolere edilir)", () => {
    expect(deletionConfirmationMatches(" ayse.yilmaz ", "ayse.yilmaz")).toBe(true);
    expect(deletionConfirmationMatches("Ayse.Yilmaz", "ayse.yilmaz")).toBe(false);
    expect(deletionConfirmationMatches("ayse", "ayse.yilmaz")).toBe(false);
  });

  it("kullanıcı adı bilinmiyorsa hiçbir zaman geçmez", () => {
    expect(deletionConfirmationMatches("", null)).toBe(false);
    expect(deletionConfirmationMatches("x", null)).toBe(false);
  });
});
