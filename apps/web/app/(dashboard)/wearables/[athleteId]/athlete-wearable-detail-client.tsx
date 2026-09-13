"use client";

import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ArrowLeft, Dumbbell, HeartPulse } from "lucide-react";
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
import type { Tables } from "@athleteiq/db/types";

type Athlete = { id: string; full_name: string };
type WearableConnection = Tables<"wearable_connections">;
type WearableMetric = Tables<"wearable_daily_metrics">;
type WhoopWorkout = Tables<"whoop_workouts">;

interface Props {
  athlete: Athlete;
  connection: WearableConnection | null;
  metrics: WearableMetric[];
  workouts: WhoopWorkout[];
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Henüz veri senkronize edilmedi.";
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 60) return `Son senkron ${diffMin} dk önce`;
  if (diffMin < 60 * 24) return `Son senkron ${Math.round(diffMin / 60)} sa önce`;
  return `Son senkron: ${new Date(iso).toLocaleDateString("tr-TR")}`;
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "—";
  const min = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (min < 60) return `${min} dk`;
  return `${Math.floor(min / 60)}s ${min % 60}d`;
}

export function AthleteWearableDetailClient({ athlete, connection, metrics, workouts }: Props) {
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
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500" : "bg-muted-foreground/40"}`}
          />
          {connected ? formatSyncTime(connection?.last_synced_at ?? null) : "WHOOP bağlı değil"}
        </p>
      </div>

      {!connected ? (
        <Card>
          <CardContent className="flex flex-col items-center text-center py-12">
            <HeartPulse className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Bu sporcu henüz WHOOP hesabını bağlamamış.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HeartPulse className="h-4 w-4" />
                Toparlanma / Strain / RHR Trendi
              </CardTitle>
              <p className="text-xs text-muted-foreground">Son {metrics.length} gün · WHOOP</p>
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
                    <Line
                      type="monotone"
                      dataKey="recovery"
                      name="Toparlanma"
                      stroke="var(--color-good)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="strain"
                      name="Strain"
                      stroke="var(--color-warning)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="restingHr"
                      name="Dinlenik Nabız"
                      stroke="var(--color-violet)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls
                    />
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
                Son {14} gün içinde uygulamada başlatılan antrenmanlar · WHOOP
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {workouts.length === 0 ? (
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
                      <TableHead>Strain</TableHead>
                      <TableHead>Ort/Maks Nabız</TableHead>
                      <TableHead className="text-right">Kalori</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workouts.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-sm">
                          {new Date(w.start_time).toLocaleString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{w.sport_name ?? "—"}</TableCell>
                        <TableCell>{formatDuration(w.start_time, w.end_time)}</TableCell>
                        <TableCell>{w.strain_score ?? "—"}</TableCell>
                        <TableCell>
                          {w.avg_hr ?? "—"} / {w.max_hr ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {w.kilojoules != null ? Math.round(w.kilojoules / 4.184) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
