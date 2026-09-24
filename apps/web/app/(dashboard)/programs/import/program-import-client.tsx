"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, XCircle } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import { ImportSource } from "@/components/features/import/import-source";
import { mapRpcError } from "@/lib/program-rpc";
import { matchesTrainingGroup } from "@athleteiq/validators/athlete";
import {
  parseProgramImport,
  programImportTemplateCsv,
  sessionsEqual,
  type ImportedSession,
  type ImportedWeek,
} from "@athleteiq/validators/program-import";

interface Props {
  orgId: string;
  teams: { id: string; name: string }[];
  athletes: {
    id: string;
    full_name: string;
    team_id: string | null;
    training_group: string | null;
    position: string | null;
  }[];
}

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const PHASES = [
  { value: "preparation", label: "Hazırlık" },
  { value: "competition", label: "Müsabaka" },
  { value: "transition", label: "Geçiş" },
  { value: "peak", label: "Zirve" },
] as const;

const SESSION_TYPE_LABELS: Record<string, string> = {
  strength: "Kuvvet",
  conditioning: "Kondisyon",
  technical: "Teknik",
  recovery: "Toparlanma",
  competition: "Müsabaka",
};

/** YYYY-MM-DD + n gün. UTC üzerinden — yerel saat dilimi gün kaydırmasın. */
function addDays(iso: string, days: number): string {
  const parts = iso.split("-");
  const y = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 1);
  const d = Number(parts[2] ?? 1);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function ProgramImportClient({ orgId, teams, athletes }: Props) {
  const router = useRouter();

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<"team" | "athlete">("team");
  const [teamId, setTeamId] = useState("");
  const [athleteId, setAthleteId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [phase, setPhase] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [trainingGroup, setTrainingGroup] = useState("");
  const [notes, setNotes] = useState("");

  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const result = useMemo(() => parseProgramImport(text), [text]);

  const filteredAthletes = useMemo(
    () => (teamId ? athletes.filter((a) => a.team_id === teamId) : athletes),
    [athletes, teamId]
  );

  // Program builder'daki aynı önizleme: yazılan grup takımda kimi kapsıyor
  // (kural packages/validators/athlete.ts matchesTrainingGroup — RLS'teki
  // public.matches_training_group ile birebir aynı, bkz. CLAUDE.md §4.4).
  const groupMatches = useMemo(() => {
    if (scope !== "team" || !teamId) return null;
    const group = trainingGroup.trim();
    if (!group) return null;
    return athletes.filter(
      (a) => a.team_id === teamId && matchesTrainingGroup(a.training_group, a.position, group)
    );
  }, [athletes, scope, teamId, trainingGroup]);

  const metaErrors: string[] = [];
  if (title.trim() === "") metaErrors.push("Program başlığı gerekli");
  if (startDate === "") metaErrors.push("Başlangıç tarihi gerekli");
  if (scope === "team" && !teamId) metaErrors.push("Takım seçin");
  if (scope === "athlete" && !athleteId) metaErrors.push("Sporcu seçin");

  const hasContent = result.weeks.length > 0 && result.totals.sets > 0;
  const canImport =
    !isImporting && hasContent && result.errorCount === 0 && metaErrors.length === 0;

  async function handleImport() {
    setIsImporting(true);
    setSubmitError(null);
    try {
      const supabase = createClient();
      const weeks = result.weeks;
      const firstWeek = weeks[0];
      if (!firstWeek) throw new Error("İçe aktarılacak hafta bulunamadı.");
      const group = scope === "team" ? trainingGroup.trim() || undefined : undefined;
      const disc = discipline.trim() || undefined;

      // 1) Blok + N hafta tek transaction'da oluşur. RPC p_sessions'ı HER
      // haftaya klonlar, bu yüzden 1. haftanın ağacı gönderilir; içeriği farklı
      // olan haftalar 2. adımda kendi ağacıyla değiştirilir.
      setProgress(`Blok oluşturuluyor (${weeks.length} hafta)…`);
      const { data: created, error } = await supabase.rpc("create_program_with_weeks", {
        p_org_id: orgId,
        p_team_id: (scope === "team" ? teamId : null) as string,
        p_athlete_id: (scope === "athlete" ? athleteId : null) as string,
        p_title: title.trim(),
        p_phase: (phase || null) as string,
        p_notes: (notes.trim() || null) as string,
        p_weeks_count: weeks.length,
        p_block_start_date: startDate,
        p_sessions: firstWeek.sessions,
        p_discipline: disc,
        p_training_group: group,
      });

      if (error) throw new Error(mapRpcError(error.message));

      const typed = created as { block_id: string | null; program_ids: string[] } | null;
      if (!typed || typed.program_ids.length !== weeks.length) {
        throw new Error("Program oluşturuldu ama hafta sayısı beklenenden farklı döndü.");
      }

      // 2) 1. haftadan farklı olan haftaların seans ağacını değiştir.
      // update_program_week tarihleri de yazdığı için create_program_with_weeks'in
      // kullandığı aynı formül (blok başlangıcı + (i-1)*7) tekrarlanır — aksi
      // halde hafta tarihleri kayardı.
      for (let i = 1; i < weeks.length; i++) {
        const week = weeks[i];
        const programId = typed.program_ids[i];
        if (!week || !programId) continue;
        if (sessionsEqual(week.sessions, firstWeek.sessions)) continue;
        setProgress(`${i + 1}. hafta yazılıyor…`);
        const weekStart = addDays(startDate, i * 7);
        const { error: weekError } = await supabase.rpc("update_program_week", {
          p_program_id: programId,
          p_title: title.trim(),
          p_phase: (phase || null) as string,
          p_notes: (notes.trim() || null) as string,
          p_start_date: weekStart,
          p_end_date: addDays(weekStart, 6),
          p_sessions: week.sessions,
          p_discipline: disc,
          p_training_group: group,
        });
        if (weekError) {
          throw new Error(
            `${i + 1}. hafta yazılamadı (${mapRpcError(weekError.message)}). ` +
              "Blok oluşturuldu — programlar listesinden açıp eksik haftayı düzenleyebilirsiniz."
          );
        }
      }

      router.push(`/programs/${typed.program_ids[0]}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Program içe aktarılırken bir hata oluştu."
      );
      setIsImporting(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/programs"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Programlar
        </Link>
        <h1 className="text-2xl font-semibold">Antrenman Programı İçe Aktar</h1>
        <p className="text-sm text-muted-foreground">
          Excel veya CSV&apos;deki haftalık programı tek seferde oluşturun. Program taslak olarak
          (yayınlanmamış) eklenir — sporcular yayınlayana kadar göremez.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Program bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Program başlığı *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: 8 Haftalık Hazırlık Dönemi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start_date">1. haftanın başlangıç tarihi *</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Kapsam</Label>
            <div className="flex gap-3">
              {(["team", "athlete"] as const).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={scope === s ? "default" : "outline"}
                  onClick={() => setScope(s)}
                >
                  {s === "team" ? "Takım" : "Bireysel sporcu"}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="team">Takım {scope === "team" ? "*" : "(filtre)"}</Label>
              <select
                id="team"
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setAthleteId("");
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Takım seçin</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {scope === "athlete" && (
              <div className="space-y-1.5">
                <Label htmlFor="athlete">Sporcu *</Label>
                <select
                  id="athlete"
                  value={athleteId}
                  onChange={(e) => setAthleteId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sporcu seçin</option>
                  {filteredAthletes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="phase">Faz</Label>
              <select
                id="phase"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Seçilmedi</option>
                {PHASES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discipline">Branş</Label>
              <Input
                id="discipline"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                placeholder="Örn: Kuvvet & Kondisyon"
              />
            </div>
          </div>

          {scope === "team" && (
            <div className="space-y-1.5">
              <Label htmlFor="training_group">Antrenman grubu (opsiyonel)</Label>
              <Input
                id="training_group"
                value={trainingGroup}
                onChange={(e) => setTrainingGroup(e.target.value)}
                placeholder="Örn: Hücum Hattı"
              />
              {groupMatches && (
                <p className="text-xs text-muted-foreground">
                  {groupMatches.length === 0
                    ? "Bu grupla eşleşen sporcu yok — programı kimse göremez."
                    : `${groupMatches.length} sporcu görecek: ${groupMatches
                        .map((a) => a.full_name)
                        .join(", ")}`}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notlar</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Program dosyasını yükleyin</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportSource
            templateCsv={programImportTemplateCsv()}
            templateFileName="athleteiq-program-sablonu.csv"
            value={text}
            onChange={setText}
            hint={
              <>
                <strong>Her satır bir settir.</strong> Zorunlu sütunlar: <strong>Gün</strong> (1-7
                veya Pzt/Sal/…) ve <strong>Egzersiz</strong>; ayrıca her satırda{" "}
                <strong>Tekrar</strong> veya <strong>Süre (sn)</strong> dolu olmalı. Opsiyonel:
                Hafta, Seans, Seans Tipi, Set, Yük, Yük Tipi (kg / %1RM / Vücut Ağırlığı / Bant),
                RPE, Dinlenme (sn), Süperset, Not. Aynı egzersizin ardışık satırları o egzersizin
                setleri olarak gruplanır. CrossFit/WOD formatındaki seanslar bu dosyayla
                aktarılamaz — onları program oluşturma ekranından girin.
              </>
            }
          />
        </CardContent>
      </Card>

      {text.trim() !== "" && (
        <Card>
          <CardHeader>
            <CardTitle>3. Önizleme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.fatalError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {result.fatalError}
              </p>
            )}

            {result.missingColumns.length > 0 && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Dosyada bulunamayan zorunlu sütun: {result.missingColumns.join(", ")}. Örnek
                şablonu indirip sütun adlarını karşılaştırın.
              </p>
            )}

            {result.unknownColumns.length > 0 && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Tanınmayan sütunlar yok sayılacak: {result.unknownColumns.join(", ")}
              </p>
            )}

            {(result.weeks.length > 0 || result.errorCount > 0) && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{result.totals.weeks} hafta</Badge>
                <Badge variant="secondary">{result.totals.sessions} seans</Badge>
                <Badge variant="secondary">{result.totals.exercises} egzersiz</Badge>
                <Badge variant="secondary">{result.totals.sets} set</Badge>
                {result.errorCount > 0 && (
                  <Badge variant="destructive">{result.errorCount} hatalı satır</Badge>
                )}
              </div>
            )}

            {result.warnings.map((w) => (
              <p
                key={w}
                className="flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-500"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {w}
              </p>
            ))}

            {result.errorCount > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="mb-2 text-sm font-medium text-destructive">
                  Hatalı satırlar düzeltilmeden içe aktarma yapılamaz:
                </p>
                <ul className="space-y-1 text-sm">
                  {result.rowIssues
                    .filter((i) => i.errors.length > 0)
                    .map((issue) => (
                      <li key={issue.line} className="flex gap-2">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <span>
                          <strong>Satır {issue.line}:</strong> {issue.errors.join(" · ")}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {result.rowIssues.some((i) => i.errors.length === 0 && i.warnings.length > 0) && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                <p className="mb-2 font-medium">Uyarılar (içe aktarmayı engellemez):</p>
                <ul className="space-y-1">
                  {result.rowIssues
                    .filter((i) => i.errors.length === 0 && i.warnings.length > 0)
                    .map((issue) => (
                      <li key={issue.line}>
                        <strong>Satır {issue.line}:</strong> {issue.warnings.join(" · ")}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {result.weeks.map((week) => (
              <WeekPreview key={week.week} week={week} />
            ))}
          </CardContent>
        </Card>
      )}

      {metaErrors.length > 0 && hasContent && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          İçe aktarmadan önce: {metaErrors.join(", ")}.
        </p>
      )}

      {submitError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex items-center gap-4">
        <Button onClick={handleImport} disabled={!canImport}>
          {isImporting ? (progress ?? "Aktarılıyor…") : "Programı oluştur"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/programs">İptal</Link>
        </Button>
      </div>
    </div>
  );
}

function WeekPreview({ week }: { week: ImportedWeek }) {
  return (
    <details className="rounded-md border" open={week.week === 1}>
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
        {week.week}. Hafta
        {week.source_week !== week.week && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (dosyada: {week.source_week}. hafta)
          </span>
        )}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {week.sessions.length} seans
        </span>
      </summary>
      <div className="space-y-3 border-t px-3 py-3">
        {week.sessions.map((session) => (
          <SessionPreview key={`${session.day_of_week}-${session.order_index}`} session={session} />
        ))}
      </div>
    </details>
  );
}

function SessionPreview({ session }: { session: ImportedSession }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary">{DAY_LABELS[session.day_of_week - 1]}</Badge>
        <span className="font-medium">{session.title ?? "Antrenman"}</span>
        {session.session_type && (
          <span className="text-xs text-muted-foreground">
            {SESSION_TYPE_LABELS[session.session_type] ?? session.session_type}
          </span>
        )}
        {session.duration_min != null && (
          <span className="text-xs text-muted-foreground">{session.duration_min} dk</span>
        )}
      </div>
      <ul className="space-y-1 text-sm">
        {session.exercises.map((ex) => (
          <li key={ex.order_index} className="flex flex-wrap gap-x-2">
            <span className="font-medium">{ex.name}</span>
            {ex.superset_group && (
              <span className="text-xs text-muted-foreground">süperset {ex.superset_group}</span>
            )}
            <span className="text-muted-foreground">
              {ex.sets.map((s) => formatSet(s)).join(" · ")}
            </span>
            {ex.rest_sec != null && (
              <span className="text-xs text-muted-foreground">dinlenme {ex.rest_sec}sn</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatSet(set: ImportedSession["exercises"][number]["sets"][number]): string {
  const parts: string[] = [];
  if (set.reps != null) parts.push(`${set.reps} tekrar`);
  else if (set.duration_sec != null) parts.push(`${set.duration_sec} sn`);

  if (set.percent_1rm != null) parts.push(`%${set.percent_1rm}`);
  else if (set.load_kg != null) parts.push(`${set.load_kg} kg`);
  else if (set.is_bodyweight) parts.push("vücut ağırlığı");
  else if (set.band_resistance) parts.push(`bant: ${set.band_resistance}`);

  if (set.rpe != null) parts.push(`RPE ${set.rpe}`);
  return parts.join(" @ ");
}
