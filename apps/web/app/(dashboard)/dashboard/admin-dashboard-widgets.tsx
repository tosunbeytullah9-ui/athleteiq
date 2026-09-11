import Link from "next/link";
import { ArrowRight, Calendar, ClipboardList, MapPin, Sunrise } from "lucide-react";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import type { TodaySessionRow } from "@athleteiq/db/queries/programs";
import { SESSION_TYPE_LABELS } from "@/lib/exercise-format";

interface UpcomingCompetition {
  id: string;
  name: string;
  competition_date: string | null;
  location: string | null;
}

interface WellnessLowScorer {
  full_name: string;
  wellness_total: number;
}

interface Props {
  todaySessions: TodaySessionRow[];
  upcomingCompetitions: UpcomingCompetition[];
  wellnessTotal: number;
  wellnessSubmitted: number;
  wellnessLowScorers: WellnessLowScorer[];
}

export function AdminDashboardWidgets({
  todaySessions,
  upcomingCompetitions,
  wellnessTotal,
  wellnessSubmitted,
  wellnessLowScorers,
}: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] items-start">
      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Bugünün Programı
          </CardTitle>
          <Link href="/programs" className="flex items-center gap-1 text-xs font-medium text-primary">
            Tüm programlar <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Bugün için yayınlanmış bir seans yok.
            </p>
          ) : (
            <div className="space-y-1">
              {todaySessions.slice(0, 6).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 border-b py-2.5 text-sm last:border-0"
                >
                  <Badge className="shrink-0">
                    {SESSION_TYPE_LABELS[session.session_type ?? ""] ?? session.session_type ?? "Seans"}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {session.title ?? "Antrenman"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {session.team_name ?? session.athlete_name ?? "—"}
                  </span>
                  {session.duration_min && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {session.duration_min} dk
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Yaklaşan Yarışmalar</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingCompetitions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Yaklaşan yarışma yok.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingCompetitions.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {c.competition_date ? (
                        <>
                          <span className="text-[10px] font-semibold leading-none">
                            {new Date(c.competition_date + "T00:00:00").toLocaleDateString("tr-TR", {
                              month: "short",
                            })}
                          </span>
                          <span className="text-sm font-bold leading-none">
                            {new Date(c.competition_date + "T00:00:00").getDate()}
                          </span>
                        </>
                      ) : (
                        <Calendar className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      {c.location && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {c.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sunrise className="h-4 w-4" />
              Wellness Özeti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Bugün check-in yapan:{" "}
              <span className="font-semibold text-foreground">
                {wellnessSubmitted}/{wellnessTotal}
              </span>
            </p>
            {wellnessLowScorers.length > 0 && (
              <div className="space-y-1.5 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Düşük skor</p>
                {wellnessLowScorers.slice(0, 4).map((w) => (
                  <div key={w.full_name} className="flex items-center justify-between text-sm">
                    <span>{w.full_name}</span>
                    <Badge variant="destructive" className="text-xs">
                      {w.wellness_total}/25
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
