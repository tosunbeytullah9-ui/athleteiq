"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import type { OrgExerciseCategory } from "@athleteiq/db/queries/exercises";

const PRESET_COLORS = [
  "#534AB7", "#0F6E56", "#993C1D", "#185FA5", "#854F0B",
  "#1D4ED8", "#047857", "#B45309", "#7C3AED", "#DC2626",
];

interface Props {
  orgId: string;
  userId: string;
  editTarget: OrgExerciseCategory | null;
  onClose: () => void;
  onSaved: (cat: OrgExerciseCategory) => void;
}

export function CreateCategoryModal({ orgId, userId, editTarget, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [nameTr, setNameTr] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]!);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editTarget) {
      setName(editTarget.name);
      setNameTr(editTarget.name_tr ?? "");
      setDescription(editTarget.description ?? "");
      setColor(editTarget.color ?? PRESET_COLORS[0]!);
    }
  }, [editTarget]);

  async function handleSubmit() {
    if (!name.trim()) { setError("Kategori adı gerekli."); return; }
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();

    if (editTarget) {
      const { data, error: err } = await (supabase as any)
        .from("org_exercise_categories")
        .update({
          name: name.trim(),
          name_tr: nameTr.trim() || null,
          description: description.trim() || null,
          color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editTarget.id)
        .select()
        .single();

      setIsSubmitting(false);
      if (err) { setError(err.message); return; }
      onSaved(data);
    } else {
      const { data, error: err } = await (supabase as any)
        .from("org_exercise_categories")
        .insert({
          org_id: orgId,
          name: name.trim(),
          name_tr: nameTr.trim() || null,
          description: description.trim() || null,
          color,
          created_by: userId,
        })
        .select()
        .single();

      setIsSubmitting(false);
      if (err) { setError(err.message); return; }
      onSaved(data);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 mx-3 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border bg-card shadow-lg sm:mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {editTarget ? "Kategoriyi Düzenle" : "Yeni Kategori Oluştur"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kategori Adı (EN) *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="gymnastics_specific" />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori Adı (TR)</Label>
              <Input value={nameTr} onChange={(e) => setNameTr(e.target.value)} placeholder="Jimnastiğe Özgü" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="İsteğe bağlı..." />
          </div>

          <div className="space-y-1.5">
            <Label>Renk</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""
                  }`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-7 rounded-full border cursor-pointer"
                title="Özel renk seç"
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block h-4 w-4 rounded-full"
                style={{ background: color }}
              />
              <span className="text-xs text-muted-foreground">{color}</span>
            </div>
          </div>
        </div>
        {error && <p className="px-6 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>İptal</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : (editTarget ? "Güncelle" : "Oluştur")}
          </Button>
        </div>
      </div>
    </div>
  );
}
