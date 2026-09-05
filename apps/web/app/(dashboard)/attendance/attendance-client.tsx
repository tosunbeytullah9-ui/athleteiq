"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Check, Clock, ShieldCheck, X, Save } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Label } from "@athleteiq/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Badge } from "@athleteiq/ui/components/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  getAttendanceForTeamAndDate,
  getAttendanceHistory,
  upsertAttendanceRecords,
} from "@athleteiq/db/queries/attendance";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@athleteiq/validators/attendance";
import type { Tables } from "@athleteiq/db/types";

type AttendanceRecord = Tables<"attendance_records">;
type Team = { id: string; name: string };
type Athlete = { id: string; full_name: string; team_id: string | null };

interface Props {
  orgId: string;
  teams: Team[];
  athletes: Athlete[];
  defaultTeamId: string | null;
}

const STATUS_META: Record<
  AttendanceStatus,
  { label: string; icon: typeof Check; activeClass: string }
> = {
  present: { label: "Var", icon: Check, activeClass: "bg-green-600 text-white border-green-600" },
  late: { label: "Geç", icon: Clock, activeClass: "bg-amber-500 text-white border-amber-500" },
  excused: {
    label: "İzinli",
    icon: ShieldCheck,
    activeClass: "bg-blue-600 text-white border-blue-600",
  },
  absent: { label: "Yok", icon: X, activeClass: "bg-red-600 text-white border-red-600" },
};

const today = new Date().toISOString().split("T")[0]!;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
}

export function AttendanceClient({ orgId, teams, athletes, defaultTeamId }: Props) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    defaultTeamId ?? teams[0]?.id ?? ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [statusByAthlete, setStatusByAthlete] = useState<Record<string, AttendanceStatus>>({});
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const teamAthletes = useMemo(
    () => athletes.filter((a) => a.team_id === selectedTeamId),
    [athletes, selectedTeamId]
  );

  const isCoachLocked = defaultTeamId !== null;

  const load = useCallback(async (teamId: string, date: string) => {
    if (!teamId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const [dayRecords, historyRecords] = await Promise.all([
        getAttendanceForTeamAndDate(supabase, teamId, date),
        getAttendanceHistory(supabase, teamId, daysAgo(30), today),
      ]);

      const next: Record<string, AttendanceStatus> = {};
      for (const r of dayRecords ?? []) {
        if (r.athlete_id && r.status) next[r.athlete_id] = r.status as AttendanceStatus;
      }
      setStatusByAthlete(next);
      setHistory((historyRecords ?? []) as AttendanceRecord[]);
    } catch (err) {
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Yoklama yüklenemedi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeamId) load(selectedTeamId, selectedDate);
  }, [selectedTeamId, selectedDate, load]);

  function setStatus(athleteId: string, status: AttendanceStatus) {
    setStatusByAthlete((prev) => {
      const next = { ...prev };
      if (next[athleteId] === status) {
        delete next[athleteId];
      } else {
        next[athleteId] = status;
      }
      return next;
    });
  }

  async function handleSave() {
    const entries = Object.entries(statusByAthlete).filter(([, status]) => Boolean(status));
    if (entries.length === 0) {
      toast({ title: "Kaydedilecek bir işaretleme yok" });
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await upsertAttendanceRecords(
        supabase,
        entries.map(([athleteId, status]) => ({
          org_id: orgId,
          team_id: selectedTeamId,
          athlete_id: athleteId,
          session_date: selectedDate,
          status,
          recorded_by: user?.id ?? null,
        }))
      );

      toast({ title: "Yoklama kaydedildi" });
      await load(selectedTeamId, selectedDate);
    } catch (err) {
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Yoklama kaydedilemedi.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const summary = useMemo(() => {
    const counts: Record<string, Record<AttendanceStatus, number>> = {};
    for (const a of teamAthletes) {
      counts[a.id] = { present: 0, late: 0, excused: 0, absent: 0 };
    }
    for (const r of history) {
      if (r.athlete_id && r.status && counts[r.athlete_id]) {
        counts[r.athlete_id]![r.status as AttendanceStatus]++;
      }
    }
    return counts;
  }, [teamAthletes, history]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Yoklama</h1>
        <p className="text-sm text-muted-foreground mt-1">Takım/tarih bazlı antrenman yoklaması</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Label className="shrink-0">Takım</Label>
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          disabled={isCoachLocked}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-70"
        >
          {teams.length === 0 ? (
            <option value="">Takım bulunamadı</option>
          ) : (
            teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))
          )}
        </select>

        <Label className="shrink-0">Tarih</Label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />

        <Button onClick={handleSave} disabled={isSaving} className="ml-auto">
          <Save className="h-4 w-4" />
          {isSaving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {new Date(selectedDate).toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Yükleniyor...</p>
          ) : teamAthletes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Bu takımda sporcu bulunamadı.
            </p>
          ) : (
            <div className="space-y-2">
              {teamAthletes.map((a) => {
                const current = statusByAthlete[a.id];
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <span className="text-sm font-medium">{a.full_name}</span>
                    <div className="flex gap-1.5">
                      {ATTENDANCE_STATUSES.map((status) => {
                        const meta = STATUS_META[status];
                        const Icon = meta.icon;
                        const active = current === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setStatus(a.id, status)}
                            className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              active
                                ? meta.activeClass
                                : "border-input bg-background text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {teamAthletes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Son 30 Gün Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs">
                      Sporcu
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                      Var
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                      Geç
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                      İzinli
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                      Yok
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                      Devam %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamAthletes.map((a) => {
                    const c = summary[a.id] ?? { present: 0, late: 0, excused: 0, absent: 0 };
                    const total = c.present + c.late + c.excused + c.absent;
                    const pct = total > 0 ? Math.round(((c.present + c.late) / total) * 100) : null;
                    return (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{a.full_name}</td>
                        <td className="py-2 px-2 text-center">{c.present}</td>
                        <td className="py-2 px-2 text-center">{c.late}</td>
                        <td className="py-2 px-2 text-center">{c.excused}</td>
                        <td className="py-2 px-2 text-center">{c.absent}</td>
                        <td className="py-2 px-2 text-center">
                          {pct === null ? (
                            "—"
                          ) : (
                            <Badge variant={pct >= 80 ? "default" : "destructive"}>{pct}%</Badge>
                          )}
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
