"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Users,
  User,
  Send,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Badge } from "@athleteiq/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@athleteiq/ui/components/card";
import { createClient } from "@/lib/supabase/client";
import { useUserContext } from "@/lib/hooks/useUserContext";
import { toast } from "@/components/ui/use-toast";
import { AthleteDataWarningDialog } from "@/components/features/program-builder/athlete-data-warning-dialog";
import {
  publishProgram,
  setBlockPublished,
  getProgramsByBlockId,
  setProgramsArchived,
  deletePrograms,
  deleteProgramBlock,
} from "@athleteiq/db/queries/programs";
import type { Tables } from "@athleteiq/db/types";
import {
  resolveOneRepMaxKgForDate,
  type Athlete1RMRecord,
} from "@athleteiq/db/queries/exercises";
import {
  buildMaxHistoryLookup,
  calculateProgramTonnage,
  calculateSessionTonnage,
  summarizeUnresolved,
  type TonnageContext,
  type TonnageSummary,
} from "@/lib/tonnage";

type Program = Tables<"training_programs"> & {
  training_sessions: (Tables<"training_sessions"> & {
    exercises: (Tables<"exercises"> & {
      exercise_sets: Tables<"exercise_sets">[];
    })[];
  })[];
};

const BAND_LABELS: Record<string, string> = {
  soft: "Yumuşak",
  medium: "Orta",
  hard: "Sert",
};

function formatSetReps(set: Tables<"exercise_sets">): string {
  if (set.duration_sec != null) return `${set.duration_sec} sn`;
  if (set.reps != null) return `${set.reps} tekrar`;
  return "—";
}

function formatSetLoad(
  set: Tables<"exercise_sets">,
  exerciseName: string,
  maxHistoryLookup: Map<string, Athlete1RMRecord[]>,
  programStartDate: string | null
): string {
  if (set.band_resistance)
    return `${BAND_LABELS[set.band_resistance] ?? set.band_resistance} bant`;
  if (set.is_bodyweight) return "Vücut ağırlığı";
  if (set.percent_1rm != null) {
    const resolvedKg = resolveOneRepMaxKgForDate(
      exerciseName,
      set.percent_1rm,
      maxHistoryLookup,
      programStartDate
    );
    return resolvedKg != null
      ? `%${set.percent_1rm} 1RM (${resolvedKg.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} kg)`
      : `%${set.percent_1rm} 1RM`;
  }
  if (set.load_kg != null) return `${set.load_kg} kg`;
  return "—";
}

function formatTonnage(kg: number): string {
  return `${kg.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} kg`;
}

function TonnageBreakdown({ tonnage }: { tonnage: TonnageSummary }) {
  if (tonnage.unresolved.length === 0) return null;
  const groups = summarizeUnresolved(tonnage.unresolved);
  return (
    <div className="mt-1 space-y-0.5">
      <p className="text-xs text-amber-600">
        {tonnage.totalSetCount} setten {tonnage.unresolved.length}&apos;i
        hesaplanamadı:
      </p>
      {groups.map((g) => (
        <p key={g.reason} className="text-xs text-amber-600 pl-3">
          • {g.label} — {g.exerciseNames.join(", ")} ({g.count} set)
        </p>
      ))}
    </div>
  );
}

interface Props {
  program: Program;
  athlete: { id: string; full_name: string; weight_kg: number | null } | null;
  team: { id: string; name: string } | null;
  athleteMaxHistory: Athlete1RMRecord[];
}

const DAY_LABELS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

const SESSION_TYPE_LABELS: Record<string, string> = {
  strength: "Kuvvet",
  conditioning: "Kondisyon",
  technical: "Teknik",
  recovery: "Toparlanma",
  competition: "Müsabaka",
};

const PHASE_LABELS: Record<string, string> = {
  preparation: "Hazırlık",
  competition: "Müsabaka",
  transition: "Geçiş",
  peak: "Zirve",
};

export function ProgramDetailClient({
  program,
  athlete,
  team,
  athleteMaxHistory,
}: Props) {
  const router = useRouter();
  const { role } = useUserContext();
  const isAthlete = role === "athlete";
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(program.is_published ?? false);
  const [blockPublishInfo, setBlockPublishInfo] = useState<{
    publishedCount: number;
    totalCount: number;
  } | null>(null);
  const [isBlockPublishing, setIsBlockPublishing] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{
    willDelete: boolean;
    description: string;
    affectedWeeks?: string[];
    targetIds: string[];
    blockId: string | null;
  } | null>(null);
  const [isDeleteBusy, setIsDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const maxHistoryLookup = useMemo(
    () => buildMaxHistoryLookup(athleteMaxHistory),
    [athleteMaxHistory]
  );
  const tonnageContext: TonnageContext = useMemo(
    () => ({
      maxHistoryLookup,
      athleteWeightKg: athlete?.weight_kg ?? null,
      hasAthleteContext: !!program.athlete_id,
      programStartDate: program.start_date,
    }),
    [
      maxHistoryLookup,
      athlete?.weight_kg,
      program.athlete_id,
      program.start_date,
    ]
  );
  const programTonnage = useMemo(
    () => calculateProgramTonnage(program.training_sessions, tonnageContext),
    [program.training_sessions, tonnageContext]
  );

  async function refreshBlockPublishInfo(blockId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("training_programs")
      .select("id, is_published")
      .eq("block_id", blockId);
    if (error) {
      console.error("Blok yayın durumu sorgusu hatası:", error);
      return;
    }
    const rows = data ?? [];
    setBlockPublishInfo({
      publishedCount: rows.filter((r) => r.is_published).length,
      totalCount: rows.length,
    });
  }

  useEffect(() => {
    if (!program.block_id) return;
    refreshBlockPublishInfo(program.block_id);
  }, [program.block_id]);

  async function handlePublish() {
    setIsPublishing(true);
    try {
      const supabase = createClient();
      await publishProgram(supabase, program.id);
      setIsPublished(true);
      if (program.block_id) await refreshBlockPublishInfo(program.block_id);
    } finally {
      setIsPublishing(false);
    }
  }

  // "Tüm bloğu yayınla" — tek tek hafta yayınlamadan (handlePublish) AYRI bir
  // aksiyon, mevcut davranışı bozmaz. training_programs üzerinde doğrudan
  // update yeterli — programs_write RLS politikası zaten ALL (bkz. PROGRESS.md
  // Parti 10). Blok oluşturulurken otomatik yayınlama yapılmıyor (RPC her
  // zaman is_published=false ile başlatıyor); bu buton yalnızca koçun
  // bilinçli tetiklediği toplu aksiyon.
  async function handleBlockPublishToggle() {
    if (!program.block_id || !blockPublishInfo) return;
    const allPublished =
      blockPublishInfo.publishedCount === blockPublishInfo.totalCount;
    const nextState = !allPublished;
    setIsBlockPublishing(true);
    try {
      const supabase = createClient();
      await setBlockPublished(supabase, program.block_id, nextState);
      setIsPublished(nextState);
      await refreshBlockPublishInfo(program.block_id);
    } finally {
      setIsBlockPublishing(false);
    }
  }

  // "Sil" — block_id doluysa TÜM blok kapsamında çalışır, tek haftaya değil
  // (tek haftayı silmek bloğun hafta numaralandırmasını bozar). Yayınlanmamış
  // hedefler kalıcı silinir, yayında olan tek bir hafta bile varsa tüm hedef
  // arşivlenir (karma blok durumunda kısmi işlem yapılmaz).
  async function handleDeleteClick() {
    const supabase = createClient();
    let targets: Program[] = [program];
    if (program.block_id) {
      targets = (await getProgramsByBlockId(
        supabase,
        program.block_id
      )) as Program[];
    }

    const willDelete = targets.every((p) => !p.is_published);
    const sessionCount = targets.reduce(
      (sum, p) => sum + p.training_sessions.length,
      0
    );
    const exerciseCount = targets.reduce(
      (sum, p) =>
        sum +
        p.training_sessions.reduce((s, sess) => s + sess.exercises.length, 0),
      0
    );
    const setCount = targets.reduce(
      (sum, p) =>
        sum +
        p.training_sessions.reduce(
          (s, sess) =>
            s +
            sess.exercises.reduce(
              (e, ex) => e + (ex.exercise_sets?.length ?? 0),
              0
            ),
          0
        ),
      0
    );

    const blockPrefix =
      targets.length > 1
        ? `Bu işlem ${targets.length} haftalık bloğun tamamını kapsar. `
        : "";
    const description = willDelete
      ? `${blockPrefix}${sessionCount} seans, ${exerciseCount} egzersiz, ${setCount} set kalıcı olarak silinecek. Bu işlem geri alınamaz.`
      : `${blockPrefix}Program arşivlenecek. Sporcular artık göremeyecek, veriler korunacak.`;
    const affectedWeeks =
      targets.length > 1
        ? targets
            .slice()
            .sort(
              (a, b) =>
                (a.week_index_in_block ?? 0) - (b.week_index_in_block ?? 0)
            )
            .map((p) => `Hafta ${p.week_index_in_block ?? "?"}`)
        : undefined;

    setDeleteError(null);
    setDeleteDialog({
      willDelete,
      description,
      affectedWeeks,
      targetIds: targets.map((p) => p.id),
      blockId: program.block_id,
    });
  }

  async function handleConfirmDelete() {
    if (!deleteDialog) return;
    setIsDeleteBusy(true);
    setDeleteError(null);
    try {
      const supabase = createClient();
      if (deleteDialog.willDelete) {
        await deletePrograms(supabase, deleteDialog.targetIds);
        if (deleteDialog.blockId)
          await deleteProgramBlock(supabase, deleteDialog.blockId);
        toast({ title: "Program silindi" });
      } else {
        await setProgramsArchived(supabase, deleteDialog.targetIds, true);
        toast({ title: "Program arşivlendi" });
      }
      router.push("/programs");
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "İşlem sırasında hata oluştu."
      );
    } finally {
      setIsDeleteBusy(false);
    }
  }

  const sessionsByDay = Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    label: DAY_LABELS[i]!,
    sessions: program.training_sessions
      .filter((s) => s.day_of_week === i + 1)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
  })).filter((d) => d.sessions.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/programs")}
        >
          <ArrowLeft className="h-4 w-4" />
          Programlar
        </Button>
        {!isAthlete && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/programs/${program.id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
              Düzenle
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeleteClick}>
              <Trash2 className="h-4 w-4" />
              Sil
            </Button>
          </div>
        )}
      </div>

      {deleteDialog && (
        <AthleteDataWarningDialog
          title={deleteDialog.willDelete ? "Programı Sil" : "Programı Arşivle"}
          description={deleteDialog.description}
          affectedWeeks={deleteDialog.affectedWeeks}
          confirmLabel={deleteDialog.willDelete ? "Sil" : "Arşivle"}
          isBusy={isDeleteBusy}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            if (isDeleteBusy) return;
            setDeleteDialog(null);
            setDeleteError(null);
          }}
        />
      )}

      {/* Başlık kartı */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{program.title}</h1>
                <Badge variant={isPublished ? "default" : "secondary"}>
                  {isPublished ? "Yayında" : "Taslak"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  {team ? (
                    <>
                      <Users className="h-3.5 w-3.5" />
                      <Link
                        href="#"
                        className="hover:text-foreground transition-colors"
                      >
                        {team.name}
                      </Link>
                    </>
                  ) : athlete ? (
                    <>
                      <User className="h-3.5 w-3.5" />
                      <Link
                        href={`/athletes/${athlete.id}`}
                        className="hover:text-foreground transition-colors"
                      >
                        {athlete.full_name}
                      </Link>
                    </>
                  ) : null}
                </div>
                {program.phase && (
                  <span>{PHASE_LABELS[program.phase] ?? program.phase}</span>
                )}
                {program.week_number && (
                  <span>Hafta {program.week_number}</span>
                )}
                {program.start_date && (
                  <span>
                    {new Date(program.start_date).toLocaleDateString("tr-TR")}
                    {program.end_date &&
                      ` — ${new Date(program.end_date).toLocaleDateString("tr-TR")}`}
                  </span>
                )}
                <span>{program.training_sessions.length} seans</span>
                <span className="font-medium text-foreground">
                  {programTonnage.totalSetCount > 0 &&
                  programTonnage.resolvedSetCount === 0
                    ? "Tonaj hesaplanamıyor"
                    : `Toplam Tonaj: ${formatTonnage(programTonnage.totalKg)}`}
                </span>
              </div>

              <TonnageBreakdown tonnage={programTonnage} />

              {program.notes && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {program.notes}
                </p>
              )}
            </div>

            {!isPublished && !isAthlete && (
              <Button
                onClick={handlePublish}
                disabled={isPublishing}
                className="shrink-0"
              >
                {isPublishing ? (
                  <>Yayınlanıyor...</>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Yayınla
                  </>
                )}
              </Button>
            )}

            {isPublished && (
              <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Yayında
              </div>
            )}
          </div>

          {program.block_id && !isAthlete && blockPublishInfo && (
            <div className="mt-4 flex items-center justify-between gap-4 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Blok: {blockPublishInfo.publishedCount}/
                {blockPublishInfo.totalCount} hafta yayında
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBlockPublishToggle}
                disabled={isBlockPublishing}
              >
                {isBlockPublishing
                  ? "İşleniyor..."
                  : blockPublishInfo.publishedCount ===
                      blockPublishInfo.totalCount
                    ? "Tüm bloğu yayından kaldır"
                    : "Tüm bloğu yayınla"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seanslar */}
      {sessionsByDay.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Clock className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Bu programda henüz seans eklenmemiş.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessionsByDay.map(({ day, label, sessions }) => (
            <div key={day}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {label}
              </h2>
              <div className="space-y-3">
                {sessions.map((session) => {
                  const sessionTonnage = calculateSessionTonnage(
                    session,
                    tonnageContext
                  );
                  return (
                    <Card key={session.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          {session.session_type && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {SESSION_TYPE_LABELS[session.session_type] ??
                                session.session_type}
                            </span>
                          )}
                          <CardTitle className="text-base">
                            {session.title ||
                              SESSION_TYPE_LABELS[session.session_type ?? ""] ||
                              "Seans"}
                          </CardTitle>
                          {session.duration_min && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {session.duration_min} dk
                            </span>
                          )}
                        </div>
                        {session.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {session.description}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {sessionTonnage.totalSetCount > 0 &&
                            sessionTonnage.resolvedSetCount === 0
                              ? "Tonaj hesaplanamıyor"
                              : `Tonaj: ${formatTonnage(sessionTonnage.totalKg)}`}
                          </span>
                        </div>
                        <TonnageBreakdown tonnage={sessionTonnage} />
                      </CardHeader>

                      {session.exercises.length > 0 && (
                        <CardContent className="space-y-3">
                          {session.exercises
                            .slice()
                            .sort(
                              (a, b) =>
                                (a.order_index ?? 0) - (b.order_index ?? 0)
                            )
                            .map((exercise) => {
                              const sets = (exercise.exercise_sets ?? [])
                                .slice()
                                .sort((a, b) => a.set_number - b.set_number);

                              return (
                                <div
                                  key={exercise.id}
                                  className="rounded-md border p-3"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                      <p className="font-medium text-sm">
                                        {exercise.name}
                                      </p>
                                      {exercise.notes && (
                                        <p className="text-xs text-muted-foreground">
                                          {exercise.notes}
                                        </p>
                                      )}
                                    </div>
                                    {exercise.rest_sec && (
                                      <span className="shrink-0 text-xs text-muted-foreground">
                                        Dinlenme {exercise.rest_sec}s
                                      </span>
                                    )}
                                  </div>

                                  {sets.length > 0 ? (
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left py-1 pr-2 font-medium text-muted-foreground text-xs">
                                            Set
                                          </th>
                                          <th className="text-left py-1 px-2 font-medium text-muted-foreground text-xs">
                                            Tekrar/Süre
                                          </th>
                                          <th className="text-left py-1 px-2 font-medium text-muted-foreground text-xs">
                                            Yük
                                          </th>
                                          <th className="text-left py-1 px-2 font-medium text-muted-foreground text-xs">
                                            RPE
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sets.map((set) => (
                                          <tr
                                            key={set.id}
                                            className="border-b last:border-0"
                                          >
                                            <td className="py-1.5 pr-2 text-xs text-muted-foreground">
                                              {set.set_number}
                                            </td>
                                            <td className="py-1.5 px-2">
                                              {formatSetReps(set)}
                                            </td>
                                            <td className="py-1.5 px-2">
                                              {formatSetLoad(
                                                set,
                                                exercise.name,
                                                maxHistoryLookup,
                                                program.start_date
                                              )}
                                            </td>
                                            <td className="py-1.5 px-2">
                                              {set.rpe ?? "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      Set bilgisi yok.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
