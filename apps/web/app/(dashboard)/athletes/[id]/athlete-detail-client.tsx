"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, Trophy, TrendingUp } from "lucide-react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Button } from "@athleteiq/ui/components/button";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EditAthleteModal } from "@/components/features/athletes/edit-athlete-modal";
import { AthleteStatusDialog } from "@/components/features/athletes/athlete-status-dialog";
import type { Tables } from "@athleteiq/db/types";
import type {
  Athlete1RMRecord,
  PlatformExercise,
  OrgExercise,
  OrgExerciseCategory,
} from "@athleteiq/db/queries/exercises";
import type { getAthleteCompetitionEntries } from "@athleteiq/db/queries/competitions";
import { OneRmRecordsTab } from "./one-rm-records-tab";
import {
  competitionLastDate,
  isCompetitionStage,
  stagesForEntry,
} from "@athleteiq/validators/competition";
import { StageBadge } from "@/components/features/competitions/stage-badge";

type Athlete = Tables<"athletes">;
type CompetitionEntry = Awaited<ReturnType<typeof getAthleteCompetitionEntries>>[number];

interface RecentProgram {
  id: string;
  title: string;
  phase: string | null;
  start_date: string | null;
  end_date: string | null;
  is_published: boolean | null;
  week_number: number | null;
}

interface TestResult {
  id: string;
  test_type: string;
  value: number | null;
  unit: string | null;
  test_date: string;
  notes: string | null;
}

interface AcwrLog {
  log_date: string;
  session_load: number | null;
  acwr_ratio: number | null;
  acute_load: number | null;
  chronic_load: number | null;
}

interface Props {
  athlete: Athlete;
  recentPrograms: RecentProgram[];
  recentTests: TestResult[];
  acwrLogs: AcwrLog[];
  maxHistory: Athlete1RMRecord[];
  platformExercises: PlatformExercise[];
  orgExercises: OrgExercise[];
  categories: OrgExerciseCategory[];
  competitionEntries: CompetitionEntry[];
  teams: { id: string; name: string; discipline: string | null }[];
}

const GENDER_LABELS: Record<string, string> = {
  male: "Erkek",
  female: "Kadın",
  other: "Diğer",
};

const PHASE_LABELS: Record<string, string> = {
  preparation: "Hazırlık",
  competition: "Müsabaka",
  transition: "Geçiş",
  peak: "Zirve",
};

function acwrColor(ratio: number | null): string {
  if (!ratio) return "text-muted-foreground";
  if (ratio < 0.8) return "text-primary";
  if (ratio <= 1.3) return "text-good";
  if (ratio <= 1.5) return "text-warning";
  return "text-critical";
}

export function AthleteDetailClient({
  athlete,
  recentPrograms,
  recentTests,
  acwrLogs,
  maxHistory,
  platformExercises,
  orgExercises,
  categories,
  competitionEntries,
  teams,
}: Props) {
  const router = useRouter();
  const [statusOpen, setStatusOpen] = useState(false);
  // Branş sporcuda tutulmaz, takımdan türetilir (teams.discipline tek kaynak, 044).
  const team = teams.find((t) => t.id === athlete.team_id) ?? null;
  const latestAcwr = acwrLogs[0];
  const chartData = [...acwrLogs].reverse().map((log) => ({
    date: new Date(log.log_date).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }),
    acwr: log.acwr_ratio != null ? Number(log.acwr_ratio.toFixed(2)) : null,
  }));
  const initials = athlete.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/athletes">
            <ArrowLeft className="h-4 w-4" />
            Sporcular
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <EditAthleteModal athlete={athlete} teams={teams} onSuccess={() => router.refresh()} />
          <Button variant="outline" size="sm" onClick={() => setStatusOpen(true)}>
            {athlete.is_active ? "Pasife Al / Sil" : "Tekrar Aktif Et"}
          </Button>
        </div>
      </div>

      {statusOpen && (
        <AthleteStatusDialog
          athlete={athlete}
          onSuccess={() => {
            setStatusOpen(false);
            router.refresh();
          }}
          onCancel={() => setStatusOpen(false)}
        />
      )}

      {/* Sporcu kartı */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap sm:gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary sm:h-20 sm:w-20 sm:text-2xl">
              {initials}
            </div>
            <div className="min-w-0 flex-1 basis-48">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="break-words text-xl font-bold sm:text-2xl">{athlete.full_name}</h1>
                <Badge variant={athlete.is_active ? "default" : "secondary"}>
                  {athlete.is_active ? "Aktif" : "Pasif"}
                </Badge>
              </div>
              {/* Branş takımdan türetilir (teams.discipline), mevki sporcuda (044). */}
              <p className="text-muted-foreground mt-1">
                {[team?.discipline, athlete.position].filter(Boolean).join(" · ") || "—"}
                {athlete.training_group && (
                  <Badge variant="secondary" className="ml-2 align-middle">
                    {athlete.training_group}
                  </Badge>
                )}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:gap-x-8 md:grid-cols-4">
                {athlete.birth_date && (
                  <div>
                    <span className="text-muted-foreground">Doğum: </span>
                    {new Date(athlete.birth_date).toLocaleDateString("tr-TR")}
                  </div>
                )}
                {athlete.gender && (
                  <div>
                    <span className="text-muted-foreground">Cinsiyet: </span>
                    {GENDER_LABELS[athlete.gender] ?? athlete.gender}
                  </div>
                )}
                {athlete.height_cm && (
                  <div>
                    <span className="text-muted-foreground">Boy: </span>
                    {athlete.height_cm} cm
                  </div>
                )}
                {athlete.weight_kg && (
                  <div>
                    <span className="text-muted-foreground">Kilo: </span>
                    {athlete.weight_kg} kg
                  </div>
                )}
              </div>
            </div>
            {latestAcwr?.acwr_ratio !== undefined && (
              <div className="w-full rounded-lg bg-muted/50 px-3 py-2 sm:w-auto sm:bg-transparent sm:p-0 sm:text-right">
                <p className="text-xs text-muted-foreground">ACWR</p>
                <p className={`text-3xl font-bold ${acwrColor(latestAcwr.acwr_ratio)}`}>
                  {latestAcwr.acwr_ratio?.toFixed(2) ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {latestAcwr.log_date
                    ? new Date(latestAcwr.log_date).toLocaleDateString("tr-TR")
                    : ""}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="one-rm">1RM Kayıtları</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Programlar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Son Programlar</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/programs/new?athlete_id=${athlete.id}`}>Program Oluştur</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentPrograms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Henüz program yok.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentPrograms.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/programs/${p.id}`}
                      className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.phase ? PHASE_LABELS[p.phase] ?? p.phase : ""}
                          {p.week_number ? ` — Hafta ${p.week_number}` : ""}
                        </p>
                      </div>
                      {p.is_published ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Test sonuçları */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Son Testler</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/tests">Tüm Testler</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Henüz test sonucu yok.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentTests.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-md px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{t.test_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.test_date).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {t.value ?? "—"} {t.unit ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Yarışmalar — competitions/competitions-client.tsx'teki roster picker'ın
          sonucu, sporcu bazında görünüm */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" />
            Yarışmalar
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/competitions">Yarışma Takvimi</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {competitionEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Bu sporcu henüz hiçbir yarışmaya kayıtlı değil.
            </p>
          ) : (
            <ul className="space-y-2">
              {competitionEntries.map((entry) => {
                const comp = entry.competitions;
                if (!comp) return null;
                const defined = (comp.competition_stages ?? []).filter((st) =>
                  isCompetitionStage(st.stage)
                );
                const stages = stagesForEntry(
                  entry.stages,
                  defined.map((st) => st.stage).filter(isCompetitionStage)
                );
                // Final yarışma gününden sonra olabilir — son gün geçene kadar yaklaşan
                const lastDay = competitionLastDate(
                  comp.competition_date,
                  defined.map((st) => st.stage_date)
                );
                const upcoming = lastDay
                  ? new Date(lastDay) >= new Date(new Date().toDateString())
                  : false;
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{comp.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {comp.competition_date
                          ? new Date(comp.competition_date).toLocaleDateString("tr-TR")
                          : ""}
                        {comp.location ? ` · ${comp.location}` : ""}
                      </p>
                      {stages.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {stages.map((stage) => {
                            const date =
                              defined.find((st) => st.stage === stage)?.stage_date ?? null;
                            return (
                              <StageBadge
                                key={stage}
                                stage={stage}
                                date={date && date !== comp.competition_date ? date : null}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {upcoming && (
                      <Badge variant="default" className="text-xs">
                        Yaklaşan
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ACWR tablo */}
      {acwrLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              ACWR Geçmişi (Son 30 Gün)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReferenceLine y={0.8} stroke="var(--color-primary)" strokeDasharray="3 3" />
                <ReferenceLine y={1.3} stroke="var(--color-warning)" strokeDasharray="3 3" />
                <ReferenceLine y={1.5} stroke="var(--color-critical)" strokeDasharray="3 3" />
                <Tooltip formatter={(value: number) => [value, "ACWR"]} />
                <Line
                  type="monotone"
                  dataKey="acwr"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tarih</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Seans Yükü</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Akut (7g)</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Kronik (28g)</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">ACWR</th>
                  </tr>
                </thead>
                <tbody>
                  {acwrLogs.map((log) => (
                    <tr key={log.log_date} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {new Date(log.log_date).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-3 py-2 text-right">{log.session_load ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{log.acute_load?.toFixed(0) ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{log.chronic_load?.toFixed(0) ?? "—"}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${acwrColor(log.acwr_ratio)}`}>
                        {log.acwr_ratio?.toFixed(2) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {athlete.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notlar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{athlete.notes}</p>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="one-rm">
          <OneRmRecordsTab
            athleteId={athlete.id}
            history={maxHistory}
            platformExercises={platformExercises}
            orgExercises={orgExercises}
            categories={categories}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
