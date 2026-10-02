import { z } from "zod";

// =============================================
// Dayanıklılık seansı — saf (DOM/React yok) mantık, web + mobil ortak.
//
// DB karşılığı (20261002113316 + 20261002113426):
//   training_sessions.endurance_modality → seansın modalitesi; doluysa seansın
//   exercises satırları birer BÖLÜMDÜR (segment_*), set yoktur.
//   exercises.segment_type / segment_repeats / segment_distance_m /
//   segment_duration_sec / intensity_zone / intensity_target /
//   segment_recovery_target + mevcut rest_sec (tekrar arası toparlanma süresi).
//
// Mesafe ve süre TEK TEKRAR içindir: "8 × 400 m" → repeats 8, distance 400.
// Toplamlar burada hesaplanır, DB'de saklanmaz.
// =============================================

export const ENDURANCE_MODALITIES = [
  { value: "run", label: "Koşu" },
  { value: "bike", label: "Bisiklet" },
  { value: "row", label: "Kürek" },
  { value: "swim", label: "Yüzme" },
  { value: "ski", label: "SkiErg" },
  { value: "walk", label: "Yürüyüş" },
  { value: "other", label: "Diğer" },
] as const;

export type EnduranceModality = (typeof ENDURANCE_MODALITIES)[number]["value"];

export const ENDURANCE_MODALITY_LABELS: Record<string, string> = Object.fromEntries(
  ENDURANCE_MODALITIES.map((m) => [m.value, m.label])
);

export const SEGMENT_TYPES = [
  { value: "warmup", label: "Isınma" },
  { value: "steady", label: "Sürekli" },
  { value: "interval", label: "İnterval" },
  { value: "recovery", label: "Toparlanma" },
  { value: "cooldown", label: "Soğuma" },
] as const;

export type SegmentType = (typeof SEGMENT_TYPES)[number]["value"];

export const SEGMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  SEGMENT_TYPES.map((s) => [s.value, s.label])
);

/** 5 bölgeli yoğunluk modeli — %maks. nabız aralıkları yalnızca yol gösterici. */
export const INTENSITY_ZONES = [
  { zone: 1, label: "Z1 · Çok hafif", hint: "%50-60 maks. nabız — toparlanma" },
  { zone: 2, label: "Z2 · Hafif", hint: "%60-70 maks. nabız — aerobik taban" },
  { zone: 3, label: "Z3 · Orta", hint: "%70-80 maks. nabız — tempo" },
  { zone: 4, label: "Z4 · Zor", hint: "%80-90 maks. nabız — eşik" },
  { zone: 5, label: "Z5 · Çok zor", hint: "%90-100 maks. nabız — VO2maks" },
] as const;

// ---------------------------------------------
// Görüntüleme
// ---------------------------------------------

function trDecimal(n: number, maxFraction: number): string {
  const factor = 10 ** maxFraction;
  return String(Math.round(n * factor) / factor).replace(".", ",");
}

/** 30 → "30 sn", 2700 → "45 dk", 270 → "4 dk 30 sn", 3900 → "1 sa 5 dk". */
export function formatDuration(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s} sn`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} sa`);
  if (m > 0) parts.push(`${m} dk`);
  if (rest > 0 && h === 0) parts.push(`${rest} sn`);
  return parts.join(" ");
}

/** 400 → "400 m", 1500 → "1,5 km", 21097 → "21,1 km". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${trDecimal(meters / 1000, meters % 1000 === 0 ? 0 : meters < 10000 ? 2 : 1)} km`;
}

function formatClock(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}

/**
 * Mesafe + süre birlikte verilmişse modaliteye uygun tempo: koşu/yürüyüş "/km",
 * kürek/SkiErg "/500 m", yüzme "/100 m", bisiklet "km/sa".
 */
export function formatPace(
  modality: string | null | undefined,
  distanceM: number | null | undefined,
  durationSec: number | null | undefined
): string | null {
  if (!distanceM || !durationSec || distanceM <= 0 || durationSec <= 0) return null;
  switch (modality) {
    case "bike":
      return `${trDecimal(distanceM / 1000 / (durationSec / 3600), 1)} km/sa`;
    case "row":
    case "ski":
      return `${formatClock((durationSec / distanceM) * 500)} /500 m`;
    case "swim":
      return `${formatClock((durationSec / distanceM) * 100)} /100 m`;
    default:
      return `${formatClock((durationSec / distanceM) * 1000)} /km`;
  }
}

// ---------------------------------------------
// Bölüm hesapları — DB satırı (exercises) doğrudan geçilebilir.
// ---------------------------------------------

export interface EnduranceSegmentLike {
  segment_type: string | null;
  segment_repeats: number | null;
  segment_distance_m: number | null;
  segment_duration_sec: number | null;
  intensity_zone: number | null;
  intensity_target: string | null;
  rest_sec: number | null;
  segment_recovery_target: string | null;
}

/** Tekrar yalnızca interval bölümünde anlamlıdır; diğerleri hep 1 kez yapılır. */
export function segmentRepeats(seg: Pick<EnduranceSegmentLike, "segment_type" | "segment_repeats">): number {
  return seg.segment_type === "interval" ? Math.max(1, seg.segment_repeats ?? 1) : 1;
}

export interface SegmentTotals {
  repeats: number;
  /** Tüm tekrarların toplam mesafesi; mesafe girilmemişse null. */
  distanceM: number | null;
  /** Yalnızca çalışma süresi (tekrar × süre); süre girilmemişse null. */
  workSec: number | null;
  /** Tekrar arası toparlanmaların toplamı (son tekrardan sonra toparlanma yok). */
  recoverySec: number;
  /** Çalışma + toparlanma; süre girilmemişse null. */
  totalSec: number | null;
}

export function segmentTotals(seg: EnduranceSegmentLike): SegmentTotals {
  const repeats = segmentRepeats(seg);
  const recoverySec =
    seg.segment_type === "interval" && seg.rest_sec ? (repeats - 1) * seg.rest_sec : 0;
  const workSec = seg.segment_duration_sec != null ? repeats * seg.segment_duration_sec : null;
  return {
    repeats,
    distanceM: seg.segment_distance_m != null ? repeats * seg.segment_distance_m : null,
    workSec,
    recoverySec,
    totalSec: workSec != null ? workSec + recoverySec : null,
  };
}

export interface EnduranceSummary {
  segmentCount: number;
  totalDistanceM: number;
  totalDurationSec: number;
  /** En az bir bölümün süresi bilinmiyor (yalnızca mesafe girilmiş) — toplam süre eksik. */
  durationIncomplete: boolean;
  /** Bölge başına ÇALIŞMA süresi (sn), index 0 = Z1. Toparlanmalar ve bölgesiz bölümler dahil değil. */
  zoneWorkSec: [number, number, number, number, number];
}

export function summarizeEnduranceSegments(segments: EnduranceSegmentLike[]): EnduranceSummary {
  const summary: EnduranceSummary = {
    segmentCount: segments.length,
    totalDistanceM: 0,
    totalDurationSec: 0,
    durationIncomplete: false,
    zoneWorkSec: [0, 0, 0, 0, 0],
  };
  for (const seg of segments) {
    const t = segmentTotals(seg);
    summary.totalDistanceM += t.distanceM ?? 0;
    if (t.totalSec == null) summary.durationIncomplete = true;
    else summary.totalDurationSec += t.totalSec;
    const zone = seg.intensity_zone;
    if (t.workSec != null && zone != null && zone >= 1 && zone <= 5) {
      summary.zoneWorkSec[zone - 1] = (summary.zoneWorkSec[zone - 1] ?? 0) + t.workSec;
    }
  }
  return summary;
}

/** Seans süresi boş bırakıldıysa planlanan süre olarak önerilir (dakika, yukarı yuvarlanır). */
export function suggestedDurationMin(segments: EnduranceSegmentLike[]): number | null {
  const s = summarizeEnduranceSegments(segments);
  if (s.durationIncomplete || s.totalDurationSec <= 0) return null;
  return Math.ceil(s.totalDurationSec / 60);
}

export interface SegmentDescription {
  /** "8 × 400 m", "20 dk", "5 km · 25 dk" */
  volume: string;
  /** "Z4 · %80 tempo" */
  intensity: string | null;
  /** "Toparlanma 90 sn · %50 tempo jog" — yalnızca interval */
  recovery: string | null;
  /** Mesafe ve süre birlikte verildiyse türetilen tempo — "4:00 /km" */
  pace: string | null;
}

export function describeSegment(
  seg: EnduranceSegmentLike,
  modality: string | null | undefined
): SegmentDescription {
  const repeats = segmentRepeats(seg);
  const pieces: string[] = [];
  if (seg.segment_distance_m != null) pieces.push(formatDistance(seg.segment_distance_m));
  if (seg.segment_duration_sec != null) pieces.push(formatDuration(seg.segment_duration_sec));
  const single = pieces.join(" · ") || "—";
  const volume =
    seg.segment_type === "interval" && repeats > 1
      ? `${repeats} × ${pieces.length > 1 ? `(${single})` : single}`
      : single;

  const intensityParts: string[] = [];
  if (seg.intensity_zone != null) intensityParts.push(`Z${seg.intensity_zone}`);
  if (seg.intensity_target?.trim()) intensityParts.push(seg.intensity_target.trim());

  let recovery: string | null = null;
  if (seg.segment_type === "interval" && (seg.rest_sec || seg.segment_recovery_target?.trim())) {
    const rec = ["Toparlanma"];
    if (seg.rest_sec) rec.push(formatDuration(seg.rest_sec));
    const parts = [rec.join(" ")];
    if (seg.segment_recovery_target?.trim()) parts.push(seg.segment_recovery_target.trim());
    recovery = parts.join(" · ");
  }

  return {
    volume,
    intensity: intensityParts.length > 0 ? intensityParts.join(" · ") : null,
    recovery,
    pace: formatPace(modality, seg.segment_distance_m, seg.segment_duration_sec),
  };
}

/** "Koşu · 8,4 km · ~52 dk" — kart rozetleri için. "~" = süresi bilinmeyen bölüm var. */
export function formatEnduranceSummary(
  modality: string | null | undefined,
  segments: EnduranceSegmentLike[]
): string {
  const label = ENDURANCE_MODALITY_LABELS[modality ?? ""] ?? "Dayanıklılık";
  const s = summarizeEnduranceSegments(segments);
  const parts: string[] = [label];
  if (s.totalDistanceM > 0) parts.push(formatDistance(s.totalDistanceM));
  if (s.totalDurationSec > 0) {
    parts.push(`${s.durationIncomplete ? "~" : ""}${formatDuration(s.totalDurationSec)}`);
  }
  return parts.join(" · ");
}

// ---------------------------------------------
// Form modeli — program oluşturma/düzenleme formlarının bölüm satırı.
// Süre/mesafe SAYI olarak (saniye/metre) tutulur; arayüz bunları
// "sayı + birim düğmesi" (dk|sn, m|km) ile girdirir — serbest metin
// ayrıştırması yok, yanlış anlaşılma yok.
//
// BİLİNÇLİ OLARAK GEVŞEK: hiçbir alan kaydı engellemez (koç yarım bir
// bölümle de kaydedebilmeli). Anlamsız değerler enduranceSegmentToRow'da
// null'a düşer, tamamen boş bölümler isEmptySegment ile payload'dan atlanır.
// ---------------------------------------------

const nanToUndefined = (v: unknown) =>
  (typeof v === "number" && Number.isNaN(v)) || v === null ? undefined : v;
const optionalNumber = z.preprocess(nanToUndefined, z.number().optional());

export const enduranceSegmentFieldsSchema = z.object({
  segment_type: z.enum(["warmup", "steady", "interval", "recovery", "cooldown"]),
  /** Eski kayıtlardan gelebilir; arayüzde girdisi yok. */
  name: z.string().optional(),
  repeats: optionalNumber,
  distance_m: optionalNumber,
  duration_sec: optionalNumber,
  intensity_zone: optionalNumber,
  intensity_target: z.string().optional(),
  rest_sec: optionalNumber,
  recovery_target: z.string().optional(),
  notes: z.string().optional(),
});

export type EnduranceSegmentFormValues = z.infer<typeof enduranceSegmentFieldsSchema>;

/** Formların seans alanları — sessionSchema'ya yayılır. */
export const enduranceSessionFields = {
  // "" native <select>'in boş değeri — WOD'un workout_format'ıyla aynı dönüşüm.
  endurance_modality: z
    .enum(["run", "bike", "row", "swim", "ski", "walk", "other", ""])
    .optional()
    .transform((v) => (v ? v : undefined)),
  endurance_segments: z.array(enduranceSegmentFieldsSchema).default([]),
};

const PRESET_DEFAULTS: Record<SegmentType, Partial<EnduranceSegmentFormValues>> = {
  warmup: { duration_sec: 600, intensity_zone: 1 },
  steady: { duration_sec: 1800, intensity_zone: 2 },
  interval: { repeats: 6, duration_sec: 60, rest_sec: 60, intensity_zone: 4 },
  recovery: { duration_sec: 300, intensity_zone: 1 },
  cooldown: { duration_sec: 600, intensity_zone: 1 },
};

/** "+ Isınma", "+ İnterval" gibi hızlı ekleme butonlarının varsayılanları. */
export function newEnduranceSegment(type: SegmentType): EnduranceSegmentFormValues {
  return { segment_type: type, ...PRESET_DEFAULTS[type] };
}

/**
 * Hızlı ekleme butonunun yeni bölümü nereye koyacağı: ısınma baştaki ısınma
 * grubunun sonuna, soğuma en sona, diğerleri sondaki soğuma grubunun ÖNÜNE —
 * koç "+ İnterval"e bastığında bölüm soğumadan sonra düşmesin.
 */
export function segmentInsertIndex(existingTypes: readonly string[], type: SegmentType): number {
  if (type === "cooldown") return existingTypes.length;
  if (type === "warmup") {
    const firstNonWarmup = existingTypes.findIndex((t) => t !== "warmup");
    return firstNonWarmup === -1 ? existingTypes.length : firstNonWarmup;
  }
  let idx = existingTypes.length;
  while (idx > 0 && existingTypes[idx - 1] === "cooldown") idx--;
  return idx;
}

function positiveInt(n: number | undefined, max = Number.MAX_SAFE_INTEGER): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= 1 && r <= max ? r : null;
}

function cleanText(t: string | undefined): string | null {
  return t?.trim() ? t.trim() : null;
}

/** Form satırı → DB/hesap şekli. DB check'lerini ihlal edecek değerler null'a düşer. */
export function enduranceSegmentToRow(v: EnduranceSegmentFormValues): EnduranceSegmentLike {
  const isInterval = v.segment_type === "interval";
  return {
    segment_type: v.segment_type,
    segment_repeats: isInterval ? (positiveInt(v.repeats, 200) ?? 1) : null,
    segment_distance_m: positiveInt(v.distance_m),
    segment_duration_sec: positiveInt(v.duration_sec),
    intensity_zone: positiveInt(v.intensity_zone, 5),
    intensity_target: cleanText(v.intensity_target),
    rest_sec: isInterval ? positiveInt(v.rest_sec) : null,
    segment_recovery_target: isInterval ? cleanText(v.recovery_target) : null,
  };
}

/** Mesafe, süre, hedef ve not hepsi boş — kaydedilecek bir şey yok, payload'dan atlanır. */
export function isEmptySegment(v: EnduranceSegmentFormValues): boolean {
  const row = enduranceSegmentToRow(v);
  return (
    row.segment_distance_m == null &&
    row.segment_duration_sec == null &&
    row.intensity_target == null &&
    !v.notes?.trim()
  );
}

/** DB satırı → form satırı (düzenleme formunun defaultValues'u). */
export function enduranceRowToSegment(
  row: EnduranceSegmentLike & { name?: string | null; notes?: string | null }
): EnduranceSegmentFormValues {
  const type = (SEGMENT_TYPES.some((t) => t.value === row.segment_type)
    ? row.segment_type
    : "steady") as SegmentType;
  return {
    segment_type: type,
    // Ad, tipin varsayılan etiketiyle aynıysa (payload'ın otomatik verdiği)
    // forma boş döner.
    name: row.name && row.name !== SEGMENT_TYPE_LABELS[type] ? row.name : undefined,
    repeats: row.segment_repeats ?? undefined,
    distance_m: row.segment_distance_m ?? undefined,
    duration_sec: row.segment_duration_sec ?? undefined,
    intensity_zone: row.intensity_zone ?? undefined,
    intensity_target: row.intensity_target ?? undefined,
    rest_sec: row.rest_sec ?? undefined,
    recovery_target: row.segment_recovery_target ?? undefined,
    notes: row.notes ?? undefined,
  };
}

// ---------------------------------------------
// Hazır seans şablonları — tek tıkla bölüm listesini kurar, koç sonra
// sayıları değiştirir. "İnterval 30/90" canlı veriden: koçun "For Time"a
// sıkıştırdığı 30 sn %80 / 90 sn %50 seansının birebir karşılığı.
// ---------------------------------------------

export interface EnduranceTemplate {
  id: string;
  label: string;
  description: string;
  segments: EnduranceSegmentFormValues[];
}

const warmup = (min: number): EnduranceSegmentFormValues => ({
  segment_type: "warmup",
  duration_sec: min * 60,
  intensity_zone: 1,
});
const cooldown = (min: number): EnduranceSegmentFormValues => ({
  segment_type: "cooldown",
  duration_sec: min * 60,
  intensity_zone: 1,
});

export const ENDURANCE_TEMPLATES: readonly EnduranceTemplate[] = [
  {
    id: "aerobic",
    label: "Sürekli (aerobik)",
    description: "10 dk ısınma · 30 dk Z2 · 5 dk soğuma",
    segments: [
      warmup(10),
      { segment_type: "steady", duration_sec: 1800, intensity_zone: 2, intensity_target: "%60-70 tempo" },
      cooldown(5),
    ],
  },
  {
    id: "interval-30-90",
    label: "İnterval 30/90",
    description: "10 × (30 sn %80 + 90 sn %50)",
    segments: [
      warmup(10),
      {
        segment_type: "interval",
        repeats: 10,
        duration_sec: 30,
        intensity_zone: 4,
        intensity_target: "%80 tempo",
        rest_sec: 90,
        recovery_target: "%50 tempo",
      },
      cooldown(5),
    ],
  },
  {
    id: "tempo",
    label: "Tempo / eşik",
    description: "10 dk ısınma · 20 dk Z3 · 10 dk soğuma",
    segments: [
      warmup(10),
      { segment_type: "steady", duration_sec: 1200, intensity_zone: 3, intensity_target: "%75-80 tempo" },
      cooldown(10),
    ],
  },
  {
    id: "repeats-400",
    label: "400 m tekrarlar",
    description: "8 × 400 m Z5 · 90 sn yürüyüş",
    segments: [
      warmup(15),
      {
        segment_type: "interval",
        repeats: 8,
        distance_m: 400,
        intensity_zone: 5,
        rest_sec: 90,
        recovery_target: "yürüyüş",
      },
      cooldown(10),
    ],
  },
  {
    id: "long",
    label: "Uzun yavaş",
    description: "60 dk Z2",
    segments: [{ segment_type: "steady", duration_sec: 3600, intensity_zone: 2 }],
  },
  {
    id: "recovery",
    label: "Toparlanma",
    description: "20 dk Z1",
    segments: [{ segment_type: "recovery", duration_sec: 1200, intensity_zone: 1 }],
  },
];
