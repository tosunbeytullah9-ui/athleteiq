"use client";

import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import type {
  ArrayPath,
  Control,
  FieldValues,
  Path,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { ExercisePickerModal } from "@/components/features/exercises/exercise-picker-modal";
import type {
  PlatformExercise,
  OrgExercise,
  OrgExerciseCategory,
  Athlete1RMRecord,
} from "@athleteiq/db/queries/exercises";
import { SUPERSET_GROUPS, SUPERSET_COLORS } from "@/lib/supersetGroups";

export { SUPERSET_GROUPS, SUPERSET_COLORS };

// Set bazlı yük tipi — exercise_sets tablosunda ayrı bir load_type kolonu
// YOK; tip, hangi kolon dolu olduğundan (load_kg / percent_1rm / is_bodyweight /
// band_resistance) türetilir. Bu dropdown yalnızca form state'inde yaşar,
// submit sırasında ilgili kolona çevrilir (bkz. new/edit-program-client onSubmit).
export const LOAD_TYPES = [
  { value: "kg", label: "Kg" },
  { value: "percent_1rm", label: "%1RM" },
  { value: "bodyweight", label: "Vücut Ağırlığı" },
  { value: "band", label: "Direnç Bandı" },
] as const;

export const BAND_RESISTANCE_OPTIONS = [
  { value: "soft", label: "Yumuşak" },
  { value: "medium", label: "Orta" },
  { value: "hard", label: "Sert" },
] as const;

// Boş input'u NaN yerine undefined'a çevirir — valueAsNumber'ın boş
// bırakılan opsiyonel sayı alanlarında NaN üretip zod'u sessizce
// reddetmesi bilinen bir bug sınıfı (BUGS.md: week_number/duration_min).
// Yeni set alanları bu deseni tekrar etmesin diye setValueAs kullanılıyor.
const numberOrUndefined = (v: string) => (v === "" ? undefined : Number(v));

export const exerciseSetSchema = z
  .object({
    reps: z.number().int().positive().optional(),
    duration_sec: z.number().int().positive().optional(),
    load_type: z.enum(["kg", "percent_1rm", "bodyweight", "band"]).default("kg"),
    load_kg: z.number().positive().optional(),
    percent_1rm: z.number().positive().max(100).optional(),
    band_resistance: z.enum(["soft", "medium", "hard"]).optional(),
    rpe: z.number().min(1).max(10).optional(),
    notes: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.load_type === "kg" && val.load_kg == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Yük (kg) gerekli",
        path: ["load_kg"],
      });
    }
    if (val.load_type === "percent_1rm" && val.percent_1rm == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "1RM % gerekli",
        path: ["percent_1rm"],
      });
    }
    if (val.load_type === "band" && !val.band_resistance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direnç seviyesi gerekli",
        path: ["band_resistance"],
      });
    }
  });

export type ExerciseSetFormValues = z.infer<typeof exerciseSetSchema>;

export const exerciseSchema = z
  .object({
    name: z.string().min(1, "Egzersiz adı gerekli"),
    category: z.string().optional(),
    is_duration_based: z.boolean().default(false),
    rest_sec: z.number().int().positive().optional().or(z.literal(undefined)),
    notes: z.string().optional(),
    superset_group: z.string().optional(),
    superset_order: z.number().int().default(0),
    exercise_sets: z.array(exerciseSetSchema).min(1, "En az bir set gerekli"),
  })
  .superRefine((val, ctx) => {
    val.exercise_sets.forEach((set, idx) => {
      const hasValue = val.is_duration_based ? set.duration_sec != null : set.reps != null;
      if (!hasValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: val.is_duration_based ? "Süre gerekli" : "Tekrar gerekli",
          path: ["exercise_sets", idx, val.is_duration_based ? "duration_sec" : "reps"],
        });
      }
    });
  });

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;

function emptySet(): ExerciseSetFormValues {
  return { load_type: "kg" } as ExerciseSetFormValues;
}

export function newExerciseDefaults(seed?: { name?: string; category?: string }): ExerciseFormValues {
  return {
    name: seed?.name ?? "",
    category: seed?.category,
    is_duration_based: false,
    superset_group: undefined,
    superset_order: 0,
    exercise_sets: [emptySet()],
  } as ExerciseFormValues;
}

// ExerciseList sadece "sessions.N.exercises" alanına ihtiyaç duyar — çağıran
// dosyanın tam ProgramForm tipi (title/scope/team_id/vb.) burada önemli değil.
export interface ProgramFormShape extends FieldValues {
  sessions: { exercises: ExerciseFormValues[] }[];
}

interface ExerciseRowProps<TFieldValues extends ProgramFormShape> {
  sessionIdx: number;
  exIdx: number;
  register: UseFormRegister<TFieldValues>;
  control: Control<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  exercise: ExerciseFormValues | undefined;
  group: string;
  isGroupStart: boolean;
  groupCount: number;
  borderColor: string;
  onGroupChange: (group: string) => void;
  onRemoveExercise: () => void;
}

function ExerciseRow<TFieldValues extends ProgramFormShape>({
  sessionIdx,
  exIdx,
  register,
  control,
  setValue,
  exercise,
  group,
  isGroupStart,
  groupCount,
  borderColor,
  onGroupChange,
  onRemoveExercise,
}: ExerciseRowProps<TFieldValues>) {
  const base = `sessions.${sessionIdx}.exercises.${exIdx}`;
  const setsPath = `${base}.exercise_sets` as ArrayPath<TFieldValues>;

  const { fields: setFields, append: appendSet, remove: removeSet } = useFieldArray({
    control,
    name: setsPath,
  });

  const isDurationBased = exercise?.is_duration_based ?? false;
  const sets = exercise?.exercise_sets ?? [];

  function handleAddSet() {
    const last = sets[sets.length - 1];
    appendSet((last ? { ...last } : emptySet()) as never);
  }

  function handleToggleDurationBased(value: boolean) {
    setValue(`${base}.is_duration_based` as Path<TFieldValues>, value as never);
  }

  return (
    <div>
      {isGroupStart && (
        <p className="text-xs font-semibold text-muted-foreground mb-1 pl-3">
          {group} Grubu — Süperset ({groupCount} egzersiz)
        </p>
      )}
      <div
        data-testid={`exercise-row-${exIdx}`}
        className={`rounded-md border p-3 space-y-3 ${group ? `border-l-4 ${borderColor}` : ""}`}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              {...register(`${base}.name` as Path<TFieldValues>)}
              placeholder="Egzersiz adı (örn: Back Squat)"
              className="text-sm"
              data-testid={`exercise-name-${exIdx}`}
            />
          </div>
          <select
            value={group}
            onChange={(e) => onGroupChange(e.target.value)}
            className="flex h-9 w-28 shrink-0 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            title="Süperset grubu"
          >
            {SUPERSET_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g ? `Grup ${g}` : "Grup Yok"}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onRemoveExercise}
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border p-0.5 text-xs">
            <button
              type="button"
              data-testid={`toggle-reps-${exIdx}`}
              onClick={() => handleToggleDurationBased(false)}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                !isDurationBased ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Tekrar bazlı
            </button>
            <button
              type="button"
              data-testid={`toggle-duration-${exIdx}`}
              onClick={() => handleToggleDurationBased(true)}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                isDurationBased ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Süre bazlı
            </button>
          </div>
          <div className="ml-auto w-28">
            <Label className="text-xs">Dinlenme (s)</Label>
            <Input
              type="number"
              {...register(`${base}.rest_sec` as Path<TFieldValues>, { setValueAs: numberOrUndefined })}
              placeholder="120"
              className="text-sm h-8"
            />
          </div>
        </div>

        <div className="space-y-2">
          {setFields.map((setField, setIdx) => {
            const set = sets[setIdx];
            const loadType = set?.load_type ?? "kg";

            return (
              <div
                key={setField.id}
                data-testid={`set-row-${exIdx}-${setIdx}`}
                className="flex flex-wrap items-end gap-2 rounded border bg-muted/20 p-2"
              >
                <div className="flex h-8 w-7 shrink-0 items-center justify-center text-xs font-semibold text-muted-foreground">
                  {setIdx + 1}
                </div>

                <div className="w-20">
                  <Label className="text-xs">{isDurationBased ? "Süre (sn)" : "Tekrar"}</Label>
                  <Input
                    type="number"
                    {...register(
                      (isDurationBased
                        ? `${base}.exercise_sets.${setIdx}.duration_sec`
                        : `${base}.exercise_sets.${setIdx}.reps`) as Path<TFieldValues>,
                      { setValueAs: numberOrUndefined }
                    )}
                    placeholder={isDurationBased ? "30" : "8"}
                    className="text-sm h-8"
                    data-testid={`primary-value-${exIdx}-${setIdx}`}
                  />
                </div>

                <div className="w-32">
                  <Label className="text-xs">Yük Tipi</Label>
                  <select
                    {...register(`${base}.exercise_sets.${setIdx}.load_type` as Path<TFieldValues>)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    data-testid={`load-type-${exIdx}-${setIdx}`}
                  >
                    {LOAD_TYPES.map((lt) => (
                      <option key={lt.value} value={lt.value}>
                        {lt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {loadType === "kg" && (
                  <div className="w-24">
                    <Label className="text-xs">Yük (kg)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      {...register(`${base}.exercise_sets.${setIdx}.load_kg` as Path<TFieldValues>, {
                        setValueAs: numberOrUndefined,
                      })}
                      placeholder="80"
                      className="text-sm h-8"
                      data-testid={`load-value-${exIdx}-${setIdx}`}
                    />
                  </div>
                )}

                {loadType === "percent_1rm" && (
                  <div className="w-24">
                    <Label className="text-xs">1RM %</Label>
                    <Input
                      type="number"
                      step="1"
                      min={0}
                      max={100}
                      {...register(
                        `${base}.exercise_sets.${setIdx}.percent_1rm` as Path<TFieldValues>,
                        { setValueAs: numberOrUndefined }
                      )}
                      placeholder="75"
                      className="text-sm h-8"
                      data-testid={`load-value-${exIdx}-${setIdx}`}
                    />
                  </div>
                )}

                {loadType === "band" && (
                  <div className="w-28">
                    <Label className="text-xs">Direnç</Label>
                    <select
                      {...register(
                        `${base}.exercise_sets.${setIdx}.band_resistance` as Path<TFieldValues>
                      )}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      data-testid={`band-${exIdx}-${setIdx}`}
                    >
                      <option value="">Seçin</option>
                      {BAND_RESISTANCE_OPTIONS.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="w-20">
                  <Label className="text-xs">RPE</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min={1}
                    max={10}
                    {...register(`${base}.exercise_sets.${setIdx}.rpe` as Path<TFieldValues>, {
                      setValueAs: numberOrUndefined,
                    })}
                    placeholder="8"
                    className="text-sm h-8"
                    data-testid={`rpe-${exIdx}-${setIdx}`}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={setFields.length <= 1}
                  onClick={() => removeSet(setIdx)}
                  data-testid={`remove-set-${exIdx}-${setIdx}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSet}
          data-testid={`add-set-${exIdx}`}
        >
          <Plus className="h-3.5 w-3.5" />
          Set Ekle
        </Button>

        <Input
          {...register(`${base}.notes` as Path<TFieldValues>)}
          placeholder="Not (isteğe bağlı)"
          className="text-sm"
        />
      </div>
    </div>
  );
}

interface ExerciseListProps<TFieldValues extends ProgramFormShape> {
  sessionIdx: number;
  register: UseFormRegister<TFieldValues>;
  control: Control<TFieldValues>;
  watch: UseFormWatch<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  platformExercises: PlatformExercise[];
  orgExercises: OrgExercise[];
  categories: OrgExerciseCategory[];
  athleteMaxes?: Athlete1RMRecord[];
}

export function ExerciseList<TFieldValues extends ProgramFormShape>({
  sessionIdx,
  register,
  control,
  watch,
  setValue,
  platformExercises,
  orgExercises,
  categories,
  athleteMaxes,
}: ExerciseListProps<TFieldValues>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `sessions.${sessionIdx}.exercises` as ArrayPath<TFieldValues>,
  });

  const [pickerOpen, setPickerOpen] = useState(false);

  const exercises =
    (watch(`sessions.${sessionIdx}.exercises` as Path<TFieldValues>) as
      | ExerciseFormValues[]
      | undefined) ?? [];

  function getGroupCount(group: string): number {
    return exercises.filter((e) => e.superset_group === group && group !== "").length;
  }

  function getNextGroupOrder(group: string): number {
    if (!group) return 0;
    return getGroupCount(group);
  }

  function handleGroupChange(exIdx: number, group: string) {
    if (group && getGroupCount(group) >= 10) return;
    setValue(
      `sessions.${sessionIdx}.exercises.${exIdx}.superset_group` as Path<TFieldValues>,
      (group || undefined) as never
    );
    setValue(
      `sessions.${sessionIdx}.exercises.${exIdx}.superset_order` as Path<TFieldValues>,
      (group ? getNextGroupOrder(group) : 0) as never
    );
  }

  const groupCounts: Record<string, number> = {};
  const groupStartIndices = new Set<number>();

  for (const ex of exercises) {
    if (ex.superset_group) {
      groupCounts[ex.superset_group] = (groupCounts[ex.superset_group] ?? 0) + 1;
    }
  }

  let lastGroup: string | null = null;
  for (let i = 0; i < exercises.length; i++) {
    const g = exercises[i]?.superset_group ?? null;
    if (g && g !== lastGroup) {
      groupStartIndices.add(i);
    }
    lastGroup = g ?? null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>Egzersizler</Label>
        <div className="flex gap-2">
          {(platformExercises.length > 0 || orgExercises.length > 0) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Kütüphaneden Seç
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(newExerciseDefaults() as never)}
            data-testid="add-exercise"
          >
            <Plus className="h-3.5 w-3.5" />
            Egzersiz Ekle
          </Button>
        </div>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-md">
          Henüz egzersiz eklenmedi.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, exIdx) => {
            const ex = exercises[exIdx];
            const group = ex?.superset_group ?? "";
            const isGroupStart = Boolean(group) && groupStartIndices.has(exIdx);
            const borderColor = group ? SUPERSET_COLORS[group] ?? "border-l-gray-400" : "";

            return (
              <ExerciseRow<TFieldValues>
                key={field.id}
                sessionIdx={sessionIdx}
                exIdx={exIdx}
                register={register}
                control={control}
                setValue={setValue}
                exercise={ex}
                group={group}
                isGroupStart={isGroupStart}
                groupCount={groupCounts[group] ?? 0}
                borderColor={borderColor}
                onGroupChange={(g) => handleGroupChange(exIdx, g)}
                onRemoveExercise={() => remove(exIdx)}
              />
            );
          })}
        </div>
      )}

      {pickerOpen && (
        <ExercisePickerModal
          platformExercises={platformExercises}
          orgExercises={orgExercises}
          categories={categories}
          athleteMaxes={athleteMaxes}
          onClose={() => setPickerOpen(false)}
          onPick={(picked) => {
            append(
              newExerciseDefaults({ name: picked.name, category: picked.category }) as never
            );
          }}
        />
      )}
    </div>
  );
}
