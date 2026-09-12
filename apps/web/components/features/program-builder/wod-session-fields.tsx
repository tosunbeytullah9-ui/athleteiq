"use client";

import { useFieldArray } from "react-hook-form";
import type {
  ArrayPath,
  Control,
  FieldValues,
  Path,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";

// CrossFit tarzı (WOD) seans desteği — bkz. plan "expressive-weaving-candy".
// Kapsam BİLEREK dar: set/yük/skorlama YOK, yalnızca yapı (format + zamanlama
// + düz hareket listesi). exercise-list.tsx'teki exerciseSchema/ExerciseList
// (kuvvet akışı) buna HİÇ dokunulmadan ayrı tutuluyor.

export const WORKOUT_FORMATS = [
  { value: "amrap", label: "AMRAP" },
  { value: "emom", label: "EMOM" },
  { value: "for_time", label: "For Time" },
  { value: "tabata", label: "Tabata" },
  { value: "rounds_for_time", label: "Tur Bazlı (RFT)" },
  { value: "chipper", label: "Chipper" },
] as const;

export type WorkoutFormat = (typeof WORKOUT_FORMATS)[number]["value"];

const numberOrUndefined = (v: string) => (v === "" ? undefined : Number(v));

export const wodMovementSchema = z.object({
  name: z.string().min(1, "Hareket adı gerekli"),
  movement_detail: z.string().optional(),
  notes: z.string().optional(),
  order_index: z.number().int().default(0),
});

export type WodMovementFormValues = z.infer<typeof wodMovementSchema>;

export function newWodMovementDefaults(): WodMovementFormValues {
  return { name: "", order_index: 0 };
}

export interface WodProgramFormShape extends FieldValues {
  sessions: {
    workout_format?: string;
    // Dakika cinsinden — form alanı budur, saniyeye çevirme yalnızca
    // program-rpc.ts'teki buildSessionsPayload'da (RPC/DB saniye bekliyor).
    time_cap_min?: number;
    rounds?: number;
    work_sec?: number;
    interval_rest_sec?: number;
    wod_movements: WodMovementFormValues[];
  }[];
}

interface WodFormatFieldsProps<TFieldValues extends WodProgramFormShape> {
  sessionIdx: number;
  format: WorkoutFormat;
  register: UseFormRegister<TFieldValues>;
}

// Formata göre hangi zamanlama alanının anlamlı olduğunu gösterir — hepsi
// aynı genel kolonları (time_cap_sec/rounds/work_sec/interval_rest_sec)
// kullanır, yalnızca hangisinin gösterildiği formata göre değişir.
export function WodFormatFields<TFieldValues extends WodProgramFormShape>({
  sessionIdx,
  format,
  register,
}: WodFormatFieldsProps<TFieldValues>) {
  const base = `sessions.${sessionIdx}`;

  return (
    <div className="grid grid-cols-3 gap-3">
      {(format === "amrap" || format === "for_time" || format === "chipper") && (
        <div className="space-y-1.5">
          <Label className="text-xs">Süre Sınırı (dk){format !== "amrap" ? " (opsiyonel)" : ""}</Label>
          <Input
            type="number"
            {...register(`${base}.time_cap_min` as Path<TFieldValues>, {
              setValueAs: numberOrUndefined,
            })}
            placeholder="12"
            className="h-8 text-sm"
          />
        </div>
      )}

      {(format === "emom" || format === "rounds_for_time") && (
        <div className="space-y-1.5">
          <Label className="text-xs">Tur Sayısı</Label>
          <Input
            type="number"
            {...register(`${base}.rounds` as Path<TFieldValues>, { setValueAs: numberOrUndefined })}
            placeholder={format === "emom" ? "20" : "5"}
            className="h-8 text-sm"
          />
        </div>
      )}

      {format === "emom" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Aralık (sn)</Label>
          <Input
            type="number"
            {...register(`${base}.work_sec` as Path<TFieldValues>, { setValueAs: numberOrUndefined })}
            placeholder="60"
            className="h-8 text-sm"
          />
        </div>
      )}

      {format === "tabata" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Tur Sayısı</Label>
            <Input
              type="number"
              {...register(`${base}.rounds` as Path<TFieldValues>, { setValueAs: numberOrUndefined })}
              placeholder="8"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Çalışma (sn)</Label>
            <Input
              type="number"
              {...register(`${base}.work_sec` as Path<TFieldValues>, { setValueAs: numberOrUndefined })}
              placeholder="20"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dinlenme (sn)</Label>
            <Input
              type="number"
              {...register(`${base}.interval_rest_sec` as Path<TFieldValues>, {
                setValueAs: numberOrUndefined,
              })}
              placeholder="10"
              className="h-8 text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}

interface WodMovementListProps<TFieldValues extends WodProgramFormShape> {
  sessionIdx: number;
  register: UseFormRegister<TFieldValues>;
  control: Control<TFieldValues>;
  watch: UseFormWatch<TFieldValues>;
}

// Süperset/circuit gruplama YOK (bilinçli kapsam dışı) — düz, sıralı bir
// hareket listesi. Her satır: isim + "ne kadar" (serbest metin: "15 tekrar",
// "20 cal Row", "400m", "21-15-9" gibi) + opsiyonel not.
export function WodMovementList<TFieldValues extends WodProgramFormShape>({
  sessionIdx,
  register,
  control,
  watch,
}: WodMovementListProps<TFieldValues>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `sessions.${sessionIdx}.wod_movements` as ArrayPath<TFieldValues>,
  });

  const movements =
    (watch(`sessions.${sessionIdx}.wod_movements` as Path<TFieldValues>) as
      | WodMovementFormValues[]
      | undefined) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>Hareketler</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(newWodMovementDefaults() as never)}
        >
          <Plus className="h-3.5 w-3.5" />
          Hareket Ekle
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
          Henüz hareket eklenmedi.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, idx) => {
            const base = `sessions.${sessionIdx}.wod_movements.${idx}`;
            return (
              <div key={field.id} className="flex items-start gap-2 rounded-md border p-2">
                <div className="flex h-8 w-6 shrink-0 items-center justify-center text-xs font-semibold text-muted-foreground">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <Input
                    {...register(`${base}.name` as Path<TFieldValues>)}
                    placeholder="Hareket adı (örn: Thruster)"
                    className="text-sm h-8"
                  />
                </div>
                <div className="w-40">
                  <Input
                    {...register(`${base}.movement_detail` as Path<TFieldValues>)}
                    placeholder="Örn: 15 tekrar / 20 cal"
                    className="text-sm h-8"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => remove(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      {movements.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Sıra tekrar/ağırlık şeması (örn. &quot;21-15-9&quot;) her hareketin &quot;ne kadar&quot;
          alanına serbest metin olarak yazılabilir.
        </p>
      )}
    </div>
  );
}
