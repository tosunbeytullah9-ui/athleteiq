"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Pencil, Trash2, GitFork, Layers } from "lucide-react";
import { Input } from "@athleteiq/ui/components/input";
import { Button } from "@athleteiq/ui/components/button";
import { Badge } from "@athleteiq/ui/components/badge";
import type { PlatformExercise, OrgExercise, OrgExerciseCategory } from "@athleteiq/db/queries/exercises";
import { CreateExerciseModal } from "@/components/features/exercises/create-exercise-modal";
import { EditExerciseModal } from "@/components/features/exercises/edit-exercise-modal";
import { CreateCategoryModal } from "@/components/features/exercises/create-category-modal";
import { ForkExerciseModal } from "@/components/features/exercises/fork-exercise-modal";
import { DeleteConfirmDialog } from "@/components/features/exercises/delete-confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

const MOVEMENT_PATTERNS: { value: string; label: string }[] = [
  { value: "horizontal_push", label: "Horizontal Push" },
  { value: "vertical_push", label: "Vertical Push" },
  { value: "horizontal_pull", label: "Horizontal Pull" },
  { value: "vertical_pull", label: "Vertical Pull" },
  { value: "hip_hinge_bilateral", label: "Hip Hinge (Bilateral)" },
  { value: "hip_hinge_unilateral", label: "Hip Hinge (Unilateral)" },
  { value: "knee_dominant_bilateral", label: "Knee Dominant (Bilateral)" },
  { value: "knee_dominant_unilateral", label: "Knee Dominant (Unilateral)" },
  { value: "rotation", label: "Rotation" },
  { value: "anti_rotation", label: "Anti-Rotation" },
  { value: "jump_land", label: "Jump & Land" },
  { value: "locomotion", label: "Locomotion" },
  { value: "core_stability", label: "Core Stability" },
  { value: "loaded_carry", label: "Loaded Carry" },
  { value: "sport_specific", label: "Sport Specific" },
  { value: "mobility_flexibility", label: "Mobility & Flexibility" },
  { value: "isolation", label: "Isolation" },
  { value: "olympic_lift", label: "Olympic Lift" },
];

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: "Başlangıç", color: "bg-green-100 text-green-800" },
  intermediate: { label: "Orta", color: "bg-yellow-100 text-yellow-800" },
  advanced: { label: "İleri", color: "bg-red-100 text-red-800" },
};

interface Props {
  platformExercises: PlatformExercise[];
  orgExercises: OrgExercise[];
  categories: OrgExerciseCategory[];
  orgId: string;
  userId: string;
  userRole: string;
}

type FilterSidebar =
  | { type: "all" }
  | { type: "pattern"; value: string }
  | { type: "category"; value: string };

export function ExercisesClient({
  platformExercises: initialPlatform,
  orgExercises: initialOrg,
  categories: initialCategories,
  orgId,
  userId,
  userRole,
}: Props) {
  const router = useRouter();

  const [platform, setPlatform] = useState(initialPlatform);
  const [org, setOrg] = useState(initialOrg);
  const [categories, setCategories] = useState(initialCategories);

  const [search, setSearch] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState<FilterSidebar>({ type: "all" });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgExercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgExercise | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editCategoryTarget, setEditCategoryTarget] = useState<OrgExerciseCategory | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<OrgExerciseCategory | null>(null);
  const [forkOpen, setForkOpen] = useState(false);

  const canWrite = userRole === "admin" || userRole === "coach";

  const filtered = useMemo(() => {
    const allPlatform = platform.map((e) => ({ ...e, _source: "platform" as const }));
    const allOrg = org.map((e) => ({ ...e, _source: "org" as const }));
    const combined = [...allPlatform, ...allOrg];

    return combined.filter((ex) => {
      if (search) {
        const q = search.toLowerCase();
        const matchName = ex.name.toLowerCase().includes(q) || (ex.name_tr?.toLowerCase().includes(q) ?? false);
        if (!matchName) return false;
      }

      if (sidebarFilter.type === "pattern") {
        return ex.movement_pattern === sidebarFilter.value;
      }
      if (sidebarFilter.type === "category") {
        if (ex._source === "platform") return false;
        return (ex as OrgExercise).custom_category_id === sidebarFilter.value;
      }
      return true;
    });
  }, [platform, org, search, sidebarFilter]);

  async function handleDeleteExercise(ex: OrgExercise) {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from("org_exercises")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", ex.id);

    if (error) {
      toast({ title: "Hata", description: "Egzersiz silinemedi.", variant: "destructive" });
      return;
    }
    setOrg((prev) => prev.filter((e) => e.id !== ex.id));
    setDeleteTarget(null);
    toast({ title: "Egzersiz silindi" });
  }

  async function handleDeleteCategory(cat: OrgExerciseCategory) {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from("org_exercise_categories")
      .delete()
      .eq("id", cat.id);

    if (error) {
      toast({ title: "Hata", description: "Kategori silinemedi.", variant: "destructive" });
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    setDeleteCategoryTarget(null);
    if (sidebarFilter.type === "category" && sidebarFilter.value === cat.id) {
      setSidebarFilter({ type: "all" });
    }
    toast({ title: "Kategori silindi" });
  }

  const patternCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ex of [...platform, ...org]) {
      const p = ex.movement_pattern;
      if (p) map[p] = (map[p] ?? 0) + 1;
    }
    return map;
  }, [platform, org]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ex of org) {
      if (ex.custom_category_id) {
        map[ex.custom_category_id] = (map[ex.custom_category_id] ?? 0) + 1;
      }
    }
    return map;
  }, [org]);

  return (
    <div className="flex h-full gap-0">
      {/* Sol sidebar */}
      <aside className="w-56 shrink-0 border-r overflow-y-auto pr-0">
        <div className="p-3 space-y-0.5">
          <button
            onClick={() => setSidebarFilter({ type: "all" })}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              sidebarFilter.type === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            Tüm Egzersizler
            <span className="ml-1 text-xs opacity-70">({platform.length + org.length})</span>
          </button>

          <div className="pt-3 pb-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hareket Paterni
            </p>
          </div>

          {MOVEMENT_PATTERNS.map((p) => (
            <button
              key={p.value}
              onClick={() => setSidebarFilter({ type: "pattern", value: p.value })}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                sidebarFilter.type === "pattern" && sidebarFilter.value === p.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <span className="truncate">{p.label}</span>
              {patternCounts[p.value] ? (
                <span className="ml-1 text-xs opacity-60">({patternCounts[p.value]})</span>
              ) : null}
            </button>
          ))}

          <div className="pt-4 pb-1 flex items-center justify-between px-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Org Kategorileri
            </p>
            {canWrite && (
              <button
                onClick={() => { setEditCategoryTarget(null); setCategoryModalOpen(true); }}
                className="text-muted-foreground hover:text-foreground"
                title="Yeni kategori"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {categories.length === 0 ? (
            <p className="px-3 text-xs text-muted-foreground py-1">Henüz kategori yok.</p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors group ${
                  sidebarFilter.type === "category" && sidebarFilter.value === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <button
                  className="flex-1 text-left text-sm"
                  onClick={() => setSidebarFilter({ type: "category", value: cat.id })}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5 shrink-0"
                    style={{ background: cat.color ?? "#534AB7" }}
                  />
                  <span className="truncate">{cat.name_tr ?? cat.name}</span>
                  {categoryCounts[cat.id] ? (
                    <span className="ml-1 text-xs opacity-60">({categoryCounts[cat.id]})</span>
                  ) : null}
                </button>
                {canWrite && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditCategoryTarget(cat); setCategoryModalOpen(true); }}
                      className="p-0.5 hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteCategoryTarget(cat); }}
                      className="p-0.5 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Ana alan */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Egzersiz Kütüphanesi</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {platform.length} platform + {org.length} organizasyon egzersizi
            </p>
          </div>
          {canWrite && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditCategoryTarget(null); setCategoryModalOpen(true); }}
              >
                <Layers className="h-4 w-4" />
                Yeni Kategori
              </Button>
              <Button variant="outline" size="sm" onClick={() => setForkOpen(true)}>
                <GitFork className="h-4 w-4" />
                Platform&apos;dan Ekle
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Yeni Egzersiz
              </Button>
            </div>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Egzersiz ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <Layers className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "Arama kriterlerine uyan egzersiz bulunamadı." : "Bu kategoride egzersiz yok."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((ex) => {
              const isOrg = ex._source === "org";
              const orgEx = isOrg ? (ex as OrgExercise) : null;
              const canEdit = isOrg && canWrite && (
                userRole === "admin" || orgEx?.created_by === userId
              );
              const difficulty = ex.difficulty ? DIFFICULTY_LABELS[ex.difficulty] : null;
              const pattern = MOVEMENT_PATTERNS.find((p) => p.value === ex.movement_pattern);
              const cat = orgEx?.custom_category_id
                ? categories.find((c) => c.id === orgEx.custom_category_id)
                : null;

              return (
                <div
                  key={`${ex._source}-${ex.id}`}
                  className="rounded-lg border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{ex.name}</p>
                      {ex.name_tr && ex.name_tr !== ex.name && (
                        <p className="text-xs text-muted-foreground truncate">({ex.name_tr})</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isOrg && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          P
                        </span>
                      )}
                      {canEdit && (
                        <>
                          <button
                            onClick={() => setEditTarget(orgEx!)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(orgEx!)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {pattern && (
                      <Badge variant="secondary" className="text-xs py-0">
                        {pattern.label}
                      </Badge>
                    )}
                    {cat && (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ background: cat.color ?? "#534AB7" }}
                      >
                        {cat.name_tr ?? cat.name}
                      </span>
                    )}
                    {difficulty && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${difficulty.color}`}>
                        {difficulty.label}
                      </span>
                    )}
                    {ex.is_unilateral && (
                      <Badge variant="outline" className="text-xs py-0">
                        Tek taraf
                      </Badge>
                    )}
                  </div>

                  {(ex.primary_muscles?.length > 0 || ex.equipment?.length > 0) && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {ex.primary_muscles?.length > 0 && (
                        <p className="truncate">
                          <span className="font-medium">Kas:</span>{" "}
                          {ex.primary_muscles.slice(0, 3).join(", ")}
                          {ex.primary_muscles.length > 3 && "..."}
                        </p>
                      )}
                      {ex.equipment?.length > 0 && (
                        <p className="truncate">
                          <span className="font-medium">Ekipman:</span>{" "}
                          {ex.equipment.slice(0, 3).join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modaller */}
      {createOpen && (
        <CreateExerciseModal
          orgId={orgId}
          userId={userId}
          categories={categories}
          onClose={() => setCreateOpen(false)}
          onCreated={(ex) => {
            setOrg((prev) => [...prev, ex]);
            setCreateOpen(false);
            toast({ title: "Egzersiz oluşturuldu" });
          }}
        />
      )}

      {editTarget && (
        <EditExerciseModal
          exercise={editTarget}
          categories={categories}
          userId={userId}
          onClose={() => setEditTarget(null)}
          onUpdated={(updated) => {
            setOrg((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setEditTarget(null);
            toast({ title: "Egzersiz güncellendi" });
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title="Egzersizi Sil"
          description={`"${deleteTarget.name_tr ?? deleteTarget.name}" egzersizini silmek istediğinize emin misiniz? Program builder'da kullanılan egzersizler etkilenmez (isim saklanır).`}
          onConfirm={() => handleDeleteExercise(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {(categoryModalOpen) && (
        <CreateCategoryModal
          orgId={orgId}
          userId={userId}
          editTarget={editCategoryTarget}
          onClose={() => { setCategoryModalOpen(false); setEditCategoryTarget(null); }}
          onSaved={(cat) => {
            if (editCategoryTarget) {
              setCategories((prev) => prev.map((c) => (c.id === cat.id ? cat : c)));
              toast({ title: "Kategori güncellendi" });
            } else {
              setCategories((prev) => [...prev, cat]);
              toast({ title: "Kategori oluşturuldu" });
            }
            setCategoryModalOpen(false);
            setEditCategoryTarget(null);
          }}
        />
      )}

      {deleteCategoryTarget && (
        <DeleteConfirmDialog
          title="Kategoriyi Sil"
          description={`"${deleteCategoryTarget.name_tr ?? deleteCategoryTarget.name}" kategorisini silmek istediğinize emin misiniz? Bu kategoriye atanmış egzersizler silinmez.`}
          onConfirm={() => handleDeleteCategory(deleteCategoryTarget)}
          onCancel={() => setDeleteCategoryTarget(null)}
        />
      )}

      {forkOpen && (
        <ForkExerciseModal
          platformExercises={platform}
          orgId={orgId}
          userId={userId}
          onClose={() => setForkOpen(false)}
          onForked={(ex) => {
            setOrg((prev) => [...prev, ex]);
            setForkOpen(false);
            toast({ title: "Egzersiz kütüphaneye eklendi" });
          }}
        />
      )}
    </div>
  );
}
