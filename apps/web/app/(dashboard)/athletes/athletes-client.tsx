"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, UserCircle2 } from "lucide-react";
import { Input } from "@athleteiq/ui/components/input";
import { Badge } from "@athleteiq/ui/components/badge";
import { Skeleton } from "@athleteiq/ui/components/skeleton";
import { AddAthleteModal } from "@/components/features/athletes/add-athlete-modal";
import { GrantAccessModal } from "@/components/features/athletes/grant-access-modal";
import { ResetPasswordModal } from "@/components/features/athletes/reset-password-modal";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import type { Tables } from "@athleteiq/db/types";

type Athlete = Tables<"athletes">;
type Team = { id: string; name: string };

interface Props {
  athletes: Athlete[];
  teams: Team[];
  orgId: string;
}

function calculateAge(birthDate: string | null): string {
  if (!birthDate) return "—";
  const age = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
  return `${age} yaş`;
}

export function AthletesClient({ athletes: initialAthletes, teams, orgId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("program-updates-athletes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "training_programs",
          filter: "is_published=eq.true",
        },
        () => {
          router.refresh();
          toast({ title: "Yeni program yayınlandı" });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const filtered = useMemo(() => {
    return initialAthletes.filter((a) => {
      const matchSearch = a.full_name.toLowerCase().includes(search.toLowerCase());
      const matchTeam = selectedTeam === "all" || a.team_id === selectedTeam;
      return matchSearch && matchTeam;
    });
  }, [initialAthletes, search, selectedTeam]);

  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t.name])),
    [teams]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sporcular</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {initialAthletes.length} sporcu kayıtlı
          </p>
        </div>
        <AddAthleteModal teams={teams} orgId={orgId} onSuccess={() => router.refresh()} />
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Sporcu ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">Tüm Takımlar</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <UserCircle2 className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || selectedTeam !== "all"
              ? "Arama kriterlerine uyan sporcu bulunamadı."
              : "Henüz sporcu eklenmemiş."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ad Soyad</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Takım</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Yaş</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Branş</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Durum</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Giriş</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((athlete) => (
                <tr
                  key={athlete.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/athletes/${athlete.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {athlete.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <span className="font-medium">{athlete.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {teamMap[athlete.team_id] ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {calculateAge(athlete.birth_date)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {athlete.position ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={athlete.is_active ? "default" : "secondary"}>
                      {athlete.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {athlete.user_id ? (
                        <>
                          <Badge variant="outline">
                            {athlete.username ? `@${athlete.username}` : "Giriş var"}
                          </Badge>
                          <ResetPasswordModal
                            athlete={{
                              id: athlete.id,
                              full_name: athlete.full_name,
                              username: athlete.username,
                            }}
                            onSuccess={() => router.refresh()}
                          />
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">Giriş yok</Badge>
                          <GrantAccessModal
                            athlete={{ id: athlete.id, full_name: athlete.full_name }}
                            onSuccess={() => router.refresh()}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
