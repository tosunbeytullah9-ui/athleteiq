"use client";

import type { ReactNode } from "react";
import { useFieldArray, useFormState, get } from "react-hook-form";
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
import { ArrowDown, ArrowUp, Copy, Plus, Timer, Trash2 } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import {
  ENDURANCE_MODALITIES,
  INTENSITY_ZONES,
  SEGMENT_TYPES,
  describeSegment,
  enduranceSegmentToRow,
  formatDistance,
  formatDuration,
  formatEnduranceSummary,
  newEnduranceSegment,
  segmentInsertIndex,
  suggestedDurationMin,
  summarizeEnduranceSegments,
  type EnduranceSegmentFormValues,
  type SegmentType,
} from "@athleteiq/validators/endurance";
import { WORKOUT_FORMATS } from "@/components/features/program-builder/wod-session-fields";

// Dayanıklılık (koşu/bisiklet/kürek/yüzme…) seans editörü — WOD'un
// (wod-session-fields.tsx) yanında, aynı desenle: seans bir "yapı" seçer,
// yapıya özel alanlar ExerciseList'in YERİNE render edilir. Hesaplar ve
// metinler @athleteiq/validators/endurance'ta (mobil de aynısını kullanır).

export interface StructuredSessionFormShape extends FieldValues {
  sessions: {
    session_type?: string;
    duration_min?: number;
    workout_format?: string;
    endurance_modality?: string;
    endurance_segments: EnduranceSegmentFormValues[];
  }[];
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";
const SMALL_SELECT_CLASS =
  "flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

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

const ENDURANCE_OPTION = "endurance";

// ---------------------------------------------------------------------------
// Seans yapısı seçici — eski "Format" <select>'inin yerini alır. Standart /
// CrossFit formatları / Dayanıklılık tek listede; dayanıklılık seçilince
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
  const segments =
    (watch(`${base}.endurance_segments` as Path<T>) as EnduranceSegmentFormValues[] | undefined) ?? [];
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
      // Boş bölüm listesiyle açılmasın — dayanıklılık sayfasındaki gibi ısınma + soğuma hazır.
      if (segments.length === 0) {
        set("endurance_segments", [newEnduranceSegment("warmup"), newEnduranceSegment("cooldown")]);
      }
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
    const rows = (session.endurance_segments ?? []).map(enduranceSegmentToRow);
    return `${rows.length} bölüm · ${formatEnduranceSummary(session.endurance_modality, rows)}`;
  }
  if (session.workout_format) return `${session.wod_movements?.length ?? 0} hareket`;
  return `${session.exercises?.length ?? 0} egzersiz`;
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

const numberOrUndefined = (v: string) => (v === "" ? undefined : Number(v));

export function EnduranceSessionFields<T extends StructuredSessionFormShape>({
  sessionIdx,
  register,
  control,
  watch,
  setValue,
}: EnduranceFieldsProps<T>) {
  const base = `sessions.${sessionIdx}`;
  const { fields, insert, remove, move } = useFieldArray({
    control,
    name: `${base}.endurance_segments` as ArrayPath<T>,
  });
  const { errors } = useFormState({ control });

  const modality = (watch(`${base}.endurance_modality` as Path<T>) as string | undefined) ?? "run";
  const durationMin = watch(`${base}.duration_min` as Path<T>) as number | undefined;
  const segments =
    (watch(`${base}.endurance_segments` as Path<T>) as EnduranceSegmentFormValues[] | undefined) ?? [];
  const rows = segments.map(enduranceSegmentToRow);
  const summary = summarizeEnduranceSegments(rows);
  const suggestedMin = suggestedDurationMin(rows);
  const listError = get(errors, `${base}.endurance_segments`)?.message as string | undefined;

  function addSegment(type: SegmentType) {
    const at = segmentInsertIndex(
      segments.map((s) => s.segment_type),
      type
    );
    insert(at, newEnduranceSegment(type) as never);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Modalite</Label>
          <select {...register(`${base}.endurance_modality` as Path<T>)} className={SELECT_CLASS}>
            {ENDURANCE_MODALITIES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <EnduranceTotals
          summary={summary}
          suggestedMin={suggestedMin}
          durationMin={durationMin}
          onApplyDuration={() =>
            setValue(`${base}.duration_min` as Path<T>, suggestedMin as PathValue<T, Path<T>>, {
              shouldDirty: true,
            })
          }
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <Label>Bölümler</Label>
          <div className="flex flex-wrap gap-1.5">
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

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
            Henüz bölüm eklenmedi. Yukarıdaki butonlarla ısınma, sürekli koşu, interval vb. ekleyin.
          </p>
        ) : (
          <div className="space-y-2">
            {fields.map((field, idx) => {
              const segBase = `${base}.endurance_segments.${idx}`;
              const seg = segments[idx];
              const isInterval = seg?.segment_type === "interval";
              const fieldError = (name: string) =>
                get(errors, `${segBase}.${name}`)?.message as string | undefined;
              const segError = fieldError("duration") ?? fieldError("distance");
              const desc = seg ? describeSegment(enduranceSegmentToRow(seg), modality) : null;

              return (
                <div
                  key={field.id}
                  className={`rounded-md border border-l-4 ${SEGMENT_BORDER[seg?.segment_type ?? "steady"] ?? ""} p-2.5 space-y-2`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center text-xs font-semibold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="w-32 shrink-0">
                      <select
                        {...register(`${segBase}.segment_type` as Path<T>)}
                        className={SMALL_SELECT_CLASS}
                      >
                        {SEGMENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      {...register(`${segBase}.name` as Path<T>)}
                      placeholder="Ad (opsiyonel, örn: 400'ler)"
                      className="h-8 text-sm"
                    />
                    <div className="flex shrink-0">
                      <IconButton label="Yukarı taşı" disabled={idx === 0} onClick={() => move(idx, idx - 1)}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label="Aşağı taşı"
                        disabled={idx === fields.length - 1}
                        onClick={() => move(idx, idx + 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label="Çoğalt"
                        onClick={() => seg && insert(idx + 1, { ...seg } as never)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton label="Sil" onClick={() => remove(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </div>

                  <div className={`grid gap-2 ${isInterval ? "grid-cols-5" : "grid-cols-4"}`}>
                    {isInterval && (
                      <SmallField label="Tekrar">
                        <Input
                          type="number"
                          min={1}
                          {...register(`${segBase}.repeats` as Path<T>, { setValueAs: numberOrUndefined })}
                          placeholder="8"
                          className="h-8 text-sm"
                        />
                      </SmallField>
                    )}
                    <SmallField label={isInterval ? "Mesafe (tekrar)" : "Mesafe"}>
                      <Input
                        {...register(`${segBase}.distance` as Path<T>)}
                        placeholder={isInterval ? "400" : "5 km"}
                        className="h-8 text-sm"
                      />
                    </SmallField>
                    <SmallField label={isInterval ? "Süre (tekrar)" : "Süre"}>
                      <Input
                        {...register(`${segBase}.duration` as Path<T>)}
                        placeholder={isInterval ? "30 sn / 1:30" : "20 dk"}
                        className="h-8 text-sm"
                      />
                    </SmallField>
                    <SmallField label="Bölge">
                      <select
                        {...register(`${segBase}.intensity_zone` as Path<T>, {
                          setValueAs: numberOrUndefined,
                        })}
                        className={SMALL_SELECT_CLASS}
                      >
                        <option value="">—</option>
                        {INTENSITY_ZONES.map((z) => (
                          <option key={z.zone} value={z.zone} title={z.hint}>
                            {z.label}
                          </option>
                        ))}
                      </select>
                    </SmallField>
                    <SmallField label="Hedef">
                      <Input
                        {...register(`${segBase}.intensity_target` as Path<T>)}
                        placeholder="%80 tempo, 4:30/km"
                        className="h-8 text-sm"
                      />
                    </SmallField>
                  </div>

                  {isInterval && (
                    <div className="grid grid-cols-5 gap-2">
                      <SmallField label="Toparlanma (sn)">
                        <Input
                          type="number"
                          min={1}
                          {...register(`${segBase}.rest_sec` as Path<T>, { setValueAs: numberOrUndefined })}
                          placeholder="90"
                          className="h-8 text-sm"
                        />
                      </SmallField>
                      <div className="col-span-4">
                        <SmallField label="Toparlanma şekli">
                          <Input
                            {...register(`${segBase}.recovery_target` as Path<T>)}
                            placeholder="Örn: %50 tempo jog, yürüyüş, pasif"
                            className="h-8 text-sm"
                          />
                        </SmallField>
                      </div>
                    </div>
                  )}

                  <Input
                    {...register(`${segBase}.notes` as Path<T>)}
                    placeholder="Not (opsiyonel, örn: çim zemin, yokuş)"
                    className="h-8 text-sm"
                  />

                  {segError ? (
                    <p className="text-xs text-destructive">{segError}</p>
                  ) : (
                    desc && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{desc.volume}</span>
                        {desc.intensity && <> · {desc.intensity}</>}
                        {desc.recovery && <> · {desc.recovery}</>}
                        {desc.pace && <> · ≈ {desc.pace}</>}
                      </p>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
        {listError && <p className="text-xs text-destructive mt-1">{listError}</p>}
        <p className="text-xs text-muted-foreground mt-2">
          Süre: çıplak sayı dakikadır (20 = 20 dk); saniye için &quot;30 sn&quot;, dakika:saniye için
          &quot;4:30&quot; yazın. Mesafe: çıplak sayı metredir (400), kilometre için &quot;5 km&quot;.
          İntervalde mesafe ve süre TEK tekrar içindir.
        </p>
      </div>
    </div>
  );
}

function SmallField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
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

function EnduranceTotals({
  summary,
  suggestedMin,
  durationMin,
  onApplyDuration,
}: {
  summary: ReturnType<typeof summarizeEnduranceSegments>;
  suggestedMin: number | null;
  durationMin: number | undefined;
  onApplyDuration: () => void;
}) {
  const hasAny = summary.totalDistanceM > 0 || summary.totalDurationSec > 0;
  return (
    <div className="space-y-1.5">
      <Label>Toplam</Label>
      <div className="rounded-md border bg-muted/30 px-3 py-1.5 text-sm">
        {hasAny ? (
          <>
            <p className="font-medium">
              {[
                summary.totalDistanceM > 0 ? formatDistance(summary.totalDistanceM) : null,
                summary.totalDurationSec > 0
                  ? `${summary.durationIncomplete ? "~" : ""}${formatDuration(summary.totalDurationSec)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <ZoneBar zoneWorkSec={summary.zoneWorkSec} />
          </>
        ) : (
          <p className="text-muted-foreground">—</p>
        )}
      </div>
      {suggestedMin != null && suggestedMin !== durationMin && (
        <button
          type="button"
          onClick={onApplyDuration}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Timer className="h-3 w-3" />
          Seans süresini {suggestedMin} dk yap
        </button>
      )}
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
