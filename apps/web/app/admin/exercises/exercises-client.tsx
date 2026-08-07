"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updatePlatformExercise } from "@athleteiq/db/queries/exercises";
import type { PlatformExercise } from "@athleteiq/db/queries/exercises";
import { MOVEMENT_PATTERNS } from "@/components/features/exercises/exercise-form-fields";
import { CreatePlatformExerciseModal } from "@/components/features/exercises/create-platform-exercise-modal";
import { EditPlatformExerciseModal } from "@/components/features/exercises/edit-platform-exercise-modal";
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

  return (
    <div className="space-y-4">
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
                  <Button variant="outline" size="sm" onClick={() => setEditing(ex)}>
                    Düzenle
                  </Button>
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
