"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { createClient } from "@/lib/supabase/client";
import { updatePlatformExercise } from "@athleteiq/db/queries/exercises";
import type { PlatformExercise } from "@athleteiq/db/queries/exercises";
import { ExerciseFormFields, parseArrayField } from "./exercise-form-fields";
import type { ExerciseFormData } from "./exercise-form-fields";

interface Props {
  exercise: PlatformExercise;
  onClose: () => void;
  onUpdated: (ex: PlatformExercise) => void;
}

function toFormData(ex: PlatformExercise): ExerciseFormData {
  return {
    name: ex.name,
    name_tr: ex.name_tr ?? "",
    movement_pattern: ex.movement_pattern ?? "",
    custom_category_id: "",
    primary_muscles: (ex.primary_muscles ?? []).join(", "),
    secondary_muscles: (ex.secondary_muscles ?? []).join(", "),
    equipment: (ex.equipment ?? []).join(", "),
    sport_tags: (ex.sport_tags ?? []).join(", "),
    load_type: ex.load_type ?? "absolute_kg",
    is_unilateral: ex.is_unilateral ?? false,
    difficulty: ex.difficulty ?? "intermediate",
    instructions: ex.instructions ?? "",
    coach_notes: "",
    demo_url: ex.demo_url ?? "",
  };
}

export function EditPlatformExerciseModal({ exercise, onClose, onUpdated }: Props) {
  const [form, setForm] = useState<ExerciseFormData>(toFormData(exercise));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(updates: Partial<ExerciseFormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Egzersiz adı gerekli."); return; }
    if (!form.movement_pattern) { setError("Hareket paterni seçilmeli."); return; }

    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      name_tr: form.name_tr.trim() || null,
      movement_pattern: form.movement_pattern,
      primary_muscles: parseArrayField(form.primary_muscles),
      secondary_muscles: parseArrayField(form.secondary_muscles),
      equipment: parseArrayField(form.equipment),
      sport_tags: parseArrayField(form.sport_tags),
      load_type: form.load_type,
      is_unilateral: form.is_unilateral,
      difficulty: form.difficulty,
      instructions: form.instructions.trim() || null,
      demo_url: form.demo_url.trim() || null,
    };

    try {
      const result = await updatePlatformExercise(supabase as any, exercise.id, payload);
      onUpdated(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Egzersiz güncellenemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl border bg-card shadow-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Platform Egzersizini Düzenle</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          <ExerciseFormFields data={form} onChange={handleChange} categories={[]} scope="platform" />
        </div>
        {error && <p className="px-6 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>İptal</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : "Güncelle"}
          </Button>
        </div>
      </div>
    </div>
  );
}
