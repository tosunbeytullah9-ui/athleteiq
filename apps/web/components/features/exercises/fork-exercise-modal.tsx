"use client";

import { useState, useMemo } from "react";
import { X, Search, GitFork } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { createClient } from "@/lib/supabase/client";
import type { PlatformExercise, OrgExercise } from "@athleteiq/db/queries/exercises";

const MOVEMENT_LABELS: Record<string, string> = {
  horizontal_push: "Horizontal Push",
  vertical_push: "Vertical Push",
  horizontal_pull: "Horizontal Pull",
  vertical_pull: "Vertical Pull",
  hip_hinge_bilateral: "Hip Hinge (Bilateral)",
  hip_hinge_unilateral: "Hip Hinge (Unilateral)",
  knee_dominant_bilateral: "Knee Dominant (Bilateral)",
  knee_dominant_unilateral: "Knee Dominant (Unilateral)",
  rotation: "Rotation",
  anti_rotation: "Anti-Rotation",
  jump_land: "Jump & Land",
  locomotion: "Locomotion",
  core_stability: "Core Stability",
  loaded_carry: "Loaded Carry",
  sport_specific: "Sport Specific",
  mobility_flexibility: "Mobility & Flexibility",
  isolation: "Isolation",
  olympic_lift: "Olympic Lift",
};

interface Props {
  platformExercises: PlatformExercise[];
  orgId: string;
  userId: string;
  onClose: () => void;
  onForked: (ex: OrgExercise) => void;
}

export function ForkExerciseModal({ platformExercises, orgId, userId, onClose, onForked }: Props) {
  const [search, setSearch] = useState("");
  const [patternFilter, setPatternFilter] = useState("");
  const [selected, setSelected] = useState<PlatformExercise | null>(null);
  const [customName, setCustomName] = useState("");
  const [customNameTr, setCustomNameTr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return platformExercises.filter((ex) => {
      const q = search.toLowerCase();
      const matchSearch = !search || ex.name.toLowerCase().includes(q) || (ex.name_tr?.toLowerCase().includes(q) ?? false);
      const matchPattern = !patternFilter || ex.movement_pattern === patternFilter;
      return matchSearch && matchPattern;
    });
  }, [platformExercises, search, patternFilter]);

  function handleSelect(ex: PlatformExercise) {
    setSelected(ex);
    setCustomName(ex.name);
    setCustomNameTr(ex.name_tr ?? "");
    setError(null);
  }

  async function handleFork() {
    if (!selected) return;
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      org_id: orgId,
      created_by: userId,
      updated_by: null,
      forked_from_platform: selected.id,
      name: customName.trim() || selected.name,
      name_tr: customNameTr.trim() || selected.name_tr || null,
      movement_pattern: selected.movement_pattern,
      custom_category_id: null,
      primary_muscles: selected.primary_muscles ?? [],
      secondary_muscles: selected.secondary_muscles ?? [],
      sport_tags: selected.sport_tags ?? [],
      equipment: selected.equipment ?? [],
      load_type: selected.load_type,
      is_unilateral: selected.is_unilateral,
      difficulty: selected.difficulty,
      demo_url: selected.demo_url,
      instructions: selected.instructions,
      coach_notes: null,
      is_active: true,
    };

    const { data, error: err } = await (supabase as any)
      .from("org_exercises")
      .insert(payload)
      .select()
      .single();

    setIsSubmitting(false);
    if (err) { setError(err.message); return; }
    onForked(data);
  }

  const patterns = useMemo(() => {
    const set = new Set(platformExercises.map((e) => e.movement_pattern));
    return Array.from(set).sort();
  }, [platformExercises]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-xl border bg-card shadow-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Platform&apos;dan Egzersiz Ekle</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sol: Liste */}
          <div className="w-1/2 border-r flex flex-col">
            <div className="p-3 space-y-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={patternFilter}
                onChange={(e) => setPatternFilter(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Tüm Paternler</option>
                {patterns.map((p) => (
                  <option key={p} value={p}>{MOVEMENT_LABELS[p] ?? p}</option>
                ))}
              </select>
            </div>

            <div className="overflow-y-auto flex-1">
              {filtered.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => handleSelect(ex)}
                  className={`w-full text-left px-4 py-2.5 border-b last:border-0 transition-colors hover:bg-accent ${
                    selected?.id === ex.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <p className="text-sm font-medium">{ex.name}</p>
                  {ex.name_tr && ex.name_tr !== ex.name && (
                    <p className="text-xs text-muted-foreground/60">({ex.name_tr})</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {MOVEMENT_LABELS[ex.movement_pattern] ?? ex.movement_pattern}
                    {ex.difficulty && ` • ${ex.difficulty}`}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-6">Sonuç bulunamadı.</p>
              )}
            </div>
          </div>

          {/* Sağ: Özelleştirme */}
          <div className="w-1/2 p-4 overflow-y-auto">
            {!selected ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  Sol taraftan bir egzersiz seçin.<br />Adını özelleştirebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Seçilen Egzersiz
                  </p>
                  <p className="font-medium">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {MOVEMENT_LABELS[selected.movement_pattern] ?? selected.movement_pattern}
                  </p>
                  {selected.primary_muscles?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Kas: {selected.primary_muscles.slice(0, 4).join(", ")}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Özelleştir (isteğe bağlı)
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">İsim (EN)</label>
                    <Input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={selected.name}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">İsim (TR)</label>
                    <Input
                      value={customNameTr}
                      onChange={(e) => setCustomNameTr(e.target.value)}
                      placeholder={selected.name_tr ?? ""}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Diğer özellikler (kas grupları, ekipman, talimatlar) kütüphaneye eklendikten sonra düzenlenebilir.
                  </p>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  className="w-full"
                  onClick={handleFork}
                  disabled={isSubmitting}
                >
                  <GitFork className="h-4 w-4" />
                  {isSubmitting ? "Ekleniyor..." : "Kütüphaneye Ekle"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
