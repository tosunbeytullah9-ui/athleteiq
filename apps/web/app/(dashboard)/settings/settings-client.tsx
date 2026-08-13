"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Users, Building2 } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Badge } from "@athleteiq/ui/components/badge";
import { createClient } from "@/lib/supabase/client";
import { deleteTeam } from "@athleteiq/db/queries/teams";
import { createTeamSchema, type CreateTeamInput } from "@athleteiq/validators/team";
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
}

const PLAN_LABELS: Record<string, string> = {
  free: "Ücretsiz",
  pro: "Pro",
  enterprise: "Kurumsal",
};

const PLAN_COLORS: Record<string, string> = {
  free: "secondary",
  pro: "default",
  enterprise: "default",
};

export function SettingsClient({ orgId, org, teams: initialTeams }: Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
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
      const json = await res.json() as { team?: Team; error?: string };
      if (!res.ok || !json.team) throw new Error(json.error ?? "Takım oluşturulamadı.");
      setTeams((prev) => [...prev, json.team!]);
      reset();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Takım oluşturulurken hata oluştu.");
    }
  }

  async function onDeleteTeam(teamId: string) {
    setIsDeleting(teamId);
    try {
      const supabase = createClient();
      await deleteTeam(supabase, teamId);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    } catch {
      alert("Takım silinirken hata oluştu.");
    } finally {
      setIsDeleting(null);
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

      {/* Organizasyon Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Organizasyon Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {org ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Organizasyon Adı</p>
                <p className="font-medium">{org.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Slug</p>
                <p className="font-medium font-mono text-xs">{org.slug}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Plan</p>
                <Badge variant={(PLAN_COLORS[org.plan ?? "free"] as "default" | "secondary") ?? "secondary"}>
                  {PLAN_LABELS[org.plan ?? "free"] ?? org.plan}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Organizasyon bilgisi yüklenemedi.</p>
          )}
        </CardContent>
      </Card>

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
              {teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{team.name}</p>
                    {team.discipline && (
                      <p className="text-xs text-muted-foreground">{team.discipline}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteTeam(team.id)}
                    disabled={isDeleting === team.id}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
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
                {...register("discipline")}
                placeholder="Örn: artistic, rhythmic, trampoline"
              />
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
    </div>
  );
}
