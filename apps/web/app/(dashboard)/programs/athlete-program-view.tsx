"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, MessageSquare } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { buildMaxHistoryLookup, type Athlete1RMRecord } from "@athleteiq/db/queries/exercises";
import { isDateActive, sortAthletePrograms } from "@athleteiq/db/queries/programs";
import type { Tables } from "@athleteiq/db/types";
import { formatSetLoad, formatSetReps, SESSION_TYPE_LABELS, DAY_LABELS } from "@/lib/exercise-format";
import { getTodayDayOfWeek, toLocalDateString } from "@/lib/date";

type Program = Tables<"training_programs"> & {
  training_sessions: (Tables<"training_sessions"> & {
    exercises: (Tables<"exercises"> & {
      exercise_sets?: Tables<"exercise_sets">[];
    })[];
  })[];
};

const DOW_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const SESSION_TYPE_COLORS: Record<string, string> = {
  strength: "bg-blue-500",
  conditioning: "bg-orange-500",
  technical: "bg-rose-500",
  recovery: "bg-green-500",
  competition: "bg-purple-500",
};

interface Props {
  programs: Program[];
  maxHistory: Athlete1RMRecord[];
}

function dayDate(startDate: string | null, dayOfWeek: number): Date | null {
  if (!startDate) return null;
  // start_date programın Pazartesi'si kabul edilir (haftalık program modeli).
  const d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + (dayOfWeek - 1));
  return d;
}

export function AthleteProgramView({ programs, maxHistory }: Props) {
  const maxHistoryLookup = useMemo(() => buildMaxHistoryLookup(maxHistory), [maxHistory]);
  const todayIso = toLocalDateString(new Date());
  const todayDow = getTodayDayOfWeek();

  const sorted = useMemo(() => sortAthletePrograms(programs) as Program[], [programs]);

  const initialProgram = useMemo(() => {
    const dateActive = sorted.find((p) => isDateActive(p, todayIso));
    return dateActive ?? sorted[0] ?? null;
  }, [sorted, todayIso]);

  const blockSiblings = useMemo(() => {
    if (!initialProgram?.block_id) return initialProgram ? [initialProgram] : [];
    return programs
      .filter((p) => p.block_id === initialProgram.block_id)
      .sort((a, b) => (a.week_index_in_block ?? 0) - (b.week_index_in_block ?? 0));
  }, [programs, initialProgram]);

  const otherPrograms = useMemo(
    () => programs.filter((p) => !blockSiblings.some((s) => s.id === p.id)),
    [programs, blockSiblings]
  );

  const [weekIndex, setWeekIndex] = useState(() =>
    Math.max(0, blockSiblings.findIndex((p) => p.id === initialProgram?.id))
  );
  const [selectedDay, setSelectedDay] = useState(todayDow);

  const currentProgram = blockSiblings[weekIndex] ?? initialProgram;

  if (!currentProgram) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Programlar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Henüz size atanmış yayınlanmış bir program yok.
          </p>
        </div>
      </div>
    );
  }

  const daySessions = currentProgram.training_sessions
    .filter((s) => s.day_of_week === selectedDay)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Programlar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentProgram.title}
            {blockSiblings.length > 1 &&
              ` — Hafta ${(currentProgram.week_index_in_block ?? weekIndex) + 1}/${blockSiblings.length}`}
          </p>
        </div>
        {blockSiblings.length > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={weekIndex === 0}
              onClick={() => setWeekIndex((w) => Math.max(0, w - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-28 text-center">
              Hafta {weekIndex + 1}/{blockSiblings.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={weekIndex === blockSiblings.length - 1}
              onClick={() => setWeekIndex((w) => Math.min(blockSiblings.length - 1, w + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] items-start">
        <div className="space-y-6">
          {/* Gün şeridi */}
          <Card>
            <CardContent className="grid grid-cols-7 gap-2 pt-5">
              {Array.from({ length: 7 }, (_, i) => i + 1).map((dow) => {
                const sessions = currentProgram.training_sessions.filter(
                  (s) => s.day_of_week === dow
                );
                const dominant = sessions[0]?.session_type ?? null;
                const date = dayDate(currentProgram.start_date, dow);
                const isSelected = dow === selectedDay;
                const isToday = currentProgram.start_date
                  ? date && toLocalDateString(date) === todayIso
                  : dow === todayDow;
                return (
                  <button
                    key={dow}
                    onClick={() => setSelectedDay(dow)}
                    className={`rounded-lg border p-2 text-center transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : isToday
                          ? "border-primary/40"
                          : "border-border hover:bg-accent"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                      {DOW_SHORT[dow - 1]}
                    </p>
                    {date && <p className="text-sm font-bold mt-0.5">{date.getDate()}</p>}
                    <span
                      className={`mx-auto mt-1.5 block h-1.5 w-1.5 rounded-full ${
                        dominant ? SESSION_TYPE_COLORS[dominant] ?? "bg-muted-foreground" : "bg-border"
                      }`}
                    />
                    <p className="mt-1 text-[9px] text-muted-foreground leading-tight">
                      {sessions.length > 0
                        ? SESSION_TYPE_LABELS[dominant ?? ""] ?? "Antrenman"
                        : "Dinlenme"}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Seçili gün */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{DAY_LABELS[selectedDay - 1]}</CardTitle>
            </CardHeader>
            <CardContent>
              {daySessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Bu gün için planlanmış antrenman yok — dinlenme günü.
                </p>
              ) : (
                <div className="space-y-5">
                  {daySessions.map((session) => (
                    <div key={session.id}>
                      <div className="flex items-center gap-2 mb-3">
                        {session.session_type && (
                          <Badge>{SESSION_TYPE_LABELS[session.session_type] ?? session.session_type}</Badge>
                        )}
                        <span className="text-sm font-semibold">{session.title || "Seans"}</span>
                        {session.duration_min && (
                          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {session.duration_min} dk
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {session.exercises
                          .slice()
                          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                          .map((ex, i) => {
                            const sets = (ex.exercise_sets ?? []).slice().sort((a, b) => a.set_number - b.set_number);
                            const firstSet = sets[0];
                            return (
                              <div key={ex.id} className="flex items-center gap-3 py-1.5 border-b last:border-0 text-sm">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                                  {i + 1}
                                </span>
                                <span className="font-medium">{ex.name}</span>
                                {firstSet && (
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {sets.length} set · {formatSetReps(firstSet)} ·{" "}
                                    {formatSetLoad(
                                      firstSet,
                                      ex.name,
                                      maxHistoryLookup,
                                      currentProgram.start_date
                                    )}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {blockSiblings.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Program Bloğu</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{currentProgram.title}</p>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${((weekIndex + 1) / blockSiblings.length) * 100}%` }}
                  />
                </div>
                <div className="mt-3 space-y-1.5">
                  {blockSiblings.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setWeekIndex(i)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                        i === weekIndex ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <span>Hafta {i + 1}</span>
                      {i < weekIndex && <Badge variant="secondary" className="text-[10px]">Tamamlandı</Badge>}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {currentProgram.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Koç Notu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{currentProgram.notes}</p>
              </CardContent>
            </Card>
          )}

          {otherPrograms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Diğer Programların</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {otherPrograms.map((p) => (
                  <Link
                    key={p.id}
                    href={`/programs/${p.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <span className="font-medium">{p.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.training_sessions.length} seans
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
