"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import {
  ArrowRight,
  Flame,
  MapPin,
  Moon,
  Trophy,
  Watch,
  Zap,
} from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { upsertWellnessCheckin } from "@athleteiq/db/queries/wellness";
import { wellnessCheckinSchema } from "@athleteiq/validators/wellness";
import type { getAthleteCompetitionEntries } from "@athleteiq/db/queries/competitions";
import type { Tables } from "@athleteiq/db/types";
import { getAcwrBadgeVariant, getAcwrLabel } from "@/lib/acwr";
import { formatSetLoad, formatSetReps, SESSION_TYPE_LABELS } from "@/lib/exercise-format";
import { daysUntil, toLocalDateString } from "@/lib/date";

// getDaySessions'ın çıkarım tipine güvenmek yerine (DbClient.from() `any`
// döndürüyor — bkz. packages/db/queries/_client.ts — bu yüzden çıkarım
// zinciri kopuyor), program-detail-client.tsx'teki Program tipiyle aynı
// yaklaşımla açıkça tanımlanıyor.
type DaySession = Tables<"training_sessions"> & {
  exercises: (Tables<"exercises"> & { exercise_sets: Tables<"exercise_sets">[] })[];
};
type AcwrLog = Tables<"acwr_logs">;
type WellnessRow = Tables<"wellness_checkins">;
type WearableMetric = Tables<"wearable_daily_metrics">;
type CompetitionEntry = Awaited<ReturnType<typeof getAthleteCompetitionEntries>>[number];
type ScaleField = "sleep_quality" | "soreness" | "stress" | "fatigue" | "mood";

const SCALE_ITEMS: { field: ScaleField; title: string }[] = [
  { field: "sleep_quality", title: "Uyku" },
  { field: "soreness", title: "Kas Ağrısı" },
  { field: "fatigue", title: "Yorgunluk" },
  { field: "stress", title: "Stres" },
  { field: "mood", title: "Ruh Hali" },
];

const DOW_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

interface Props {
  athleteId: string;
  userId: string;
  fullName: string;
  today: string;
  todaySessions: DaySession[];
  weeklyAcwrLogs: AcwrLog[];
  todayCheckin: WellnessRow | null;
  checkinStreak: number;
  nextCompetitionEntry: CompetitionEntry | null;
  wearableProvider?: "whoop" | "polar";
  wearableMetrics: WearableMetric | null;
}

function computeReadiness(
  wearableMetrics: WearableMetric | null,
  todayCheckin: WellnessRow | null
): { score: number | null; source: "wearable" | "wellness" | null } {
  if (wearableMetrics?.recovery_score != null) {
    return { score: Math.round(wearableMetrics.recovery_score), source: "wearable" };
  }
  if (todayCheckin?.wellness_total != null) {
    return {
      score: Math.round(((todayCheckin.wellness_total - 5) / 20) * 100),
      source: "wellness",
    };
  }
  return { score: null, source: null };
}

function readinessTone(score: number | null): { ring: string; text: string; note: string } {
  if (score == null) return { ring: "#94a3b8", text: "text-muted-foreground", note: "" };
  if (score >= 70) return { ring: "#22c55e", text: "text-green-600", note: "Bugün planlanan yükte çalışabilirsin." };
  if (score >= 45) return { ring: "#f59e0b", text: "text-amber-600", note: "Bugün yükü biraz temkinli tut." };
  return { ring: "#ef4444", text: "text-red-600", note: "Toparlanman düşük — koçunla konuşmayı düşün." };
}

export function AthleteDashboardClient({
  athleteId,
  userId,
  fullName,
  today,
  todaySessions,
  weeklyAcwrLogs,
  todayCheckin,
  checkinStreak,
  nextCompetitionEntry,
  wearableProvider,
  wearableMetrics,
}: Props) {
  const router = useRouter();
  const firstName = fullName.split(" ")[0] ?? fullName;
  const readiness = computeReadiness(wearableMetrics, todayCheckin);
  const tone = readinessTone(readiness.score);

  const ringR = 46;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset =
    readiness.score != null ? ringC - (readiness.score / 100) * ringC : ringC;

  const latestAcwrLog = weeklyAcwrLogs[weeklyAcwrLogs.length - 1];
  const latestAcwr = latestAcwrLog?.acwr_ratio ? Number(latestAcwrLog.acwr_ratio) : null;

  const weekBars = useMemo(() => {
    const byDate = new Map(weeklyAcwrLogs.map((l) => [l.log_date, l]));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today + "T00:00:00");
      const currentDow = d.getDay() === 0 ? 7 : d.getDay();
      d.setDate(d.getDate() - (currentDow - 1) + i);
      const iso = toLocalDateString(d);
      const log = byDate.get(iso);
      return {
        label: DOW_LABELS[i],
        iso,
        load: log?.session_load ? Number(log.session_load) : 0,
        isToday: iso === today,
      };
    });
  }, [weeklyAcwrLogs, today]);

  const firstSession = todaySessions[0];

  // Wellness hızlı check-in — bugün kaydedilmemişse
  const [values, setValues] = useState<Partial<Record<ScaleField, number>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const allAnswered = SCALE_ITEMS.every((item) => values[item.field] !== undefined);

  async function handleQuickSave() {
    if (!allAnswered) return;
    const parsed = wellnessCheckinSchema.safeParse(values);
    if (!parsed.success) {
      toast({ title: "Form geçersiz", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const supabase = createClient();
      await upsertWellnessCheckin(supabase, {
        athlete_id: athleteId,
        checkin_date: today,
        sleep_quality: parsed.data.sleep_quality,
        soreness: parsed.data.soreness,
        stress: parsed.data.stress,
        fatigue: parsed.data.fatigue,
        mood: parsed.data.mood,
        sleep_hours: null,
        notes: null,
        source: "athlete",
        entered_by: userId,
      });
      toast({ title: "Wellness kaydedildi" });
      router.refresh();
    } catch (err: unknown) {
      toast({
        title: "Kaydedilemedi",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const compDate = nextCompetitionEntry?.competitions?.competition_date;
  const compDaysUntil = compDate ? daysUntil(compDate) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Günaydın, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(today + "T00:00:00").toLocaleDateString("tr-TR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {firstSession ? ` — bugün ${firstSession.title || SESSION_TYPE_LABELS[firstSession.session_type ?? ""] || "antrenman"} planlı` : " — bugün planlı antrenman yok"}
          </p>
        </div>
        {checkinStreak > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-amber-600 border-amber-200 bg-amber-50">
            <Flame className="h-3.5 w-3.5" />
            {checkinStreak} gün üst üste check-in
          </Badge>
        )}
      </div>

      {/* Toparlanma */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 pt-6">
          <svg width="112" height="112" viewBox="0 0 112 112" className="shrink-0">
            <circle cx="56" cy="56" r={ringR} fill="none" stroke="var(--color-muted)" strokeWidth="10" />
            <circle
              cx="56"
              cy="56"
              r={ringR}
              fill="none"
              stroke={tone.ring}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={ringC}
              strokeDashoffset={ringOffset}
              transform="rotate(-90 56 56)"
            />
            <text x="56" y="52" textAnchor="middle" fontSize="22" fontWeight="700" className="fill-foreground">
              {readiness.score ?? "—"}
            </text>
            <text x="56" y="70" textAnchor="middle" fontSize="10" className="fill-muted-foreground">
              Toparlanma
            </text>
          </svg>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bugünkü Hazır Oluşluk
            </p>
            {readiness.score != null ? (
              <>
                <p className={`mt-1 text-sm font-medium ${tone.text}`}>{tone.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Kaynak: {readiness.source === "wearable" ? "wearable toparlanma skoru" : "günlük wellness check-in"}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Henüz veri yok — bir wearable bağla ya da bugünün wellness check-in&apos;ini doldur.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] items-start">
        <div className="space-y-6">

          {/* Bugünün Programı */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Bugünün Programı</CardTitle>
              <Link href="/programs" className="text-xs font-medium text-primary flex items-center gap-1">
                Tümünü gör <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {!firstSession ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Bugün için planlanmış bir antrenman yok.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge>{SESSION_TYPE_LABELS[firstSession.session_type ?? ""] ?? firstSession.session_type}</Badge>
                    <span className="text-sm font-medium">{firstSession.title}</span>
                    {firstSession.duration_min && (
                      <span className="ml-auto text-xs text-muted-foreground">{firstSession.duration_min} dk</span>
                    )}
                  </div>
                  {firstSession.exercises.slice(0, 5).map((ex, i) => {
                    const firstSet = ex.exercise_sets?.[0];
                    return (
                      <div key={ex.id} className="flex items-center gap-3 py-1.5 border-b last:border-0 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="font-medium">{ex.name}</span>
                        {firstSet && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {ex.exercise_sets.length} set · {formatSetReps(firstSet)}
                            {" · "}
                            {formatSetLoad(firstSet, ex.name, new Map(), null)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Haftalık Yük */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Haftalık Antrenman Yükü</CardTitle>
              {latestAcwr != null && (
                <Badge variant={getAcwrBadgeVariant(latestAcwr)}>{getAcwrLabel(latestAcwr)}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {weeklyAcwrLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Bu hafta için henüz yük kaydı yok.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={weekBars} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <ReferenceLine y={0} stroke="var(--color-border)" />
                    <Bar dataKey="load" radius={[4, 4, 0, 0]}>
                      {weekBars.map((d) => (
                        <Cell
                          key={d.iso}
                          fill="var(--color-primary)"
                          fillOpacity={d.isToday ? 1 : 0.55}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

        </div>

        <div className="space-y-6">

          {/* Wellness hızlı check-in */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Günlük Wellness Check-in</CardTitle>
            </CardHeader>
            <CardContent>
              {todayCheckin ? (
                <div className="text-center py-2">
                  <p className="text-2xl font-bold">
                    {todayCheckin.wellness_total ?? "—"}
                    <span className="text-sm font-normal text-muted-foreground">/25</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Bugün için kaydedildi</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/wellness">Düzenle</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {SCALE_ITEMS.map((item) => (
                    <div key={item.field} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{item.title}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setValues((prev) => ({ ...prev, [item.field]: n }))}
                            className={`h-7 w-7 rounded-full text-xs font-semibold transition-colors ${
                              values[item.field] === n
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button
                    className="w-full mt-2"
                    disabled={!allAnswered || isSaving}
                    onClick={handleQuickSave}
                  >
                    {isSaving ? "Kaydediliyor..." : "Bugünü Kaydet"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sıradaki Müsabaka */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sıradaki Müsabaka</CardTitle>
            </CardHeader>
            <CardContent>
              {!nextCompetitionEntry?.competitions ? (
                <div className="text-center py-4">
                  <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Yaklaşan müsabaka yok.</p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-4xl font-bold text-primary">{compDaysUntil}</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">gün kaldı</p>
                  <p className="mt-3 text-sm font-medium">{nextCompetitionEntry.competitions.name}</p>
                  {nextCompetitionEntry.competitions.location && (
                    <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {nextCompetitionEntry.competitions.location}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wearable */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Bugünkü Wearable Verisi</CardTitle>
              {wearableProvider && (
                <Badge variant="outline" className="uppercase text-xs">{wearableProvider}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {!wearableProvider ? (
                <div className="text-center py-3">
                  <Watch className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Henüz bir wearable bağlı değil.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/wearables">Bağlantı Kur</Link>
                  </Button>
                </div>
              ) : !wearableMetrics ? (
                <p className="text-sm text-muted-foreground py-3 text-center">Bugün için henüz veri gelmedi.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-2">
                    <Moon className="h-4 w-4 mx-auto mb-1 text-violet-600" />
                    <p className="text-sm font-bold">
                      {wearableMetrics.total_sleep_min != null
                        ? `${Math.floor(wearableMetrics.total_sleep_min / 60)}s ${wearableMetrics.total_sleep_min % 60}d`
                        : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Uyku</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <span className="mx-auto mb-1 block h-4 w-4 text-center text-red-600">♥</span>
                    <p className="text-sm font-bold">{wearableMetrics.resting_hr ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">RHR</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <Zap className="h-4 w-4 mx-auto mb-1 text-amber-600" />
                    <p className="text-sm font-bold">{wearableMetrics.strain_score ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Strain</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
