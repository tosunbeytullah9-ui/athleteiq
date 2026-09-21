"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarRange, Plus, Users, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  createAnnualPlan,
  deleteAnnualPlan,
  seedAnnualPlanMethods,
} from "@athleteiq/db/queries/annual-plans";
import {
  createAnnualPlanSchema,
  DEFAULT_ANNUAL_PLAN_METHODS,
  weekStartDate,
} from "@athleteiq/validators/annual-plan";

type Team = { id: string; name: string };
type Athlete = { id: string; full_name: string; team_id: string | null };

type PlanRow = {
  id: string;
  title: string;
  season_start: string;
  total_weeks: number;
  team_id: string | null;
  athlete_id: string | null;
  notes: string | null;
  teams: { id: string; name: string } | null;
  athletes: { id: string; full_name: string; team_id: string | null } | null;
};

interface Props {
  orgId: string;
  plans: PlanRow[];
  teams: Team[];
  athletes: Athlete[];
  /** Coach ise kendi takımı; admin/super-admin ise null. */
  coachTeamId: string | null;
}

type ScopeKind = "team" | "athlete";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Sezon genelde Ağustos'ta açılır — varsayılan başlangıç için makul bir tahmin. */
function defaultSeasonStart(): string {
  const now = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  // O yılın Ağustos ayındaki ilk Pazartesi.
  const aug = new Date(Date.UTC(year, 7, 1));
  const shift = (8 - aug.getUTCDay()) % 7;
  return new Date(Date.UTC(year, 7, 1 + shift)).toISOString().slice(0, 10);
}

export function AnnualPlansClient({ orgId, plans, teams, athletes, coachTeamId }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [scope, setScope] = useState<ScopeKind>("team");
  const [teamId, setTeamId] = useState<string>(coachTeamId ?? "");
  const [athleteId, setAthleteId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [seasonStart, setSeasonStart] = useState(defaultSeasonStart());
  const [totalWeeks, setTotalWeeks] = useState("52");
  const [notes, setNotes] = useState("");

  // Coach yalnızca kendi takımının sporcusuna bireysel plan açabilir — RLS zaten
  // reddederdi, burada listeyi daraltmak sessiz bir hatayı önler.
  const selectableAthletes = useMemo(
    () => (coachTeamId ? athletes.filter((a) => a.team_id === coachTeamId) : athletes),
    [athletes, coachTeamId]
  );
  const selectableTeams = useMemo(
    () => (coachTeamId ? teams.filter((t) => t.id === coachTeamId) : teams),
    [teams, coachTeamId]
  );

  const teamPlans = plans.filter((p) => p.team_id);
  const athletePlans = plans.filter((p) => p.athlete_id);

  function resetForm() {
    setScope("team");
    setTeamId(coachTeamId ?? "");
    setAthleteId("");
    setTitle("");
    setSeasonStart(defaultSeasonStart());
    setTotalWeeks("52");
    setNotes("");
  }

  async function handleCreate() {
    const parsed = createAnnualPlanSchema.safeParse({
      title: title.trim(),
      team_id: scope === "team" ? teamId || null : null,
      athlete_id: scope === "athlete" ? athleteId || null : null,
      season_start: seasonStart,
      total_weeks: Number(totalWeeks),
      notes: notes.trim() || null,
    });

    if (!parsed.success) {
      toast({
        title: "Eksik bilgi",
        description: parsed.error.issues[0]?.message ?? "Form geçersiz.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      // Kütüphane boşsa Excel'deki 11 sistemle tohumla (idempotent) — yeni bir
      // org ilk planını boş bir ızgarayla açmasın.
      await seedAnnualPlanMethods(
        supabase,
        orgId,
        DEFAULT_ANNUAL_PLAN_METHODS,
        userData.user?.id ?? null
      );

      const plan = await createAnnualPlan(supabase, {
        org_id: orgId,
        title: parsed.data.title,
        team_id: parsed.data.team_id ?? null,
        athlete_id: parsed.data.athlete_id ?? null,
        season_start: parsed.data.season_start,
        total_weeks: parsed.data.total_weeks,
        notes: parsed.data.notes ?? null,
        created_by: userData.user?.id ?? null,
      });

      toast({ title: "Plan oluşturuldu", description: parsed.data.title });
      setIsOpen(false);
      resetForm();
      router.push(`/annual-plans/${plan.id}`);
    } catch (err) {
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Plan oluşturulamadı.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(plan: PlanRow) {
    if (
      !window.confirm(
        `"${plan.title}" planı ve içindeki tüm hafta/ızgara verisi kalıcı olarak silinecek. Emin misiniz?`
      )
    ) {
      return;
    }

    setDeletingId(plan.id);
    try {
      await deleteAnnualPlan(createClient(), plan.id);
      toast({ title: "Plan silindi", description: plan.title });
      router.refresh();
    } catch (err) {
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Plan silinemedi.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  function renderPlanCard(plan: PlanRow) {
    const target = plan.teams?.name ?? plan.athletes?.full_name ?? "—";
    const lastWeek = weekStartDate(plan.season_start, plan.total_weeks);

    return (
      <Card key={plan.id} className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                <Link href={`/annual-plans/${plan.id}`} className="hover:underline">
                  {plan.title}
                </Link>
              </CardTitle>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                {plan.team_id ? (
                  <Users className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <User className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{target}</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(plan)}
              disabled={deletingId === plan.id}
              aria-label={`${plan.title} planını sil`}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge variant="secondary">{plan.total_weeks} hafta</Badge>
          <p className="text-xs text-muted-foreground">
            {formatDate(plan.season_start)} — {formatDate(lastWeek)}
          </p>
          {plan.notes ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{plan.notes}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yıllık Planlar</h1>
          <p className="text-sm text-muted-foreground">
            Sezon boyunca hafta hafta hangi antrenman sisteminin uygulanacağını planlayın.
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Yıllık Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <CalendarRange className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Henüz yıllık plan yok</p>
              <p className="text-sm text-muted-foreground">
                Bir takım ya da sporcu için sezon planı oluşturarak başlayın.
              </p>
            </div>
            <Button onClick={() => setIsOpen(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Yıllık Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {teamPlans.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="h-4 w-4" />
                Takım Planları
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {teamPlans.map(renderPlanCard)}
              </div>
            </section>
          )}

          {athletePlans.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <User className="h-4 w-4" />
                Sporcu Planları
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {athletePlans.map(renderPlanCard)}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Yıllık Plan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Kime Ait?</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={scope === "team" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScope("team")}
                  className="flex-1"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Takım
                </Button>
                <Button
                  type="button"
                  variant={scope === "athlete" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScope("athlete")}
                  className="flex-1"
                >
                  <User className="mr-2 h-4 w-4" />
                  Sporcu
                </Button>
              </div>
              {scope === "athlete" && (
                <p className="text-xs text-muted-foreground">
                  Bireysel branşlarda her sporcunun yarışma takvimi farklı olduğu için sporcu
                  bazlı plan önerilir — yarışma satırı o sporcunun kendi kayıtlarından dolar.
                </p>
              )}
            </div>

            {scope === "team" ? (
              <div className="space-y-2">
                <Label htmlFor="ap-team">Takım</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger id="ap-team">
                    <SelectValue placeholder="Takım seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="ap-athlete">Sporcu</Label>
                <Select value={athleteId} onValueChange={setAthleteId}>
                  <SelectTrigger id="ap-athlete">
                    <SelectValue placeholder="Sporcu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableAthletes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ap-title">Plan Adı</Label>
              <Input
                id="ap-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="2026-2027 Sezonu Kuvvet & Kondisyon"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ap-start">1. Hafta Başlangıcı</Label>
                <Input
                  id="ap-start"
                  type="date"
                  value={seasonStart}
                  onChange={(e) => setSeasonStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap-weeks">Toplam Hafta</Label>
                <Input
                  id="ap-weeks"
                  type="number"
                  min={1}
                  max={104}
                  value={totalWeeks}
                  onChange={(e) => setTotalWeeks(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ap-notes">Not (opsiyonel)</Label>
              <Textarea
                id="ap-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
              İptal
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? "Oluşturuluyor…" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
