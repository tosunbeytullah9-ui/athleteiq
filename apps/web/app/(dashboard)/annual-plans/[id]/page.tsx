import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAnnualPlan,
  getAnnualPlanCells,
  getAnnualPlanMethods,
  getAnnualPlanWeeks,
} from "@athleteiq/db/queries/annual-plans";
import { AnnualPlanGrid } from "./annual-plan-grid";

/**
 * Yıllık plan ızgarası (detay).
 *
 * YARIŞMA SATIRI: Excel'deki "MAÇLAR" satırının karşılığı, ama burada veri
 * ÜRETİLMEZ — competitions + competition_entries'ten TÜRETİLİR:
 *   - Takım planı  → competitions.team_id eşleşenler, ARTI o takımdan en az
 *                    bir sporcunun kayıtlı olduğu yarışmalar (org geneli bir
 *                    yarışmaya takımdan sporcu yazıldıysa o da takımı ilgilendirir).
 *   - Sporcu planı → YALNIZCA o sporcunun competition_entries kayıtları.
 * Bireysel branşta her sporcunun yarışma takvimi farklı olduğu için ikinci dal
 * özelliğin çekirdeği. Yarışma verisi ikinci bir yerde TUTULMAZ.
 */
export default async function AnnualPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;
  const role = cookieStore.get("aiq_role")?.value as "admin" | "coach" | "athlete" | undefined;

  if (!orgId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  // RLS annual_plans_select zaten erişimi daraltır — yetkisiz bir plan burada
  // null döner ve 404'e düşer (ayrı bir yetki kontrolü yazmaya gerek yok).
  const plan = await getAnnualPlan(supabase, id);
  if (!plan) notFound();

  const [methods, weeks, cells, competitionsResult] = await Promise.all([
    getAnnualPlanMethods(supabase, orgId, { includeInactive: true }),
    getAnnualPlanWeeks(supabase, id),
    getAnnualPlanCells(supabase, id),
    supabase
      .from("competitions")
      .select(
        "id, name, competition_date, location, level, team_id, competition_entries(athlete_id, athletes(id, team_id))"
      )
      .eq("org_id", orgId)
      .not("competition_date", "is", null),
  ]);

  type CompRow = {
    id: string;
    name: string;
    competition_date: string | null;
    location: string | null;
    level: string | null;
    team_id: string | null;
    competition_entries: { athlete_id: string; athletes: { id: string; team_id: string | null } | null }[];
  };

  const allCompetitions = (competitionsResult.data ?? []) as CompRow[];

  const relevantCompetitions = allCompetitions
    .filter((c) => {
      if (plan.athlete_id) {
        return c.competition_entries.some((e) => e.athlete_id === plan.athlete_id);
      }
      if (plan.team_id) {
        if (c.team_id === plan.team_id) return true;
        return c.competition_entries.some((e) => e.athletes?.team_id === plan.team_id);
      }
      return false;
    })
    .map((c) => ({
      id: c.id,
      name: c.name,
      competition_date: c.competition_date!,
      location: c.location,
      level: c.level,
      entry_count: c.competition_entries.length,
    }));

  return (
    <AnnualPlanGrid
      orgId={orgId}
      plan={plan}
      methods={methods ?? []}
      initialWeeks={weeks ?? []}
      initialCells={cells ?? []}
      competitions={relevantCompetitions}
      canManageMethods={role === "admin" || role === "coach"}
    />
  );
}
