"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Users, Building2 } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Badge } from "@athleteiq/ui/components/badge";
import { createClient } from "@/lib/supabase/client";
import { useUserContext } from "@/lib/hooks/useUserContext";
import { toast } from "@/components/ui/use-toast";
import { deleteTeam, updateOrganization } from "@athleteiq/db/queries";
import type { TeamCounts } from "@athleteiq/db/queries";
import { createTeamSchema, type CreateTeamInput } from "@athleteiq/validators/team";
import { updateOrgSchema, updateOrgSlugPlanSchema } from "@athleteiq/validators/organization";
import { EditTeamModal } from "@/components/features/settings/edit-team-modal";
import { DeleteTeamDialog } from "@/components/features/settings/delete-team-dialog";
import type { Tables } from "@athleteiq/db/types";

type Team = Tables<"teams">;
type Org = {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  logo_url: string | null;
} | null;

interface Props {
  orgId: string;
  org: Org;
  teams: Team[];
  teamCounts: Record<string, TeamCounts>;
  orgUserCount: number;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Ücretsiz",
  pro: "Pro",
  enterprise: "Kurumsal",
};

const DISCIPLINE_SUGGESTIONS = [
  "ARTİSTİK CİMNASTİK",
  "RİTMİK CİMNASTİK",
  "TRAMPOLİN",
  "AEROBİK CİMNASTİK",
  "Kuvvet & Kondisyon",
  "Amerikan Futbolu",
];

const EMPTY_COUNTS: TeamCounts = { athletes: 0, members: 0, programs: 0, competitions: 0 };

function OrganizationCard({ orgId, org, orgUserCount }: { orgId: string; org: Org; orgUserCount: number }) {
  const router = useRouter();
  const { isSuperAdmin } = useUserContext();
  const [form, setForm] = useState({
    name: org?.name ?? "",
    logo_url: org?.logo_url ?? "",
    slug: org?.slug ?? "",
    plan: org?.plan ?? "free",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    const baseResult = updateOrgSchema.safeParse({ name: form.name, logo_url: form.logo_url });
    if (!baseResult.success) {
      const errs: Record<string, string> = {};
      for (const issue of baseResult.error.issues) errs[String(issue.path[0])] = issue.message;
      setFieldErrors(errs);
      return;
    }

    let payload: Record<string, unknown> = {
      name: baseResult.data.name,
      logo_url: baseResult.data.logo_url || null,
    };

    if (isSuperAdmin) {
      const slugPlanResult = updateOrgSlugPlanSchema.safeParse({ slug: form.slug, plan: form.plan });
      if (!slugPlanResult.success) {
        const errs: Record<string, string> = {};
        for (const issue of slugPlanResult.error.issues) errs[String(issue.path[0])] = issue.message;
        setFieldErrors((prev) => ({ ...prev, ...errs }));
        return;
      }
      payload = { ...payload, slug: slugPlanResult.data.slug, plan: slugPlanResult.data.plan };
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      await updateOrganization(supabase, orgId, payload);
      router.refresh();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Organizasyon güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          Organizasyon Bilgileri
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!org ? (
          <p className="text-sm text-muted-foreground">Organizasyon bilgisi yüklenemedi.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="org-name">Organizasyon Adı *</Label>
                <Input
                  id="org-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-logo">Logo URL</Label>
                <Input
                  id="org-logo"
                  value={form.logo_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://..."
                />
                {fieldErrors.logo_url && (
                  <p className="text-xs text-destructive">{fieldErrors.logo_url}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-slug">Slug</Label>
                {isSuperAdmin ? (
                  <>
                    <Input
                      id="org-slug"
                      value={form.slug}
                      onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                    />
                    <p className="text-xs text-amber-700">
                      Bu organizasyondaki {orgUserCount} kullanıcının giriş kimliği eski slug&apos;da
                      kalacak — e-postalar otomatik güncellenmez.
                    </p>
                  </>
                ) : (
                  <>
                    <Input id="org-slug" value={form.slug} readOnly className="font-mono text-xs bg-muted/40" />
                    <p className="text-xs text-muted-foreground">
                      Sentetik giriş e-postaları ({"{"}kullanıcı adı{"}"}@{form.slug}.athleteiq.app) slug&apos;a
                      bağlı olduğu için yalnızca süper admin değiştirebilir.
                    </p>
                  </>
                )}
                {fieldErrors.slug && <p className="text-xs text-destructive">{fieldErrors.slug}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-plan">Plan</Label>
                {isSuperAdmin ? (
                  <select
                    id="org-plan"
                    value={form.plan}
                    onChange={(e) => setForm((prev) => ({ ...prev, plan: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="free">Ücretsiz</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Kurumsal</option>
                  </select>
                ) : (
                  <div>
                    <Badge variant="secondary">{PLAN_LABELS[form.plan] ?? form.plan}</Badge>
                  </div>
                )}
              </div>
            </div>

            {submitError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={isSaving} size="sm">
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function SettingsClient({ orgId, org, teams, teamCounts, orgUserCount }: Props) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Takım oluşturma formu
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
  });

  async function onCreateTeam(data: CreateTeamInput) {
    setSubmitError(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, name: data.name, discipline: data.discipline ?? "" }),
      });
      const json = (await res.json()) as { team?: Team; error?: string };
      if (!res.ok || !json.team) throw new Error(json.error ?? "Takım oluşturulamadı.");
      reset();
      router.refresh();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Takım oluşturulurken hata oluştu.");
    }
  }

  async function onConfirmDeleteTeam() {
    if (!deleteTarget) return;
    setIsDeletingTeam(true);
    try {
      const supabase = createClient();
      const counts = teamCounts[deleteTarget.id] ?? EMPTY_COUNTS;
      await deleteTeam(supabase, deleteTarget.id);
      setDeleteTarget(null);
      if (counts.athletes > 0) {
        toast({
          title: `${counts.athletes} sporcu artık takımsız`,
          description: "Sporcu listesinde \"Takımsız\" rozetiyle işaretlendi, koça tekrar atayabilirsiniz.",
        });
      }
      router.refresh();
    } catch (err: unknown) {
      toast({
        title: "Takım silinemedi",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsDeletingTeam(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organizasyon ve takım ayarlarını yönetin.
        </p>
      </div>

      <OrganizationCard orgId={orgId} org={org} orgUserCount={orgUserCount} />

      {/* Takım Yönetimi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Takımlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mevcut takımlar */}
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
              Henüz takım oluşturulmamış.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {teams.map((team) => {
                const counts = teamCounts[team.id] ?? EMPTY_COUNTS;
                return (
                  <div key={team.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {team.discipline ? `${team.discipline} · ` : ""}
                        {counts.athletes} sporcu · {counts.members} koç · {counts.programs} program
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <EditTeamModal team={team} onSuccess={() => router.refresh()} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(team)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Yeni takım formu */}
          <form onSubmit={handleSubmit(onCreateTeam)} className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Yeni Takım Oluştur</p>
            <div className="space-y-1.5">
              <Label htmlFor="team-name">Takım Adı *</Label>
              <Input
                id="team-name"
                {...register("name")}
                placeholder="Örn: Artistik Jimnastik A Takımı"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discipline">Branş</Label>
              <Input
                id="discipline"
                list="settings-discipline-suggestions"
                {...register("discipline")}
                placeholder="Örn: ARTİSTİK CİMNASTİK"
              />
              <datalist id="settings-discipline-suggestions">
                {DISCIPLINE_SUGGESTIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
            {submitError && (
              <p className="text-xs text-destructive">{submitError}</p>
            )}
            <Button type="submit" disabled={isSubmitting} size="sm">
              <Plus className="h-4 w-4" />
              {isSubmitting ? "Oluşturuluyor..." : "Takım Oluştur"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {deleteTarget && (
        <DeleteTeamDialog
          teamName={deleteTarget.name}
          counts={teamCounts[deleteTarget.id] ?? EMPTY_COUNTS}
          onConfirm={onConfirmDeleteTeam}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeletingTeam}
        />
      )}
    </div>
  );
}
