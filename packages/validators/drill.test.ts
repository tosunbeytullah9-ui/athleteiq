import { describe, expect, it } from "vitest";
import {
  buildDrillRender,
  drillDiagramSchema,
  drillPxToUnits,
  drillTotalDistance,
  emptyDrillDiagram,
  formatDrillDistance,
  hasDrawableContent,
  parseDrillDiagram,
  routeDistance,
  snapToGrid,
  usedMovements,
  DRILL_TEMPLATES,
  type DrillDiagram,
} from "./drill";

function template(key: string): DrillDiagram {
  const t = DRILL_TEMPLATES.find((x) => x.key === key);
  if (!t) throw new Error(`şablon yok: ${key}`);
  return t.diagram;
}

describe("drillDiagramSchema", () => {
  it("tüm hazır şablonlar şemadan geçer", () => {
    for (const t of DRILL_TEMPLATES) {
      expect(drillDiagramSchema.safeParse(t.diagram).success, t.key).toBe(true);
    }
  });

  it("şablon anahtarları benzersiz", () => {
    const keys = DRILL_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("saha dışındaki noktayı reddeder", () => {
    const d = { ...emptyDrillDiagram(10, 10), cones: [{ x: 11, y: 2 }] };
    expect(drillDiagramSchema.safeParse(d).success).toBe(false);
  });

  it("bilinmeyen hareket tipini reddeder", () => {
    const d = { ...emptyDrillDiagram(), routes: [{ steps: [{ x: 1, y: 1 }, { x: 2, y: 2, move: "fly" }] }] };
    expect(drillDiagramSchema.safeParse(d).success).toBe(false);
  });

  it("saha sınırlarını zorlar (4–60)", () => {
    expect(drillDiagramSchema.safeParse(emptyDrillDiagram(3, 10)).success).toBe(false);
    expect(drillDiagramSchema.safeParse(emptyDrillDiagram(61, 10)).success).toBe(false);
    expect(drillDiagramSchema.safeParse(emptyDrillDiagram(60, 4)).success).toBe(true);
  });

  it("eksik labels/showDistances varsayılanla doldurulur", () => {
    const parsed = parseDrillDiagram({ v: 1, width: 10, height: 10, cones: [], routes: [] });
    expect(parsed?.labels).toEqual([]);
    expect(parsed?.showDistances).toBe(false);
  });

  it("bozuk jsonb için null döner", () => {
    expect(parseDrillDiagram(null)).toBeNull();
    expect(parseDrillDiagram({ v: 2 })).toBeNull();
    expect(parseDrillDiagram("x")).toBeNull();
  });
});

describe("mesafe", () => {
  it("kutu drill'i 40", () => {
    expect(drillTotalDistance(template("box-sprint"))).toBe(40);
  });

  it("Pro Agility 5-10-5 = 20", () => {
    expect(drillTotalDistance(template("pro-agility"))).toBe(20);
  });

  it("T-Test = 40", () => {
    expect(drillTotalDistance(template("t-test"))).toBe(40);
  });

  it("çapraz bölüm hipotenüs olarak hesaplanır", () => {
    expect(routeDistance({ steps: [{ x: 0, y: 0 }, { x: 3, y: 4 }] })).toBe(5);
  });

  it("tek noktalı / boş rota 0", () => {
    expect(routeDistance({ steps: [] })).toBe(0);
    expect(routeDistance({ steps: [{ x: 1, y: 1 }] })).toBe(0);
  });

  it("formatDrillDistance yarım birime yuvarlar, Türkçe ondalık", () => {
    expect(formatDrillDistance(40, "yd")).toBe("40 yd");
    expect(formatDrillDistance(12.5, "m")).toBe("12,5 m");
    expect(formatDrillDistance(20.1, "m")).toBe("20 m");
    expect(formatDrillDistance(14.14, "m")).toBe("14 m");
    expect(formatDrillDistance(14.3, "yd")).toBe("14,5 yd");
  });
});

describe("yardımcılar", () => {
  it("snapToGrid yarım birime oturtur ve sahaya kırpar", () => {
    expect(snapToGrid(3.26, 10)).toBe(3.5);
    expect(snapToGrid(3.24, 10)).toBe(3);
    expect(snapToGrid(-1, 10)).toBe(0);
    expect(snapToGrid(12, 10)).toBe(10);
  });

  it("usedMovements lejant sırasıyla, ilk adımı saymaz", () => {
    expect(usedMovements(template("box-mixed"))).toEqual(["sprint", "backpedal", "shuffle", "carioca"]);
    expect(usedMovements({ ...emptyDrillDiagram(), routes: [{ steps: [{ x: 1, y: 1, move: "jog" }] }] })).toEqual([]);
  });

  it("move verilmemiş bölüm sprint sayılır", () => {
    const d = { ...emptyDrillDiagram(), routes: [{ steps: [{ x: 1, y: 1 }, { x: 5, y: 1 }] }] };
    expect(usedMovements(d)).toEqual(["sprint"]);
  });

  it("hasDrawableContent", () => {
    expect(hasDrawableContent(emptyDrillDiagram())).toBe(false);
    expect(hasDrawableContent(template("zigzag"))).toBe(true);
  });

  it("drillPxToUnits, render koordinatlarının tersidir", () => {
    const d = template("t-test");
    const r = buildDrillRender(d);
    const cone = r.cones[1]!; // B (7,2)
    const back = drillPxToUnits(d, cone.x, cone.y);
    expect(back.x).toBeCloseTo(7);
    expect(back.y).toBeCloseTo(2);
  });
});

describe("buildDrillRender", () => {
  it("uzun kenar 600 piksele ölçeklenir", () => {
    const r = buildDrillRender(template("flying-sprint")); // 44×8
    expect(r.field.width).toBeCloseTo(600);
    expect(r.field.height).toBeCloseTo(600 * (8 / 44));
    expect(r.vbWidth).toBeCloseTo(600 + r.pad * 2);
  });

  it("ana ızgara 5 birimde bir", () => {
    const r = buildDrillRender(emptyDrillDiagram(10, 10));
    // x: 0,5,10 + y: 0,5,10
    expect(r.majorGrid).toHaveLength(6);
    expect(r.minorGrid).toHaveLength(16);
  });

  it("her bölüm bir path, son bölümde bitiş oku var", () => {
    const r = buildDrillRender(template("box-sprint"));
    const route = r.routes[0]!;
    expect(route.segments).toHaveLength(4);
    expect(route.endArrow).not.toBeNull();
    expect(route.start).not.toBeNull();
    expect(route.distance).toBe(40);
  });

  it("üst üste binen gidiş-dönüş bölümleri şeritlere ayrılır", () => {
    const r = buildDrillRender(template("pro-agility"));
    const ys = r.routes[0]!.segments.map((s) => {
      const m = /^M[\d.]+ ([\d.]+)/.exec(s.d);
      return Number(m![1]);
    });
    // Dönüş (10) gidişlerin (5 + 5) üstüne binmesin diye ayrı şeritte; iki 5'lik
    // bölüm birbiriyle çakışmadığı için ana şeritte kalır.
    expect(ys[1]).not.toBe(ys[0]);
    expect(ys[2]).toBe(ys[0]);
  });

  it("çakışmayan bölümler kaydırılmaz", () => {
    const r = buildDrillRender(template("box-sprint"));
    const first = r.routes[0]!.segments[0]!;
    const cone = r.cones[0]!; // (2,12) — rota başlangıcı
    const m = /^M([\d.]+) ([\d.]+)/.exec(first.d)!;
    expect(Number(m[1])).toBeCloseTo(cone.x, 1);
    expect(Number(m[2])).toBeCloseTo(cone.y, 1);
  });

  it("çapraz adım dalgalı path üretir, diğerleri düz", () => {
    const d: DrillDiagram = {
      ...emptyDrillDiagram(),
      routes: [
        {
          steps: [
            { x: 1, y: 1 },
            { x: 10, y: 1, move: "crossover" },
            { x: 10, y: 8, move: "sprint" },
          ],
        },
      ],
    };
    const [wave, line] = buildDrillRender(d).routes[0]!.segments;
    expect(wave!.d.split("L").length).toBeGreaterThan(10);
    expect(line!.d.split("L")).toHaveLength(2);
  });

  it("koni dönüşü çember + yön oku üretir", () => {
    const r = buildDrillRender(template("box-360"));
    expect(r.routes[0]!.turns).toHaveLength(3);
    expect(r.routes[0]!.turns[0]!.d).toContain("A");
  });

  it("showDistances açıkken bölüm uzunluğu etiketi", () => {
    const d = { ...template("pro-agility"), showDistances: true };
    const labels = buildDrillRender(d).routes[0]!.segments.map((s) => s.label?.text);
    expect(labels).toEqual(["5", "10", "5"]);
  });

  it("showDistances kapalıyken etiket yok", () => {
    const labels = buildDrillRender(template("pro-agility")).routes[0]!.segments.map((s) => s.label);
    expect(labels.every((l) => l === null)).toBe(true);
  });

  it("aynı noktaya tekrar tıklanan (sıfır uzunluk) bölüm atlanır", () => {
    const d: DrillDiagram = {
      ...emptyDrillDiagram(),
      routes: [{ steps: [{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 5, y: 1 }] }],
    };
    expect(buildDrillRender(d).routes[0]!.segments).toHaveLength(1);
  });
});
