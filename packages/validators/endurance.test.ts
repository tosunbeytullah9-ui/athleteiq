import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  parseDurationInput,
  parseDistanceInput,
  formatDurationInput,
  formatDistanceInput,
  formatDuration,
  formatDistance,
  formatPace,
  segmentTotals,
  summarizeEnduranceSegments,
  suggestedDurationMin,
  describeSegment,
  formatEnduranceSummary,
  enduranceSegmentFormSchema,
  enduranceSegmentToRow,
  enduranceRowToSegment,
  newEnduranceSegment,
  refineEnduranceSession,
  segmentInsertIndex,
  type EnduranceSegmentLike,
} from "./endurance";

function seg(partial: Partial<EnduranceSegmentLike>): EnduranceSegmentLike {
  return {
    segment_type: "steady",
    segment_repeats: null,
    segment_distance_m: null,
    segment_duration_sec: null,
    intensity_zone: null,
    intensity_target: null,
    rest_sec: null,
    segment_recovery_target: null,
    ...partial,
  };
}

describe("parseDurationInput", () => {
  it("çıplak sayı dakikadır", () => {
    expect(parseDurationInput("45")).toBe(2700);
    expect(parseDurationInput("1,5")).toBe(90);
    expect(parseDurationInput("20 dk")).toBe(1200);
    expect(parseDurationInput("20dk")).toBe(1200);
  });

  it("dk:sn ve sa:dk:sn biçimleri", () => {
    expect(parseDurationInput("4:30")).toBe(270);
    expect(parseDurationInput("1:05:00")).toBe(3900);
    expect(Number.isNaN(parseDurationInput("4:75"))).toBe(true);
  });

  it("saniye ve saat birimleri", () => {
    expect(parseDurationInput("30 sn")).toBe(30);
    expect(parseDurationInput("30 saniye")).toBe(30);
    expect(parseDurationInput("90s")).toBe(90);
    expect(parseDurationInput("1 sa")).toBe(3600);
    expect(parseDurationInput("1,5 saat")).toBe(5400);
  });

  it("boş → null, anlamsız → NaN", () => {
    expect(parseDurationInput("")).toBeNull();
    expect(parseDurationInput("   ")).toBeNull();
    expect(parseDurationInput(undefined)).toBeNull();
    expect(Number.isNaN(parseDurationInput("abc"))).toBe(true);
    expect(Number.isNaN(parseDurationInput("0"))).toBe(true);
    expect(Number.isNaN(parseDurationInput("-5"))).toBe(true);
  });
});

describe("parseDistanceInput", () => {
  it("çıplak sayı metredir", () => {
    expect(parseDistanceInput("400")).toBe(400);
    expect(parseDistanceInput("400 m")).toBe(400);
  });

  it("km / k birimleri, Türkçe ondalık", () => {
    expect(parseDistanceInput("5 km")).toBe(5000);
    expect(parseDistanceInput("5k")).toBe(5000);
    expect(parseDistanceInput("1,5 km")).toBe(1500);
    expect(parseDistanceInput("21.1km")).toBe(21100);
  });

  it("boş → null, anlamsız → NaN", () => {
    expect(parseDistanceInput("")).toBeNull();
    expect(Number.isNaN(parseDistanceInput("uzun"))).toBe(true);
    expect(Number.isNaN(parseDistanceInput("0"))).toBe(true);
  });
});

describe("form metni gidiş-dönüş", () => {
  it.each([30, 90, 270, 1200, 2700, 3900])("süre %i sn aynı değere döner", (sec) => {
    expect(parseDurationInput(formatDurationInput(sec))).toBe(sec);
  });

  it.each([200, 400, 1000, 1500, 5000, 21100])("mesafe %i m aynı değere döner", (m) => {
    expect(parseDistanceInput(formatDistanceInput(m))).toBe(m);
  });
});

describe("görüntüleme", () => {
  it("formatDuration", () => {
    expect(formatDuration(30)).toBe("30 sn");
    expect(formatDuration(2700)).toBe("45 dk");
    expect(formatDuration(270)).toBe("4 dk 30 sn");
    expect(formatDuration(3900)).toBe("1 sa 5 dk");
  });

  it("formatDistance", () => {
    expect(formatDistance(400)).toBe("400 m");
    expect(formatDistance(5000)).toBe("5 km");
    expect(formatDistance(1500)).toBe("1,5 km");
    expect(formatDistance(21097)).toBe("21,1 km");
  });

  it("formatPace modaliteye göre birim seçer", () => {
    expect(formatPace("run", 1000, 240)).toBe("4:00 /km");
    expect(formatPace("row", 2000, 480)).toBe("2:00 /500 m");
    expect(formatPace("swim", 100, 95)).toBe("1:35 /100 m");
    expect(formatPace("bike", 30000, 3600)).toBe("30 km/sa");
    expect(formatPace("run", null, 240)).toBeNull();
  });
});

describe("segmentTotals", () => {
  it("interval: tekrar × mesafe/süre + (tekrar-1) × toparlanma", () => {
    const t = segmentTotals(
      seg({ segment_type: "interval", segment_repeats: 8, segment_distance_m: 400, segment_duration_sec: 90, rest_sec: 60 })
    );
    expect(t).toEqual({ repeats: 8, distanceM: 3200, workSec: 720, recoverySec: 420, totalSec: 1140 });
  });

  it("interval olmayan bölümde tekrar ve toparlanma yok sayılır", () => {
    const t = segmentTotals(seg({ segment_type: "steady", segment_repeats: 5, segment_duration_sec: 1200, rest_sec: 60 }));
    expect(t.repeats).toBe(1);
    expect(t.totalSec).toBe(1200);
  });

  it("yalnızca mesafe girilmişse süre bilinmez", () => {
    const t = segmentTotals(seg({ segment_distance_m: 5000 }));
    expect(t.workSec).toBeNull();
    expect(t.totalSec).toBeNull();
  });
});

describe("summarizeEnduranceSegments", () => {
  // Canlı veride koçun For Time'a sıkıştırdığı seans: 10 × (30 sn %80 + 90 sn %50)
  const segments = [
    seg({ segment_type: "warmup", segment_duration_sec: 600, intensity_zone: 1 }),
    seg({ segment_type: "interval", segment_repeats: 10, segment_duration_sec: 30, rest_sec: 90, intensity_zone: 4 }),
    seg({ segment_type: "cooldown", segment_duration_sec: 300, intensity_zone: 1 }),
  ];

  it("toplam süre ve bölge dağılımı", () => {
    const s = summarizeEnduranceSegments(segments);
    expect(s.totalDurationSec).toBe(600 + 300 + 810 + 300);
    expect(s.durationIncomplete).toBe(false);
    expect(s.zoneWorkSec).toEqual([900, 0, 0, 300, 0]);
  });

  it("önerilen seans süresi yukarı yuvarlanır", () => {
    expect(suggestedDurationMin(segments)).toBe(34);
  });

  it("süresi bilinmeyen bölüm varsa öneri yok ve özet ~ ile işaretlenir", () => {
    const mixed = [...segments, seg({ segment_distance_m: 2000 })];
    expect(suggestedDurationMin(mixed)).toBeNull();
    expect(formatEnduranceSummary("run", mixed)).toBe("Koşu · 2 km · ~33 dk 30 sn");
  });

  it("boş seans yalnızca modaliteyi gösterir", () => {
    expect(formatEnduranceSummary("bike", [])).toBe("Bisiklet");
  });
});

describe("describeSegment", () => {
  it("interval mesafe + yoğunluk + toparlanma + tempo", () => {
    const d = describeSegment(
      seg({
        segment_type: "interval",
        segment_repeats: 6,
        segment_distance_m: 1000,
        segment_duration_sec: 240,
        intensity_zone: 4,
        intensity_target: "%85 tempo",
        rest_sec: 120,
        segment_recovery_target: "yürüyüş",
      }),
      "run"
    );
    expect(d).toEqual({
      volume: "6 × (1 km · 4 dk)",
      intensity: "Z4 · %85 tempo",
      recovery: "Toparlanma 2 dk · yürüyüş",
      pace: "4:00 /km",
    });
  });

  it("tek tekrarlı sürekli bölüm", () => {
    const d = describeSegment(seg({ segment_duration_sec: 1800, intensity_target: "%60-70 tempo" }), "run");
    expect(d.volume).toBe("30 dk");
    expect(d.intensity).toBe("%60-70 tempo");
    expect(d.recovery).toBeNull();
  });
});

describe("enduranceSegmentFormSchema", () => {
  it("mesafe veya süre zorunlu", () => {
    expect(enduranceSegmentFormSchema.safeParse({ segment_type: "steady" }).success).toBe(false);
    expect(enduranceSegmentFormSchema.safeParse({ segment_type: "steady", duration: "20" }).success).toBe(true);
    expect(enduranceSegmentFormSchema.safeParse({ segment_type: "steady", distance: "5 km" }).success).toBe(true);
  });

  it("anlaşılamayan süre/mesafe reddedilir", () => {
    expect(enduranceSegmentFormSchema.safeParse({ segment_type: "steady", duration: "biraz" }).success).toBe(false);
    expect(enduranceSegmentFormSchema.safeParse({ segment_type: "steady", distance: "uzun" }).success).toBe(false);
  });

  it("hızlı ekleme varsayılanları geçerlidir (interval hariç — hacmi koç girer)", () => {
    expect(enduranceSegmentFormSchema.safeParse(newEnduranceSegment("warmup")).success).toBe(true);
    expect(enduranceSegmentFormSchema.safeParse(newEnduranceSegment("cooldown")).success).toBe(true);
    expect(enduranceSegmentFormSchema.safeParse(newEnduranceSegment("interval")).success).toBe(false);
  });
});

describe("segmentInsertIndex", () => {
  const types = ["warmup", "steady", "cooldown"];
  it("ısınma baştaki ısınmaların sonuna", () => {
    expect(segmentInsertIndex(types, "warmup")).toBe(1);
    expect(segmentInsertIndex(["steady"], "warmup")).toBe(0);
  });
  it("ana bölümler sondaki soğumanın önüne", () => {
    expect(segmentInsertIndex(types, "interval")).toBe(2);
    expect(segmentInsertIndex(["warmup", "cooldown", "cooldown"], "steady")).toBe(1);
    expect(segmentInsertIndex([], "interval")).toBe(0);
  });
  it("soğuma en sona", () => {
    expect(segmentInsertIndex(types, "cooldown")).toBe(3);
  });
});

describe("refineEnduranceSession (sessionSchema.superRefine)", () => {
  const sessionSchema = z
    .object({ endurance_modality: z.string().optional(), endurance_segments: z.array(z.any()).default([]) })
    .superRefine(refineEnduranceSession);

  it("dayanıklılık seansı DEĞİLSE bozuk bölümler kaydı kilitlemez", () => {
    const res = sessionSchema.safeParse({ endurance_segments: [{ segment_type: "steady", duration: "biraz" }] });
    expect(res.success).toBe(true);
  });

  it("dayanıklılık seansında bölüm hatası doğru path'e düşer", () => {
    const res = sessionSchema.safeParse({
      endurance_modality: "run",
      endurance_segments: [{ segment_type: "warmup", duration: "10" }, { segment_type: "interval" }],
    });
    expect(res.success).toBe(false);
    expect(res.error?.issues.map((i) => i.path.join("."))).toEqual(["endurance_segments.1.duration"]);
  });

  it("bölümsüz dayanıklılık seansı reddedilir", () => {
    const res = sessionSchema.safeParse({ endurance_modality: "bike", endurance_segments: [] });
    expect(res.success).toBe(false);
  });
});

describe("form ↔ DB satırı", () => {
  it("interval olmayan bölümde tekrar/toparlanma DB'ye yazılmaz", () => {
    const row = enduranceSegmentToRow({
      segment_type: "steady",
      repeats: 4,
      duration: "30",
      rest_sec: 60,
      recovery_target: "jog",
    });
    expect(row.segment_repeats).toBeNull();
    expect(row.rest_sec).toBeNull();
    expect(row.segment_recovery_target).toBeNull();
    expect(row.segment_duration_sec).toBe(1800);
  });

  it("DB satırı forma geri döner ve tekrar aynı satırı üretir", () => {
    const original = seg({
      segment_type: "interval",
      segment_repeats: 8,
      segment_distance_m: 400,
      segment_duration_sec: 75,
      intensity_zone: 5,
      intensity_target: "1:15",
      rest_sec: 90,
      segment_recovery_target: "%50 tempo jog",
    });
    const form = enduranceRowToSegment({ ...original, name: "İnterval", notes: null });
    expect(form.name).toBeUndefined();
    expect(enduranceSegmentToRow(form)).toEqual(original);
  });
});
