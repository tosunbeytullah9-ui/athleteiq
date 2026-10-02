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
// Süre / mesafe girdisi
// ---------------------------------------------

function toNumber(raw: string): number | null {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Koçun yazdığı süreyi saniyeye çevirir. Boş → null, anlaşılmazsa → NaN.
 *   "45" / "45 dk" / "1,5"  → dakika      (2700 / 2700 / 90)
 *   "4:30" / "1:05:00"      → dk:sn / sa:dk:sn
 *   "30 sn" / "30s"         → saniye
 *   "1 sa" / "1,5 saat"     → saat
 * Çıplak sayı DAKİKA'dır — bölüm süreleri ("20 dk sürekli") çoğunlukla dakikayla
 * yazılır; saniye için birim yazılır ("30 sn").
 */
export function parseDurationInput(raw: string | null | undefined): number | null {
  const s = (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (s === "") return null;

  if (/^\d+(:\d{1,2}){1,2}$/.test(s)) {
    const parts = s.split(":").map(Number);
    if (parts.slice(1).some((p) => p >= 60)) return NaN;
    const sec = parts.reduce((acc, p) => acc * 60 + p, 0);
    return sec > 0 ? sec : NaN;
  }

  const m = /^(\d+(?:[.,]\d+)?)\s*(sn|saniye|s|sec|dk|dakika|min|m|'|sa|saat|h)?$/.exec(s);
  if (!m) return NaN;
  const value = toNumber(m[1]!);
  if (value == null || value <= 0) return NaN;
  const unit = m[2] ?? "dk";
  const factor = ["sn", "saniye", "s", "sec"].includes(unit)
    ? 1
    : ["sa", "saat", "h"].includes(unit)
      ? 3600
      : 60;
  const sec = Math.round(value * factor);
  return sec > 0 ? sec : NaN;
}

/**
 * Koçun yazdığı mesafeyi metreye çevirir. Boş → null, anlaşılmazsa → NaN.
 *   "400" / "400 m"         → metre
 *   "5 km" / "5k" / "1,5km" → kilometre
 * Çıplak sayı METRE'dir (interval mesafeleri — 200, 400, 1000 — böyle yazılır).
 */
export function parseDistanceInput(raw: string | null | undefined): number | null {
  const s = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (s === "") return null;
  const m = /^(\d+(?:[.,]\d+)?)(m|metre|km|k)?$/.exec(s);
  if (!m) return NaN;
  const value = toNumber(m[1]!);
  if (value == null || value <= 0) return NaN;
  const meters = Math.round(m[2] === "km" || m[2] === "k" ? value * 1000 : value);
  return meters > 0 ? meters : NaN;
}

const isBlankOrValid = (parse: (v: string) => number | null) => (v: string | undefined) => {
  const parsed = parse(v ?? "");
  return parsed === null || !Number.isNaN(parsed);
};

/** Saniyeyi forma geri yazılacak, parseDurationInput ile aynı değere dönen metne çevirir. */
export function formatDurationInput(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return "";
  if (sec < 60) return `${sec} sn`;
  if (sec % 60 === 0) return String(sec / 60);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** Metreyi forma geri yazılacak metne çevirir. */
export function formatDistanceInput(meters: number | null | undefined): string {
  if (meters == null || meters <= 0) return "";
  if (meters >= 1000) return `${String(meters / 1000).replace(".", ",")} km`;
  return String(meters);
}

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
// Form şeması — program oluşturma/düzenleme formlarının bölüm satırı.
// Mesafe/süre METİN olarak tutulur (koç "5 km", "4:30" yazabilsin), RPC
// payload'ına enduranceSegmentToRow ile çevrilir.
// ---------------------------------------------

const optionalText = z.string().optional();
// Boş number input'u (valueAsNumber → NaN / setValueAs → undefined) "girilmedi" sayılır.
const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === "number" && Number.isNaN(v) ? undefined : v),
    z.number().int().min(min).max(max).optional()
  );

/**
 * Bölüm satırının YAPISI — yalnızca tipler. İçerik kuralları (mesafe/süre
 * anlaşılır mı, ikisinden biri var mı) enduranceSegmentIssues'ta; formlar bu
 * kuralları yalnızca seans GERÇEKTEN dayanıklılık seansıyken uygular
 * (refineEnduranceSession). Aksi halde koç yapıyı "Standart"a geri çevirdiğinde
 * formda kalan, ekranda görünmeyen bir bölüm kaydı sessizce kilitlerdi.
 */
export const enduranceSegmentFieldsSchema = z.object({
  segment_type: z.enum(["warmup", "steady", "interval", "recovery", "cooldown"]),
  name: optionalText,
  repeats: optionalInt(1, 200),
  distance: optionalText,
  duration: optionalText,
  intensity_zone: optionalInt(1, 5),
  intensity_target: optionalText,
  rest_sec: optionalInt(1, 3600),
  recovery_target: optionalText,
  notes: optionalText,
});

export type EnduranceSegmentFormValues = z.infer<typeof enduranceSegmentFieldsSchema>;

export function enduranceSegmentIssues(
  v: Pick<EnduranceSegmentFormValues, "distance" | "duration">
): { field: "distance" | "duration"; message: string }[] {
  const issues: { field: "distance" | "duration"; message: string }[] = [];
  if (!isBlankOrValid(parseDistanceInput)(v.distance)) {
    issues.push({ field: "distance", message: "Mesafe anlaşılamadı (örn: 400, 5 km)" });
  }
  if (!isBlankOrValid(parseDurationInput)(v.duration)) {
    issues.push({ field: "duration", message: "Süre anlaşılamadı (örn: 20, 4:30, 30 sn)" });
  }
  if (issues.length === 0 && parseDistanceInput(v.distance) === null && parseDurationInput(v.duration) === null) {
    issues.push({ field: "duration", message: "Mesafe veya süre girin" });
  }
  return issues;
}

/** Tek bir bölümün tam doğrulaması (yapı + içerik). */
export const enduranceSegmentFormSchema = enduranceSegmentFieldsSchema.superRefine((v, ctx) => {
  for (const issue of enduranceSegmentIssues(v)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [issue.field], message: issue.message });
  }
});

/** Formların seans alanları — new-program / week-editor sessionSchema'sına yayılır. */
export const enduranceSessionFields = {
  // "" native <select>'in boş değeri — WOD'un workout_format'ıyla aynı dönüşüm.
  endurance_modality: z
    .enum(["run", "bike", "row", "swim", "ski", "walk", "other", ""])
    .optional()
    .transform((v) => (v ? v : undefined)),
  endurance_segments: z.array(enduranceSegmentFieldsSchema).default([]),
};

/** sessionSchema.superRefine içinden çağrılır — kuralları yalnızca dayanıklılık seansında uygular. */
export function refineEnduranceSession(
  session: { endurance_modality?: string; endurance_segments?: EnduranceSegmentFormValues[] },
  ctx: z.RefinementCtx
): void {
  if (!session.endurance_modality) return;
  const segments = session.endurance_segments ?? [];
  if (segments.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endurance_segments"],
      message: "En az bir bölüm ekleyin",
    });
  }
  segments.forEach((seg, i) => {
    for (const issue of enduranceSegmentIssues(seg)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endurance_segments", i, issue.field],
        message: issue.message,
      });
    }
  });
}

const PRESET_DEFAULTS: Record<SegmentType, Partial<EnduranceSegmentFormValues>> = {
  warmup: { duration: "10", intensity_zone: 1 },
  steady: { intensity_zone: 2 },
  interval: { repeats: 6, intensity_zone: 4 },
  recovery: { duration: "5", intensity_zone: 1 },
  cooldown: { duration: "10", intensity_zone: 1 },
};

/** "+ Isınma", "+ İnterval" gibi hızlı ekleme butonlarının varsayılanları. */
export function newEnduranceSegment(type: SegmentType): EnduranceSegmentFormValues {
  return { segment_type: type, ...PRESET_DEFAULTS[type] } as EnduranceSegmentFormValues;
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

/** Form satırı → DB/hesap şekli (EnduranceSegmentLike). Geçersiz mesafe/süre null'a düşer. */
export function enduranceSegmentToRow(v: EnduranceSegmentFormValues): EnduranceSegmentLike {
  const isInterval = v.segment_type === "interval";
  const clean = (n: number | null) => (n == null || Number.isNaN(n) ? null : n);
  const text = (t: string | undefined) => (t?.trim() ? t.trim() : null);
  return {
    segment_type: v.segment_type,
    segment_repeats: isInterval ? (v.repeats ?? 1) : null,
    segment_distance_m: clean(parseDistanceInput(v.distance)),
    segment_duration_sec: clean(parseDurationInput(v.duration)),
    intensity_zone: v.intensity_zone ?? null,
    intensity_target: text(v.intensity_target),
    rest_sec: isInterval ? (v.rest_sec ?? null) : null,
    segment_recovery_target: isInterval ? text(v.recovery_target) : null,
  };
}

/** DB satırı → form satırı (düzenleme formunun defaultValues'u). */
export function enduranceRowToSegment(
  row: EnduranceSegmentLike & { name?: string | null; notes?: string | null }
): EnduranceSegmentFormValues {
  const type = (SEGMENT_TYPES.some((t) => t.value === row.segment_type)
    ? row.segment_type
    : "steady") as SegmentType;
  const label = SEGMENT_TYPE_LABELS[type];
  return {
    segment_type: type,
    // Ad, tipin varsayılan etiketiyle aynıysa (enduranceSegmentToRow'un
    // otomatik verdiği) forma boş döner — koç yazmadıysa yazmamış görünsün.
    name: row.name && row.name !== label ? row.name : undefined,
    repeats: row.segment_repeats ?? undefined,
    distance: formatDistanceInput(row.segment_distance_m),
    duration: formatDurationInput(row.segment_duration_sec),
    intensity_zone: row.intensity_zone ?? undefined,
    intensity_target: row.intensity_target ?? undefined,
    rest_sec: row.rest_sec ?? undefined,
    recovery_target: row.segment_recovery_target ?? undefined,
    notes: row.notes ?? undefined,
  };
}
