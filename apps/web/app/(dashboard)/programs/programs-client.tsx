"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  CheckCircle2,
  Clock,
  Users,
  User,
  Archive,
  ArchiveRestore,
  LayoutGrid,
  Rows3,
  Search,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserContext } from "@/lib/hooks/useUserContext";
import { toast } from "@/components/ui/use-toast";
import { setProgramsArchived } from "@athleteiq/db/queries/programs";
import { getAthleteMaxHistory, getExercise1RMRatios } from "@athleteiq/db/queries/exercises";
import { Button } from "@athleteiq/ui/components/button";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent } from "@athleteiq/ui/components/card";
import { Input } from "@/components/ui/input";
import type { Tables } from "@athleteiq/db/types";
import { AthleteProgramView } from "./athlete-program-view";
import { GroupedPrograms } from "./grouped-programs";
import { groupPrograms, filterGroups, type BlockRow } from "@/lib/program-grouping";

const VIEW_STORAGE_KEY = "aiq_programs_view";

type Program = Tables<"training_programs"> & {
  training_sessions: (Tables<"training_sessions"> & {
    exercises: (Tables<"exercises"> & {
      exercise_sets: Tables<"exercise_sets">[];
    })[];
  })[];
};

interface Props {
  programs: Program[];
  teams: { id: string; name: string }[];
  athletes: { id: string; full_name: string; team_id: string | null }[];
  blocks?: BlockRow[];
  athleteMaxHistory?: Awaited<ReturnType<typeof getAthleteMaxHistory>>;
  ratios?: Awaited<ReturnType<typeof getExercise1RMRatios>>;
  /** Yalnızca athlete rolünde dolu — AthleteProgramView'daki geri bildirim kartı için. */
  athleteId?: string | null;
  feedback?: Tables<"session_feedback">[];
}

const PHASE_LABELS: Record<string, string> = {
  preparation: "Hazırlık",
  competition: "Müsabaka",
  transition: "Geçiş",
  peak: "Zirve",
};

const PHASE_COLORS: Record<string, string> = {
  preparation: "bg-blue-100 text-blue-700",
  competition: "bg-red-100 text-red-700",
  transition: "bg-gray-100 text-gray-700",
  peak: "bg-purple-100 text-purple-700",
};

export function ProgramsClient({
  programs,
  teams,
  athletes,
  blocks = [],
  athleteMaxHistory = [],
  ratios = [],
  athleteId = null,
  feedback = [],
}: Props) {
  const router = useRouter();
  const { role } = useUserContext();
  const isAthlete = role === "athlete";
  const [filter, setFilter] = useState<"all" | "published" | "draft">(
    isAthlete ? "published" : "all"
  );
  const [showArchived, setShowArchived] = useState(false);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);
  // Varsayılan gruplu görünüm; tercih tarayıcıda hatırlanır (yalnızca bir UI
  // kolaylığı — okunamazsa sessizce varsayılana düşer).
  const [view, setView] = useState<"grouped" | "list">("grouped");
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "list" || saved === "grouped") setView(saved);
    } catch {
      // private mode / site verisi kapalı — varsayılanla devam
    }
  }, []);

  function changeView(next: "grouped" | "list") {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // yazılamadıysa tercih yalnızca bu oturumda geçerli olur
    }
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("program-updates-programs")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "training_programs",
          filter: "is_published=eq.true",
        },
        () => {
          router.refresh();
          toast({ title: "Yeni program yayınlandı" });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t.name])),
    [teams]
  );

  const athleteMap = useMemo(
    () => Object.fromEntries(athletes.map((a) => [a.id, a.full_name])),
    [athletes]
  );

  const filtered = useMemo(() => {
    // Athlete her durumda yalnızca yayınlanmış VE arşivlenmemiş programları görür
    // (RLS is_archived'dan habersiz — bu istemci tarafı bir UX filtresi).
    if (isAthlete) return programs.filter((p) => p.is_published && !p.is_archived);
    const base = programs.filter((p) => showArchived || !p.is_archived);
    if (filter === "published") return base.filter((p) => p.is_published);
    if (filter === "draft") return base.filter((p) => !p.is_published);
    return base;
  }, [programs, filter, isAthlete, showArchived]);

  // Gruplama, filtrelenmiş haftalar üzerinden çalışır — böylece Tümü/Yayında/
  // Taslak/Arşiv seçimleri gruplu görünümde de aynen geçerli olur.
  const groups = useMemo(() => {
    const todayISO = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(
      new Date()
    );
    const all = groupPrograms({
      programs: filtered,
      blocks,
      teamNames: teamMap,
      athleteNames: athleteMap,
      todayISO,
    });
    return filterGroups(all, query);
  }, [filtered, blocks, teamMap, athleteMap, query]);

  if (isAthlete) {
    return (
      <AthleteProgramView
        programs={filtered}
        maxHistory={athleteMaxHistory}
        ratios={ratios}
        athleteId={athleteId}
        feedback={feedback}
      />
    );
  }

  const activePrograms = programs.filter((p) => !p.is_archived);
  const publishedCount = activePrograms.filter((p) => p.is_published).length;
  const draftCount = activePrograms.filter((p) => !p.is_published).length;
  const archivedCount = programs.filter((p) => p.is_archived).length;

  async function handleUnarchive(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setUnarchivingId(id);
    try {
      const supabase = createClient();
      await setProgramsArchived(supabase, [id], false);
      toast({ title: "Program arşivden çıkarıldı" });
      router.refresh();
    } catch (err: unknown) {
      toast({
        title: "İşlem başarısız",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setUnarchivingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Antrenman Programları</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAthlete
              ? `${publishedCount} program`
              : `${activePrograms.length} program — ${publishedCount} yayında, ${draftCount} taslak`}
          </p>
        </div>
        {!isAthlete && (
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/programs/import">
                <Upload className="h-4 w-4" />
                İçe Aktar
              </Link>
            </Button>
            <Button asChild>
              <Link href="/programs/new">
                <Plus className="h-4 w-4" />
                Yeni Program
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className={`flex items-center justify-between gap-2 ${isAthlete ? "hidden" : ""}`}>
        <div className="flex gap-2">
          {(["all", "published", "draft"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {f === "all" ? "Tümü" : f === "published" ? "Yayında" : "Taslak"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived((s) => !s)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              showArchived
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            Arşivi göster {archivedCount > 0 && `(${archivedCount})`}
          </button>

          {/* Gruplu (takım/sporcu) ↔ düz liste — eski davranış "Liste"de korunuyor. */}
          <div className="flex items-center rounded-full bg-secondary p-0.5">
            <button
              onClick={() => changeView("grouped")}
              title="Takım / sporcu bazında grupla"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                view === "grouped"
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Rows3 className="h-3.5 w-3.5" />
              Gruplu
            </button>
            <button
              onClick={() => changeView("list")}
              title="Tüm haftaları düz liste olarak göster"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Liste
            </button>
          </div>
        </div>
      </div>

      {view === "grouped" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sporcu, takım veya program ara..."
            className="pl-8"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {isAthlete
              ? "Henüz size atanmış yayınlanmış bir program yok."
              : filter === "all"
              ? "Henüz program oluşturulmamış."
              : "Bu filtreye uygun program yok."}
          </p>
          {!isAthlete && (
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/programs/new">Program Oluştur</Link>
            </Button>
          )}
        </div>
      ) : view === "grouped" ? (
        groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <Clock className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              &quot;{query}&quot; aramasına uyan program yok.
            </p>
          </div>
        ) : (
          <GroupedPrograms groups={groups} />
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((program) => {
            const sessionCount = program.training_sessions?.length ?? 0;
            const exerciseCount =
              program.training_sessions?.reduce(
                (sum, s) => sum + (s.exercises?.length ?? 0),
                0
              ) ?? 0;
            const isTeam = !!program.team_id;

            return (
              <Card
                key={program.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/programs/${program.id}`)}
              >
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold leading-tight">{program.title}</h3>
                    {program.is_published ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {program.phase && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          PHASE_COLORS[program.phase] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {PHASE_LABELS[program.phase] ?? program.phase}
                      </span>
                    )}
                    {program.week_number && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        Hafta {program.week_number}
                      </span>
                    )}
                    <Badge variant={program.is_published ? "default" : "secondary"} className="text-xs">
                      {program.is_published ? "Yayında" : "Taslak"}
                    </Badge>
                    {program.is_archived && (
                      <Badge variant="secondary" className="text-xs">
                        Arşivlendi
                      </Badge>
                    )}
                  </div>

                  {program.is_archived && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-3 w-full"
                      disabled={unarchivingId === program.id}
                      onClick={(e) => handleUnarchive(program.id, e)}
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      {unarchivingId === program.id ? "İşleniyor..." : "Arşivden çıkar"}
                    </Button>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5">
                      {isTeam ? (
                        <Users className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isTeam
                          ? teamMap[program.team_id!] ?? "—"
                          : athleteMap[program.athlete_id!] ?? "—"}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <span>{sessionCount} seans</span>
                      <span>{exerciseCount} egzersiz</span>
                    </div>
                    {program.start_date && (
                      <div>
                        {new Date(program.start_date).toLocaleDateString("tr-TR")}
                        {program.end_date &&
                          ` — ${new Date(program.end_date).toLocaleDateString("tr-TR")}`}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
