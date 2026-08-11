"use client";

import { useState, useMemo } from "react";
import { X, Search } from "lucide-react";
import { Input } from "@athleteiq/ui/components/input";
import { normalizeExerciseName } from "@athleteiq/validators/exercise";
import type { PlatformExercise, OrgExercise, OrgExerciseCategory, Athlete1RMRecord } from "@athleteiq/db/queries/exercises";

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
};

export interface PickedExercise {
  name: string;
  category?: string;
  load_type?: string;
  superset_group?: string;
  /** Katalog kaydının id'si — 1RM formu gibi exercise_id/exercise_source gereken akışlar için. */
  id?: string;
  source?: "platform" | "org";
}

interface Props {
  platformExercises: PlatformExercise[];
  orgExercises: OrgExercise[];
  categories: OrgExerciseCategory[];
  athleteMaxes?: Athlete1RMRecord[];
  onClose: () => void;
  onPick: (ex: PickedExercise) => void;
}

type FilterMode = "all" | "platform" | "org" | { pattern: string } | { category: string };

export function ExercisePickerModal({
  platformExercises,
  orgExercises,
  categories,
  athleteMaxes = [],
  onClose,
  onPick,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const maxMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of athleteMaxes) {
      m[normalizeExerciseName(r.exercise_name)] = r.weight_kg;
    }
    return m;
  }, [athleteMaxes]);

  const combined = useMemo(() => {
    const p = platformExercises.map((e) => ({ ...e, _source: "platform" as const, custom_category_id: null as null }));
    const o = orgExercises.map((e) => ({ ...e, _source: "org" as const }));
    return [...o, ...p];
  }, [platformExercises, orgExercises]);

  const filtered = useMemo(() => {
    return combined.filter((ex) => {
      if (search) {
        const q = normalizeExerciseName(search);
        if (
          !normalizeExerciseName(ex.name).includes(q) &&
          !(ex.name_tr && normalizeExerciseName(ex.name_tr).includes(q))
        )
          return false;
      }
      if (filterMode === "platform") return ex._source === "platform";
      if (filterMode === "org") return ex._source === "org";
      if (typeof filterMode === "object" && "pattern" in filterMode) {
        return ex.movement_pattern === filterMode.pattern;
      }
      if (typeof filterMode === "object" && "category" in filterMode) {
        if (ex._source === "platform") return false;
        return (ex as OrgExercise).custom_category_id === filterMode.category;
      }
      return true;
    });
  }, [combined, search, filterMode]);

  const patterns = useMemo(() => {
    const set = new Set(combined.map((e) => e.movement_pattern).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [combined]);

  function handlePick(ex: (typeof filtered)[number]) {
    onPick({
      name: ex.name,
      category: ex.movement_pattern ?? undefined,
      load_type: ex.load_type ?? undefined,
      id: ex.id,
      source: ex._source,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-xl border bg-card shadow-lg mx-4 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-base font-semibold">Egzersiz Seç</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-44 border-r shrink-0 overflow-y-auto py-2">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                filterMode === "all" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              Tümü ({combined.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("org")}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                filterMode === "org" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              Org Egzersizleri ({orgExercises.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("platform")}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                filterMode === "platform" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              Platform ({platformExercises.length})
            </button>

            {categories.length > 0 && (
              <>
                <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kategoriler
                </div>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilterMode({ category: c.id })}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      typeof filterMode === "object" && "category" in filterMode && filterMode.category === c.id
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                      style={{ background: c.color ?? "#534AB7" }}
                    />
                    {c.name_tr ?? c.name}
                  </button>
                ))}
              </>
            )}

            <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paternler
            </div>
            {patterns.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterMode({ pattern: p })}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors truncate ${
                  typeof filterMode === "object" && "pattern" in filterMode && filterMode.pattern === p
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {MOVEMENT_LABELS[p] ?? p}
              </button>
            ))}
          </div>

          {/* Liste */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Egzersiz ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Sonuç bulunamadı.</p>
              ) : (
                filtered.map((ex) => {
                  const max =
                    maxMap[normalizeExerciseName(ex.name)] ??
                    (ex.name_tr ? maxMap[normalizeExerciseName(ex.name_tr)] : undefined);

                  return (
                    <button
                      key={`${ex._source}-${ex.id}`}
                      type="button"
                      onClick={() => handlePick(ex)}
                      className="w-full text-left px-4 py-2.5 border-b last:border-0 hover:bg-accent transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{ex.name}</p>
                        {ex.name_tr && ex.name_tr !== ex.name && (
                          <p className="text-xs text-muted-foreground/60 truncate">({ex.name_tr})</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {ex._source === "org" ? "Org • " : "P • "}
                          {MOVEMENT_LABELS[ex.movement_pattern ?? ""] ?? ex.movement_pattern}
                          {ex.difficulty && ` • ${ex.difficulty}`}
                        </p>
                      </div>
                      {max !== undefined && (
                        <span className="shrink-0 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                          Son max: {max} kg
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
