"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, Dumbbell, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLocalDateString } from "@athleteiq/validators/wellness";
import { normalizeExerciseName } from "@athleteiq/validators/exercise";
import { createClient } from "@/lib/supabase/client";
import { useUserContext } from "@/lib/hooks/useUserContext";
import {
  create1RMRecord,
  updateAthlete1RMRecord,
  deleteAthlete1RMRecord,
  buildMaxHistoryLookup,
  type Athlete1RMRecord,
  type PlatformExercise,
  type OrgExercise,
  type OrgExerciseCategory,
} from "@athleteiq/db/queries/exercises";
import {
  ExercisePickerModal,
  type PickedExercise,
} from "@/components/features/exercises/exercise-picker-modal";

interface Props {
  athleteId: string;
  history: Athlete1RMRecord[];
  platformExercises: PlatformExercise[];
  orgExercises: OrgExercise[];
  categories: OrgExerciseCategory[];
}

const oneRmFormSchema = z.object({
  weight_kg: z.coerce
    .number({ invalid_type_error: "Geçerli bir değer girin" })
    .positive("Pozitif bir değer girin"),
  test_date: z
    .string()
    .min(1, "Tarih zorunludur")
    .refine((v) => v <= getLocalDateString(), "Gelecek tarih girilemez"),
  notes: z.string().optional(),
});

type OneRmForm = z.input<typeof oneRmFormSchema>;

function daysAgoLabel(testDate: string): string {
  const [y, m, d] = testDate.split("-").map(Number);
  const testUtc = Date.UTC(y!, m! - 1, d!);
  const [ty, tm, td] = getLocalDateString().split("-").map(Number);
  const todayUtc = Date.UTC(ty!, tm! - 1, td!);
  const diff = Math.round((todayUtc - testUtc) / 86400000);
  if (diff <= 0) return "Bugün";
  if (diff === 1) return "1 gün önce";
  return `${diff} gün önce`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("tr-TR");
}

export function OneRmRecordsTab({
  athleteId,
  history: initialHistory,
  platformExercises,
  orgExercises,
  categories,
}: Props) {
  const { role } = useUserContext();
  const canManage = role === "admin" || role === "coach";

  const [history, setHistory] = useState<Athlete1RMRecord[]>(initialHistory);
  const [showForm, setShowForm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickedExercise, setPickedExercise] = useState<PickedExercise | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ weight_kg: string; test_date: string; notes: string }>({
    weight_kg: "",
    test_date: "",
    notes: "",
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OneRmForm>({
    resolver: zodResolver(oneRmFormSchema),
    defaultValues: { test_date: getLocalDateString() },
  });

  const watchedTestDate = watch("test_date");

  const historyLookup = useMemo(() => buildMaxHistoryLookup(history), [history]);

  const currentRows = useMemo(() => {
    return Array.from(historyLookup.entries())
      .map(([, records]) => records[0]!) // her grup test_date desc — ilk eleman en güncel
      .sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));
  }, [historyLookup]);

  const isDuplicateDate =
    pickedExercise?.id != null &&
    watchedTestDate &&
    history.some(
      (r) =>
        r.exercise_id === pickedExercise.id &&
        r.exercise_source === pickedExercise.source &&
        r.test_date === watchedTestDate
    );

  async function onSubmit(data: OneRmForm) {
    setSubmitError(null);
    if (!pickedExercise || !pickedExercise.id || !pickedExercise.source) {
      setSubmitError("Bir egzersiz seçin.");
      return;
    }
    try {
      const supabase = createClient();
      const created = await create1RMRecord(supabase, {
        athlete_id: athleteId,
        exercise_id: pickedExercise.id,
        exercise_source: pickedExercise.source,
        exercise_name: pickedExercise.name,
        weight_kg: Number(data.weight_kg),
        test_date: data.test_date,
        notes: data.notes?.trim() ? data.notes.trim() : null,
      });
      setHistory((prev) => [created, ...prev]);
      reset({ test_date: getLocalDateString() });
      setPickedExercise(null);
      setShowForm(false);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "1RM kaydı eklenirken hata oluştu.");
    }
  }

  function startEdit(record: Athlete1RMRecord) {
    setEditingId(record.id);
    setEditValues({
      weight_kg: String(record.weight_kg),
      test_date: record.test_date,
      notes: record.notes ?? "",
    });
  }

  async function saveEdit(id: string) {
    const weight = Number(editValues.weight_kg);
    if (!Number.isFinite(weight) || weight <= 0) return;
    if (editValues.test_date > getLocalDateString()) return;
    try {
      const supabase = createClient();
      const updated = await updateAthlete1RMRecord(supabase, id, {
        weight_kg: weight,
        test_date: editValues.test_date,
        notes: editValues.notes.trim() ? editValues.notes.trim() : null,
      });
      setHistory((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setEditingId(null);
    } catch {
      // sessizce bırak — kullanıcı tekrar deneyebilir
    }
  }

  async function onDelete(id: string) {
    const prev = history;
    setHistory((h) => h.filter((r) => r.id !== id));
    try {
      const supabase = createClient();
      await deleteAthlete1RMRecord(supabase, id);
    } catch {
      setHistory(prev); // geri al
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            1RM Kayıtları
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentRows.length} egzersiz — en güncel maksimal kuvvet kayıtları
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setShowForm((v) => !v);
              setSubmitError(null);
            }}
            variant="outline"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "İptal" : "Yeni Kayıt Ekle"}
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yeni 1RM Kaydı</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label>Egzersiz *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowPicker(true);
                      setPickError(null);
                    }}
                  >
                    {pickedExercise ? pickedExercise.name : "Egzersiz seçmek için tıklayın"}
                  </Button>
                  {pickError && <p className="text-xs text-destructive">{pickError}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rm-weight">Ağırlık (kg) *</Label>
                  <Input
                    id="rm-weight"
                    type="number"
                    step="any"
                    {...register("weight_kg")}
                    placeholder="100"
                  />
                  {errors.weight_kg && (
                    <p className="text-xs text-destructive">{errors.weight_kg.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rm-date">Tarih *</Label>
                  <Input
                    id="rm-date"
                    type="date"
                    max={getLocalDateString()}
                    {...register("test_date")}
                  />
                  {errors.test_date && (
                    <p className="text-xs text-destructive">{errors.test_date.message}</p>
                  )}
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="rm-notes">Not</Label>
                  <Input id="rm-notes" {...register("notes")} placeholder="İsteğe bağlı not..." />
                </div>
              </div>

              {isDuplicateDate && (
                <p className="text-xs text-amber-600">
                  Bu tarihte bu egzersiz için zaten kayıt var — yenisi eklenecek.
                </p>
              )}

              {submitError && <p className="text-xs text-destructive">{submitError}</p>}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Kaydediliyor..." : "Kaydı Ekle"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showPicker && (
        <ExercisePickerModal
          platformExercises={platformExercises}
          orgExercises={orgExercises}
          categories={categories}
          onClose={() => setShowPicker(false)}
          onPick={(ex) => {
            if (!ex.id || !ex.source) {
              setPickError("Bu egzersiz katalog kaydı değil, tekrar seçin.");
              return;
            }
            setPickedExercise(ex);
          }}
        />
      )}

      {currentRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Dumbbell className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Henüz 1RM kaydı eklenmemiş.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Egzersiz</TableHead>
                  <TableHead className="text-right">Güncel 1RM</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((row) => {
                  const key = normalizeExerciseName(row.exercise_name);
                  const isExpanded = expanded === key;
                  const rowHistory = historyLookup.get(key) ?? [];
                  return (
                    <>
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => setExpanded(isExpanded ? null : key)}
                      >
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {row.exercise_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.weight_kg} kg
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(row.test_date)} · {daysAgoLabel(row.test_date)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                      {isExpanded &&
                        rowHistory.map((h) => (
                          <TableRow key={`hist-${h.id}`} className="bg-muted/30">
                            <TableCell className="pl-8 text-xs text-muted-foreground">
                              {h.notes || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {editingId === h.id ? (
                                <Input
                                  type="number"
                                  step="any"
                                  value={editValues.weight_kg}
                                  onChange={(e) =>
                                    setEditValues((v) => ({ ...v, weight_kg: e.target.value }))
                                  }
                                  className="h-7 w-24 ml-auto text-right"
                                />
                              ) : (
                                <span className="tabular-nums">{h.weight_kg} kg</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === h.id ? (
                                <Input
                                  type="date"
                                  max={getLocalDateString()}
                                  value={editValues.test_date}
                                  onChange={(e) =>
                                    setEditValues((v) => ({ ...v, test_date: e.target.value }))
                                  }
                                  className="h-7 w-36"
                                />
                              ) : (
                                <span className="text-muted-foreground">
                                  {formatDate(h.test_date)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {canManage &&
                                (editingId === h.id ? (
                                  <div className="flex gap-1 justify-end">
                                    <Button size="sm" variant="ghost" onClick={() => saveEdit(h.id)}>
                                      Kaydet
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingId(null)}
                                    >
                                      İptal
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEdit(h)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => onDelete(h.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                            </TableCell>
                          </TableRow>
                        ))}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
