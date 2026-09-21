"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings2, Trophy, Users, User, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { setAnnualPlanCell } from "@athleteiq/db/queries/annual-plans";
import {
  MAX_SESSIONS_PER_CELL,
  weekDateRange,
  weekIndexForDate,
} from "@athleteiq/validators/annual-plan";
import type { Tables } from "@athleteiq/db/types";
import { WeekDetailDialog } from "./week-detail-dialog";
import { MethodsDialog } from "./methods-dialog";

type Method = Tables<"annual_plan_methods">;
type WeekRow = Tables<"annual_plan_weeks">;
type CellRow = Tables<"annual_plan_cells">;

export type PlanCompetition = {
  id: string;
  name: string;
  competition_date: string;
  location: string | null;
  level: string | null;
  entry_count: number;
};

type Plan = {
  id: string;
  org_id: string;
  title: string;
  season_start: string;
  total_weeks: number;
  team_id: string | null;
  athlete_id: string | null;
  notes: string | null;
  teams: { id: string; name: string } | null;
  athletes: { id: string; full_name: string; team_id: string | null } | null;
};

interface Props {
  orgId: string;
  plan: Plan;
  methods: Method[];
  initialWeeks: WeekRow[];
  initialCells: CellRow[];
  competitions: PlanCompetition[];
  canManageMethods: boolean;
}

/**
 * Tıklamayla dönen seans sayısı aralığı. DB 14'e kadar izin verir; gerçekte
 * bir sistemden haftada 6'dan fazla seans planlanmıyor, bu yüzden hızlı
 * tıklama döngüsü 0..6 arası. 7-14 arası değerler hafta detayı panelindeki
 * sayı alanından girilir (orada MAX_SESSIONS_PER_CELL sınırı geçerli).
 */
const CYCLE_MAX = 6;

const MONTHS_TR = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_TR[m! - 1]}`;
}

/** Hücre yoğunluğuna göre dolgu opaklığı — ızgarada yük dağılımı tek bakışta okunsun. */
function cellOpacity(sessions: number): number {
  if (sessions <= 0) return 0;
  return Math.min(0.25 + sessions * 0.13, 0.92);
}

export function AnnualPlanGrid({
  orgId,
  plan,
  methods: initialMethods,
  initialWeeks,
  initialCells,
  competitions,
  canManageMethods,
}: Props) {
  const router = useRouter();
  const [methods, setMethods] = useState<Method[]>(initialMethods);
  const [weeks, setWeeks] = useState<WeekRow[]>(initialWeeks);
  const [cells, setCells] = useState<CellRow[]>(initialCells);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [isMethodsOpen, setIsMethodsOpen] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const activeMethods = useMemo(() => methods.filter((m) => m.is_active), [methods]);

  const weekIndexes = useMemo(
    () => Array.from({ length: plan.total_weeks }, (_, i) => i + 1),
    [plan.total_weeks]
  );

  /** week_index → hafta bağlamı satırı. */
  const weekByIndex = useMemo(() => {
    const map = new Map<number, WeekRow>();
    for (const w of weeks) map.set(w.week_index, w);
    return map;
  }, [weeks]);

  /** "methodId:weekIndex" → seans sayısı. */
  const cellMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cells) map.set(`${c.method_id}:${c.week_index}`, c.sessions);
    return map;
  }, [cells]);

  /**
   * week_index → o haftaya düşen yarışmalar. Excel'in MAÇLAR satırı; veri
   * competitions tablosundan gelir, burada yalnızca haftaya eşlenir.
   */
  const competitionsByWeek = useMemo(() => {
    const map = new Map<number, PlanCompetition[]>();
    for (const c of competitions) {
      const idx = weekIndexForDate(plan.season_start, plan.total_weeks, c.competition_date);
      if (idx == null) continue;
      const list = map.get(idx) ?? [];
      list.push(c);
      map.set(idx, list);
    }
    return map;
  }, [competitions, plan.season_start, plan.total_weeks]);

  /** Plan aralığının DIŞINDA kalan yarışmalar — sessizce kaybolmasınlar. */
  const outOfRangeCompetitions = useMemo(
    () =>
      competitions.filter(
        (c) => weekIndexForDate(plan.season_start, plan.total_weeks, c.competition_date) == null
      ),
    [competitions, plan.season_start, plan.total_weeks]
  );

  const currentWeekIndex = useMemo(
    () =>
      weekIndexForDate(
        plan.season_start,
        plan.total_weeks,
        new Date().toISOString().slice(0, 10)
      ),
    [plan.season_start, plan.total_weeks]
  );

  /**
   * Hücreyi yazar. Önce yerel state güncellenir (ızgara anında tepki versin),
   * hata olursa eski değere GERİ ALINIR — 59×11 ızgarada her tıklamada
   * router.refresh() yapmak kullanılamaz hale getirirdi.
   */
  const writeCell = useCallback(
    async (methodId: string, weekIndex: number, nextValue: number) => {
      const key = `${methodId}:${weekIndex}`;
      const previous = cellMap.get(key) ?? 0;
      if (previous === nextValue) return;

      setCells((prev) => {
        const without = prev.filter(
          (c) => !(c.method_id === methodId && c.week_index === weekIndex)
        );
        if (nextValue <= 0) return without;
        const existing = prev.find(
          (c) => c.method_id === methodId && c.week_index === weekIndex
        );
        return [
          ...without,
          {
            ...(existing ?? ({} as CellRow)),
            id: existing?.id ?? `optimistic-${key}`,
            plan_id: plan.id,
            method_id: methodId,
            week_index: weekIndex,
            sessions: nextValue,
            created_at: existing?.created_at ?? null,
            updated_at: null,
          } as CellRow,
        ];
      });

      setPending((p) => new Set(p).add(key));
      try {
        await setAnnualPlanCell(createClient(), plan.id, methodId, weekIndex, nextValue);
      } catch (err) {
        // Geri al: sunucu reddettiyse ızgara yalan söylememeli.
        setCells((prev) => {
          const without = prev.filter(
            (c) => !(c.method_id === methodId && c.week_index === weekIndex)
          );
          if (previous <= 0) return without;
          return [
            ...without,
            {
              id: `rollback-${key}`,
              plan_id: plan.id,
              method_id: methodId,
              week_index: weekIndex,
              sessions: previous,
              created_at: null,
              updated_at: null,
            } as CellRow,
          ];
        });
        toast({
          title: "Kaydedilemedi",
          description: err instanceof Error ? err.message : "Hücre güncellenemedi.",
          variant: "destructive",
        });
      } finally {
        setPending((p) => {
          const next = new Set(p);
          next.delete(key);
          return next;
        });
      }
    },
    [cellMap, plan.id]
  );

  const handleCellClick = useCallback(
    (methodId: string, weekIndex: number, decrement: boolean) => {
      const current = cellMap.get(`${methodId}:${weekIndex}`) ?? 0;
      const next = decrement
        ? current <= 0
          ? CYCLE_MAX
          : current - 1
        : current >= CYCLE_MAX
          ? 0
          : current + 1;
      void writeCell(methodId, weekIndex, next);
    },
    [cellMap, writeCell]
  );

  const targetLabel = plan.teams?.name ?? plan.athletes?.full_name ?? "—";
  const TargetIcon = plan.team_id ? Users : User;

  const totalSessions = cells.reduce((sum, c) => sum + c.sessions, 0);

  if (activeMethods.length === 0) {
    return (
      <div className="space-y-6">
        <PlanHeader
          plan={plan}
          targetLabel={targetLabel}
          TargetIcon={TargetIcon}
          onOpenMethods={() => setIsMethodsOpen(true)}
          canManageMethods={canManageMethods}
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Settings2 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Antrenman sistemi tanımlı değil</p>
              <p className="text-sm text-muted-foreground">
                Izgaranın satırlarını oluşturmak için en az bir antrenman sistemi ekleyin.
              </p>
            </div>
            {canManageMethods && (
              <Button variant="outline" onClick={() => setIsMethodsOpen(true)}>
                <Settings2 className="mr-2 h-4 w-4" />
                Sistemleri Yönet
              </Button>
            )}
          </CardContent>
        </Card>
        <MethodsDialog
          open={isMethodsOpen}
          onOpenChange={setIsMethodsOpen}
          orgId={orgId}
          methods={methods}
          onChange={setMethods}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PlanHeader
        plan={plan}
        targetLabel={targetLabel}
        TargetIcon={TargetIcon}
        onOpenMethods={() => setIsMethodsOpen(true)}
        canManageMethods={canManageMethods}
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{plan.total_weeks} hafta</Badge>
        <Badge variant="secondary">{activeMethods.length} sistem</Badge>
        <Badge variant="secondary">{totalSessions} planlanmış seans</Badge>
        <Badge variant="secondary">{competitions.length} yarışma</Badge>
        <span className="ml-auto">
          Hücreye tıkla: +1 · Shift+tıkla: −1 · Hafta başlığına tıkla: detay
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-max border-collapse text-xs">
          <thead>
            {/* HAFTALAR */}
            <tr>
              <th className="sticky left-0 z-20 min-w-[190px] border-b border-r bg-muted/60 px-3 py-2 text-left font-semibold backdrop-blur">
                HAFTALAR
              </th>
              {weekIndexes.map((w) => (
                <th
                  key={w}
                  className={`min-w-[44px] border-b border-r px-1 py-2 text-center font-semibold ${
                    w === currentWeekIndex ? "bg-primary/15 text-primary" : "bg-muted/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenWeek(w)}
                    className="w-full rounded hover:underline"
                    title={`Hafta ${w} detayı`}
                  >
                    {w}
                  </button>
                </th>
              ))}
            </tr>

            {/* TARİH */}
            <tr>
              <th className="sticky left-0 z-20 border-b border-r bg-muted/60 px-3 py-1.5 text-left font-medium text-muted-foreground backdrop-blur">
                TARİH
              </th>
              {weekIndexes.map((w) => (
                <th
                  key={w}
                  className={`whitespace-nowrap border-b border-r px-1 py-1.5 text-center text-[10px] font-normal text-muted-foreground ${
                    w === currentWeekIndex ? "bg-primary/10" : ""
                  }`}
                >
                  {shortDate(weekDateRange(plan.season_start, w).start)}
                </th>
              ))}
            </tr>

            {/* YARIŞMALAR — competitions tablosundan türetilir, düzenlenemez */}
            <tr>
              <th className="sticky left-0 z-20 border-b border-r bg-muted/60 px-3 py-1.5 text-left font-medium backdrop-blur">
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" />
                  YARIŞMALAR
                </span>
              </th>
              {weekIndexes.map((w) => {
                const comps = competitionsByWeek.get(w) ?? [];
                return (
                  <th
                    key={w}
                    className={`border-b border-r px-1 py-1.5 text-center font-normal ${
                      comps.length > 0 ? "bg-amber-100 dark:bg-amber-500/20" : ""
                    }`}
                    title={comps.map((c) => `${c.name} (${c.competition_date})`).join("\n")}
                  >
                    {comps.length > 0 ? (
                      <span className="font-semibold text-amber-700 dark:text-amber-300">
                        {comps.length === 1 ? "★" : `★${comps.length}`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">·</span>
                    )}
                  </th>
                );
              })}
            </tr>

            {/* CYCLES/LOADS — haftalık yoğunluk yüzdesi */}
            <tr>
              <th className="sticky left-0 z-20 border-b border-r bg-muted/60 px-3 py-1.5 text-left font-medium backdrop-blur">
                YOĞUNLUK
              </th>
              {weekIndexes.map((w) => {
                const week = weekByIndex.get(w);
                const pct = week?.intensity_pct == null ? null : Number(week.intensity_pct);
                return (
                  <th
                    key={w}
                    className={`border-b border-r px-1 py-1.5 text-center font-normal ${
                      w === currentWeekIndex ? "bg-primary/10" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenWeek(w)}
                      className="w-full rounded px-0.5 hover:bg-accent"
                      title={`Hafta ${w} yoğunluğunu düzenle`}
                    >
                      {pct == null ? (
                        <span className="text-muted-foreground/30">·</span>
                      ) : (
                        <span className="font-semibold tabular-nums">{Math.round(pct)}</span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>

            {/* FAZ / YER — Excel'in HOME/AWAY + faz satırlarının birleşimi */}
            <tr>
              <th className="sticky left-0 z-20 border-b-2 border-r bg-muted/60 px-3 py-1.5 text-left font-medium text-muted-foreground backdrop-blur">
                FAZ / YER
              </th>
              {weekIndexes.map((w) => {
                const week = weekByIndex.get(w);
                const label = week?.phase || week?.location || null;
                return (
                  <th
                    key={w}
                    className="border-b-2 border-r px-1 py-1.5 text-center font-normal"
                    title={
                      [week?.phase, week?.location, week?.notes].filter(Boolean).join(" · ") ||
                      undefined
                    }
                  >
                    {label ? (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {label.slice(0, 3)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">·</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {activeMethods.map((method) => (
              <tr key={method.id} className="group">
                <th className="sticky left-0 z-10 border-b border-r bg-card px-3 py-1.5 text-left font-medium group-hover:bg-accent/50">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: method.color ?? "#94a3b8" }}
                      aria-hidden
                    />
                    <span className="truncate">{method.name}</span>
                  </span>
                </th>
                {weekIndexes.map((w) => {
                  const key = `${method.id}:${w}`;
                  const value = cellMap.get(key) ?? 0;
                  const isPending = pending.has(key);
                  return (
                    <td
                      key={w}
                      className={`border-b border-r p-0 ${
                        w === currentWeekIndex ? "bg-primary/5" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleCellClick(method.id, w, e.shiftKey)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleCellClick(method.id, w, true);
                        }}
                        disabled={isPending}
                        className={`h-7 w-full text-center tabular-nums transition-colors hover:ring-1 hover:ring-inset hover:ring-primary ${
                          isPending ? "opacity-50" : ""
                        }`}
                        style={
                          value > 0
                            ? {
                                backgroundColor: method.color ?? "#94a3b8",
                                opacity: cellOpacity(value),
                                color: "#fff",
                              }
                            : undefined
                        }
                        aria-label={`${method.name}, hafta ${w}: ${value} seans`}
                        title={`${method.name} · Hafta ${w} · ${value} seans`}
                      >
                        {value > 0 ? <span className="font-semibold">{value}</span> : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {outOfRangeCompetitions.length > 0 && (
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-medium">Plan aralığı dışındaki yarışmalar</p>
            <p className="text-xs text-muted-foreground">
              Bu yarışmaların tarihi planın {plan.total_weeks} haftalık aralığına düşmüyor;
              ızgarada görünmezler. Planın başlangıcını veya süresini güncellemeniz gerekebilir.
            </p>
            <ul className="space-y-1 text-xs">
              {outOfRangeCompetitions.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <Trophy className="h-3 w-3 shrink-0 text-amber-600" />
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">{c.competition_date}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/competitions"
              className="inline-block text-xs text-primary hover:underline"
            >
              Yarışmalar sayfasına git →
            </Link>
          </CardContent>
        </Card>
      )}

      {openWeek !== null && (
        <WeekDetailDialog
          open
          onOpenChange={(v) => !v && setOpenWeek(null)}
          planId={plan.id}
          seasonStart={plan.season_start}
          totalWeeks={plan.total_weeks}
          weekIndex={openWeek}
          week={weekByIndex.get(openWeek) ?? null}
          methods={activeMethods}
          cells={cells}
          competitions={competitionsByWeek.get(openWeek) ?? []}
          onWeeksChange={setWeeks}
          onCellsChange={setCells}
          onNavigateWeek={setOpenWeek}
          onRequireRefresh={() => router.refresh()}
        />
      )}

      <MethodsDialog
        open={isMethodsOpen}
        onOpenChange={setIsMethodsOpen}
        orgId={orgId}
        methods={methods}
        onChange={setMethods}
      />
    </div>
  );
}

function PlanHeader({
  plan,
  targetLabel,
  TargetIcon,
  onOpenMethods,
  canManageMethods,
}: {
  plan: Plan;
  targetLabel: string;
  TargetIcon: typeof Users;
  onOpenMethods: () => void;
  canManageMethods: boolean;
}) {
  const range = weekDateRange(plan.season_start, plan.total_weeks);
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <Link
          href="/annual-plans"
          className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Yıllık Planlar
        </Link>
        <h1 className="truncate text-2xl font-bold tracking-tight">{plan.title}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <TargetIcon className="h-3.5 w-3.5" />
            {targetLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5" />
            {plan.season_start} → {range.end}
          </span>
        </p>
      </div>
      {canManageMethods && (
        <Button variant="outline" size="sm" onClick={onOpenMethods}>
          <Settings2 className="mr-2 h-4 w-4" />
          Sistemleri Yönet
        </Button>
      )}
    </div>
  );
}

export { CYCLE_MAX, MAX_SESSIONS_PER_CELL };
