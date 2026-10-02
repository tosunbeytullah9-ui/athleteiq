import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatDistance,
  formatPace,
  segmentTotals,
  summarizeEnduranceSegments,
  suggestedDurationMin,
  describeSegment,
  formatEnduranceSummary,
  enduranceSegmentFieldsSchema,
  enduranceSegmentToRow,
  enduranceRowToSegment,
  isEmptySegment,
  newEnduranceSegment,
  segmentInsertIndex,
  ENDURANCE_TEMPLATES,
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

describe("form modeli — hiçbir alan kaydı engellemez", () => {
  it("boş veya NaN sayılar şemadan geçer (undefined olur)", () => {
    const res = enduranceSegmentFieldsSchema.safeParse({
      segment_type: "steady",
      duration_sec: Number.NaN,
      distance_m: null,
      intensity_zone: undefined,
    });
    expect(res.success).toBe(true);
    expect(res.success && res.data.duration_sec).toBeUndefined();
  });

  it("DB check'lerini ihlal edecek değerler null'a düşer", () => {
    const row = enduranceSegmentToRow({
      segment_type: "interval",
      repeats: 500,
      distance_m: -400,
      duration_sec: 0,
      intensity_zone: 9,
      rest_sec: 90,
    });
    expect(row.segment_repeats).toBe(1);
    expect(row.segment_distance_m).toBeNull();
    expect(row.segment_duration_sec).toBeNull();
    expect(row.intensity_zone).toBeNull();
    expect(row.rest_sec).toBe(90);
  });

  it("interval olmayan bölümde tekrar/toparlanma DB'ye yazılmaz", () => {
    const row = enduranceSegmentToRow({
      segment_type: "steady",
      repeats: 4,
      duration_sec: 1800,
      rest_sec: 60,
      recovery_target: "jog",
    });
    expect(row.segment_repeats).toBeNull();
    expect(row.rest_sec).toBeNull();
    expect(row.segment_recovery_target).toBeNull();
    expect(row.segment_duration_sec).toBe(1800);
  });

  it("isEmptySegment: mesafe/süre/hedef/not yoksa boş sayılır", () => {
    expect(isEmptySegment({ segment_type: "steady", intensity_zone: 2 })).toBe(true);
    expect(isEmptySegment({ segment_type: "steady", duration_sec: 600 })).toBe(false);
    expect(isEmptySegment({ segment_type: "steady", intensity_target: "rahat" })).toBe(false);
    expect(isEmptySegment({ segment_type: "steady", notes: "çim zemin" })).toBe(false);
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

  it("hızlı ekleme varsayılanları dolu bir bölüm üretir", () => {
    for (const t of ["warmup", "steady", "interval", "recovery", "cooldown"] as const) {
      expect(isEmptySegment(newEnduranceSegment(t))).toBe(false);
    }
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

describe("ENDURANCE_TEMPLATES", () => {
  it("her şablon şemadan geçer ve boş bölüm içermez", () => {
    for (const t of ENDURANCE_TEMPLATES) {
      for (const s of t.segments) {
        expect(enduranceSegmentFieldsSchema.safeParse(s).success).toBe(true);
        expect(isEmptySegment(s)).toBe(false);
      }
    }
  });

  it("İnterval 30/90 koçun canlı verideki seansıyla aynı süreyi verir", () => {
    const t = ENDURANCE_TEMPLATES.find((x) => x.id === "interval-30-90")!;
    expect(suggestedDurationMin(t.segments.map(enduranceSegmentToRow))).toBe(34);
  });

  it("şablon kimlikleri benzersiz", () => {
    const ids = ENDURANCE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
