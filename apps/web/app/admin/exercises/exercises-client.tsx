"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  updatePlatformExercise,
  deletePlatformExercise,
  getPlatformExerciseUsage,
} from "@athleteiq/db/queries/exercises";
import type {
  PlatformExercise,
  PlatformExerciseUsage,
} from "@athleteiq/db/queries/exercises";
import { MOVEMENT_PATTERNS } from "@/components/features/exercises/exercise-form-fields";
import { CreatePlatformExerciseModal } from "@/components/features/exercises/create-platform-exercise-modal";
import { EditPlatformExerciseModal } from "@/components/features/exercises/edit-platform-exercise-modal";
import { DeleteConfirmDialog } from "@/components/features/exercises/delete-confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PATTERN_LABELS = Object.fromEntries(
  MOVEMENT_PATTERNS.map((p) => [p.value, p.label])
);

interface Props {
  initialExercises: PlatformExercise[];
}

export function ExercisesClient({ initialExercises }: Props) {
  const [exercises, setExercises] = useState<PlatformExercise[]>(initialExercises);
  const [search, setSearch] = useState("");
  const [patternFilter, setPatternFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<PlatformExercise | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PlatformExercise | null>(null);
  const [usage, setUsage] = useState<PlatformExerciseUsage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (patternFilter && ex.movement_pattern !== patternFilter) return false;
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        (ex.name_tr ?? "").toLowerCase().includes(q) ||
        ex.movement_pattern.toLowerCase().includes(q)
      );
    });
  }, [exercises, search, patternFilter]);

  function upsert(ex: PlatformExercise) {
    setExercises((prev) => {
      const exists = prev.some((p) => p.id === ex.id);
      const next = exists ? prev.map((p) => (p.id === ex.id ? ex : p)) : [...prev, ex];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async function toggleActive(ex: PlatformExercise) {
    setTogglingId(ex.id);
    try {
      const supabase = createClient();
      const result = await updatePlatformExercise(supabase as any, ex.id, {
        is_active: !ex.is_active,
      });
      upsert(result);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  async function askDelete(ex: PlatformExercise) {
    setError(null);
    setUsage(null);
    setDeleting(ex);
    try {
      const supabase = createClient();
      setUsage(await getPlatformExerciseUsage(supabase as any, ex));
    } catch (err) {
      console.error(err);
      // Kullanım sayımı başarısız olsa da silme engellenmez; diyalog
      // sayı yerine uyarı metniyle açılır.
      setUsage(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeletingId(target.id);
    setError(null);
    try {
      const supabase = createClient();
      await deletePlatformExercise(supabase as any, target.id);
      setExercises((prev) => prev.filter((p) => p.id !== target.id));
      setDeleting(null);
      setUsage(null);
    } catch (err) {
      console.error(err);
      setError(
        `"${target.name}" silinemedi. Süper admin yetkisi gerekiyor.`
      );
      setDeleting(null);
    } finally {
      setDeletingId(null);
    }
  }

  function deleteDescription(ex: PlatformExercise): string {
    const lines = [
      `"${ex.name}" platform kütüphanesinden kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
    ];

    if (!usage) {
      lines.push("Kullanım özeti alınamadı.");
    } else if (usage.programRows || usage.orgForks || usage.oneRmRecords) {
      const parts: string[] = [];
      if (usage.programRows) parts.push(`${usage.programRows} program satırı`);
      if (usage.orgForks) parts.push(`${usage.orgForks} org fork'u`);
      if (usage.oneRmRecords) parts.push(`${usage.oneRmRecords} 1RM kaydı`);
      lines.push(
        `Bu egzersiz şu an ${parts.join(", ")} tarafından kullanılıyor. ` +
          `Bunlar silinmez: programlar egzersiz adını metin olarak sakladığı için ` +
          `bozulmaz, fork'lanmış org egzersizleri kalır. Egzersiz yalnızca ` +
          `kütüphaneden ve seçim listesinden kaybolur.`
      );
    } else {
      lines.push("Bu egzersiz hiçbir programda, fork'ta veya 1RM kaydında kullanılmıyor.");
    }

    lines.push(
      "Kalıcı silmek yerine geçici gizlemek istiyorsan Aktif rozetine tıklayıp pasife alabilirsin."
    );

    return lines.join(" ");
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim veya hareket paternine göre ara..."
            className="w-64"
          />
          <select
            value={patternFilter}
            onChange={(e) => setPatternFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Tüm Hareket Paternleri</option>
            {MOVEMENT_PATTERNS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <Button onClick={() => setShowCreate(true)}>Yeni Egzersiz Ekle</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Egzersiz</TableHead>
              <TableHead>Hareket Paterni</TableHead>
              <TableHead>Demo</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Sonuç bulunamadı.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((ex) => (
              <TableRow key={ex.id}>
                <TableCell className="font-medium">
                  {ex.name}
                  {ex.name_tr && (
                    <div className="text-xs text-muted-foreground font-normal">{ex.name_tr}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {PATTERN_LABELS[ex.movement_pattern] ?? ex.movement_pattern}
                </TableCell>
                <TableCell>
                  <Badge variant={ex.demo_url ? "secondary" : "outline"}>
                    {ex.demo_url ? "Var" : "Yok"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleActive(ex)}
                    disabled={togglingId === ex.id}
                    className="cursor-pointer"
                  >
                    <Badge variant={ex.is_active ? "default" : "outline"}>
                      {ex.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(ex)}>
                      Düzenle
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === ex.id}
                      onClick={() => askDelete(ex)}
                    >
                      {deletingId === ex.id ? "Siliniyor..." : "Sil"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showCreate && (
        <CreatePlatformExerciseModal
          onClose={() => setShowCreate(false)}
          onCreated={(ex) => {
            upsert(ex);
            setShowCreate(false);
          }}
        />
      )}

      {deleting && (
        <DeleteConfirmDialog
          title="Egzersizi kalıcı olarak sil"
          description={deleteDescription(deleting)}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleting(null);
            setUsage(null);
          }}
        />
      )}

      {editing && (
        <EditPlatformExerciseModal
          exercise={editing}
          onClose={() => setEditing(null)}
          onUpdated={(ex) => {
            upsert(ex);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
