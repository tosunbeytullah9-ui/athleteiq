"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Badge } from "@athleteiq/ui/components/badge";
import { createClient } from "@/lib/supabase/client";
import { upsertAcwrLog } from "@athleteiq/db/queries/acwr";
import { acwrLogSchema, type AcwrLogInput } from "@athleteiq/validators/acwr";
import type { Tables } from "@athleteiq/db/types";

type AcwrLog = Tables<"acwr_logs">;
type Athlete = { id: string; full_name: string; team_id: string | null };

interface Props {
  athletes: Athlete[];
}

function getAcwrColor(ratio: number | null): string {
  if (!ratio) return "#6b7280";
  if (ratio < 0.8) return "#3b82f6";
  if (ratio <= 1.3) return "#22c55e";
  if (ratio <= 1.5) return "#f59e0b";
  return "#ef4444";
}

function getAcwrLabel(ratio: number | null): string {
  if (!ratio) return "—";
  if (ratio < 0.8) return "Düşük";
  if (ratio <= 1.3) return "Optimal";
  if (ratio <= 1.5) return "Dikkat";
  return "Yüksek Risk";
}

function getAcwrBadgeVariant(ratio: number | null): "default" | "secondary" | "destructive" {
  if (!ratio) return "secondary";
  if (ratio <= 1.3) return "default";
  if (ratio > 1.5) return "destructive";
  return "secondary";
}

const today = new Date().toISOString().split("T")[0]!;
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0]!;

export function AcwrClient({ athletes }: Props) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(
    athletes[0]?.id ?? ""
  );
  const [logs, setLogs] = useState<AcwrLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AcwrLogInput>({
    resolver: zodResolver(acwrLogSchema),
    defaultValues: {
      log_date: today,
      athlete_id: selectedAthleteId,
    },
  });

  const loadLogs = useCallback(async (athleteId: string) => {
    if (!athleteId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("acwr_logs")
        .select("*")
        .eq("athlete_id", athleteId)
        .gte("log_date", thirtyDaysAgo)
        .lte("log_date", today)
        .order("log_date");
      if (error) throw error;
      setLogs(data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAthleteId) loadLogs(selectedAthleteId);
  }, [selectedAthleteId, loadLogs]);

  async function onSubmit(data: AcwrLogInput) {
    setSubmitError(null);
    try {
      const supabase = createClient();

      // Compute running acute (7-day) and chronic (28-day) loads
      type LogEntry = { log_date: string | null; session_load: number | null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const allLogsResult = await db
        .from("acwr_logs")
        .select("log_date, session_load")
        .eq("athlete_id", data.athlete_id)
        .order("log_date");

      const existingLogs = (allLogsResult.data ?? []) as LogEntry[];
      const sessionLoad = data.session_rpe * data.duration_min;

      const logDate = new Date(data.log_date);

      function avgLoad(days: number): number {
        const cutoff = new Date(logDate.getTime() - days * 24 * 60 * 60 * 1000);
        const relevant = existingLogs.filter((l) => {
          const d = new Date(l.log_date ?? "");
          return d >= cutoff && d < logDate;
        });
        // include current session in average
        const total =
          relevant.reduce((s, l) => s + (Number(l.session_load) || 0), 0) + sessionLoad;
        return total / days;
      }

      const acuteLoad = avgLoad(7);
      const chronicLoad = avgLoad(28);

      await upsertAcwrLog(supabase, {
        athlete_id: data.athlete_id,
        log_date: data.log_date,
        session_rpe: data.session_rpe,
        duration_min: data.duration_min,
        acute_load: acuteLoad,
        chronic_load: chronicLoad,
        notes: data.notes ?? null,
      });

      reset({ log_date: today, athlete_id: selectedAthleteId });
      setShowForm(false);
      await loadLogs(selectedAthleteId);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Kayıt sırasında hata oluştu.");
    }
  }

  const chartData = logs.map((l) => ({
    date: new Date(l.log_date ?? "").toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
    }),
    acwr: l.acwr_ratio ? Number(Number(l.acwr_ratio).toFixed(2)) : null,
    sessionLoad: Number(l.session_load) || null,
    acuteLoad: l.acute_load ? Number(Number(l.acute_load).toFixed(1)) : null,
    chronicLoad: l.chronic_load ? Number(Number(l.chronic_load).toFixed(1)) : null,
  }));

  const latestLog = logs[logs.length - 1];
  const latestAcwr = latestLog?.acwr_ratio ? Number(latestLog.acwr_ratio) : null;

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ACWR Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Akut:Kronik Yük Oranı — son 30 gün
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          Yük Logu Ekle
        </Button>
      </div>

      {/* Sporcu seçimi */}
      <div className="flex items-center gap-3">
        <Label className="shrink-0">Sporcu</Label>
        <select
          value={selectedAthleteId}
          onChange={(e) => setSelectedAthleteId(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {athletes.length === 0 ? (
            <option value="">Sporcu bulunamadı</option>
          ) : (
            athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Log girişi formu */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Antrenman Yükü Gir</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid grid-cols-2 gap-4 md:grid-cols-4"
            >
              <input
                type="hidden"
                value={selectedAthleteId}
                {...register("athlete_id")}
              />

              <div className="space-y-1.5">
                <Label htmlFor="log_date">Tarih *</Label>
                <Input id="log_date" type="date" {...register("log_date")} />
                {errors.log_date && (
                  <p className="text-xs text-destructive">{errors.log_date.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="session_rpe">sRPE (0–10) *</Label>
                <Input
                  id="session_rpe"
                  type="number"
                  step="0.5"
                  min={0}
                  max={10}
                  {...register("session_rpe", { valueAsNumber: true })}
                  placeholder="7"
                />
                {errors.session_rpe && (
                  <p className="text-xs text-destructive">{errors.session_rpe.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="duration_min">Süre (dk) *</Label>
                <Input
                  id="duration_min"
                  type="number"
                  min={1}
                  {...register("duration_min", { valueAsNumber: true })}
                  placeholder="60"
                />
                {errors.duration_min && (
                  <p className="text-xs text-destructive">{errors.duration_min.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Not</Label>
                <Input
                  id="notes"
                  {...register("notes")}
                  placeholder="İsteğe bağlı"
                />
              </div>

              {submitError && (
                <p className="col-span-full text-xs text-destructive">{submitError}</p>
              )}

              <div className="col-span-full flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={isSubmitting || !selectedAthleteId}>
                  {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Mevcut ACWR</p>
            <p
              className="text-2xl font-bold mt-1"
              style={{ color: getAcwrColor(latestAcwr) }}
            >
              {latestAcwr ? latestAcwr.toFixed(2) : "—"}
            </p>
            {latestAcwr && (
              <Badge variant={getAcwrBadgeVariant(latestAcwr)} className="mt-1 text-xs">
                {getAcwrLabel(latestAcwr)}
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Akut Yük (7 gün)</p>
            <p className="text-2xl font-bold mt-1">
              {latestLog?.acute_load ? Number(latestLog.acute_load).toFixed(0) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">AU</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Kronik Yük (28 gün)</p>
            <p className="text-2xl font-bold mt-1">
              {latestLog?.chronic_load ? Number(latestLog.chronic_load).toFixed(0) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">AU</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Toplam Log</p>
            <p className="text-2xl font-bold mt-1">{logs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">son 30 gün</p>
          </CardContent>
        </Card>
      </div>

      {/* ACWR Grafik */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            ACWR Trendi — {selectedAthlete?.full_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-md">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Bu sporcu için henüz yük logu yok.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="acwr"
                  domain={[0, 2]}
                  tick={{ fontSize: 11 }}
                  tickCount={5}
                  label={{ value: "ACWR", angle: -90, position: "insideLeft", fontSize: 11 }}
                />
                <YAxis
                  yAxisId="load"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  label={{ value: "Yük (AU)", angle: 90, position: "insideRight", fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      acwr: "ACWR",
                      sessionLoad: "Seans Yükü",
                      acuteLoad: "Akut Yük",
                      chronicLoad: "Kronik Yük",
                    };
                    return [value, labels[name] ?? name];
                  }}
                />
                <Legend
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      acwr: "ACWR",
                      sessionLoad: "Seans Yükü",
                      acuteLoad: "Akut Yük",
                      chronicLoad: "Kronik Yük",
                    };
                    return labels[value] ?? value;
                  }}
                />
                {/* ACWR güvenli bölge referans çizgileri */}
                <ReferenceLine
                  yAxisId="acwr"
                  y={0.8}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  label={{ value: "0.8", position: "right", fontSize: 10, fill: "#3b82f6" }}
                />
                <ReferenceLine
                  yAxisId="acwr"
                  y={1.3}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{ value: "1.3", position: "right", fontSize: 10, fill: "#f59e0b" }}
                />
                <ReferenceLine
                  yAxisId="acwr"
                  y={1.5}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: "1.5", position: "right", fontSize: 10, fill: "#ef4444" }}
                />
                <Line
                  yAxisId="acwr"
                  type="monotone"
                  dataKey="acwr"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#6366f1" }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  yAxisId="load"
                  type="monotone"
                  dataKey="sessionLoad"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Log tablosu */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs">
                      Tarih
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                      sRPE
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                      Süre
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                      Seans Yükü
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                      ACWR
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...logs].reverse().map((log) => {
                    const ratio = log.acwr_ratio ? Number(log.acwr_ratio) : null;
                    return (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          {new Date(log.log_date ?? "").toLocaleDateString("tr-TR")}
                        </td>
                        <td className="py-2 px-2 text-center">{log.session_rpe}</td>
                        <td className="py-2 px-2 text-center">{log.duration_min} dk</td>
                        <td className="py-2 px-2 text-center">
                          {log.session_load ? Number(log.session_load).toFixed(0) : "—"}
                        </td>
                        <td
                          className="py-2 px-2 text-center font-semibold"
                          style={{ color: getAcwrColor(ratio) }}
                        >
                          {ratio ? ratio.toFixed(2) : "—"}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge
                            variant={getAcwrBadgeVariant(ratio)}
                            className="text-xs"
                          >
                            {getAcwrLabel(ratio)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
