"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ArrowLeft, Dumbbell, HeartPulse, RefreshCw } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import type { Tables } from "@athleteiq/db/types";
import { AiInsightPanel } from "./ai-insight-panel";

type Athlete = { id: string; full_name: string };
type WearableConnection = Tables<"wearable_connections">;
type WearableMetric = Tables<"wearable_daily_metrics">;
type WhoopWorkout = Tables<"whoop_workouts">;
type PolarExercise = Tables<"polar_exercises">;
type FitbitActivity = Tables<"fitbit_activities">;
type AthleteAiInsightRow = Tables<"athlete_ai_insights">;

interface Props {
  athlete: Athlete;
  whoop: { connection: WearableConnection | null; metrics: WearableMetric[]; workouts: WhoopWorkout[] };
  polar: { connection: WearableConnection | null; metrics: WearableMetric[]; exercises: PolarExercise[] };
  fitbit: { connection: WearableConnection | null; metrics: WearableMetric[]; activities: FitbitActivity[] };
  isSuperAdmin: boolean;
  aiInsightHistory: AthleteAiInsightRow[];
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Henüz veri senkronize edilmedi.";
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 60) return `Son senkron ${diffMin} dk önce`;
  if (diffMin < 60 * 24) return `Son senkron ${Math.round(diffMin / 60)} sa önce`;
  return `Son senkron: ${new Date(iso).toLocaleDateString("tr-TR")}`;
}

interface WorkoutRow {
  id: string;
  start: string;
  sport: string;
  durationLabel: string;
  load: string;
  loadLabel: string;
  hr: string;
  calories: string;
}

function formatDurationMin(min: number): string {
  if (min < 60) return `${min} dk`;
  return `${Math.floor(min / 60)}s ${min % 60}d`;
}

function whoopWorkoutToRow(w: WhoopWorkout): WorkoutRow {
  const min = w.end_time
    ? Math.round((new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / 60000)
    : null;
  return {
    id: w.id,
    start: w.start_time,
    sport: w.sport_name ?? "—",
    durationLabel: min != null ? formatDurationMin(min) : "—",
    load: String(w.strain_score ?? "—"),
    loadLabel: "Strain",
    hr: `${w.avg_hr ?? "—"} / ${w.max_hr ?? "—"}`,
    calories: w.kilojoules != null ? String(Math.round(w.kilojoules / 4.184)) : "—",
  };
}

function polarExerciseToRow(e: PolarExercise): WorkoutRow {
  return {
    id: e.id,
    start: e.start_time,
    sport: e.sport ?? "—",
    durationLabel: e.duration_sec != null ? formatDurationMin(Math.round(e.duration_sec / 60)) : "—",
    load: e.training_load != null ? String(e.training_load) : "—",
    loadLabel: "Yük",
    hr: `${e.avg_hr ?? "—"} / ${e.max_hr ?? "—"}`,
    calories: e.calories != null ? String(e.calories) : "—",
  };
}

function fitbitActivityToRow(a: FitbitActivity): WorkoutRow {
  return {
    id: a.id,
    start: a.start_time,
    sport: a.activity_name ?? "—",
    durationLabel: a.duration_sec != null ? formatDurationMin(Math.round(a.duration_sec / 60)) : "—",
    load: "—",
    loadLabel: "Yük",
    hr: `${a.avg_hr ?? "—"} / —`,
    calories: a.calories != null ? String(a.calories) : "—",
  };
}

interface ProviderSectionProps {
  label: string;
  connection: WearableConnection | null;
  metrics: WearableMetric[];
  rows: WorkoutRow[];
  syncHref?: string;
  athleteId: string;
}

function ProviderSection({ label, connection, metrics, rows, syncHref, athleteId }: ProviderSectionProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const connected = Boolean(connection?.is_active);

  const chartData = metrics.map((m) => ({
    date: new Date(m.metric_date + "T00:00:00").toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
    }),
    recovery: m.recovery_score,
    strain: m.strain_score,
    restingHr: m.resting_hr,
  }));

  async function handleSync() {
    if (!syncHref) return;
    setSyncing(true);
    try {
      const res = await fetch(syncHref, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Senkronizasyon başarısız oldu");
      }
      if (body.metricsError || body.exercisesError) {
        toast({
          title: "Senkron kısmen tamamlandı",
          description: [body.metricsError, body.exercisesError].filter(Boolean).join(" · "),
          variant: "destructive",
        });
      } else {
        toast({ title: `${label} verisi senkronize edildi.` });
      }
      router.refresh();
    } catch (err) {
      toast({
        title: "Senkronizasyon başarısız oldu",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }

  if (!connected && metrics.length === 0 && rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Bu sporcu henüz {label} hesabını bağlamamış.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{label}</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500" : "bg-muted-foreground/40"}`} />
            {connected ? formatSyncTime(connection?.last_synced_at ?? null) : "Bağlı değil"}
          </p>
        </div>
        {syncHref && connected && (
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className="h-3.5 w-3.5" />
            {syncing ? "Senkronize ediliyor..." : "Senkronize Et"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HeartPulse className="h-4 w-4" />
            Toparlanma / Strain / RHR Trendi
          </CardTitle>
          <p className="text-xs text-muted-foreground">Son {metrics.length} gün · {label}</p>
        </CardHeader>
        <CardContent>
          {metrics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Bu aralıkta henüz senkronize veri yok.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="recovery" name="Toparlanma" stroke="var(--color-good)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="strain" name="Strain" stroke="var(--color-warning)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="restingHr" name="Dinlenik Nabız" stroke="var(--color-violet)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Antrenman Kayıtları
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Son 14 gün içinde uygulamada başlatılan antrenmanlar · {label}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Bu aralıkta kaydedilmiş bir antrenman yok.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Spor</TableHead>
                  <TableHead>Süre</TableHead>
                  <TableHead>{rows[0]?.loadLabel ?? "Yük"}</TableHead>
                  <TableHead>Ort/Maks Nabız</TableHead>
                  <TableHead className="text-right">Kalori</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {new Date(r.start).toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{r.sport}</TableCell>
                    <TableCell>{r.durationLabel}</TableCell>
                    <TableCell>{r.load}</TableCell>
                    <TableCell>{r.hr}</TableCell>
                    <TableCell className="text-right">{r.calories}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AthleteWearableDetailClient({
  athlete,
  whoop,
  polar,
  fitbit,
  isSuperAdmin,
  aiInsightHistory,
}: Props) {
  const whoopRows = whoop.workouts.map(whoopWorkoutToRow);
  const polarRows = polar.exercises.map(polarExerciseToRow);
  const fitbitRows = fitbit.activities.map(fitbitActivityToRow);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/wearables">
            <ArrowLeft className="h-4 w-4" />
            Wearable Bağlantıları
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{athlete.full_name}</h1>
      </div>

      {isSuperAdmin && (
        <AiInsightPanel athleteId={athlete.id} initialHistory={aiInsightHistory} />
      )}

      <ProviderSection
        label="WHOOP"
        connection={whoop.connection}
        metrics={whoop.metrics}
        rows={whoopRows}
        athleteId={athlete.id}
      />

      <ProviderSection
        label="Polar"
        connection={polar.connection}
        metrics={polar.metrics}
        rows={polarRows}
        syncHref="/api/wearables/polar/sync"
        athleteId={athlete.id}
      />

      <ProviderSection
        label="Fitbit"
        connection={fitbit.connection}
        metrics={fitbit.metrics}
        rows={fitbitRows}
        syncHref="/api/wearables/fitbit/sync"
        athleteId={athlete.id}
      />
    </div>
  );
}
