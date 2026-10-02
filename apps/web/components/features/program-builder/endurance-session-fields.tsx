"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import type {
  ArrayPath,
  Control,
  FieldValues,
  Path,
  PathValue,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { ArrowDown, ArrowUp, Copy, MessageSquarePlus, Plus, Sparkles, Trash2, Undo2 } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import {
  ENDURANCE_MODALITIES,
  ENDURANCE_TEMPLATES,
  INTENSITY_ZONES,
  SEGMENT_TYPES,
  describeSegment,
  enduranceSegmentToRow,
  formatDistance,
  formatDuration,
  formatEnduranceSummary,
  isEmptySegment,
  newEnduranceSegment,
  segmentInsertIndex,
  suggestedDurationMin,
  summarizeEnduranceSegments,
  type EnduranceSegmentFormValues,
  type EnduranceTemplate,
  type SegmentType,
} from "@athleteiq/validators/endurance";
import { WORKOUT_FORMATS } from "@/components/features/program-builder/wod-session-fields";

// Dayanıklılık (koşu/bisiklet/kürek/yüzme…) seans editörü — WOD'un
// (wod-session-fields.tsx) yanında, aynı desenle: seans bir "yapı" seçer,
// yapıya özel alanlar ExerciseList'in YERİNE render edilir.
//
// Sadeleştirilmiş arayüz (2026-10-02, koç geri bildirimi "daha kolay olsun"):
// hazır şablonlar tek tıkla seansı kurar; süre/mesafe "sayı + birim düğmesi"
// (serbest metin ayrıştırma yok); bölge tek tıklık Z1–Z5 düğmeleri; seans
// süresi bölümlerden otomatik. Hiçbir alan kaydı engellemez — boş bölüm
// payload'da atlanır (program-rpc.ts). Hesaplar/metinler
// @athleteiq/validators/endurance'ta (mobil de aynısını kullanır).

export interface StructuredSessionFormShape extends FieldValues {
  sessions: {
    title?: string;
    session_type?: string;
    duration_min?: number;
    workout_format?: string;
    endurance_modality?: string;
    endurance_segments: EnduranceSegmentFormValues[];
  }[];
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

const SEGMENT_BORDER: Record<string, string> = {
  warmup: "border-l-amber-400",
  steady: "border-l-sky-500",
  interval: "border-l-rose-500",
  recovery: "border-l-emerald-500",
  cooldown: "border-l-slate-400",
};

export const ZONE_BAR_COLORS = [
  "bg-sky-300",
  "bg-emerald-400",
  "bg-yellow-400",
  "bg-orange-500",
  "bg-red-600",
] as const;

const ZONE_ACTIVE = [
  "bg-sky-300 text-sky-950 border-sky-300",
  "bg-emerald-400 text-emerald-950 border-emerald-400",
  "bg-yellow-400 text-yellow-950 border-yellow-400",
  "bg-orange-500 text-white border-orange-500",
  "bg-red-600 text-white border-red-600",
] as const;

const DURATION_UNITS = [
  { label: "dk", factor: 60 },
  { label: "sn", factor: 1 },
] as const;

/** Kısa süreler (interval tekrarı, toparlanma) — boşken "sn" seçili gelir. */
const SHORT_DURATION_UNITS = [
  { label: "sn", factor: 1 },
  { label: "dk", factor: 60 },
] as const;

const DISTANCE_UNITS = [
  { label: "m", factor: 1 },
  { label: "km", factor: 1000 },
] as const;

const ENDURANCE_OPTION = "endurance";

// ---------------------------------------------------------------------------
// Seans yapısı seçici — eski "Format" <select>'inin yerini alır. Standart /
// Dayanıklılık / CrossFit formatları tek listede; dayanıklılık seçilince
// workout_format temizlenir (DB check constraint: ikisi birden dolu olamaz).
// ---------------------------------------------------------------------------

interface StructureSelectProps<T extends StructuredSessionFormShape> {
  sessionIdx: number;
  watch: UseFormWatch<T>;
  setValue: UseFormSetValue<T>;
}

export function SessionStructureSelect<T extends StructuredSessionFormShape>({
  sessionIdx,
  watch,
  setValue,
}: StructureSelectProps<T>) {
  const base = `sessions.${sessionIdx}`;
  const workoutFormat = watch(`${base}.workout_format` as Path<T>) as string | undefined;
  const modality = watch(`${base}.endurance_modality` as Path<T>) as string | undefined;
  const sessionType = watch(`${base}.session_type` as Path<T>) as string | undefined;
  const value = modality ? ENDURANCE_OPTION : (workoutFormat ?? "");

  function set(field: string, v: unknown) {
    setValue(`${base}.${field}` as Path<T>, v as PathValue<T, Path<T>>, { shouldDirty: true });
  }

  function handleChange(next: string) {
    if (next === ENDURANCE_OPTION) {
      set("workout_format", "");
      set("endurance_modality", modality || "run");
      // Yeni seansın varsayılan türü "Kuvvet" — dayanıklılığa geçince Kondisyon'a çek.
      if (!sessionType || sessionType === "strength") set("session_type", "conditioning");
    } else {
      set("endurance_modality", "");
      set("workout_format", next);
    }
  }

  return (
    <select value={value} onChange={(e) => handleChange(e.target.value)} className={SELECT_CLASS}>
      <option value="">Standart (set bazlı)</option>
      <option value={ENDURANCE_OPTION}>Dayanıklılık (koşu, bisiklet, kürek…)</option>
      <optgroup label="CrossFit (WOD)">
        {WORKOUT_FORMATS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

/** Seans kartı başlığındaki alt satır: "4 egzersiz" / "3 hareket" / "Koşu · 8,4 km · 52 dk". */
export function describeSessionContent(session: {
  workout_format?: string;
  endurance_modality?: string;
  endurance_segments?: EnduranceSegmentFormValues[];
  wod_movements?: unknown[];
  exercises?: unknown[];
}): string {
  if (session.endurance_modality) {
    const rows = (session.endurance_segments ?? []).filter((s) => !isEmptySegment(s)).map(enduranceSegmentToRow);
    return rows.length === 0
      ? "Bölüm eklenmedi"
      : `${rows.length} bölüm · ${formatEnduranceSummary(session.endurance_modality, rows)}`;
  }
  if (session.workout_format) return `${session.wod_movements?.length ?? 0} hareket`;
  return `${session.exercises?.length ?? 0} egzersiz`;
}

/** Dayanıklılık seansında "Seans süresi" boş bırakılırsa yazılacak süre (dk). */
export function autoDurationMin(session: {
  endurance_modality?: string;
  endurance_segments?: EnduranceSegmentFormValues[];
}): number | null {
  if (!session.endurance_modality) return null;
  return suggestedDurationMin(
    (session.endurance_segments ?? []).filter((s) => !isEmptySegment(s)).map(enduranceSegmentToRow)
  );
}

// ---------------------------------------------------------------------------
// Dayanıklılık alanları
// ---------------------------------------------------------------------------

interface EnduranceFieldsProps<T extends StructuredSessionFormShape> {
  sessionIdx: number;
  register: UseFormRegister<T>;
  control: Control<T>;
  watch: UseFormWatch<T>;
  setValue: UseFormSetValue<T>;
}

export function EnduranceSessionFields<T extends StructuredSessionFormShape>({
  sessionIdx,
  register,
  control,
  watch,
  setValue,
}: EnduranceFieldsProps<T>) {
  const base = `sessions.${sessionIdx}`;
  const segmentsPath = `${base}.endurance_segments` as Path<T>;
  const { fields, insert, remove, move } = useFieldArray({
    control,
    name: segmentsPath as ArrayPath<T>,
  });
  const [undoSegments, setUndoSegments] = useState<EnduranceSegmentFormValues[] | null>(null);

  const modality = (watch(`${base}.endurance_modality` as Path<T>) as string | undefined) ?? "run";
  const title = watch(`${base}.title` as Path<T>) as string | undefined;
  const segments = (watch(segmentsPath) as EnduranceSegmentFormValues[] | undefined) ?? [];
  const summary = summarizeEnduranceSegments(
    segments.filter((s) => !isEmptySegment(s)).map(enduranceSegmentToRow)
  );

  function setSegments(next: EnduranceSegmentFormValues[]) {
    setValue(segmentsPath, next as PathValue<T, Path<T>>, { shouldDirty: true });
  }

  function applyTemplate(template: EnduranceTemplate) {
    const hasContent = segments.some((s) => !isEmptySegment(s));
    setUndoSegments(hasContent ? segments : null);
    setSegments(template.segments.map((s) => ({ ...s })));
    if (!title?.trim()) {
      setValue(`${base}.title` as Path<T>, template.label as PathValue<T, Path<T>>, { shouldDirty: true });
    }
  }

  function addSegment(type: SegmentType) {
    insert(
      segmentInsertIndex(
        segments.map((s) => s.segment_type),
        type
      ),
      newEnduranceSegment(type) as never
    );
  }

  return (
    <div className="space-y-4">
      {/* Modalite — tek tık */}
      <div className="space-y-1.5">
        <Label>Ne yapılacak?</Label>
        <Controller
          control={control}
          name={`${base}.endurance_modality` as Path<T>}
          render={({ field }) => (
            <div className="flex flex-wrap gap-1.5">
              {ENDURANCE_MODALITIES.map((m) => (
                <ChipButton key={m.value} active={field.value === m.value} onClick={() => field.onChange(m.value)}>
                  {m.label}
                </ChipButton>
              ))}
            </div>
          )}
        />
      </div>

      {/* Hazır şablonlar */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Hazır şablonla başla
        </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ENDURANCE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t)}
              className="rounded-md border px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </button>
          ))}
        </div>
        {undoSegments && (
          <button
            type="button"
            onClick={() => {
              setSegments(undoSegments);
              setUndoSegments(null);
            }}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Undo2 className="h-3 w-3" />
            Şablon uygulandı — önceki bölümlere geri dön
          </button>
        )}
      </div>

      {/* Bölümler + toplam */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label>Bölümler</Label>
          <EnduranceTotals summary={summary} />
        </div>

        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed py-4 text-center text-sm text-muted-foreground">
            Yukarıdan bir şablon seçin ya da aşağıdan bölüm ekleyin.
          </p>
        ) : (
          fields.map((field, idx) => (
            <SegmentRow<T>
              key={field.id}
              idx={idx}
              count={fields.length}
              basePath={`${segmentsPath}.${idx}`}
              segment={segments[idx]}
              modality={modality}
              register={register}
              control={control}
              onMove={(to) => move(idx, to)}
              onDuplicate={() => segments[idx] && insert(idx + 1, { ...segments[idx] } as never)}
              onRemove={() => remove(idx)}
            />
          ))
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-muted-foreground">Bölüm ekle:</span>
          {SEGMENT_TYPES.map((t) => (
            <Button
              key={t.value}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => addSegment(t.value)}
            >
              <Plus className="h-3 w-3" />
              {t.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tek bölüm satırı
// ---------------------------------------------------------------------------

interface SegmentRowProps<T extends StructuredSessionFormShape> {
  idx: number;
  count: number;
  basePath: string;
  segment: EnduranceSegmentFormValues | undefined;
  modality: string;
  register: UseFormRegister<T>;
  control: Control<T>;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function SegmentRow<T extends StructuredSessionFormShape>({
  idx,
  count,
  basePath,
  segment,
  modality,
  register,
  control,
  onMove,
  onDuplicate,
  onRemove,
}: SegmentRowProps<T>) {
  const [showNotes, setShowNotes] = useState(!!segment?.notes);
  const isInterval = segment?.segment_type === "interval";
  const path = (field: string) => `${basePath}.${field}` as Path<T>;
  const empty = !segment || isEmptySegment(segment);
  const desc = segment && !empty ? describeSegment(enduranceSegmentToRow(segment), modality) : null;

  return (
    <div
      className={`space-y-2 rounded-md border border-l-4 p-2.5 ${SEGMENT_BORDER[segment?.segment_type ?? "steady"] ?? ""}`}
    >
      {/* 1. satır: tip · (tekrar) · süre · mesafe · aksiyonlar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          {...register(path("segment_type"))}
          className="h-8 w-[7.5rem] rounded-md border border-input bg-background px-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {SEGMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {isInterval && (
          <Field label="Tekrar">
            <Controller
              control={control}
              name={path("repeats")}
              render={({ field }) => (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={(field.value as number | undefined) ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                    className="h-8 w-14 text-sm"
                    placeholder="6"
                  />
                  <span className="text-sm text-muted-foreground">×</span>
                </div>
              )}
            />
          </Field>
        )}

        <Field label={isInterval ? "Süre (her tekrar)" : "Süre"}>
          <Controller
            control={control}
            name={path("duration_sec")}
            render={({ field }) => (
              <UnitNumberInput
                // Birim listesi tipe göre değişiyor — yerel birim/metin durumu sıfırlansın.
                key={isInterval ? "short" : "long"}
                value={field.value as number | undefined}
                onChange={field.onChange}
                units={isInterval ? SHORT_DURATION_UNITS : DURATION_UNITS}
                smallBelow={isInterval ? 120 : 0}
                placeholder={isInterval ? "30" : "20"}
              />
            )}
          />
        </Field>

        <Field label={isInterval ? "Mesafe (her tekrar)" : "Mesafe"}>
          <Controller
            control={control}
            name={path("distance_m")}
            render={({ field }) => (
              <UnitNumberInput
                value={field.value as number | undefined}
                onChange={field.onChange}
                units={DISTANCE_UNITS}
                placeholder={isInterval ? "400" : "—"}
              />
            )}
          />
        </Field>

        <div className="ml-auto flex">
          <IconButton label="Yukarı taşı" disabled={idx === 0} onClick={() => onMove(idx - 1)}>
            <ArrowUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Aşağı taşı" disabled={idx === count - 1} onClick={() => onMove(idx + 1)}>
            <ArrowDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Not ekle" onClick={() => setShowNotes((v) => !v)}>
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Çoğalt" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Sil" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      {/* 2. satır: yoğunluk */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-[7.5rem] text-xs text-muted-foreground">Yoğunluk</span>
        <Controller
          control={control}
          name={path("intensity_zone")}
          render={({ field }) => <ZonePicker value={field.value as number | undefined} onChange={field.onChange} />}
        />
        <Input
          {...register(path("intensity_target"))}
          placeholder="Hedef (opsiyonel): %80 tempo, 4:30/km, 150 nabız"
          className="h-8 min-w-[12rem] flex-1 text-sm"
        />
      </div>

      {/* 3. satır: interval toparlanması */}
      {isInterval && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-[7.5rem] text-xs text-muted-foreground">Tekrar arası</span>
          <Controller
            control={control}
            name={path("rest_sec")}
            render={({ field }) => (
              <UnitNumberInput
                value={field.value as number | undefined}
                onChange={field.onChange}
                units={SHORT_DURATION_UNITS}
                smallBelow={120}
                placeholder="90"
              />
            )}
          />
          <Input
            {...register(path("recovery_target"))}
            placeholder="nasıl? (opsiyonel): %50 tempo, yürüyüş, pasif"
            className="h-8 min-w-[12rem] flex-1 text-sm"
          />
        </div>
      )}

      {showNotes && (
        <Input
          {...register(path("notes"))}
          placeholder="Not (örn: çim zemin, yokuş yukarı)"
          className="h-8 text-sm"
        />
      )}

      <p className="text-xs text-muted-foreground">
        {desc ? (
          <>
            <span className="font-medium text-foreground">{desc.volume}</span>
            {desc.intensity && <> · {desc.intensity}</>}
            {desc.recovery && <> · {desc.recovery}</>}
            {desc.pace && <> · ≈ {desc.pace}</>}
          </>
        ) : (
          "Süre veya mesafe girin — boş bölüm kaydedilmez."
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Küçük yapı taşları
// ---------------------------------------------------------------------------

interface Unit {
  readonly label: string;
  readonly factor: number;
}

/**
 * Değere en uygun birim: tam bölünen en büyük birim (1800 sn → 30 dk, 90 sn →
 * 90 sn, 1500 m → 1,5 km). Değer yoksa listedeki İLK birim — interval/toparlanma
 * süreleri [sn, dk] sırasıyla verilir ki koç "30" yazınca 30 dk olmasın.
 * smallBelow: bu değerin altı her zaman en küçük birimde (60 sn "1 dk" değil "60 sn").
 */
function pickUnit(value: number | undefined, units: readonly Unit[], smallBelow = 0): number {
  if (value == null) return 0;
  if (value < smallBelow) return units.findIndex((u) => u.factor === 1);
  const byFactorDesc = units.map((u, i) => ({ u, i })).sort((a, b) => b.u.factor - a.u.factor);
  for (const { u, i } of byFactorDesc) {
    if (u.factor === 1000 ? value >= 1000 : value % u.factor === 0) return i;
  }
  return byFactorDesc[byFactorDesc.length - 1]!.i;
}

function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

/**
 * Sayı + birim düğmesi. Değer her zaman TEMEL birimde (saniye/metre) tutulur;
 * koç "10" yazıp "dk"ya basarsa 600, "sn"ye basarsa 10 olur.
 */
function UnitNumberInput({
  value,
  onChange,
  units,
  placeholder,
  smallBelow,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  units: readonly Unit[];
  placeholder?: string;
  smallBelow?: number;
}) {
  const [unitIdx, setUnitIdx] = useState(() => pickUnit(value, units, smallBelow));
  const [text, setText] = useState(() =>
    value != null ? formatNumber(value / units[pickUnit(value, units, smallBelow)]!.factor) : ""
  );
  const factor = units[unitIdx]!.factor;

  // Dışarıdan değişen değer (şablon, sıralama, düzenleme formu yüklemesi) — yerel metni eşitle.
  useEffect(() => {
    const parsed = text.trim() === "" ? undefined : Number(text.replace(",", "."));
    const local = parsed == null || Number.isNaN(parsed) ? undefined : Math.round(parsed * factor);
    if (local === value) return;
    const idx = pickUnit(value, units, smallBelow);
    setUnitIdx(idx);
    setText(value != null ? formatNumber(value / units[idx]!.factor) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emit(nextText: string, nextFactor: number) {
    const n = Number(nextText.replace(",", "."));
    onChange(nextText.trim() === "" || Number.isNaN(n) ? undefined : Math.round(n * nextFactor));
  }

  return (
    <div className="flex items-center">
      <Input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          emit(e.target.value, factor);
        }}
        className="h-8 w-16 rounded-r-none text-sm"
      />
      <div className="flex h-8 overflow-hidden rounded-r-md border border-l-0 border-input">
        {units.map((u, i) => (
          <button
            key={u.label}
            type="button"
            onClick={() => {
              setUnitIdx(i);
              emit(text, u.factor);
            }}
            className={`px-2 text-xs transition-colors ${
              i === unitIdx ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ZonePicker({ value, onChange }: { value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <div className="flex gap-1">
      {INTENSITY_ZONES.map((z) => {
        const active = value === z.zone;
        return (
          <button
            key={z.zone}
            type="button"
            title={`${z.label} — ${z.hint}`}
            onClick={() => onChange(active ? undefined : z.zone)}
            className={`h-8 w-9 rounded-md border text-xs font-semibold transition-colors ${
              active ? ZONE_ACTIVE[z.zone - 1] : "border-input bg-background text-muted-foreground hover:bg-accent"
            }`}
          >
            Z{z.zone}
          </button>
        );
      })}
    </div>
  );
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-muted-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function EnduranceTotals({ summary }: { summary: ReturnType<typeof summarizeEnduranceSegments> }) {
  const parts = [
    summary.totalDistanceM > 0 ? formatDistance(summary.totalDistanceM) : null,
    summary.totalDurationSec > 0
      ? `${summary.durationIncomplete ? "~" : ""}${formatDuration(summary.totalDurationSec)}`
      : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className="min-w-[12rem] text-right">
      <p className="text-sm font-semibold">Toplam: {parts.join(" · ")}</p>
      <ZoneBar zoneWorkSec={summary.zoneWorkSec} />
    </div>
  );
}

/** Bölge başına çalışma süresi şeridi — Z1 (açık) → Z5 (koyu kırmızı). */
export function ZoneBar({ zoneWorkSec }: { zoneWorkSec: readonly number[] }) {
  const total = zoneWorkSec.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {zoneWorkSec.map((sec, i) =>
          sec > 0 ? (
            <div
              key={i}
              className={ZONE_BAR_COLORS[i]}
              style={{ width: `${(sec / total) * 100}%` }}
              title={`Z${i + 1}: ${formatDuration(sec)}`}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
        {zoneWorkSec.map((sec, i) =>
          sec > 0 ? (
            <span key={i} className="flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${ZONE_BAR_COLORS[i]}`} />
              Z{i + 1} {formatDuration(sec)}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}
