"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Tables } from "@athleteiq/db/types";
import type {
  Athlete1RMRecord,
  PlatformExercise,
  OrgExercise,
  OrgExerciseCategory,
} from "@athleteiq/db/queries/exercises";
import { OneRmRecordsTab } from "./one-rm-records-tab";

type Athlete = Tables<"athletes">;

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
  if (ratio < 0.8) return "text-blue-600";
  if (ratio <= 1.3) return "text-green-600";
  if (ratio <= 1.5) return "text-yellow-600";
  return "text-red-600";
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
}: Props) {
  const latestAcwr = acwrLogs[0];
  const initials = athlete.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/athletes">
            <ArrowLeft className="h-4 w-4" />
            Sporcular
          </Link>
        </Button>
      </div>

      {/* Sporcu kartı */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
              {initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{athlete.full_name}</h1>
                <Badge variant={athlete.is_active ? "default" : "secondary"}>
                  {athlete.is_active ? "Aktif" : "Pasif"}
                </Badge>
              </div>
              {athlete.position && (
                <p className="text-muted-foreground mt-1">{athlete.position}</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm md:grid-cols-4">
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
              <div className="text-right">
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

      {/* ACWR tablo */}
      {acwrLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ACWR Geçmişi (Son 30 Gün)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
