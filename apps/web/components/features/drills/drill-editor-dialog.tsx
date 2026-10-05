"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import {
  forkPlatformExercise,
  type OrgExercise,
  type PlatformExercise,
} from "@athleteiq/db/queries/exercises";
import {
  deleteDrillDiagram,
  saveDrillDiagram,
  type DrillDiagramRecord,
} from "@athleteiq/db/queries/drills";
import {
  drillDiagramSchema,
  emptyDrillDiagram,
  hasDrawableContent,
  type DrillDiagram,
  type DrillUnit,
} from "@athleteiq/validators/drill";
import { DrillEditor } from "./drill-editor";
import { DrillCard } from "./drill-card";

export type DrillEditorTarget =
  | { kind: "new" }
  | { kind: "org"; exercise: OrgExercise; record: DrillDiagramRecord | null }
  | { kind: "platform"; exercise: PlatformExercise };

interface Props {
  target: DrillEditorTarget;
  orgId: string;
  userId: string;
  /** false ise salt-okunur gösterilir (koç başkasının diyagramını düzenleyemez — RLS). */
  canEdit: boolean;
  onClose: () => void;
  onSaved: (result: { record: DrillDiagramRecord; createdExercise?: OrgExercise }) => void;
  onDeleted: (recordId: string) => void;
}

const SETUP_NOTES_MAX = 2000;

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "PGRST116") {
    return "Bu diyagramı yalnızca oluşturan koç veya bir admin değiştirebilir.";
  }
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Kaydedilemedi.";
}

export function DrillEditorDialog({ target, orgId, userId, canEdit, onClose, onSaved, onDeleted }: Props) {
  const record = target.kind === "org" ? target.record : null;
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<DrillUnit>(record?.unit ?? "m");
  const [diagram, setDiagram] = useState<DrillDiagram>(record?.diagram ?? emptyDrillDiagram());
  const [setupNotes, setSetupNotes] = useState(record?.setup_notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    target.kind === "new"
      ? "Yeni Drill"
      : `${record ? "Drill Diyagramı" : "Drill Diyagramı Ekle"} — ${target.exercise.name}`;

  async function handleSave() {
    setError(null);
    if (target.kind === "new" && !name.trim()) {
      setError("Drill adı gerekli.");
      return;
    }
    // Boşaltılmış etiketler kayıt dışı kalır (şema boş metni reddeder).
    const cleaned = { ...diagram, labels: diagram.labels.filter((l) => l.text.trim()) };
    if (!hasDrawableContent(cleaned)) {
      setError("En az bir koni veya rota ekleyin.");
      return;
    }
    const parsed = drillDiagramSchema.safeParse(cleaned);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Diyagram geçersiz.");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();
    let createdExercise: OrgExercise | undefined;
    try {
      let orgExerciseId: string;
      if (target.kind === "org") {
        orgExerciseId = target.exercise.id;
      } else if (target.kind === "platform") {
        // Diyagram yalnızca org egzersizine bağlanabilir — platform egzersizi önce kütüphaneye eklenir.
        createdExercise = await forkPlatformExercise(supabase, target.exercise.id, orgId, userId);
        orgExerciseId = createdExercise.id;
      } else {
        const { data, error: insertError } = await supabase
          .from("org_exercises")
          .insert({
            org_id: orgId,
            created_by: userId,
            name: name.trim(),
            movement_pattern: "locomotion",
            equipment: ["Koni"],
            load_type: "distance_m",
            difficulty: "intermediate",
            is_active: true,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        createdExercise = data as OrgExercise;
        orgExerciseId = createdExercise.id;
      }

      try {
        const saved = await saveDrillDiagram(supabase, {
          orgId,
          orgExerciseId,
          unit,
          diagram: parsed.data,
          setupNotes: setupNotes.slice(0, SETUP_NOTES_MAX),
          userId,
        });
        onSaved({ record: saved, createdExercise });
      } catch (err) {
        // Yarım kayıt kalmasın: bu pencerede oluşturulan egzersizi geri al.
        if (createdExercise) await supabase.from("org_exercises").delete().eq("id", createdExercise.id);
        throw err;
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    setIsSaving(true);
    setError(null);
    try {
      await deleteDrillDiagram(createClient(), record.id);
      onDeleted(record.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Arka plana tıklamak kapatmaz — çizilmiş diyagram yanlışlıkla kaybolmasın. */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 mx-2 flex max-h-[95vh] w-full max-w-5xl flex-col rounded-xl border bg-card shadow-lg sm:mx-4">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">
              Diyagramlar yalnızca koç ve adminlere görünür; sporcular görmez.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {!canEdit && record ? (
            <>
              <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Bu diyagramı yalnızca oluşturan koç veya bir admin düzenleyebilir.
              </p>
              <DrillCard record={record} />
            </>
          ) : (
            <>
              {target.kind === "new" && (
                <div className="max-w-md">
                  <Label className="text-xs">Drill adı</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="örn. 5-10-5 Pro Agility"
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Egzersiz kütüphanesine eklenir; programa bu adla eklediğinizde diyagram otomatik bağlanır.
                  </p>
                </div>
              )}
              {target.kind === "platform" && (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Bu bir platform egzersizi — kaydettiğinizde organizasyon kütüphanenize kopyalanır ve diyagram o kopyaya
                  bağlanır.
                </p>
              )}

              <DrillEditor value={diagram} onChange={setDiagram} unit={unit} onUnitChange={setUnit} />

              <div>
                <Label className="text-xs">Kurulum notu (isteğe bağlı)</Label>
                <textarea
                  value={setupNotes}
                  onChange={(e) => setSetupNotes(e.target.value)}
                  maxLength={SETUP_NOTES_MAX}
                  rows={2}
                  placeholder="örn. Koniler arası 5 yd; her tekrar arası 45 sn yürüyerek dönüş."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </>
          )}
        </div>

        {error && <p className="px-5 pb-2 text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
          <div>
            {record && canEdit && (
              confirmDelete ? (
                <span className="flex items-center gap-2 text-xs">
                  Diyagram silinsin mi? (Egzersiz kalır.)
                  <Button type="button" variant="outline" size="sm" onClick={handleDelete} disabled={isSaving}>
                    Evet, sil
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={isSaving}>
                    Vazgeç
                  </Button>
                </span>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} disabled={isSaving}>
                  Diyagramı sil
                </Button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              {canEdit || !record ? "İptal" : "Kapat"}
            </Button>
            {(canEdit || !record) && (
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
