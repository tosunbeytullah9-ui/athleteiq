"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Plus, X, Activity, ArrowUp, ArrowDown, Minus, Trash2, Dumbbell, Upload } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@athleteiq/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { createTest, deleteTest } from "@athleteiq/db/queries/tests";
import {
  create1RMRecord,
  type Athlete1RMRecord,
  type PlatformExercise,
  type OrgExercise,
} from "@athleteiq/db/queries/exercises";
import { useUserContext } from "@/lib/hooks/useUserContext";
import type { Tables } from "@athleteiq/db/types";

export type TestRow = Tables<"test_results"> & {
  athletes: { id: string; full_name: string; org_id: string } | null;
};
type Athlete = { id: string; full_name: string };

interface Props {
  orgId: string;
  tests: TestRow[];
  athletes: Athlete[];
  platformExercises: PlatformExercise[];
  orgExercises: OrgExercise[];
  athleteMaxes: Athlete1RMRecord[];
}

// =============================================
// Atletik performans test kataloğu
// lowerIsBetter: sprint & çeviklikte düşük değer = iyileşme
// =============================================
interface TestType {
  value: string;
  label: string;
  unit: string;
  lowerIsBetter?: boolean;
}

interface TestCategory {
  key: string;
  label: string;
  types: TestType[];
}

const TEST_CATEGORIES: TestCategory[] = [
  {
    key: "jump",
    label: "Sıçrama",
    types: [
      { value: "CMJ", label: "CMJ", unit: "cm" },
      { value: "Squat Jump", label: "Squat Jump", unit: "cm" },
      { value: "Drop Jump", label: "Drop Jump", unit: "cm" },
      { value: "Broad Jump", label: "Broad Jump", unit: "cm" },
      { value: "Abalakov", label: "Abalakov", unit: "cm" },
    ],
  },
  {
    key: "sprint",
    label: "Sprint",
    types: [
      { value: "10m Sprint", label: "10m Sprint", unit: "s", lowerIsBetter: true },
      { value: "20m Sprint", label: "20m Sprint", unit: "s", lowerIsBetter: true },
      { value: "30m Sprint", label: "30m Sprint", unit: "s", lowerIsBetter: true },
      { value: "40m Sprint", label: "40m Sprint", unit: "s", lowerIsBetter: true },
      { value: "Flying 30m", label: "Flying 30m", unit: "s", lowerIsBetter: true },
    ],
  },
  {
    key: "strength",
    label: "Maksimal Kuvvet",
    types: [
      { value: "1RM Back Squat", label: "1RM Back Squat", unit: "kg" },
      { value: "1RM Bench Press", label: "1RM Bench Press", unit: "kg" },
      { value: "1RM Deadlift", label: "1RM Deadlift", unit: "kg" },
      { value: "IMTP Peak Force", label: "IMTP Peak Force", unit: "kg" },
    ],
  },
  {
    key: "power",
    label: "Güç",
    types: [
      { value: "Wingate Peak Power", label: "Wingate Peak Power", unit: "W" },
      { value: "Peak Power Output", label: "Peak Power Output", unit: "W" },
    ],
  },
  {
    key: "endurance",
    label: "Dayanıklılık",
    types: [
      { value: "VO2max", label: "VO2max", unit: "ml/kg/min" },
      { value: "Yo-Yo IR1", label: "Yo-Yo IR1", unit: "level" },
      { value: "Beep Test", label: "Beep Test", unit: "level" },
      { value: "30-15 IFT", label: "30-15 IFT", unit: "level" },
    ],
  },
  {
    key: "agility",
    label: "Çeviklik",
    types: [
      { value: "505 Test", label: "505 Test", unit: "s", lowerIsBetter: true },
      { value: "T-Test", label: "T-Test", unit: "s", lowerIsBetter: true },
      { value: "Illinois Agility", label: "Illinois Agility", unit: "s", lowerIsBetter: true },
      { value: "Pro Agility (5-10-5)", label: "Pro Agility (5-10-5)", unit: "s", lowerIsBetter: true },
    ],
  },
  {
    key: "flexibility",
    label: "Esneklik / Hareketlilik",
    types: [
      { value: "Sit and Reach", label: "Sit and Reach", unit: "cm" },
      { value: "FMS Total", label: "FMS Total", unit: "score" },
      { value: "Active SLR", label: "Active SLR", unit: "score" },
    ],
  },
];

const TYPE_INDEX: Record<string, { type: TestType; categoryKey: string; categoryLabel: string }> =
  (() => {
    const idx: Record<
      string,
      { type: TestType; categoryKey: string; categoryLabel: string }
    > = {};
    for (const cat of TEST_CATEGORIES) {
      for (const t of cat.types) {
        idx[t.value] = { type: t, categoryKey: cat.key, categoryLabel: cat.label };
      }
    }
    return idx;
  })();

const testSchema = z.object({
  athlete_id: z.string().min(1, "Sporcu zorunludur"),
  category: z.string().min(1, "Kategori zorunludur"),
  test_type: z.string().min(1, "Test tipi zorunludur"),
  value: z.coerce.number({ invalid_type_error: "Geçerli bir değer girin" }),
  test_date: z.string().min(1, "Tarih zorunludur"),
  notes: z.string().optional(),
});

type TestForm = z.input<typeof testSchema>;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// =============================================
// 1RM kayıtları — athlete_1rm_records
// =============================================
interface ExerciseOption {
  key: string; // `${source}:${id}` — form değeri, submit'te lookup için
  id: string;
  name: string;
  source: "platform" | "org";
}

const oneRmSchema = z.object({
  athlete_id: z.string().min(1, "Sporcu zorunludur"),
  exercise_key: z.string().min(1, "Egzersiz zorunludur"),
  weight_kg: z.coerce.number({ invalid_type_error: "Geçerli bir değer girin" }).positive("Pozitif bir değer girin"),
  test_date: z.string().min(1, "Tarih zorunludur"),
  notes: z.string().optional(),
});

type OneRmForm = z.input<typeof oneRmSchema>;

// getAthleteMaxes()'in tek-sporcu dedup mantığıyla aynı (en güncel test_date
// kazanır) ama org genelinde çoklu sporcuyu kapsayacak şekilde athlete_id de
// anahtara dahil edilir — yeni kayıt eklendiğinde local state'i tutarlı tutar.
function dedupeLatestMaxes(records: Athlete1RMRecord[]): Athlete1RMRecord[] {
  const sorted = [...records].sort((a, b) =>
    a.test_date < b.test_date ? 1 : a.test_date > b.test_date ? -1 : 0
  );
  const seen = new Set<string>();
  const out: Athlete1RMRecord[] = [];
  for (const r of sorted) {
    const key = `${r.athlete_id}:${r.exercise_name}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

// Aynı sporcu+test için önceki sonuca göre trend hesapla.
// rows: tarihe göre AZALAN sıralı tüm satırlar (en yeni başta).
function computeTrend(
  row: TestRow,
  allRows: TestRow[]
): "up" | "down" | "flat" | null {
  if (row.value == null) return null;
  const prior = allRows
    .filter(
      (r) =>
        r.athlete_id === row.athlete_id &&
        r.test_type === row.test_type &&
        r.id !== row.id &&
        (r.test_date < row.test_date ||
          (r.test_date === row.test_date && r.id < row.id)) &&
        r.value != null
    )
    .sort((a, b) =>
      a.test_date < b.test_date ? 1 : a.test_date > b.test_date ? -1 : a.id < b.id ? 1 : -1
    )[0];

  if (!prior || prior.value == null) return null;
  const diff = row.value - prior.value;
  if (diff === 0) return "flat";
  const lowerIsBetter = TYPE_INDEX[row.test_type]?.type.lowerIsBetter ?? false;
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  return improved ? "up" : "down";
}

export function TestsClient({
  orgId,
  tests: initialTests,
  athletes,
  platformExercises,
  orgExercises,
  athleteMaxes: initialAthleteMaxes,
}: Props) {
  const { role } = useUserContext();
  const canManage = role === "admin" || role === "coach";

  const [tests, setTests] = useState<TestRow[]>(initialTests);
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [maxes, setMaxes] = useState<Athlete1RMRecord[]>(initialAthleteMaxes);
  const [showRmForm, setShowRmForm] = useState(false);
  const [rmSubmitError, setRmSubmitError] = useState<string | null>(null);

  // Filtreler
  const [filterAthlete, setFilterAthlete] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TestForm>({
    resolver: zodResolver(testSchema),
    defaultValues: { test_date: today(), category: "", test_type: "" },
  });

  const selectedCategory = watch("category");
  const selectedType = watch("test_type");

  const typeOptions = useMemo(() => {
    const cat = TEST_CATEGORIES.find((c) => c.key === selectedCategory);
    return cat?.types ?? [];
  }, [selectedCategory]);

  const autoUnit = TYPE_INDEX[selectedType]?.type.unit ?? "";

  async function onSubmit(data: TestForm) {
    setSubmitError(null);
    try {
      const supabase = createClient();
      const unit = TYPE_INDEX[data.test_type]?.type.unit ?? null;
      const created = (await createTest(supabase, {
        athlete_id: data.athlete_id,
        test_type: data.test_type,
        value: Number(data.value),
        unit,
        test_date: data.test_date,
        notes: data.notes?.trim() ? data.notes.trim() : null,
      })) as TestRow;

      setTests((prev) =>
        [created, ...prev].sort((a, b) =>
          a.test_date < b.test_date ? 1 : a.test_date > b.test_date ? -1 : 0
        )
      );
      reset({ test_date: today(), category: "", test_type: "" });
      setShowForm(false);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Test sonucu eklenirken hata oluştu."
      );
    }
  }

  async function onDelete(id: string) {
    const prev = tests;
    setTests((t) => t.filter((r) => r.id !== id));
    try {
      const supabase = createClient();
      await deleteTest(supabase, id);
    } catch {
      setTests(prev); // geri al
    }
  }

  // 1RM kayıtları — egzersiz seçimi platform_exercises + org_exercises'tan,
  // mevcut kategori/tip kademeli dropdown deseniyle tutarlı basit <select>.
  const exerciseOptions = useMemo<ExerciseOption[]>(() => {
    const platform = platformExercises.map((e) => ({
      key: `platform:${e.id}`,
      id: e.id,
      name: e.name,
      source: "platform" as const,
    }));
    const org = orgExercises.map((e) => ({
      key: `org:${e.id}`,
      id: e.id,
      name: e.name,
      source: "org" as const,
    }));
    return [...org, ...platform].sort((a, b) => a.name.localeCompare(b.name));
  }, [platformExercises, orgExercises]);

  const athleteNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of athletes) m[a.id] = a.full_name;
    return m;
  }, [athletes]);

  const sortedMaxes = useMemo(
    () =>
      [...maxes].sort((a, b) => {
        const an = athleteNameMap[a.athlete_id] ?? "";
        const bn = athleteNameMap[b.athlete_id] ?? "";
        return an !== bn ? an.localeCompare(bn) : a.exercise_name.localeCompare(b.exercise_name);
      }),
    [maxes, athleteNameMap]
  );

  const {
    register: registerRm,
    handleSubmit: handleRmSubmit,
    reset: resetRm,
    formState: { errors: rmErrors, isSubmitting: rmIsSubmitting },
  } = useForm<OneRmForm>({
    resolver: zodResolver(oneRmSchema),
    defaultValues: { test_date: today() },
  });

  async function onRmSubmit(data: OneRmForm) {
    setRmSubmitError(null);
    try {
      const picked = exerciseOptions.find((e) => e.key === data.exercise_key);
      if (!picked) throw new Error("Egzersiz bulunamadı");

      const supabase = createClient();
      const created = await create1RMRecord(supabase, {
        athlete_id: data.athlete_id,
        exercise_id: picked.id,
        exercise_source: picked.source,
        exercise_name: picked.name,
        weight_kg: Number(data.weight_kg),
        test_date: data.test_date,
        notes: data.notes?.trim() ? data.notes.trim() : null,
      });

      setMaxes((prev) => dedupeLatestMaxes([created, ...prev]));
      resetRm({ test_date: today(), athlete_id: "", exercise_key: "" });
      setShowRmForm(false);
    } catch (err: unknown) {
      setRmSubmitError(
        err instanceof Error ? err.message : "1RM kaydı eklenirken hata oluştu."
      );
    }
  }

  const filtered = useMemo(() => {
    return tests.filter((t) => {
      if (filterAthlete !== "all" && t.athlete_id !== filterAthlete) return false;
      if (filterCategory !== "all") {
        const cat = TYPE_INDEX[t.test_type]?.categoryKey;
        if (cat !== filterCategory) return false;
      }
      if (filterFrom && t.test_date < filterFrom) return false;
      if (filterTo && t.test_date > filterTo) return false;
      return true;
    });
  }, [tests, filterAthlete, filterCategory, filterFrom, filterTo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Test Sonuçları</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tests.length} kayıt — atletik performans testleri
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "İptal" : "Test Sonucu Ekle"}
          </Button>
        )}
      </div>

      {/* Ekleme formu */}
      {showForm && canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yeni Test Sonucu</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <Label htmlFor="test-athlete">Sporcu *</Label>
                  <select
                    id="test-athlete"
                    {...register("athlete_id")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Seçin</option>
                    {athletes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                      </option>
                    ))}
                  </select>
                  {errors.athlete_id && (
                    <p className="text-xs text-destructive">{errors.athlete_id.message}</p>
                  )}
                </div>

                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <Label htmlFor="test-category">Test Kategorisi *</Label>
                  <select
                    id="test-category"
                    {...register("category")}
                    onChange={(e) => {
                      setValue("category", e.target.value);
                      setValue("test_type", "");
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Seçin</option>
                    {TEST_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-xs text-destructive">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="test-type">Test Tipi *</Label>
                  <select
                    id="test-type"
                    {...register("test_type")}
                    disabled={!selectedCategory}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {selectedCategory ? "Seçin" : "Önce kategori seçin"}
                    </option>
                    {typeOptions.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {errors.test_type && (
                    <p className="text-xs text-destructive">{errors.test_type.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="test-value">Değer *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="test-value"
                      type="number"
                      step="any"
                      {...register("value")}
                      placeholder="42"
                    />
                    <span className="text-sm text-muted-foreground min-w-[70px]">
                      {autoUnit || "birim"}
                    </span>
                  </div>
                  {errors.value && (
                    <p className="text-xs text-destructive">{errors.value.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="test-date">Tarih *</Label>
                  <Input id="test-date" type="date" {...register("test_date")} />
                  {errors.test_date && (
                    <p className="text-xs text-destructive">{errors.test_date.message}</p>
                  )}
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="test-notes">Not</Label>
                  <Input
                    id="test-notes"
                    {...register("notes")}
                    placeholder="İsteğe bağlı not..."
                  />
                </div>
              </div>

              {submitError && (
                <p className="text-xs text-destructive">{submitError}</p>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Kaydediliyor..." : "Sonucu Ekle"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtreler */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Sporcu</Label>
          <select
            value={filterAthlete}
            onChange={(e) => setFilterAthlete(e.target.value)}
            className="flex h-9 w-44 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Tüm Sporcular</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kategori</Label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex h-9 w-44 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Tüm Kategoriler</option>
            {TEST_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Başlangıç</Label>
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bitiş</Label>
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Tablo */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {tests.length === 0
              ? "Henüz test sonucu eklenmemiş."
              : "Filtrelere uyan sonuç bulunamadı."}
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Sporcu</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Test Tipi</TableHead>
                  <TableHead className="text-right">Değer</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                  {canManage && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const meta = TYPE_INDEX[t.test_type];
                  const trend = computeTrend(t, tests);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(t.test_date).toLocaleDateString("tr-TR")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {t.athletes?.full_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {meta?.categoryLabel ?? "—"}
                      </TableCell>
                      <TableCell>{t.test_type}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.value ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.unit ?? meta?.type.unit ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {trend === "up" && (
                          <ArrowUp className="inline h-4 w-4 text-green-600" />
                        )}
                        {trend === "down" && (
                          <ArrowDown className="inline h-4 w-4 text-red-600" />
                        )}
                        {trend === "flat" && (
                          <Minus className="inline h-4 w-4 text-muted-foreground" />
                        )}
                        {trend === null && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <button
                            onClick={() => onDelete(t.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 1RM Kayıtları */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              1RM Kayıtları
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {maxes.length} sporcu-egzersiz kombinasyonu — en güncel maksimal kuvvet kayıtları
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/tests/import-1rm">
                  <Upload className="h-4 w-4" />
                  İçe Aktar
                </Link>
              </Button>
              <Button onClick={() => setShowRmForm((v) => !v)} variant="outline">
                {showRmForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showRmForm ? "İptal" : "Yeni Kayıt Ekle"}
              </Button>
            </div>
          )}
        </div>

        {showRmForm && canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yeni 1RM Kaydı</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRmSubmit(onRmSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <Label htmlFor="rm-athlete">Sporcu *</Label>
                    <select
                      id="rm-athlete"
                      {...registerRm("athlete_id")}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Seçin</option>
                      {athletes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name}
                        </option>
                      ))}
                    </select>
                    {rmErrors.athlete_id && (
                      <p className="text-xs text-destructive">{rmErrors.athlete_id.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <Label htmlFor="rm-exercise">Egzersiz *</Label>
                    <select
                      id="rm-exercise"
                      {...registerRm("exercise_key")}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Seçin</option>
                      {exerciseOptions.map((e) => (
                        <option key={e.key} value={e.key}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                    {rmErrors.exercise_key && (
                      <p className="text-xs text-destructive">{rmErrors.exercise_key.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rm-weight">Ağırlık (kg) *</Label>
                    <Input
                      id="rm-weight"
                      type="number"
                      step="any"
                      {...registerRm("weight_kg")}
                      placeholder="100"
                    />
                    {rmErrors.weight_kg && (
                      <p className="text-xs text-destructive">{rmErrors.weight_kg.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rm-date">Tarih *</Label>
                    <Input id="rm-date" type="date" {...registerRm("test_date")} />
                    {rmErrors.test_date && (
                      <p className="text-xs text-destructive">{rmErrors.test_date.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="rm-notes">Not</Label>
                    <Input
                      id="rm-notes"
                      {...registerRm("notes")}
                      placeholder="İsteğe bağlı not..."
                    />
                  </div>
                </div>

                {rmSubmitError && (
                  <p className="text-xs text-destructive">{rmSubmitError}</p>
                )}

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowRmForm(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={rmIsSubmitting}>
                    {rmIsSubmitting ? "Kaydediliyor..." : "Kaydı Ekle"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {sortedMaxes.length === 0 ? (
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
                    <TableHead>Sporcu</TableHead>
                    <TableHead>Egzersiz</TableHead>
                    <TableHead className="text-right">En Güncel</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMaxes.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {athleteNameMap[m.athlete_id] ?? "—"}
                      </TableCell>
                      <TableCell>{m.exercise_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.weight_kg} kg</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(m.test_date).toLocaleDateString("tr-TR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
