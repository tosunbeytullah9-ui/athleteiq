"use client";

import { Trophy, MapPin, Calendar } from "lucide-react";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent } from "@athleteiq/ui/components/card";
import type { getAthleteCompetitionEntries } from "@athleteiq/db/queries/competitions";

type CompetitionEntry = Awaited<ReturnType<typeof getAthleteCompetitionEntries>>[number];

const LEVEL_LABELS: Record<string, string> = {
  international: "Uluslararası",
  national: "Ulusal",
  regional: "Bölgesel",
  local: "Yerel",
};

interface Props {
  entries: CompetitionEntry[];
}

export function AthleteCompetitionsClient({ entries }: Props) {
  const todayStr = new Date().toDateString();
  const sorted = [...entries].sort((a, b) => {
    const da = a.competitions?.competition_date ?? "";
    const db = b.competitions?.competition_date ?? "";
    return da.localeCompare(db);
  });
  const upcoming = sorted.filter(
    (e) =>
      e.competitions?.competition_date &&
      new Date(e.competitions.competition_date) >= new Date(todayStr)
  );
  const past = sorted.filter(
    (e) =>
      !e.competitions?.competition_date ||
      new Date(e.competitions.competition_date) < new Date(todayStr)
  );

  function EntryCard({ entry }: { entry: CompetitionEntry }) {
    const comp = entry.competitions;
    if (!comp) return null;
    const isUpcoming =
      comp.competition_date && new Date(comp.competition_date) >= new Date(todayStr);
    return (
      <Card key={entry.id}>
        <CardContent className="flex items-start justify-between gap-4 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{comp.name}</p>
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
                  {new Date(comp.competition_date).toLocaleDateString("tr-TR", {
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
            {entry.notes && (
              <p className="text-sm text-muted-foreground pt-1">{entry.notes}</p>
            )}
          </div>
          {isUpcoming && (
            <Badge variant="default" className="shrink-0">
              Yaklaşan
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Yarışmalarım</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Katılımcı olarak kayıtlı olduğunuz yarışmalar
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Henüz hiçbir yarışmaya kayıtlı değilsiniz.
          </p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Yaklaşan
              </h2>
              <div className="space-y-3">
                {upcoming.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Geçmiş
              </h2>
              <div className="space-y-3">
                {past.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
