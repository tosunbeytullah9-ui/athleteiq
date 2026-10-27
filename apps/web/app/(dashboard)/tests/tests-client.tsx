"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Plus,
  X,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  Trash2,
  Dumbbell,
  Upload,
  LayoutGrid,
  List,
  Grid3x3,
  Users,
  CalendarClock,
  Search,
} from "lucide-react";
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
import {
  MaxMatrix,
  MetricCard,
  StatTile,
  ViewToggle,
  relativeDays,
  type LeaderboardEntry,
  type MatrixRow,
} from "./test-dashboard";
import { formatYmdTr, todayInIstanbul } from "@athleteiq/validators/date";

export type TestRow = Tables<"test_results"> & {
  athletes: { id: string; full_name: string; org_id: string } | null;
};
type Athlete = {
  id: string;
  full_name: string;
  team_id: string | null;
  team_name: string | null;
};

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
      {
        value: "10m Sprint",
        label: "10m Sprint",
        unit: "s",
        lowerIsBetter: true,
      },
      {
        value: "20m Sprint",
        label: "20m Sprint",
        unit: "s",
        lowerIsBetter: true,
      },
      {
        value: "30m Sprint",
        label: "30m Sprint",
        unit: "s",
        lowerIsBetter: true,
      },
      {
        value: "40m Sprint",
        label: "40m Sprint",
        unit: "s",
        lowerIsBetter: true,
      },
      {
        value: "Flying 30m",
        label: "Flying 30m",
        unit: "s",
        lowerIsBetter: true,
      },
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
      {
        value: "Illinois Agility",
        label: "Illinois Agility",
        unit: "s",
        lowerIsBetter: true,
      },
      {
        value: "Pro Agility (5-10-5)",
        label: "Pro Agility (5-10-5)",
        unit: "s",
        lowerIsBetter: true,
      },
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

// Kategori rozet renkleri (panel görünümündeki test kartları)
const CATEGORY_BADGE: Record<string, string> = {
  jump: "bg-primary/10 text-primary",
  sprint: "bg-warning/15 text-warning",
  strength: "bg-violet/10 text-violet",
  power: "bg-critical/10 text-critical",
  endurance: "bg-good/10 text-good",
  agility: "bg-warning/15 text-warning",
  flexibility: "bg-muted text-muted-foreground",
};

const CATEGORY_ORDER: Record<string, number> = Object.fromEntries(
  TEST_CATEGORIES.map((c, i) => [c.key, i])
);

type TestsView = "panel" | "list";
type RmView = "panel" | "matrix" | "list";
const TESTS_VIEW_KEY = "aiq_tests_view";
const RM_VIEW_KEY = "aiq_1rm_view";

const TYPE_INDEX: Record<
  string,
  { type: TestType; categoryKey: string; categoryLabel: string }
> = (() => {
  const idx: Record<
    string,
    { type: TestType; categoryKey: string; categoryLabel: string }
  > = {};
  for (const cat of TEST_CATEGORIES) {
    for (const t of cat.types) {
      idx[t.value] = {
        type: t,
        categoryKey: cat.key,
        categoryLabel: cat.label,
      };
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
  return todayInIstanbul();
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
  weight_kg: z.coerce
    .number({ invalid_type_error: "Geçerli bir değer girin" })
    .positive("Pozitif bir değer girin"),
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
      a.test_date < b.test_date
        ? 1
        : a.test_date > b.test_date
          ? -1
          : a.id < b.id
            ? 1
            : -1
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
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [rmSearch, setRmSearch] = useState<string>("");

  // Görünüm tercihleri — yalnızca kolaylık, localStorage okunamazsa varsayılan panel
  const [testsView, setTestsView] = useState<TestsView>("panel");
  const [rmView, setRmView] = useState<RmView>("panel");

  useEffect(() => {
    try {
      const t = window.localStorage.getItem(TESTS_VIEW_KEY);
      if (t === "panel" || t === "list") setTestsView(t);
      const r = window.localStorage.getItem(RM_VIEW_KEY);
      if (r === "panel" || r === "matrix" || r === "list") setRmView(r);
    } catch {
      // private mode / site verisi kapalı — varsayılanla devam
    }
  }, []);

  function changeTestsView(v: TestsView) {
    setTestsView(v);
    try {
      window.localStorage.setItem(TESTS_VIEW_KEY, v);
    } catch {
      // yazılamadıysa tercih yalnızca bu oturumda geçerli olur
    }
  }

  function changeRmView(v: RmView) {
    setRmView(v);
    try {
      window.localStorage.setItem(RM_VIEW_KEY, v);
    } catch {
      // yazılamadıysa tercih yalnızca bu oturumda geçerli olur
    }
  }

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
        err instanceof Error
          ? err.message
          : "Test sonucu eklenirken hata oluştu."
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

  const athleteById = useMemo(() => {
    const m: Record<string, Athlete> = {};
    for (const a of athletes) m[a.id] = a;
    return m;
  }, [athletes]);

  // Takım filtresi yalnızca birden fazla takım görünüyorsa anlamlı (koç tek takım görür)
  const teams = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of athletes)
      if (a.team_id) m.set(a.team_id, a.team_name ?? "Takım");
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr-TR"));
  }, [athletes]);
  const showTeamColumn = teams.length > 1;

  const sortedMaxes = useMemo(
    () =>
      [...maxes].sort((a, b) => {
        const an = athleteNameMap[a.athlete_id] ?? "";
        const bn = athleteNameMap[b.athlete_id] ?? "";
        return an !== bn
          ? an.localeCompare(bn)
          : a.exercise_name.localeCompare(b.exercise_name);
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
      if (
        filterTeam !== "all" &&
        athleteById[t.athlete_id]?.team_id !== filterTeam
      )
        return false;
      if (filterAthlete !== "all" && t.athlete_id !== filterAthlete)
        return false;
      if (filterCategory !== "all") {
        const cat = TYPE_INDEX[t.test_type]?.categoryKey;
        if (cat !== filterCategory) return false;
      }
      if (filterFrom && t.test_date < filterFrom) return false;
      if (filterTo && t.test_date > filterTo) return false;
      return true;
    });
  }, [
    tests,
    filterAthlete,
    filterCategory,
    filterFrom,
    filterTo,
    filterTeam,
    athleteById,
  ]);

  // ---------- Özet kartları ----------
  const inTeam = (athleteId: string) =>
    filterTeam === "all" || athleteById[athleteId]?.team_id === filterTeam;
  const teamAthleteCount = athletes.filter((a) => inTeam(a.id)).length;
  const teamTests = tests.filter((t) => inTeam(t.athlete_id));
  const teamMaxes = maxes.filter((m) => inTeam(m.athlete_id));
  const testedAthleteCount = new Set(teamTests.map((t) => t.athlete_id)).size;
  const testTypeCount = new Set(teamTests.map((t) => t.test_type)).size;
  const rmAthleteCount = new Set(teamMaxes.map((m) => m.athlete_id)).size;
  const rmExerciseCount = new Set(teamMaxes.map((m) => m.exercise_name)).size;
  const latestDate = [
    ...teamTests.map((t) => t.test_date),
    ...teamMaxes.map((m) => m.test_date),
  ]
    .sort()
    .at(-1);

  // ---------- Test kartları: test tipi başına her sporcunun EN GÜNCEL değeri ----------
  const testCards = useMemo(() => {
    const byType = new Map<string, Map<string, TestRow>>();
    for (const t of filtered) {
      if (t.value == null) continue;
      const perAthlete = byType.get(t.test_type) ?? new Map<string, TestRow>();
      const cur = perAthlete.get(t.athlete_id);
      if (
        !cur ||
        t.test_date > cur.test_date ||
        (t.test_date === cur.test_date && t.id > cur.id)
      ) {
        perAthlete.set(t.athlete_id, t);
      }
      byType.set(t.test_type, perAthlete);
    }
    return [...byType.entries()]
      .map(([testType, perAthlete]) => {
        const meta = TYPE_INDEX[testType];
        const rows = [...perAthlete.values()];
        const entries: LeaderboardEntry[] = rows.map((r) => ({
          key: r.id,
          name: r.athletes?.full_name ?? athleteNameMap[r.athlete_id] ?? "—",
          sub: showTeamColumn ? athleteById[r.athlete_id]?.team_name : null,
          value: r.value as number,
          date: r.test_date,
          trend: computeTrend(r, tests),
        }));
        return {
          testType,
          unit: rows[0]?.unit ?? meta?.type.unit ?? "",
          categoryKey: meta?.categoryKey ?? "",
          categoryLabel: meta?.categoryLabel ?? "Diğer",
          lowerIsBetter: meta?.type.lowerIsBetter ?? false,
          entries,
        };
      })
      .sort(
        (a, b) =>
          (CATEGORY_ORDER[a.categoryKey] ?? 99) -
            (CATEGORY_ORDER[b.categoryKey] ?? 99) ||
          a.testType.localeCompare(b.testType, "tr-TR")
      );
  }, [filtered, tests, athleteNameMap, athleteById, showTeamColumn]);

  // ---------- 1RM: takım + arama filtresi, egzersiz kartları ve matris ----------
  const visibleMaxes = useMemo(() => {
    const q = rmSearch.trim().toLocaleLowerCase("tr-TR");
    return maxes.filter((m) => {
      if (
        filterTeam !== "all" &&
        athleteById[m.athlete_id]?.team_id !== filterTeam
      )
        return false;
      if (!q) return true;
      const name = (athleteNameMap[m.athlete_id] ?? "").toLocaleLowerCase(
        "tr-TR"
      );
      return (
        name.includes(q) ||
        m.exercise_name.toLocaleLowerCase("tr-TR").includes(q)
      );
    });
  }, [maxes, rmSearch, filterTeam, athleteById, athleteNameMap]);

  // En çok sporcusu olan egzersiz önce — kadronun ortak testleri başta görünsün
  const rmExercises = useMemo(() => {
    const count = new Map<string, number>();
    for (const m of visibleMaxes)
      count.set(m.exercise_name, (count.get(m.exercise_name) ?? 0) + 1);
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr-TR"))
      .map(([name]) => name);
  }, [visibleMaxes]);

  const rmCards = useMemo(
    () =>
      rmExercises.map((ex) => ({
        exercise: ex,
        entries: visibleMaxes
          .filter((m) => m.exercise_name === ex)
          .map<LeaderboardEntry>((m) => ({
            key: m.id,
            name: athleteNameMap[m.athlete_id] ?? "—",
            sub: showTeamColumn ? athleteById[m.athlete_id]?.team_name : null,
            value: Number(m.weight_kg),
            date: m.test_date,
          })),
      })),
    [rmExercises, visibleMaxes, athleteNameMap, athleteById, showTeamColumn]
  );

  const matrixRows = useMemo<MatrixRow[]>(() => {
    const rows = new Map<string, MatrixRow>();
    for (const m of visibleMaxes) {
      const row = rows.get(m.athlete_id) ?? {
        key: m.athlete_id,
        name: athleteNameMap[m.athlete_id] ?? "—",
        sub: showTeamColumn ? athleteById[m.athlete_id]?.team_name : null,
        cells: {},
      };
      row.cells[m.exercise_name] = {
        value: Number(m.weight_kg),
        date: m.test_date,
      };
      rows.set(m.athlete_id, row);
    }
    return [...rows.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "tr-TR")
    );
  }, [visibleMaxes, athleteNameMap, athleteById, showTeamColumn]);

  const visibleMaxIds = new Set(visibleMaxes.map((m) => m.id));
  const listMaxes = sortedMaxes.filter((m) => visibleMaxIds.has(m.id));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Test Sonuçları</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kadronun performans testleri ve maksimal kuvvet değerleri tek
            bakışta
          </p>
        </div>
        {showTeamColumn && (
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="tests-team">
              Takım
            </Label>
            <select
              id="tests-team"
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="flex h-9 w-full sm:w-52 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Tüm Takımlar</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          title="Test Sonucu"
          value={teamTests.length}
          sub={`${testedAthleteCount} sporcu · ${testTypeCount} test tipi`}
          icon={Activity}
          tint="bg-primary/10 text-primary"
        />
        <StatTile
          title="1RM Kaydı"
          value={teamMaxes.length}
          sub={`${rmExerciseCount} egzersiz`}
          icon={Dumbbell}
          tint="bg-violet/10 text-violet"
        />
        <StatTile
          title="1RM Kapsamı"
          value={`${rmAthleteCount}/${teamAthleteCount}`}
          sub="en az bir 1RM kaydı olan sporcu"
          icon={Users}
          tint="bg-good/10 text-good"
          progress={teamAthleteCount ? rmAthleteCount / teamAthleteCount : 0}
        />
        <StatTile
          title="Son Ölçüm"
          value={latestDate ? relativeDays(latestDate) : "—"}
          sub={
            latestDate
              ? formatYmdTr(latestDate, { style: "numeric" })
              : "Henüz ölçüm yok"
          }
          icon={CalendarClock}
          tint="bg-warning/15 text-warning"
        />
      </div>

      {/* Performans testleri */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performans Testleri
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {testsView === "panel"
                ? "Her test için sporcuların en güncel sonucu, en iyiden başlayarak"
                : `${filtered.length} kayıt — tüm ölçüm geçmişi`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ViewToggle
              value={testsView}
              onChange={changeTestsView}
              options={[
                { value: "panel", label: "Panel", icon: LayoutGrid },
                { value: "list", label: "Liste", icon: List },
              ]}
            />
            {canManage && (
              <Button onClick={() => setShowForm((v) => !v)}>
                {showForm ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {showForm ? "İptal" : "Test Sonucu Ekle"}
              </Button>
            )}
          </div>
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
                      <p className="text-xs text-destructive">
                        {errors.athlete_id.message}
                      </p>
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
                      <p className="text-xs text-destructive">
                        {errors.category.message}
                      </p>
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
                      <p className="text-xs text-destructive">
                        {errors.test_type.message}
                      </p>
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
                      <p className="text-xs text-destructive">
                        {errors.value.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="test-date">Tarih *</Label>
                    <Input
                      id="test-date"
                      type="date"
                      {...register("test_date")}
                    />
                    {errors.test_date && (
                      <p className="text-xs text-destructive">
                        {errors.test_date.message}
                      </p>
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
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Sporcu</Label>
            <select
              value={filterAthlete}
              onChange={(e) => setFilterAthlete(e.target.value)}
              className="flex h-9 w-full sm:w-44 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="flex h-9 w-full sm:w-44 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="w-full sm:w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bitiş</Label>
            <Input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
        </div>

        {/* Panel / Tablo */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {tests.length === 0
                ? "Henüz test sonucu eklenmemiş."
                : "Filtrelere uyan sonuç bulunamadı."}
            </p>
          </div>
        ) : testsView === "panel" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {testCards.map((c) => (
              <MetricCard
                key={c.testType}
                title={c.testType}
                badge={c.categoryLabel}
                badgeClass={CATEGORY_BADGE[c.categoryKey]}
                unit={c.unit}
                lowerIsBetter={c.lowerIsBetter}
                entries={c.entries}
              />
            ))}
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
                          {formatYmdTr(t.test_date, { style: "numeric" })}
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
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
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
      </section>

      {/* 1RM Kayıtları */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              1RM Kayıtları
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {rmView === "matrix"
                ? "Sporcu × egzersiz — renk, değerin egzersiz içindeki sırasını gösterir"
                : rmView === "panel"
                  ? "Her egzersiz için sporcuların en güncel 1RM değeri"
                  : `${listMaxes.length} sporcu-egzersiz kombinasyonu — en güncel maksimal kuvvet kayıtları`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ViewToggle
              value={rmView}
              onChange={changeRmView}
              options={[
                { value: "panel", label: "Panel", icon: LayoutGrid },
                { value: "matrix", label: "Matris", icon: Grid3x3 },
                { value: "list", label: "Liste", icon: List },
              ]}
            />
            {canManage && (
              <div className="flex items-center gap-3">
                <Button variant="outline" asChild>
                  <Link href="/tests/import-1rm">
                    <Upload className="h-4 w-4" />
                    İçe Aktar
                  </Link>
                </Button>
                <Button
                  onClick={() => setShowRmForm((v) => !v)}
                  variant="outline"
                >
                  {showRmForm ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {showRmForm ? "İptal" : "Yeni Kayıt Ekle"}
                </Button>
              </div>
            )}
          </div>
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
                      <p className="text-xs text-destructive">
                        {rmErrors.athlete_id.message}
                      </p>
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
                      <p className="text-xs text-destructive">
                        {rmErrors.exercise_key.message}
                      </p>
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
                      <p className="text-xs text-destructive">
                        {rmErrors.weight_kg.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rm-date">Tarih *</Label>
                    <Input
                      id="rm-date"
                      type="date"
                      {...registerRm("test_date")}
                    />
                    {rmErrors.test_date && (
                      <p className="text-xs text-destructive">
                        {rmErrors.test_date.message}
                      </p>
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRmForm(false)}
                  >
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

        {maxes.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={rmSearch}
              onChange={(e) => setRmSearch(e.target.value)}
              placeholder="Sporcu veya egzersiz ara..."
              className="pl-9"
              aria-label="1RM kayıtlarında ara"
            />
          </div>
        )}

        {visibleMaxes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
            <Dumbbell className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {maxes.length === 0
                ? "Henüz 1RM kaydı eklenmemiş."
                : "Aramaya uyan 1RM kaydı bulunamadı."}
            </p>
          </div>
        ) : rmView === "panel" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rmCards.map((c) => (
              <MetricCard
                key={c.exercise}
                title={c.exercise}
                badge="1RM"
                badgeClass="bg-violet/10 text-violet"
                unit="kg"
                entries={c.entries}
              />
            ))}
          </div>
        ) : rmView === "matrix" ? (
          <MaxMatrix columns={rmExercises} rows={matrixRows} />
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
                  {listMaxes.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {athleteNameMap[m.athlete_id] ?? "—"}
                      </TableCell>
                      <TableCell>{m.exercise_name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.weight_kg} kg
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatYmdTr(m.test_date, { style: "numeric" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
