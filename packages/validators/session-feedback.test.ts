import { describe, expect, it } from "vitest";
import {
  sessionFeedbackSchema,
  computeSessionLoad,
  resolveSessionDate,
  isFeedbackEditable,
  FEEDBACK_EDIT_WINDOW_DAYS,
} from "./session-feedback";

/**
 * Bu şemanın tek işi, DB'deki session_feedback_load_shape check constraint'ini
 * (20260917072700_session_feedback.sql) istemci tarafında birebir taklit etmek —
 * sporcu kaydedilemeyecek bir formu göndermeden önce hatayı görsün. Testler bu
 * eşleşmeyi koruyor.
 */
describe("sessionFeedbackSchema — DB check constraint eşleşmesi", () => {
  it("tamamlanan seansta RPE + süre zorunludur", () => {
    const ok = sessionFeedbackSchema.safeParse({
      status: "completed",
      rpe: 8,
      duration_min: 60,
      has_pain: false,
    });
    expect(ok.success).toBe(true);
  });

  it("tamamlanan seansta RPE eksikse reddeder", () => {
    const res = sessionFeedbackSchema.safeParse({
      status: "completed",
      duration_min: 60,
      has_pain: false,
    });
    expect(res.success).toBe(false);
    expect(res.success === false && res.error.issues[0]?.path).toEqual(["rpe"]);
  });

  it("tamamlanan seansta süre eksikse reddeder", () => {
    const res = sessionFeedbackSchema.safeParse({
      status: "partial",
      rpe: 5,
      has_pain: false,
    });
    expect(res.success).toBe(false);
    expect(res.success === false && res.error.issues[0]?.path).toEqual(["duration_min"]);
  });

  it("yapılmayan seansta RPE/süre null olmalıdır", () => {
    expect(
      sessionFeedbackSchema.safeParse({ status: "skipped", has_pain: false }).success
    ).toBe(true);
    expect(
      sessionFeedbackSchema.safeParse({
        status: "skipped",
        rpe: 7,
        has_pain: false,
      }).success
    ).toBe(false);
  });

  it("RPE 0 kabul etmez (0 yerine status='skipped' kullanılır)", () => {
    const res = sessionFeedbackSchema.safeParse({
      status: "completed",
      rpe: 0,
      duration_min: 30,
      has_pain: false,
    });
    expect(res.success).toBe(false);
  });
});

describe("computeSessionLoad", () => {
  it("sRPE = RPE × süre", () => {
    expect(computeSessionLoad(8, 60)).toBe(480);
  });

  it("eksik girdide null döner (generated kolonla aynı davranış)", () => {
    expect(computeSessionLoad(null, 60)).toBeNull();
    expect(computeSessionLoad(8, null)).toBeNull();
  });
});

describe("resolveSessionDate", () => {
  it("program başlangıcı + (gün - 1) verir", () => {
    expect(resolveSessionDate("2026-09-14", 1)).toBe("2026-09-14");
    expect(resolveSessionDate("2026-09-14", 3)).toBe("2026-09-16");
    expect(resolveSessionDate("2026-09-14", 7)).toBe("2026-09-20");
  });

  it("ay sınırını doğru aşar", () => {
    expect(resolveSessionDate("2026-09-28", 7)).toBe("2026-10-04");
  });

  it("start_date yoksa null döner (DB trigger'ı bugüne atar)", () => {
    expect(resolveSessionDate(null, 3)).toBeNull();
  });
});

describe("isFeedbackEditable — RLS penceresiyle aynı sınır", () => {
  const today = "2026-09-17";

  it("bugünkü seans düzenlenebilir", () => {
    expect(isFeedbackEditable(today, today)).toBe(true);
  });

  it("tam sınırdaki gün (current_date - 7) hâlâ düzenlenebilir", () => {
    expect(isFeedbackEditable("2026-09-10", today)).toBe(true);
    expect(FEEDBACK_EDIT_WINDOW_DAYS).toBe(7);
  });

  it("sınırın bir gün ötesi düzenlenemez", () => {
    expect(isFeedbackEditable("2026-09-09", today)).toBe(false);
  });

  it("tarih çözülemediyse düzenlenebilir sayılır", () => {
    expect(isFeedbackEditable(null, today)).toBe(true);
  });
});
