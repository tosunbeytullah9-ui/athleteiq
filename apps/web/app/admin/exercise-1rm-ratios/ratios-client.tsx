"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteExercise1RMRatio } from "@athleteiq/db/queries/exercises";
import type { Exercise1RMRatio, PlatformExercise } from "@athleteiq/db/queries/exercises";
import { Exercise1RMRatioModal } from "@/components/features/exercises/exercise-1rm-ratio-modal";
import { DeleteConfirmDialog } from "@/components/features/exercises/delete-confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  initialRatios: Exercise1RMRatio[];
  platformExercises: PlatformExercise[];
}

export function RatiosClient({ initialRatios, platformExercises }: Props) {
  const [ratios, setRatios] = useState<Exercise1RMRatio[]>(initialRatios);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Exercise1RMRatio | null>(null);
  const [deleting, setDeleting] = useState<Exercise1RMRatio | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ratios;
    return ratios.filter(
      (r) =>
        r.exercise_name.toLowerCase().includes(q) ||
        r.base_exercise_name.toLowerCase().includes(q)
    );
  }, [ratios, search]);

  function upsert(ratio: Exercise1RMRatio) {
    setRatios((prev) => {
      const exists = prev.some((r) => r.id === ratio.id);
      const next = exists ? prev.map((r) => (r.id === ratio.id ? ratio : r)) : [...prev, ratio];
      return next.sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));
    });
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingId(deleting.id);
    setError(null);
    try {
      const supabase = createClient();
      await deleteExercise1RMRatio(supabase as any, deleting.id);
      setRatios((prev) => prev.filter((r) => r.id !== deleting.id));
      setDeleting(null);
    } catch (err: unknown) {
      const message = (err as { message?: string } | null)?.message;
      setError(message || "Silinemedi. Süper admin yetkisi gerekiyor.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Egzersiz adına göre ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Yeni İlişki Ekle
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Türetilen Egzersiz</TableHead>
            <TableHead>Temel Egzersiz</TableHead>
            <TableHead>Oran</TableHead>
            <TableHead>Not</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.exercise_name}</TableCell>
              <TableCell>{r.base_exercise_name}</TableCell>
              <TableCell>{r.ratio}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{r.notes ?? "—"}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(r)}
                    disabled={deletingId === r.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Kayıt bulunamadı.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {showCreate && (
        <Exercise1RMRatioModal
          editing={null}
          platformExercises={platformExercises}
          onClose={() => setShowCreate(false)}
          onSaved={(r) => {
            upsert(r);
            setShowCreate(false);
          }}
        />
      )}

      {editing && (
        <Exercise1RMRatioModal
          editing={editing}
          platformExercises={platformExercises}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            upsert(r);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <DeleteConfirmDialog
          title="İlişkiyi sil"
          description={`"${deleting.exercise_name}" için "${deleting.base_exercise_name}" temel egzersiz ilişkisi silinsin mi? Bu egzersiz için doğrudan 1RM kaydı olmayan sporcularda artık tahmini kg gösterilmez.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
