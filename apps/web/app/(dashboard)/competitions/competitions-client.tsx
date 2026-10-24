"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Trophy,
  MapPin,
  Calendar,
  X,
  Pencil,
  Trash2,
  Users,
  Flag,
} from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@athleteiq/ui/components/card";
import { Badge } from "@athleteiq/ui/components/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { DeleteConfirmDialog } from "@/components/features/exercises/delete-confirm-dialog";
import {
  createCompetition,
  updateCompetition,
  deleteCompetition,
  syncCompetitionEntries,
  syncCompetitionStages,
} from "@athleteiq/db/queries/competitions";
import type { Tables } from "@athleteiq/db/types";
import {
  COMPETITION_STAGES,
  COMPETITION_STAGE_VALUES,
  competitionLastDate,
  isCompetitionStage,
  isFinalStage,
  stageLabel,
  stageShort,
  stagesForEntry,
  type CompetitionStage,
} from "@athleteiq/validators/competition";
import {
  StageBadge,
  StageTag,
  STAGE_TONE,
} from "@/components/features/competitions/stage-badge";

type Competition = Tables<"competitions"> & {
  competition_results: (Tables<"competition_results"> & {
    athletes: { full_name: string; avatar_url: string | null } | null;
  })[];
  competition_entries: (Tables<"competition_entries"> & {
    athletes: { id: string; full_name: string; team_id: string | null } | null;
  })[];
  competition_stages: Tables<"competition_stages">[];
};

type StageDraft = { enabled: boolean; date: string };
type StageDrafts = Record<CompetitionStage, StageDraft>;

function emptyStageDrafts(): StageDrafts {
  return Object.fromEntries(
    COMPETITION_STAGE_VALUES.map((s) => [s, { enabled: false, date: "" }])
  ) as StageDrafts;
}

// DB satırlarından kanonik sırada, bilinen aşamalar
function competitionStages(comp: Competition): Tables<"competition_stages">[] {
  return COMPETITION_STAGE_VALUES.flatMap((v) =>
    comp.competition_stages.filter((st) => st.stage === v)
  );
}

function stageValuesOf(comp: Competition): CompetitionStage[] {
  return competitionStages(comp)
    .map((st) => st.stage)
    .filter(isCompetitionStage);
}
type Team = { id: string; name: string };
type AthleteOption = { id: string; full_name: string; team_id: string | null };

interface Props {
  orgId: string;
  competitions: Competition[];
  teams: Team[];
  athletes: AthleteOption[];
}

const competitionSchema = z.object({
  name: z.string().min(2, "Yarışma adı en az 2 karakter olmalı"),
  competition_date: z.string().min(1, "Tarih zorunludur"),
  location: z.string().optional(),
  level: z.enum(["international", "national", "regional", "local"]).optional(),
  team_id: z.string().optional(),
  notes: z.string().optional(),
});

type CompetitionForm = z.infer<typeof competitionSchema>;

const LEVEL_LABELS: Record<string, string> = {
  international: "Uluslararası",
  national: "Ulusal",
  regional: "Bölgesel",
  local: "Yerel",
};

const LEVEL_COLORS: Record<string, string> = {
  international: "bg-violet/10 text-violet",
  national: "bg-primary/10 text-primary",
  regional: "bg-good/10 text-good",
  local: "bg-muted text-muted-foreground",
};

function AthleteChip({
  name,
  checked,
  onToggle,
}: {
  name: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors ${
        checked
          ? "border-primary bg-primary/10"
          : "border-input hover:bg-accent"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
          checked ? "bg-primary text-primary-foreground" : "border border-input"
        }`}
      >
        {checked && (
          <svg
            viewBox="0 0 24 24"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="truncate">{name}</span>
    </button>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
        checked ? "bg-primary text-primary-foreground" : "border border-input"
      }`}
    >
      {checked && (
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            d="M5 13l4 4L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function isUpcoming(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) >= new Date(new Date().toDateString());
}

// Finali yarışma tarihinden sonraki bir güne düşen yarışma, final bitene kadar
// "yaklaşan" sayılır.
function isCompetitionUpcoming(comp: Competition): boolean {
  return isUpcoming(
    competitionLastDate(
      comp.competition_date,
      comp.competition_stages.map((st) => st.stage_date)
    )
  );
}

export function CompetitionsClient({
  orgId,
  competitions: initialCompetitions,
  teams,
  athletes,
}: Props) {
  const [competitions, setCompetitions] =
    useState<Competition[]>(initialCompetitions);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Competition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Competition | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [stageDrafts, setStageDrafts] = useState<StageDrafts>(emptyStageDrafts);
  const [athleteStages, setAthleteStages] = useState<
    Record<string, CompetitionStage[]>
  >({});

  const enabledStages = COMPETITION_STAGE_VALUES.filter(
    (s) => stageDrafts[s].enabled
  );
  const athleteName = (id: string) =>
    athletes.find((a) => a.id === id)?.full_name ?? "—";

  const athletesByTeam = teams.map((team) => ({
    team,
    athletes: athletes.filter((a) => a.team_id === team.id),
  }));
  const unassignedAthletes = athletes.filter((a) => !a.team_id);

  // Qualification tanımlıysa yeni eklenen sporcu varsayılan olarak orada yarışır
  function seedQualification(ids: string[]) {
    if (!stageDrafts.qualification.enabled) return;
    setAthleteStages((prev) => {
      const next = { ...prev };
      for (const id of ids) if (!next[id]?.length) next[id] = ["qualification"];
      return next;
    });
  }

  function toggleAthlete(athleteId: string) {
    const adding = !selectedAthleteIds.includes(athleteId);
    setSelectedAthleteIds((prev) =>
      prev.includes(athleteId)
        ? prev.filter((id) => id !== athleteId)
        : [...prev, athleteId]
    );
    if (adding) seedQualification([athleteId]);
  }

  function selectAllInTeam(teamAthleteIds: string[]) {
    setSelectedAthleteIds((prev) =>
      Array.from(new Set([...prev, ...teamAthleteIds]))
    );
    seedQualification(
      teamAthleteIds.filter((id) => !selectedAthleteIds.includes(id))
    );
  }

  function toggleStage(stage: CompetitionStage) {
    const enabling = !stageDrafts[stage].enabled;
    setStageDrafts((prev) => ({
      ...prev,
      [stage]: { ...prev[stage], enabled: enabling },
    }));
    setAthleteStages((prev) => {
      const next: Record<string, CompetitionStage[]> = {};
      for (const id of selectedAthleteIds) {
        const cur = prev[id] ?? [];
        if (!enabling) next[id] = cur.filter((s) => s !== stage);
        // Qualification'ı açmak kadronun tamamını oraya yazar; finaller elle işaretlenir
        else if (stage === "qualification")
          next[id] = cur.includes(stage) ? cur : [stage, ...cur];
        else next[id] = cur;
      }
      return { ...prev, ...next };
    });
  }

  function setStageDate(stage: CompetitionStage, date: string) {
    setStageDrafts((prev) => ({ ...prev, [stage]: { ...prev[stage], date } }));
  }

  function hasStage(athleteId: string, stage: CompetitionStage) {
    return (athleteStages[athleteId] ?? []).includes(stage);
  }

  function toggleAthleteStage(athleteId: string, stage: CompetitionStage) {
    setAthleteStages((prev) => {
      const cur = prev[athleteId] ?? [];
      return {
        ...prev,
        [athleteId]: cur.includes(stage)
          ? cur.filter((s) => s !== stage)
          : [...cur, stage],
      };
    });
  }

  function toggleStageForAll(stage: CompetitionStage) {
    const allHave = selectedAthleteIds.every((id) => hasStage(id, stage));
    setAthleteStages((prev) => {
      const next = { ...prev };
      for (const id of selectedAthleteIds) {
        const cur = next[id] ?? [];
        next[id] = allHave
          ? cur.filter((s) => s !== stage)
          : cur.includes(stage)
            ? cur
            : [...cur, stage];
      }
      return next;
    });
  }

  function clearTeam(teamAthleteIds: string[]) {
    setSelectedAthleteIds((prev) =>
      prev.filter((id) => !teamAthleteIds.includes(id))
    );
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompetitionForm>({
    resolver: zodResolver(competitionSchema),
  });

  useEffect(() => {
    if (!editTarget) return;
    reset({
      name: editTarget.name,
      competition_date: editTarget.competition_date ?? "",
      location: editTarget.location ?? "",
      level: (editTarget.level ?? "") as CompetitionForm["level"],
      team_id: editTarget.team_id ?? "",
      notes: editTarget.notes ?? "",
    });
  }, [editTarget, reset]);

  function openCreateForm() {
    setEditTarget(null);
    reset({
      name: "",
      competition_date: "",
      location: "",
      level: undefined,
      team_id: "",
      notes: "",
    });
    setSelectedAthleteIds([]);
    setStageDrafts(emptyStageDrafts());
    setAthleteStages({});
    setShowForm(true);
  }

  function openEditForm(comp: Competition) {
    setEditTarget(comp);
    setSelectedAthleteIds(comp.competition_entries.map((e) => e.athlete_id));
    const drafts = emptyStageDrafts();
    for (const st of comp.competition_stages) {
      if (isCompetitionStage(st.stage))
        drafts[st.stage] = { enabled: true, date: st.stage_date ?? "" };
    }
    setStageDrafts(drafts);
    const values = stageValuesOf(comp);
    setAthleteStages(
      Object.fromEntries(
        comp.competition_entries.map((e) => [
          e.athlete_id,
          stagesForEntry(e.stages, values),
        ])
      )
    );
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setSubmitError(null);
  }

  // athletes prop'undan roster satırlarını yeniden inşa eder — competition_entries
  // tekrar fetch etmeden local state'i syncCompetitionEntries sonrasıyla tutarlı tutmak için.
  function buildEntries(
    athleteIds: string[],
    stagesByAthlete: Record<string, string[]>
  ): Competition["competition_entries"] {
    return athleteIds.map((athleteId) => {
      const athlete = athletes.find((a) => a.id === athleteId) ?? null;
      return {
        id: athleteId,
        competition_id: "",
        athlete_id: athleteId,
        notes: null,
        created_at: null,
        stages: stagesByAthlete[athleteId] ?? [],
        athletes: athlete,
      } as Competition["competition_entries"][number];
    });
  }

  async function onSubmit(data: CompetitionForm) {
    setSubmitError(null);
    // Yalnızca tanımlı aşamalar yazılır — kapatılan aşamanın etiketi sporcudan da düşer
    const stagesPayload = enabledStages.map((stage) => ({
      stage,
      stage_date: stageDrafts[stage].date || null,
    }));
    const stagesByAthlete: Record<string, string[]> = Object.fromEntries(
      selectedAthleteIds.map((id) => [
        id,
        stagesForEntry(athleteStages[id], enabledStages),
      ])
    );
    try {
      const supabase = createClient();
      if (editTarget) {
        const updated = await updateCompetition(supabase, editTarget.id, {
          name: data.name,
          competition_date: data.competition_date,
          location: data.location ?? null,
          level: data.level ?? null,
          team_id: data.team_id || null,
          notes: data.notes ?? null,
        });
        const savedStages = await syncCompetitionStages(
          supabase,
          editTarget.id,
          stagesPayload
        );
        await syncCompetitionEntries(
          supabase,
          editTarget.id,
          selectedAthleteIds,
          stagesByAthlete
        );
        setCompetitions((prev) =>
          prev
            .map((c) =>
              c.id === editTarget.id
                ? {
                    ...c,
                    ...updated,
                    competition_entries: buildEntries(
                      selectedAthleteIds,
                      stagesByAthlete
                    ),
                    competition_stages: savedStages,
                  }
                : c
            )
            .sort((a, b) =>
              (a.competition_date ?? "") < (b.competition_date ?? "") ? -1 : 1
            )
        );
        toast({ title: "Yarışma güncellendi" });
      } else {
        const newComp = await createCompetition(supabase, {
          org_id: orgId,
          name: data.name,
          competition_date: data.competition_date,
          location: data.location ?? null,
          level: data.level ?? null,
          team_id: data.team_id || null,
          notes: data.notes ?? null,
        });
        const savedStages = await syncCompetitionStages(
          supabase,
          newComp.id,
          stagesPayload
        );
        if (selectedAthleteIds.length > 0) {
          await syncCompetitionEntries(
            supabase,
            newComp.id,
            selectedAthleteIds,
            stagesByAthlete
          );
        }
        // Fetch with results joined — competitions query returns base row, add empty results
        const compWithResults = {
          ...newComp,
          competition_results: [],
          competition_entries: buildEntries(
            selectedAthleteIds,
            stagesByAthlete
          ),
          competition_stages: savedStages,
        };
        setCompetitions((prev) =>
          [...prev, compWithResults as Competition].sort((a, b) =>
            (a.competition_date ?? "") < (b.competition_date ?? "") ? -1 : 1
          )
        );
      }
      closeForm();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Yarışma kaydedilirken hata oluştu."
      );
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      const supabase = createClient();
      await deleteCompetition(supabase, deleteTarget.id);
      setCompetitions((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast({ title: "Yarışma silindi" });
    } catch (err: unknown) {
      toast({
        title: "Silme başarısız",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  }

  const filtered = competitions.filter((c) => {
    if (filter === "upcoming") return isCompetitionUpcoming(c);
    if (filter === "past") return !isCompetitionUpcoming(c);
    return true;
  });

  const upcomingCount = competitions.filter(isCompetitionUpcoming).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Yarışma Takvimi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {competitions.length} yarışma — {upcomingCount} yaklaşan
          </p>
        </div>
        <Button onClick={() => (showForm ? closeForm() : openCreateForm())}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "İptal" : "Yarışma Ekle"}
        </Button>
      </div>

      {/* Ekleme/düzenleme formu */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editTarget ? "Yarışmayı Düzenle" : "Yeni Yarışma"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <Label htmlFor="comp-name">Yarışma Adı *</Label>
                  <Input
                    id="comp-name"
                    {...register("name")}
                    placeholder="Örn: Türkiye Jimnastik Şampiyonası 2026"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="comp-date">Tarih *</Label>
                  <Input
                    id="comp-date"
                    type="date"
                    {...register("competition_date")}
                  />
                  {errors.competition_date && (
                    <p className="text-xs text-destructive">
                      {errors.competition_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="comp-location">Konum</Label>
                  <Input
                    id="comp-location"
                    {...register("location")}
                    placeholder="Şehir / Salon"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="comp-level">Kademe</Label>
                  <select
                    id="comp-level"
                    {...register("level")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Seçin</option>
                    <option value="international">Uluslararası</option>
                    <option value="national">Ulusal</option>
                    <option value="regional">Bölgesel</option>
                    <option value="local">Yerel</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="comp-team">Takım</Label>
                  <select
                    id="comp-team"
                    {...register("team_id")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Tüm takımlar / Bireysel</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="comp-notes">Notlar</Label>
                  <Input
                    id="comp-notes"
                    {...register("notes")}
                    placeholder="İsteğe bağlı notlar..."
                  />
                </div>
              </div>

              {/* Yarışma aşamaları — cimnastikte Qualification + finaller AYNI yarışmanın
                  parçası; ayrı yarışma kaydı açılmaz. Hiç seçilmezse aşama kavramı yok. */}
              <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5" />
                  Yarışma Aşamaları
                  <span className="font-normal text-muted-foreground">
                    (isteğe bağlı — cimnastik)
                  </span>
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {COMPETITION_STAGES.map((st) => {
                    const draft = stageDrafts[st.value];
                    return (
                      <div
                        key={st.value}
                        className={`flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
                          draft.enabled
                            ? "border-primary bg-primary/5"
                            : "border-input"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleStage(st.value)}
                          aria-pressed={draft.enabled}
                          className="flex flex-1 items-center gap-2 text-left text-sm"
                        >
                          <CheckBox checked={draft.enabled} />
                          <span className="font-medium">{st.label}</span>
                          <StageTag stage={st.value} />
                        </button>
                        {draft.enabled && (
                          <Input
                            type="date"
                            value={draft.date}
                            onChange={(e) =>
                              setStageDate(st.value, e.target.value)
                            }
                            className="h-8 w-[9.5rem]"
                            aria-label={`${st.label} tarihi`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Aşama tarihi boş bırakılırsa yarışma tarihi kullanılır. Finale
                  kalan sporcuları aşağıdaki aşama kadrosundan işaretleyin.
                </p>
              </div>

              {/* Katılımcı seçimi — her sporcu/takım her yarışmaya gitmez, bu yüzden
                  team_id alanı yalnızca gevşek bir ilişkilendirme; asıl "kim gidiyor"
                  kaydı burada, sporcu bazında. */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Katılımcılar ({selectedAthleteIds.length} sporcu seçili)
                  </Label>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-md border p-3 space-y-3">
                  {athletes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Henüz sporcu kaydı yok.
                    </p>
                  ) : (
                    <>
                      {athletesByTeam.map(
                        ({ team, athletes: teamAthletes }) => {
                          if (teamAthletes.length === 0) return null;
                          const teamIds = teamAthletes.map((a) => a.id);
                          const allSelected = teamIds.every((id) =>
                            selectedAthleteIds.includes(id)
                          );
                          return (
                            <div key={team.id}>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {team.name}
                                </p>
                                <button
                                  type="button"
                                  className="text-xs text-primary hover:underline"
                                  onClick={() =>
                                    allSelected
                                      ? clearTeam(teamIds)
                                      : selectAllInTeam(teamIds)
                                  }
                                >
                                  {allSelected
                                    ? "Takımı kaldır"
                                    : "Tüm takımı seç"}
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {teamAthletes.map((a) => (
                                  <AthleteChip
                                    key={a.id}
                                    name={a.full_name}
                                    checked={selectedAthleteIds.includes(a.id)}
                                    onToggle={() => toggleAthlete(a.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        }
                      )}
                      {unassignedAthletes.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Takımsız
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {unassignedAthletes.map((a) => (
                              <AthleteChip
                                key={a.id}
                                name={a.full_name}
                                checked={selectedAthleteIds.includes(a.id)}
                                onToggle={() => toggleAthlete(a.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {enabledStages.length > 0 && selectedAthleteIds.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <Label className="flex items-center gap-1.5">
                      <Flag className="h-3.5 w-3.5" />
                      Aşama Kadrosu
                    </Label>
                    <div className="max-h-72 overflow-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-card">
                          <tr className="border-b">
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                              Sporcu
                            </th>
                            {enabledStages.map((stage) => {
                              const count = selectedAthleteIds.filter((id) =>
                                hasStage(id, stage)
                              ).length;
                              return (
                                <th
                                  key={stage}
                                  className="px-2 py-2 text-center"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleStageForAll(stage)}
                                    className={`inline-flex flex-col items-center rounded-md border px-2 py-1 text-xs font-medium hover:opacity-80 ${STAGE_TONE[stage]}`}
                                    title={`${stageLabel(stage)} — tüm sporcuları seç / kaldır`}
                                  >
                                    <span className="whitespace-nowrap sm:hidden">
                                      {stageShort(stage)}
                                    </span>
                                    <span className="hidden whitespace-nowrap sm:inline">
                                      {stageLabel(stage)}
                                    </span>
                                    <span className="font-normal opacity-80 tabular-nums">
                                      {count}/{selectedAthleteIds.length}
                                    </span>
                                  </button>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {[...selectedAthleteIds]
                            .sort((a, b) =>
                              athleteName(a).localeCompare(
                                athleteName(b),
                                "tr-TR"
                              )
                            )
                            .map((id) => (
                              <tr key={id} className="border-b last:border-0">
                                <td className="px-3 py-1.5 font-medium">
                                  {athleteName(id)}
                                </td>
                                {enabledStages.map((stage) => (
                                  <td
                                    key={stage}
                                    className="px-2 py-1.5 text-center"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleAthleteStage(id, stage)
                                      }
                                      aria-pressed={hasStage(id, stage)}
                                      aria-label={`${athleteName(id)} — ${stageLabel(stage)}`}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                                    >
                                      <CheckBox checked={hasStage(id, stage)} />
                                    </button>
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sütun başlığına tıklamak o aşamayı tüm sporculara
                      işaretler / kaldırır.
                    </p>
                  </div>
                )}
              </div>

              {submitError && (
                <p className="text-xs text-destructive">{submitError}</p>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeForm}>
                  İptal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Kaydediliyor..."
                    : editTarget
                      ? "Kaydet"
                      : "Yarışmayı Ekle"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtreler */}
      <div className="flex gap-2">
        {(["upcoming", "past", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f === "upcoming" ? "Yaklaşan" : f === "past" ? "Geçmiş" : "Tümü"}
          </button>
        ))}
      </div>

      {/* Yarışma listesi */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {filter === "upcoming"
              ? "Yaklaşan yarışma bulunmuyor."
              : filter === "past"
                ? "Geçmiş yarışma bulunmuyor."
                : "Henüz yarışma eklenmemiş."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={openCreateForm}
          >
            Yarışma Ekle
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((comp) => {
            const upcoming = isCompetitionUpcoming(comp);
            const stages = competitionStages(comp);
            const stageValues = stageValuesOf(comp);
            const entryStages = (
              e: Competition["competition_entries"][number]
            ) => stagesForEntry(e.stages, stageValues);
            // Finalistler önce — çip listesi kısaltıldığında finale kalanlar görünür kalsın
            const sortedEntries = [...comp.competition_entries].sort(
              (a, b) =>
                entryStages(b).filter(isFinalStage).length -
                entryStages(a).filter(isFinalStage).length
            );
            return (
              <Card
                key={comp.id}
                className={upcoming ? "border-primary/30" : ""}
              >
                <CardContent className="pt-5">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-center ${
                        upcoming
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {comp.competition_date ? (
                        <>
                          <span className="text-xs font-medium">
                            {new Date(comp.competition_date).toLocaleDateString(
                              "tr-TR",
                              {
                                month: "short",
                              }
                            )}
                          </span>
                          <span className="text-lg font-bold leading-none">
                            {new Date(comp.competition_date).getDate()}
                          </span>
                        </>
                      ) : (
                        <Calendar className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-tight">
                          {comp.name}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {upcoming && (
                            <Badge variant="default" className="text-xs">
                              Yaklaşan
                            </Badge>
                          )}
                          {comp.level && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                LEVEL_COLORS[comp.level] ??
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {LEVEL_LABELS[comp.level] ?? comp.level}
                            </span>
                          )}
                          <button
                            onClick={() => openEditForm(comp)}
                            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            aria-label="Düzenle"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(comp)}
                            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-muted-foreground">
                        {comp.competition_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(comp.competition_date).toLocaleDateString(
                              "tr-TR",
                              {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }
                            )}
                          </span>
                        )}
                        {comp.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {comp.location}
                          </span>
                        )}
                      </div>

                      {comp.notes && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {comp.notes}
                        </p>
                      )}

                      {stages.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {stages.map((st) => {
                            if (!isCompetitionStage(st.stage)) return null;
                            const stage = st.stage;
                            const inStage = comp.competition_entries.filter(
                              (e) => entryStages(e).includes(stage)
                            );
                            return (
                              <StageBadge
                                key={st.id}
                                stage={stage}
                                date={
                                  st.stage_date &&
                                  st.stage_date !== comp.competition_date
                                    ? st.stage_date
                                    : null
                                }
                                extra={`${inStage.length} sporcu`}
                                title={
                                  inStage.length > 0
                                    ? inStage
                                        .map(
                                          (e) => e.athletes?.full_name ?? "—"
                                        )
                                        .join(", ")
                                    : undefined
                                }
                              />
                            );
                          })}
                        </div>
                      )}

                      {comp.competition_entries.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {comp.competition_entries.length} sporcu kayıtlı:
                          </span>
                          {sortedEntries.slice(0, 6).map((e) => (
                            <span
                              key={e.id}
                              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs"
                            >
                              {e.athletes?.full_name ?? "—"}
                              {entryStages(e)
                                .filter(isFinalStage)
                                .map((stage) => (
                                  <StageTag key={stage} stage={stage} />
                                ))}
                            </span>
                          ))}
                          {comp.competition_entries.length > 6 && (
                            <span className="text-xs text-muted-foreground">
                              +{comp.competition_entries.length - 6} daha
                            </span>
                          )}
                        </div>
                      )}

                      {comp.competition_results.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {comp.competition_results.slice(0, 5).map((r) => (
                            <span
                              key={r.id}
                              className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                            >
                              {r.athletes?.full_name ?? "—"}
                              {r.rank ? ` #${r.rank}` : ""}
                              {r.score ? ` (${r.score})` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title="Yarışmayı Sil"
          description={
            deleteTarget.competition_results.length > 0
              ? `"${deleteTarget.name}" yarışmasını silmek istediğinize emin misiniz? ${deleteTarget.competition_results.length} sonuç kaydı da silinecek.`
              : `"${deleteTarget.name}" yarışmasını silmek istediğinize emin misiniz?`
          }
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
