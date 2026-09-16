import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mergeCycleIntoRawData } from "./index.ts";

const sampleCycle = {
  id: 999,
  start: "2026-09-14T05:00:00.000Z",
  end: "2026-09-15T05:00:00.000Z",
  score_state: "SCORED",
  score: { strain: 12.3, kilojoule: 4000, average_heart_rate: 90, max_heart_rate: 150 },
};

// index.ts import edildiğinde modül seviyesinde Deno.serve çalışır (bir listener
// açar) — sanitizer'lar kapatılmazsa "leaking resources" hatası verir. Test
// yalnızca saf mergeCycleIntoRawData fonksiyonunu hedeflediği için sunucunun
// kendisiyle ilgilenmiyoruz.
const testOpts = { sanitizeResources: false, sanitizeOps: false };

Deno.test({
  name: "mergeCycleIntoRawData: raw null gelirse yalnızca cycle içeren obje döner",
  ...testOpts,
  fn: () => {
    const result = mergeCycleIntoRawData(null, sampleCycle);
    assertEquals(result, { cycle: sampleCycle });
  },
});

Deno.test({
  name: "mergeCycleIntoRawData: sleep ve recovery anahtarları değişmeden kalır",
  ...testOpts,
  fn: () => {
    const sleep = { id: "sleep-1", start: "2026-09-14T22:00:00.000Z" };
    const recovery = { created_at: "2026-09-15T06:00:00.000Z" };
    const oldCycle = { id: 111, start: "2026-09-14T05:00:00.000Z", end: null };

    const raw = { cycle: oldCycle, sleep, recovery };
    const result = mergeCycleIntoRawData(raw, sampleCycle);

    assertEquals(result.sleep, sleep);
    assertEquals(result.recovery, recovery);
  },
});

Deno.test({
  name: "mergeCycleIntoRawData: cycle anahtarı yeni cycle ile değişir",
  ...testOpts,
  fn: () => {
    const oldCycle = { id: 111, start: "2026-09-14T05:00:00.000Z", end: null };
    const raw = { cycle: oldCycle };

    const result = mergeCycleIntoRawData(raw, sampleCycle);

    assertEquals(result.cycle, sampleCycle);
  },
});
