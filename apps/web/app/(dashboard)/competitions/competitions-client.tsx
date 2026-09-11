"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trophy, MapPin, Calendar, X, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Badge } from "@athleteiq/ui/components/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { DeleteConfirmDialog } from "@/components/features/exercises/delete-confirm-dialog";
import {
  createCompetition,
  updateCompetition,
  deleteCompetition,
  syncCompetitionEntries,
} from "@athleteiq/db/queries/competitions";
import type { Tables } from "@athleteiq/db/types";

type Competition = Tables<"competitions"> & {
  competition_results: (Tables<"competition_results"> & {
    athletes: { full_name: string; avatar_url: string | null } | null;
  })[];
  competition_entries: (Tables<"competition_entries"> & {
    athletes: { id: string; full_name: string; team_id: string | null } | null;
  })[];
};
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
        checked ? "border-primary bg-primary/10" : "border-input hover:bg-accent"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
          checked ? "bg-primary text-primary-foreground" : "border border-input"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="truncate">{name}</span>
    </button>
  );
}

function isUpcoming(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) >= new Date(new Date().toDateString());
}

export function CompetitionsClient({
  orgId,
  competitions: initialCompetitions,
  teams,
  athletes,
}: Props) {
  const [competitions, setCompetitions] = useState<Competition[]>(initialCompetitions);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Competition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Competition | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);

  const athletesByTeam = teams.map((team) => ({
    team,
    athletes: athletes.filter((a) => a.team_id === team.id),
  }));
  const unassignedAthletes = athletes.filter((a) => !a.team_id);

  function toggleAthlete(athleteId: string) {
    setSelectedAthleteIds((prev) =>
      prev.includes(athleteId) ? prev.filter((id) => id !== athleteId) : [...prev, athleteId]
    );
  }

  function selectAllInTeam(teamAthleteIds: string[]) {
    setSelectedAthleteIds((prev) => Array.from(new Set([...prev, ...teamAthleteIds])));
  }

  function clearTeam(teamAthleteIds: string[]) {
    setSelectedAthleteIds((prev) => prev.filter((id) => !teamAthleteIds.includes(id)));
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
    reset({ name: "", competition_date: "", location: "", level: undefined, team_id: "", notes: "" });
    setSelectedAthleteIds([]);
    setShowForm(true);
  }

  function openEditForm(comp: Competition) {
    setEditTarget(comp);
    setSelectedAthleteIds(comp.competition_entries.map((e) => e.athlete_id));
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setSubmitError(null);
  }

  // athletes prop'undan roster satırlarını yeniden inşa eder — competition_entries
  // tekrar fetch etmeden local state'i syncCompetitionEntries sonrasıyla tutarlı tutmak için.
  function buildEntries(athleteIds: string[]): Competition["competition_entries"] {
    return athleteIds.map((athleteId) => {
      const athlete = athletes.find((a) => a.id === athleteId) ?? null;
      return {
        id: athleteId,
        competition_id: "",
        athlete_id: athleteId,
        notes: null,
        created_at: null,
        athletes: athlete,
      } as Competition["competition_entries"][number];
    });
  }

  async function onSubmit(data: CompetitionForm) {
    setSubmitError(null);
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
        await syncCompetitionEntries(supabase, editTarget.id, selectedAthleteIds);
        setCompetitions((prev) =>
          prev
            .map((c) =>
              c.id === editTarget.id
                ? { ...c, ...updated, competition_entries: buildEntries(selectedAthleteIds) }
                : c
            )
            .sort((a, b) => ((a.competition_date ?? "") < (b.competition_date ?? "") ? -1 : 1))
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
        if (selectedAthleteIds.length > 0) {
          await syncCompetitionEntries(supabase, newComp.id, selectedAthleteIds);
        }
        // Fetch with results joined — competitions query returns base row, add empty results
        const compWithResults = {
          ...newComp,
          competition_results: [],
          competition_entries: buildEntries(selectedAthleteIds),
        };
        setCompetitions((prev) =>
          [...prev, compWithResults as Competition].sort((a, b) =>
            (a.competition_date ?? "") < (b.competition_date ?? "") ? -1 : 1
          )
        );
      }
      closeForm();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Yarışma kaydedilirken hata oluştu.");
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
    if (filter === "upcoming") return isUpcoming(c.competition_date);
    if (filter === "past") return !isUpcoming(c.competition_date);
    return true;
  });

  const upcomingCount = competitions.filter((c) => isUpcoming(c.competition_date)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
            <CardTitle className="text-base">{editTarget ? "Yarışmayı Düzenle" : "Yeni Yarışma"}</CardTitle>
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
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="comp-date">Tarih *</Label>
                  <Input id="comp-date" type="date" {...register("competition_date")} />
                  {errors.competition_date && (
                    <p className="text-xs text-destructive">{errors.competition_date.message}</p>
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
                    <p className="text-xs text-muted-foreground">Henüz sporcu kaydı yok.</p>
                  ) : (
                    <>
                      {athletesByTeam.map(({ team, athletes: teamAthletes }) => {
                        if (teamAthletes.length === 0) return null;
                        const teamIds = teamAthletes.map((a) => a.id);
                        const allSelected = teamIds.every((id) => selectedAthleteIds.includes(id));
                        return (
                          <div key={team.id}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-medium text-muted-foreground">{team.name}</p>
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline"
                                onClick={() =>
                                  allSelected ? clearTeam(teamIds) : selectAllInTeam(teamIds)
                                }
                              >
                                {allSelected ? "Takımı kaldır" : "Tüm takımı seç"}
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
                      })}
                      {unassignedAthletes.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Takımsız</p>
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
          <Button variant="outline" size="sm" className="mt-4" onClick={openCreateForm}>
            Yarışma Ekle
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((comp) => {
            const upcoming = isUpcoming(comp.competition_date);
            return (
              <Card key={comp.id} className={upcoming ? "border-primary/30" : ""}>
                <CardContent className="pt-5">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-center ${
                        upcoming ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {comp.competition_date ? (
                        <>
                          <span className="text-xs font-medium">
                            {new Date(comp.competition_date).toLocaleDateString("tr-TR", {
                              month: "short",
                            })}
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
                        <h3 className="font-semibold leading-tight">{comp.name}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {upcoming && (
                            <Badge variant="default" className="text-xs">
                              Yaklaşan
                            </Badge>
                          )}
                          {comp.level && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                LEVEL_COLORS[comp.level] ?? "bg-gray-100 text-gray-700"
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
                            {new Date(comp.competition_date).toLocaleDateString("tr-TR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
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
                        <p className="mt-1.5 text-xs text-muted-foreground">{comp.notes}</p>
                      )}

                      {comp.competition_entries.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {comp.competition_entries.length} sporcu kayıtlı:
                          </span>
                          {comp.competition_entries.slice(0, 6).map((e) => (
                            <span
                              key={e.id}
                              className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs"
                            >
                              {e.athletes?.full_name ?? "—"}
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
