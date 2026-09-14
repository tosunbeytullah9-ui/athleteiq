"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  createExercise1RMRatio,
  updateExercise1RMRatio,
} from "@athleteiq/db/queries/exercises";
import type { Exercise1RMRatio } from "@athleteiq/db/queries/exercises";

interface Props {
  editing: Exercise1RMRatio | null;
  onClose: () => void;
  onSaved: (ratio: Exercise1RMRatio) => void;
}

export function Exercise1RMRatioModal({ editing, onClose, onSaved }: Props) {
  const [exerciseName, setExerciseName] = useState(editing?.exercise_name ?? "");
  const [baseExerciseName, setBaseExerciseName] = useState(editing?.base_exercise_name ?? "");
  const [ratio, setRatio] = useState(editing ? String(editing.ratio) : "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const name = exerciseName.trim();
    const baseName = baseExerciseName.trim();
    const ratioValue = Number(ratio.replace(",", "."));

    if (!name) { setError("Türetilen egzersiz adı gerekli."); return; }
    if (!baseName) { setError("Temel egzersiz adı gerekli."); return; }
    if (!Number.isFinite(ratioValue) || ratioValue <= 0) {
      setError("Oran pozitif bir sayı olmalı.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    try {
      const result = editing
        ? await updateExercise1RMRatio(supabase as any, editing.id, {
            exercise_name: name,
            base_exercise_name: baseName,
            ratio: ratioValue,
            notes: notes.trim() || null,
          })
        : await createExercise1RMRatio(supabase as any, {
            exercise_name: name,
            base_exercise_name: baseName,
            ratio: ratioValue,
            notes: notes.trim() || null,
          });
      onSaved(result);
    } catch (err: unknown) {
      const code = (err as { code?: string } | null)?.code;
      const message = (err as { message?: string } | null)?.message;
      if (code === "23505") {
        setError("Bu türetilen egzersiz için zaten bir ilişki tanımlı — düzenleyin veya silin.");
      } else {
        setError(message || "Kaydedilemedi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {editing ? "İlişkiyi Düzenle" : "Yeni 1RM Oran İlişkisi"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          <div>
            <Label className="text-xs">Türetilen Egzersiz</Label>
            <Input
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="Front Squat"
            />
          </div>
          <div>
            <Label className="text-xs">Temel Egzersiz</Label>
            <Input
              value={baseExerciseName}
              onChange={(e) => setBaseExerciseName(e.target.value)}
              placeholder="Back Squat"
            />
          </div>
          <div>
            <Label className="text-xs">Oran</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              placeholder="0.85"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Türetilen 1RM = Temel 1RM × Oran (örn. 0.85 = temelin %85&apos;i)
            </p>
          </div>
          <div>
            <Label className="text-xs">Not (opsiyonel)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Yaygın literatür tahmini"
            />
          </div>
        </div>
        {error && <p className="px-6 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>İptal</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : editing ? "Güncelle" : "Oluştur"}
          </Button>
        </div>
      </div>
    </div>
  );
}
