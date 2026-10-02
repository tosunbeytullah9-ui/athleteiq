import { z } from "zod";
import { exerciseSchema } from "@/components/features/program-builder/exercise-list";
import { wodMovementSchema } from "@/components/features/program-builder/wod-session-fields";
import { enduranceSessionFields } from "@athleteiq/validators/endurance";

// Program oluşturma (new-program-client.tsx) ve hafta düzenleme
// (week-editor-form.tsx) formlarının ORTAK seans şeması.
//
// BİLİNÇLİ OLARAK GEVŞEK (2026-10-02): seans içindeki hiçbir alan kaydı
// engellemez. Önceki sürümde boş bırakılan "Tahmini Seans Süresi" (valueAsNumber
// → NaN), boş tekrar/kg ya da isimsiz bir egzersiz satırı kaydı SESSİZCE
// kilitliyordu — hata kapalı bir seans kartının içinde kaldığı için koç yalnızca
// "Formda eksik veya hatalı alanlar var" uyarısını görüyor, nedenini bulamıyordu.
// Artık temizlik payload'da yapılır (program-rpc.ts): isimsiz egzersiz/hareket ve
// boş dayanıklılık bölümleri atlanır, anlamsız sayılar null'a düşer.
// Program seviyesinde zorunlu kalanlar (başlık, tarih, takım/sporcu) her formun
// kendi programSchema'sında ve 1. adımda alanın altında gösterilir.

const nanToUndefined = (v: unknown) =>
  (typeof v === "number" && Number.isNaN(v)) || v === null ? undefined : v;
export const optionalNumber = z.preprocess(nanToUndefined, z.number().optional());

export const sessionFormSchema = z.object({
  day_of_week: z.number().int().min(1).max(7),
  session_type: z.enum(["strength", "conditioning", "technical", "recovery", "competition"]).optional(),
  title: z.string().optional(),
  duration_min: optionalNumber,
  exercises: z.array(exerciseSchema).default([]),
  // CrossFit tarzı (WOD) seans alanları — "" native <select>'in boş değeri.
  workout_format: z
    .enum(["amrap", "emom", "for_time", "tabata", "rounds_for_time", "chipper", ""])
    .optional()
    .transform((v) => (v ? v : undefined)),
  time_cap_min: optionalNumber,
  rounds: optionalNumber,
  work_sec: optionalNumber,
  interval_rest_sec: optionalNumber,
  wod_movements: z.array(wodMovementSchema).default([]),
  // Dayanıklılık seansı — bkz. endurance-session-fields.tsx.
  ...enduranceSessionFields,
});

export type SessionFormInput = z.infer<typeof sessionFormSchema>;
