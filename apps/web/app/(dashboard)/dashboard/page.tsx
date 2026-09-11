import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, UsersRound, ClipboardList, Trophy, AlertTriangle } from "lucide-react";
import {
  getActiveProgramId,
  getDaySessions,
  getTodaySessions,
} from "@athleteiq/db/queries/programs";
import { getAcwrLogs, getLatestAcwrByOrg } from "@athleteiq/db/queries/acwr";
import {
  getWellnessCheckin,
  getAthleteWellnessHistory,
  getOrgWellnessCheckins,
} from "@athleteiq/db/queries/wellness";
import { getAthleteCompetitionEntries } from "@athleteiq/db/queries/competitions";
import { getWearableConnection, getWearableMetrics } from "@athleteiq/db/queries/wearables";
import { getLocalDateString, computeCheckinStreak } from "@athleteiq/validators/wellness";
import { getTodayDayOfWeek, getWeekRange } from "@/lib/date";
import { AthleteDashboardClient } from "./athlete-dashboard-client";
import { AdminDashboardWidgets } from "./admin-dashboard-widgets";

export default async function DashboardPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;
  const role = cookieStore.get("aiq_role")?.value;

  if (!orgId) {
    redirect("/login?error=no_membership");
  }

  if (role === "athlete") {
    return <AthleteDashboardSection />;
  }

  const today = getLocalDateString();

  const [
    athletesRes,
    teamsRes,
    programsRes,
    competitionsRes,
    todaySessions,
    upcomingCompetitionsRes,
    wellnessRows,
    athleteNamesRes,
    latestAcwr,
  ] = await Promise.all([
    supabase
      .from("athletes")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("is_active", true),
    supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("training_programs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("competitions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    getTodaySessions(supabase, orgId, getTodayDayOfWeek()),
    supabase
      .from("competitions")
      .select("id, name, competition_date, location")
      .eq("org_id", orgId)
      .gte("competition_date", today)
      .order("competition_date", { ascending: true })
      .limit(3),
    getOrgWellnessCheckins(supabase, orgId, today, today),
    supabase
      .from("athletes")
      .select("id, full_name")
      .eq("org_id", orgId)
      .eq("is_active", true),
    getLatestAcwrByOrg(supabase, orgId),
  ]);

  const athleteNameMap = new Map(
    (athleteNamesRes.data ?? []).map((a: { id: string; full_name: string }) => [
      a.id,
      a.full_name,
    ])
  );
  const wellnessLowScorers = wellnessRows
    .filter((w) => w.wellness_total != null && w.wellness_total <= 15)
    .map((w) => ({
      full_name: athleteNameMap.get(w.athlete_id) ?? "—",
      wellness_total: w.wellness_total!,
    }))
    .sort((a, b) => a.wellness_total - b.wellness_total);
  const riskAthleteCount = latestAcwr.filter(
    (a) => a.acwr_ratio != null && a.acwr_ratio > 1.5
  ).length;

  const stats = [
    {
      title: "Aktif Sporcular",
      value: athletesRes.count ?? 0,
      icon: Users,
      href: "/athletes",
      tint: "bg-primary/10 text-primary",
    },
    {
      title: "Takımlar",
      value: teamsRes.count ?? 0,
      icon: UsersRound,
      href: "/athletes",
      tint: "bg-violet/10 text-violet",
    },
    {
      title: "Antrenman Programları",
      value: programsRes.count ?? 0,
      icon: ClipboardList,
      href: "/programs",
      tint: "bg-primary/10 text-primary",
    },
    {
      title: "Yarışmalar",
      value: competitionsRes.count ?? 0,
      icon: Trophy,
      href: "/competitions",
      tint: "bg-good/10 text-good",
    },
    {
      title: "Risk Bölgesinde Sporcu",
      value: riskAthleteCount,
      icon: AlertTriangle,
      href: "/acwr",
      tint: "bg-warning/10 text-warning",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organizasyon Özeti</h1>
        <p className="text-muted-foreground mt-1">
          Platformunuzdaki güncel istatistikler
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="rounded-xl transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.tint}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <AdminDashboardWidgets
        todaySessions={todaySessions}
        upcomingCompetitions={upcomingCompetitionsRes.data ?? []}
        wellnessTotal={athleteNamesRes.data?.length ?? 0}
        wellnessSubmitted={wellnessRows.length}
        wellnessLowScorers={wellnessLowScorers}
      />
    </div>
  );
}

// Sporcunun Ana Sayfa'sı — ayrı bir server component olarak tutuluyor ki
// üstteki admin/coach dalı (stats sorguları) hiç çalışmasın; athlete kendi
// verisini kendi sorgu setiyle çeker.
async function AthleteDashboardSection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Oturum bulunamadı.</p>
      </div>
    );
  }

  const { data: athlete } = (await supabase
    .from("athletes")
    .select("id, full_name, team_id")
    .eq("user_id", user.id)
    .maybeSingle()) as {
    data: { id: string; full_name: string; team_id: string | null } | null;
  };

  if (!athlete) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Sporcu profili bulunamadı. Koçunuzla iletişime geçin.
        </p>
      </div>
    );
  }

  const today = getLocalDateString();
  const todayDow = getTodayDayOfWeek();
  const week = getWeekRange();
  const historyFrom = getLocalDateString(
    new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)
  );

  const activeProgramId = await getActiveProgramId(supabase, {
    athleteId: athlete.id,
    teamId: athlete.team_id ?? "",
  });

  const [
    todaySessions,
    weeklyAcwrLogs,
    todayCheckin,
    checkinHistory,
    competitionEntries,
    whoopConnection,
    polarConnection,
  ] = await Promise.all([
    activeProgramId
      ? getDaySessions(supabase, activeProgramId, todayDow)
      : Promise.resolve([]),
    getAcwrLogs(supabase, athlete.id, week.start, week.end),
    getWellnessCheckin(supabase, athlete.id, today),
    getAthleteWellnessHistory(supabase, athlete.id, historyFrom, today),
    getAthleteCompetitionEntries(supabase, athlete.id),
    getWearableConnection(supabase, athlete.id, "whoop"),
    getWearableConnection(supabase, athlete.id, "polar"),
  ]);

  const wearableConnection = whoopConnection ?? polarConnection ?? null;
  const wearableMetrics = wearableConnection
    ? await getWearableMetrics(
        supabase,
        athlete.id,
        wearableConnection.provider as "whoop" | "polar",
        today,
        today
      )
    : [];

  type CompetitionEntry = Awaited<ReturnType<typeof getAthleteCompetitionEntries>>[number] & {
    competitions: { competition_date: string | null } | null;
  };

  const checkinStreak = computeCheckinStreak(
    checkinHistory.map((c: { checkin_date: string }) => c.checkin_date),
    today
  );

  const upcomingEntries = (competitionEntries as CompetitionEntry[])
    .filter((e) => e.competitions?.competition_date && e.competitions.competition_date >= today)
    .sort((a, b) =>
      (a.competitions?.competition_date ?? "").localeCompare(
        b.competitions?.competition_date ?? ""
      )
    );

  return (
    <AthleteDashboardClient
      athleteId={athlete.id}
      userId={user.id}
      fullName={athlete.full_name}
      today={today}
      todaySessions={todaySessions}
      weeklyAcwrLogs={weeklyAcwrLogs}
      todayCheckin={todayCheckin}
      checkinStreak={checkinStreak}
      nextCompetitionEntry={upcomingEntries[0] ?? null}
      wearableProvider={wearableConnection?.provider as "whoop" | "polar" | undefined}
      wearableMetrics={wearableMetrics[0] ?? null}
    />
  );
}
