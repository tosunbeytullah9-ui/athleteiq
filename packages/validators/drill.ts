import { z } from "zod";

// Drill (koni) diyagramı — hız / hızlanma / çeviklik drill'leri için koni
// yerleşimi + rota. Web (SVG) ve mobil (react-native-svg) için TEK kaynak:
// şema, mesafe hesabı, çizim geometrisi ve hazır şablonlar burada; iki
// platform yalnızca buildDrillRender()'ın ürettiği path/polygon'ları çizer.
//
// Koordinatlar SAHA BİRİMİNDEDİR (metre ya da yarda — birim diyagramın
// içinde değil drill_diagrams.unit kolonunda durur, drill bazında seçilir).
// Orijin sol üst, y aşağı doğru artar (SVG ile aynı).

export const DRILL_UNITS = [
  { value: "m", label: "Metre", short: "m" },
  { value: "yd", label: "Yarda", short: "yd" },
] as const;
export type DrillUnit = (typeof DRILL_UNITS)[number]["value"];

export const DRILL_MOVEMENTS = [
  { value: "sprint", label: "Sprint" },
  { value: "backpedal", label: "Geri koşu" },
  { value: "shuffle", label: "Yan kayma (shuffle)" },
  { value: "carioca", label: "Carioca" },
  { value: "crossover", label: "Çapraz adım" },
  { value: "jog", label: "Hafif koşu / yavaşlama" },
] as const;
export type DrillMovement = (typeof DRILL_MOVEMENTS)[number]["value"];

const MOVEMENT_VALUES = DRILL_MOVEMENTS.map((m) => m.value) as [
  DrillMovement,
  ...DrillMovement[],
];

export const DRILL_MOVEMENT_LABELS: Record<DrillMovement, string> = Object.fromEntries(
  DRILL_MOVEMENTS.map((m) => [m.value, m.label])
) as Record<DrillMovement, string>;

export const DRILL_LIMITS = {
  minField: 4,
  maxField: 60,
  maxCones: 40,
  maxRoutes: 4,
  maxSteps: 60,
  maxLabels: 20,
  maxLabelLength: 24,
  maxConeLabelLength: 3,
} as const;

const coord = z.number().finite().min(0).max(DRILL_LIMITS.maxField);

const drillConeSchema = z.object({
  x: coord,
  y: coord,
  label: z.string().trim().max(DRILL_LIMITS.maxConeLabelLength).optional(),
});

const drillStepSchema = z.object({
  x: coord,
  y: coord,
  /** Bu noktaya GELEN bölümün hareket tipi (ilk adımda yok sayılır). */
  move: z.enum(MOVEMENT_VALUES).optional(),
  /** Bu noktadaki koninin etrafından tam dönüş (saat yönü / tersi). */
  turn: z.enum(["cw", "ccw"]).optional(),
});

const drillRouteSchema = z.object({
  steps: z.array(drillStepSchema).max(DRILL_LIMITS.maxSteps),
});

const drillLabelSchema = z.object({
  x: coord,
  y: coord,
  text: z.string().trim().min(1).max(DRILL_LIMITS.maxLabelLength),
});

export const drillDiagramSchema = z
  .object({
    v: z.literal(1),
    width: z.number().int().min(DRILL_LIMITS.minField).max(DRILL_LIMITS.maxField),
    height: z.number().int().min(DRILL_LIMITS.minField).max(DRILL_LIMITS.maxField),
    cones: z.array(drillConeSchema).max(DRILL_LIMITS.maxCones),
    routes: z.array(drillRouteSchema).max(DRILL_LIMITS.maxRoutes),
    labels: z.array(drillLabelSchema).max(DRILL_LIMITS.maxLabels).default([]),
    /** Her bölümün uzunluğunu çizgi üzerinde göster. */
    showDistances: z.boolean().default(false),
  })
  .superRefine((d, ctx) => {
    const points: { x: number; y: number }[] = [
      ...d.cones,
      ...d.labels,
      ...d.routes.flatMap((r) => r.steps),
    ];
    if (points.some((p) => p.x > d.width || p.y > d.height)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Diyagramdaki bir nokta saha sınırlarının dışında.",
      });
    }
  });

export type DrillDiagram = z.infer<typeof drillDiagramSchema>;
export type DrillCone = DrillDiagram["cones"][number];
export type DrillStep = DrillDiagram["routes"][number]["steps"][number];
export type DrillRoute = DrillDiagram["routes"][number];
export type DrillLabel = DrillDiagram["labels"][number];

/** DB'den gelen jsonb → doğrulanmış diyagram; bozuksa null (çizim hiç gösterilmez). */
export function parseDrillDiagram(value: unknown): DrillDiagram | null {
  const result = drillDiagramSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function emptyDrillDiagram(width = 20, height = 12): DrillDiagram {
  return { v: 1, width, height, cones: [], routes: [{ steps: [] }], labels: [], showDistances: false };
}

/** Editörün ızgara adımı — yarım birim (0,5 m / 0,5 yd). */
export function snapToGrid(value: number, max: number): number {
  const snapped = Math.round(value * 2) / 2;
  return Math.min(Math.max(snapped, 0), max);
}

// ---------------------------------------------------------------------------
// Mesafe
// ---------------------------------------------------------------------------

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Rotanın koşu mesafesi (koni etrafı dönüşler dahil edilmez — ihmal edilebilir). */
export function routeDistance(route: DrillRoute): number {
  let total = 0;
  for (let i = 1; i < route.steps.length; i++) {
    total += dist(route.steps[i - 1]!, route.steps[i]!);
  }
  return total;
}

export function drillTotalDistance(diagram: DrillDiagram): number {
  return diagram.routes.reduce((sum, r) => sum + routeDistance(r), 0);
}

/** 12.5 → "12,5 m"; yarım birime yuvarlanır (çizim ızgarası da yarım birimlik). */
export function formatDrillDistance(value: number, unit: DrillUnit): string {
  const rounded = Math.round(value * 2) / 2;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
  return `${text} ${unit === "yd" ? "yd" : "m"}`;
}

/** Diyagramda kullanılan hareket tipleri, DRILL_MOVEMENTS sırasıyla (lejant için). */
export function usedMovements(diagram: DrillDiagram): DrillMovement[] {
  const used = new Set<DrillMovement>();
  for (const r of diagram.routes) {
    r.steps.forEach((s, i) => {
      if (i > 0) used.add(s.move ?? "sprint");
    });
  }
  return MOVEMENT_VALUES.filter((m) => used.has(m));
}

export function hasDrawableContent(diagram: DrillDiagram): boolean {
  return diagram.cones.length > 0 || diagram.routes.some((r) => r.steps.length > 0);
}

// ---------------------------------------------------------------------------
// Çizim geometrisi — platformdan bağımsız (SVG path "d" + polygon "points")
// ---------------------------------------------------------------------------

/** Hareket tipi → çizgi stili. Kaynak görsellerdeki gelenekle aynı:
 *  sprint düz, geri koşu kesik, shuffle kareler, carioca noktalar, çapraz adım dalga. */
export const DRILL_STROKES: Record<
  DrillMovement,
  { width: number; dash?: string; cap: "round" | "butt"; opacity: number }
> = {
  sprint: { width: 3, cap: "round", opacity: 1 },
  backpedal: { width: 3, dash: "10 7", cap: "butt", opacity: 1 },
  shuffle: { width: 7, dash: "7 6", cap: "butt", opacity: 1 },
  carioca: { width: 5, dash: "0.1 10", cap: "round", opacity: 1 },
  crossover: { width: 2.5, cap: "round", opacity: 1 },
  jog: { width: 2, cap: "round", opacity: 0.55 },
};

/** Rota renkleri — açık ve koyu temada okunur orta tonlar. */
export const DRILL_ROUTE_COLORS = ["#2563eb", "#ea580c", "#16a34a", "#9333ea"] as const;
export const DRILL_CONE_COLOR = "#f97316";
export const DRILL_CONE_STROKE = "#9a3412";

const TARGET_LONG_SIDE = 600;
const PAD = 28;
const OVERLAP_STEP = 10;
const ARROW = 8;

export interface DrillPoint {
  x: number;
  y: number;
}
export interface DrillLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface DrillRenderSegment {
  d: string;
  movement: DrillMovement;
  /** Bölüm ortasındaki yön oku (polygon points). */
  arrow: string | null;
  length: number;
  label: (DrillPoint & { text: string }) | null;
}
export interface DrillRenderTurn {
  d: string;
  movement: DrillMovement;
  arrow: string;
}
export interface DrillRenderRoute {
  index: number;
  color: string;
  start: DrillPoint | null;
  segments: DrillRenderSegment[];
  turns: DrillRenderTurn[];
  endArrow: string | null;
  distance: number;
}
export interface DrillRender {
  /** viewBox genişliği / yüksekliği (piksel). */
  vbWidth: number;
  vbHeight: number;
  scale: number;
  pad: number;
  field: { x: number; y: number; width: number; height: number };
  minorGrid: DrillLine[];
  majorGrid: DrillLine[];
  coneSize: number;
  cones: (DrillPoint & { label?: string; points: string })[];
  routes: DrillRenderRoute[];
  labels: (DrillPoint & { text: string })[];
}

export function drillScale(diagram: Pick<DrillDiagram, "width" | "height">): number {
  return TARGET_LONG_SIDE / Math.max(diagram.width, diagram.height);
}

/** Ekran (viewBox pikseli) → saha birimi; editörün tıklama dönüşümü. */
export function drillPxToUnits(
  diagram: Pick<DrillDiagram, "width" | "height">,
  px: number,
  py: number
): DrillPoint {
  const s = drillScale(diagram);
  return { x: (px - PAD) / s, y: (py - PAD) / s };
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

function polygon(points: DrillPoint[]): string {
  return points.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(" ");
}

/** Ucu `tip`te, `dir` (birim vektör) yönünü gösteren üçgen. */
function arrowHead(tip: DrillPoint, dir: DrillPoint, size: number): string {
  const back = { x: tip.x - dir.x * size * 1.6, y: tip.y - dir.y * size * 1.6 };
  const perp = { x: -dir.y, y: dir.x };
  return polygon([
    tip,
    { x: back.x + perp.x * size, y: back.y + perp.y * size },
    { x: back.x - perp.x * size, y: back.y - perp.y * size },
  ]);
}

function wavePath(a: DrillPoint, b: DrillPoint): string {
  const len = dist(a, b);
  const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const perp = { x: -dir.y, y: dir.x };
  const amplitude = 4;
  const wavelength = 14;
  const steps = Math.max(2, Math.ceil(len / 3));
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * len;
    // Uçlarda dalga sönümlenir ki çizgi tam koniye otursun.
    const envelope = Math.min(1, t / 6, (len - t) / 6);
    const off = amplitude * envelope * Math.sin((2 * Math.PI * t) / wavelength);
    const x = a.x + dir.x * t + perp.x * off;
    const y = a.y + dir.y * t + perp.y * off;
    parts.push(`${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`);
  }
  return parts.join(" ");
}

/** İki bölüm aynı doğru üzerinde ve izdüşümleri çakışıyor mu (piksel uzayında). */
function collinearOverlap(a1: DrillPoint, a2: DrillPoint, b1: DrillPoint, b2: DrillPoint): boolean {
  const len = dist(a1, a2);
  if (len < 1e-6 || dist(b1, b2) < 1e-6) return false;
  const dir = { x: (a2.x - a1.x) / len, y: (a2.y - a1.y) / len };
  const lineDist = (p: DrillPoint) => Math.abs((p.x - a1.x) * dir.y - (p.y - a1.y) * dir.x);
  if (lineDist(b1) > 0.5 || lineDist(b2) > 0.5) return false;
  const proj = (p: DrillPoint) => (p.x - a1.x) * dir.x + (p.y - a1.y) * dir.y;
  const bMin = Math.min(proj(b1), proj(b2));
  const bMax = Math.max(proj(b1), proj(b2));
  return Math.min(len, bMax) - Math.max(0, bMin) > 1;
}

/** 0, +1, -1, +2, -2 … — üst üste binen gidiş-dönüşleri şeritlere ayırır. */
function laneOffset(index: number): number {
  if (index === 0) return 0;
  const k = Math.ceil(index / 2);
  return index % 2 === 1 ? k : -k;
}

export function buildDrillRender(diagram: DrillDiagram): DrillRender {
  const s = drillScale(diagram);
  const px = (p: { x: number; y: number }): DrillPoint => ({ x: PAD + p.x * s, y: PAD + p.y * s });
  const fieldW = diagram.width * s;
  const fieldH = diagram.height * s;

  const minorGrid: DrillLine[] = [];
  const majorGrid: DrillLine[] = [];
  for (let x = 0; x <= diagram.width; x++) {
    const line = { x1: PAD + x * s, y1: PAD, x2: PAD + x * s, y2: PAD + fieldH };
    (x % 5 === 0 ? majorGrid : minorGrid).push(line);
  }
  for (let y = 0; y <= diagram.height; y++) {
    const line = { x1: PAD, y1: PAD + y * s, x2: PAD + fieldW, y2: PAD + y * s };
    (y % 5 === 0 ? majorGrid : minorGrid).push(line);
  }

  const coneSize = Math.min(14, Math.max(8, s * 0.45));
  const cones = diagram.cones.map((c) => {
    const p = px(c);
    return {
      ...p,
      label: c.label || undefined,
      points: polygon([
        { x: p.x, y: p.y - coneSize },
        { x: p.x + coneSize * 0.75, y: p.y + coneSize * 0.6 },
        { x: p.x - coneSize * 0.75, y: p.y + coneSize * 0.6 },
      ]),
    };
  });

  const turnRadius = Math.min(18, Math.max(10, s * 0.55));

  const routes: DrillRenderRoute[] = diagram.routes.map((route, index) => {
    const color = DRILL_ROUTE_COLORS[index % DRILL_ROUTE_COLORS.length]!;
    const pts = route.steps.map(px);
    const segments: DrillRenderSegment[] = [];
    const drawn: { a: DrillPoint; b: DrillPoint; lane: number }[] = [];
    let lastDir: DrillPoint | null = null;
    let lastEnd: DrillPoint | null = null;

    for (let i = 1; i < pts.length; i++) {
      let a = pts[i - 1]!;
      let b = pts[i]!;
      const len = dist(a, b);
      if (len < 1) continue;
      const movement = route.steps[i]!.move ?? "sprint";
      const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };

      // Aynı doğru üzerinde çakışan önceki bölümlerin şeritleri doluysa ilk boş şerit.
      const taken = new Set(drawn.filter((s) => collinearOverlap(s.a, s.b, a, b)).map((s) => s.lane));
      let lane = 0;
      while (taken.has(lane)) lane++;
      drawn.push({ a, b, lane });
      if (lane > 0) {
        // Yönden bağımsız sabit bir dik vektör — gidiş ve dönüş zıt şeritlere düşsün.
        const canon = dir.x < -1e-9 || (Math.abs(dir.x) < 1e-9 && dir.y < 0) ? { x: -dir.x, y: -dir.y } : dir;
        const perp = { x: -canon.y, y: canon.x };
        const off = laneOffset(lane) * OVERLAP_STEP;
        a = { x: a.x + perp.x * off, y: a.y + perp.y * off };
        b = { x: b.x + perp.x * off, y: b.y + perp.y * off };
      }

      const d =
        movement === "crossover"
          ? wavePath(a, b)
          : `M${fmt(a.x)} ${fmt(a.y)} L${fmt(b.x)} ${fmt(b.y)}`;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const isLast = i === pts.length - 1;
      const arrow = len > 40 && !isLast ? arrowHead({ x: mid.x + dir.x * ARROW, y: mid.y + dir.y * ARROW }, dir, ARROW * 0.8) : null;
      const unitLen = dist(route.steps[i - 1]!, route.steps[i]!);
      const label =
        diagram.showDistances && unitLen >= 0.5
          ? {
              x: mid.x - dir.y * 12,
              y: mid.y + dir.x * 12,
              text: String(Math.round(unitLen * 2) / 2).replace(".", ","),
            }
          : null;
      segments.push({ d, movement, arrow, length: unitLen, label });
      lastDir = dir;
      lastEnd = b;
    }

    const turns: DrillRenderTurn[] = [];
    route.steps.forEach((step, i) => {
      if (!step.turn) return;
      const c = pts[i]!;
      const r = turnRadius;
      const sweep = step.turn === "cw" ? 1 : 0;
      const movement = (i > 0 ? step.move : route.steps[1]?.move) ?? "sprint";
      const d = `M${fmt(c.x + r)} ${fmt(c.y)} A${fmt(r)} ${fmt(r)} 0 1 ${sweep} ${fmt(c.x - r)} ${fmt(c.y)} A${fmt(r)} ${fmt(r)} 0 1 ${sweep} ${fmt(c.x + r)} ${fmt(c.y)}`;
      // Çemberin tepesinde dönüş yönünü gösteren ok (y aşağı: saat yönünde tepede sağa gidilir).
      const dir = { x: step.turn === "cw" ? 1 : -1, y: 0 };
      turns.push({ d, movement, arrow: arrowHead({ x: c.x + dir.x * ARROW, y: c.y - r }, dir, ARROW * 0.8) });
    });

    return {
      index,
      color,
      start: pts[0] ?? null,
      segments,
      turns,
      endArrow: lastDir && lastEnd ? arrowHead(lastEnd, lastDir, ARROW * 1.15) : null,
      distance: routeDistance(route),
    };
  });

  return {
    vbWidth: fieldW + PAD * 2,
    vbHeight: fieldH + PAD * 2,
    scale: s,
    pad: PAD,
    field: { x: PAD, y: PAD, width: fieldW, height: fieldH },
    minorGrid,
    majorGrid,
    coneSize,
    cones,
    routes,
    labels: diagram.labels.map((l) => ({ ...px(l), text: l.text })),
  };
}

// ---------------------------------------------------------------------------
// Hazır şablonlar — koç kopyalayıp değiştirir. Mesafeler şablonun önerdiği
// birimdedir; birim değişince sayılar aynı kalır (5 yd → 5 m), ölçek değişmez.
// ---------------------------------------------------------------------------

export interface DrillTemplate {
  key: string;
  name: string;
  description: string;
  unit: DrillUnit;
  diagram: DrillDiagram;
}

type P = [number, number];
const cone = ([x, y]: P, label?: string): DrillCone => (label ? { x, y, label } : { x, y });
const step = ([x, y]: P, move?: DrillMovement, turn?: "cw" | "ccw"): DrillStep => {
  const s: DrillStep = { x, y };
  if (move) s.move = move;
  if (turn) s.turn = turn;
  return s;
};
const diagram = (
  width: number,
  height: number,
  cones: DrillCone[],
  routes: DrillStep[][],
  labels: DrillLabel[] = []
): DrillDiagram => ({
  v: 1,
  width,
  height,
  cones,
  routes: routes.map((steps) => ({ steps })),
  labels,
  showDistances: false,
});

const BOX: P[] = [
  [2, 12],
  [2, 2],
  [12, 2],
  [12, 12],
];

export const DRILL_TEMPLATES: DrillTemplate[] = [
  {
    key: "box-sprint",
    name: "Kutu (Box) — sprint",
    description: "10×10 kare, dört kenar sprint. Toplam 40.",
    unit: "yd",
    diagram: diagram(
      14,
      14,
      [...BOX.map((p) => cone(p)), cone([7, 7])],
      [[step(BOX[0]!), step(BOX[1]!, "sprint"), step(BOX[2]!, "sprint"), step(BOX[3]!, "sprint"), step(BOX[0]!, "sprint")]]
    ),
  },
  {
    key: "box-mixed",
    name: "Kutu (Box) — karma",
    description: "Sprint → shuffle → geri koşu → carioca.",
    unit: "yd",
    diagram: diagram(
      14,
      14,
      [...BOX.map((p) => cone(p)), cone([7, 7])],
      [[step(BOX[0]!), step(BOX[1]!, "sprint"), step(BOX[2]!, "shuffle"), step(BOX[3]!, "backpedal"), step(BOX[0]!, "carioca")]]
    ),
  },
  {
    key: "box-360",
    name: "360'lar (köşelerde dönüş)",
    description: "Kutu rotası, her köşe konisinin etrafından tam tur.",
    unit: "yd",
    diagram: diagram(
      14,
      14,
      BOX.map((p) => cone(p)),
      [[step(BOX[0]!), step(BOX[1]!, "sprint", "cw"), step(BOX[2]!, "sprint", "cw"), step(BOX[3]!, "sprint", "cw"), step(BOX[0]!, "sprint")]]
    ),
  },
  {
    key: "m-drill",
    name: "M Drill",
    description: "Sprint ile çık, çapraz shuffle ile M çiz.",
    unit: "yd",
    diagram: diagram(
      14,
      14,
      [cone([2, 12]), cone([2, 2]), cone([7, 8]), cone([12, 2]), cone([12, 12])],
      [[step([2, 12]), step([2, 2], "sprint"), step([7, 8], "shuffle"), step([12, 2], "shuffle"), step([12, 12], "backpedal")]]
    ),
  },
  {
    key: "x-drill",
    name: "X Drill",
    description: "Çapraz sprint, yan kayma ve geri koşu.",
    unit: "yd",
    diagram: diagram(
      14,
      14,
      [...BOX.map((p) => cone(p)), cone([7, 7])],
      [[step([2, 12]), step([12, 2], "sprint"), step([12, 12], "shuffle"), step([2, 2], "backpedal"), step([2, 12], "shuffle")]]
    ),
  },
  {
    key: "pro-agility",
    name: "Pro Agility (5-10-5)",
    description: "Ortadan başla: 5 sağa, 10 sola, 5 ortaya. Toplam 20.",
    unit: "yd",
    diagram: diagram(
      14,
      6,
      [cone([2, 3]), cone([7, 3], "B"), cone([12, 3])],
      [[step([7, 3]), step([12, 3], "sprint"), step([2, 3], "sprint"), step([7, 3], "sprint")]]
    ),
  },
  {
    key: "three-cone",
    name: "3 Koni (L-Drill)",
    description: "Koniler 5 aralıklı L şeklinde; köşe ve uç koninin etrafından dön.",
    unit: "yd",
    diagram: diagram(
      12,
      12,
      [cone([3, 10], "A"), cone([3, 5], "B"), cone([8, 5], "C")],
      [
        [
          step([3, 10]),
          step([3, 5], "sprint"),
          step([3, 10], "sprint"),
          step([3, 5], "sprint"),
          step([8, 5], "sprint", "cw"),
          step([3, 5], "sprint", "ccw"),
          step([3, 10], "sprint"),
        ],
      ]
    ),
  },
  {
    key: "t-test",
    name: "T-Test",
    description: "10 ileri sprint, 5+10+5 yan kayma, 10 geri koşu. Toplam 40.",
    unit: "yd",
    diagram: diagram(
      14,
      14,
      [cone([7, 12], "A"), cone([7, 2], "B"), cone([2, 2], "C"), cone([12, 2], "D")],
      [[step([7, 12]), step([7, 2], "sprint"), step([2, 2], "shuffle"), step([12, 2], "shuffle"), step([7, 2], "shuffle"), step([7, 12], "backpedal")]]
    ),
  },
  {
    key: "illinois",
    name: "Illinois Çeviklik",
    description: "10×5 alan: 10 ileri-geri, ortadaki ~3,3 aralıklı 4 koni arasında slalom, son 10 ileri-geri.",
    unit: "m",
    diagram: diagram(
      9,
      14,
      [
        cone([2, 12]),
        cone([7, 12]),
        cone([2, 2]),
        cone([7, 2]),
        cone([4.5, 12]),
        cone([4.5, 8.5]),
        cone([4.5, 5.5]),
        cone([4.5, 2]),
      ],
      [
        [
          step([2, 12]),
          step([2, 2], "sprint"),
          step([4.5, 12], "sprint"),
          step([5.5, 10], "sprint"),
          step([3.5, 7], "sprint"),
          step([5.5, 4], "sprint"),
          step([4.5, 2], "sprint", "cw"),
          step([3.5, 4], "sprint"),
          step([5.5, 7], "sprint"),
          step([3.5, 10], "sprint"),
          step([4.5, 12], "sprint", "cw"),
          step([7, 2], "sprint"),
          step([7, 12], "sprint"),
        ],
      ]
    ),
  },
  {
    key: "zigzag",
    name: "Zig-Zag (yön değiştirme)",
    description: "5 aralıklı zig-zag koniler; her konide keskin yön değişimi.",
    unit: "m",
    diagram: diagram(
      24,
      12,
      [cone([2, 9]), cone([6, 3]), cone([10, 9]), cone([14, 3]), cone([18, 9]), cone([22, 3])],
      [[step([2, 9]), step([6, 3], "sprint"), step([10, 9], "sprint"), step([14, 3], "sprint"), step([18, 9], "sprint"), step([22, 3], "sprint")]]
    ),
  },
  {
    key: "flying-sprint",
    name: "Uçan Sprint (Flying 20)",
    description: "10 hızlanma, 20 maksimum hız bölgesi, 10 yavaşlama.",
    unit: "m",
    diagram: diagram(
      44,
      8,
      [cone([2, 5]), cone([12, 5]), cone([22, 5]), cone([32, 5]), cone([42, 5])],
      [[step([2, 5]), step([12, 5], "jog"), step([32, 5], "sprint"), step([42, 5], "jog")]],
      [
        { x: 7, y: 2, text: "Hızlanma" },
        { x: 22, y: 2, text: "Maks. hız" },
        { x: 37, y: 2, text: "Yavaşla" },
      ]
    ),
  },
];
