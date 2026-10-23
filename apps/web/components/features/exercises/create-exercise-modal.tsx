"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { createClient } from "@/lib/supabase/client";
import type { OrgExercise, OrgExerciseCategory } from "@athleteiq/db/queries/exercises";
import { ExerciseFormFields, parseArrayField } from "./exercise-form-fields";
import type { ExerciseFormData } from "./exercise-form-fields";

interface Props {
  orgId: string;
  userId: string;
  categories: OrgExerciseCategory[];
  onClose: () => void;
  onCreated: (ex: OrgExercise) => void;
}

const DEFAULT_FORM: ExerciseFormData = {
  name: "",
  name_tr: "",
  movement_pattern: "",
  custom_category_id: "",
  primary_muscles: "",
  secondary_muscles: "",
  equipment: "",
  sport_tags: "",
  load_type: "absolute_kg",
  is_unilateral: false,
  difficulty: "intermediate",
  instructions: "",
  coach_notes: "",
  demo_url: "",
};

export function CreateExerciseModal({ orgId, userId, categories, onClose, onCreated }: Props) {
  const [form, setForm] = useState<ExerciseFormData>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(updates: Partial<ExerciseFormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Egzersiz adı gerekli."); return; }
    if (!form.movement_pattern && !form.custom_category_id) {
      setError("Hareket paterni veya org kategorisi seçilmeli."); return;
    }

    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      org_id: orgId,
      created_by: userId,
      updated_by: null,
      forked_from_platform: null,
      name: form.name.trim(),
      name_tr: form.name_tr.trim() || null,
      movement_pattern: form.movement_pattern || null,
      custom_category_id: form.custom_category_id || null,
      primary_muscles: parseArrayField(form.primary_muscles),
      secondary_muscles: parseArrayField(form.secondary_muscles),
      equipment: parseArrayField(form.equipment),
      sport_tags: parseArrayField(form.sport_tags),
      load_type: form.load_type,
      is_unilateral: form.is_unilateral,
      difficulty: form.difficulty,
      instructions: form.instructions.trim() || null,
      coach_notes: form.coach_notes.trim() || null,
      demo_url: form.demo_url.trim() || null,
      is_active: true,
    };

    const { data, error: err } = await (supabase as any)
      .from("org_exercises")
      .insert(payload)
      .select()
      .single();

    setIsSubmitting(false);
    if (err) { setError(err.message); return; }
    onCreated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl border bg-card shadow-lg mx-3 sm:mx-4 flex flex-col max-h-[calc(100dvh-2rem)]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Yeni Egzersiz Oluştur</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          <ExerciseFormFields data={form} onChange={handleChange} categories={categories} />
        </div>
        {error && <p className="px-6 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>İptal</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : "Oluştur"}
          </Button>
        </div>
      </div>
    </div>
  );
}
