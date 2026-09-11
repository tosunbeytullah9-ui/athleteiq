"use client";

import { useMemo, useState } from "react";
import { Trophy, MapPin, Calendar } from "lucide-react";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent } from "@athleteiq/ui/components/card";
import type {
  getAthleteCompetitionEntries,
  getAthleteCompetitionResults,
} from "@athleteiq/db/queries/competitions";
import { daysUntil, toLocalDateString } from "@/lib/date";

type CompetitionEntry = Awaited<ReturnType<typeof getAthleteCompetitionEntries>>[number];
type CompetitionResult = Awaited<ReturnType<typeof getAthleteCompetitionResults>>[number];

const LEVEL_LABELS: Record<string, string> = {
  international: "Uluslararası",
  national: "Ulusal",
  regional: "Bölgesel",
  local: "Yerel",
};

const TABS = ["upcoming", "results", "all"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  upcoming: "Yaklaşan",
  results: "Sonuçlar",
  all: "Tümü",
};

interface Props {
  entries: CompetitionEntry[];
  results: CompetitionResult[];
}

// Şemada yarışma/maç türünü ayıran bir kolon yok — gerçek bir ayrım olarak
// team_id'nin dolu olup olmadığı kullanılıyor (takım kapsamlı mı, bireysel mi).
function scopeBadge(teamId: string | null | undefined) {
  return teamId ? (
    <Badge variant="outline" className="text-xs">Takım</Badge>
  ) : (
    <Badge variant="outline" className="text-xs">Bireysel</Badge>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AthleteCompetitionsClient({ entries, results }: Props) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const today = toLocalDateString(new Date());

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) =>
        (a.competitions?.competition_date ?? "").localeCompare(
          b.competitions?.competition_date ?? ""
        )
      ),
    [entries]
  );
  const upcoming = sortedEntries.filter(
    (e) => e.competitions?.competition_date && e.competitions.competition_date >= today
  );
  const past = sortedEntries.filter(
    (e) => !e.competitions?.competition_date || e.competitions.competition_date < today
  );

  const featured = upcoming[0] ?? null;
  const rest = upcoming.slice(1);

  const empty = entries.length === 0 && results.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Müsabakalar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kayıtlı olduğun yarışma ve maçlar
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Henüz hiçbir yarışma veya maça kayıtlı değilsin.
          </p>
        </div>
      ) : (
        <>
          {(tab === "upcoming" || tab === "all") && (
            <div className="space-y-4">
              {featured?.competitions && tab === "upcoming" && (
                <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                          <Trophy className="h-3.5 w-3.5" />
                          Sıradaki Müsabaka
                          {scopeBadge(featured.competitions.team_id)}
                        </div>
                        <p className="mt-2 text-lg font-bold">{featured.competitions.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {featured.competitions.competition_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(featured.competitions.competition_date)}
                            </span>
                          )}
                          {featured.competitions.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {featured.competitions.location}
                            </span>
                          )}
                        </div>
                      </div>
                      {featured.competitions.competition_date && (
                        <div className="text-center shrink-0">
                          <p className="text-3xl font-bold text-primary">
                            {daysUntil(featured.competitions.competition_date)}
                          </p>
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">gün kaldı</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(tab === "all" ? upcoming : rest).length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {tab === "all" ? "Yaklaşan" : "Diğer Yaklaşan Müsabakalar"}
                  </h2>
                  {(tab === "all" ? upcoming : rest).map((entry) => {
                    const comp = entry.competitions;
                    if (!comp) return null;
                    return (
                      <Card key={entry.id}>
                        <CardContent className="flex items-start justify-between gap-4 p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{comp.name}</p>
                              {scopeBadge(comp.team_id)}
                              {comp.level && (
                                <Badge variant="outline" className="text-xs">
                                  {LEVEL_LABELS[comp.level] ?? comp.level}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              {comp.competition_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {formatDate(comp.competition_date)}
                                </span>
                              )}
                              {comp.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {comp.location}
                                </span>
                              )}
                            </div>
                            {entry.notes && (
                              <p className="text-sm text-muted-foreground pt-1">{entry.notes}</p>
                            )}
                          </div>
                          <Badge variant="default" className="shrink-0">
                            Kadrodasın
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {upcoming.length === 0 && tab === "upcoming" && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Yaklaşan bir müsabakan yok.
                </p>
              )}
            </div>
          )}

          {(tab === "results" || tab === "all") && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Sonuçlar
              </h2>
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Henüz kayıtlı bir müsabaka sonucun yok.
                </p>
              ) : (
                results.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{r.competitions?.name ?? "—"}</p>
                          {scopeBadge(r.competitions?.team_id)}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {r.competitions?.competition_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(r.competitions.competition_date)}
                            </span>
                          )}
                          {r.event && <span>{r.event}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {r.rank != null && <p className="text-sm font-bold">{r.rank}. sıra</p>}
                        {r.score != null && (
                          <p className="text-xs text-muted-foreground">{r.score} puan</p>
                        )}
                        {r.rank == null && r.score == null && (
                          <p className="text-xs text-muted-foreground">—</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === "all" && past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Geçmiş Kayıtlar
              </h2>
              {past.map((entry) => {
                const comp = entry.competitions;
                if (!comp) return null;
                return (
                  <Card key={entry.id}>
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{comp.name}</p>
                          {scopeBadge(comp.team_id)}
                        </div>
                        {comp.competition_date && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(comp.competition_date)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
