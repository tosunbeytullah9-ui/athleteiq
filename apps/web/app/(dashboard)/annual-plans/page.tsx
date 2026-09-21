import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAnnualPlans } from "@athleteiq/db/queries/annual-plans";
import { AnnualPlansClient } from "./annual-plans-client";

/**
 * Yıllık plan listesi. attendance/page.tsx ile aynı desen: cookie'den org/rol
 * okunur, veri server component'te çekilip client'a prop olarak geçer.
 *
 * Rol filtresi YAZILMAZ — annual_plans_select RLS'i coach'u kendi takımına
 * (ve o takımın sporcularının bireysel planlarına) zaten daraltır.
 */
export default async function AnnualPlansPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;
  const role = cookieStore.get("aiq_role")?.value as "admin" | "coach" | "athlete" | undefined;
  const teamId = cookieStore.get("aiq_team_id")?.value;

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  const [plans, teamsResult, athletesResult] = await Promise.all([
    getAnnualPlans(supabase, orgId),
    supabase.from("teams").select("id, name").eq("org_id", orgId).order("name"),
    supabase
      .from("athletes")
      .select("id, full_name, team_id")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <AnnualPlansClient
      orgId={orgId}
      plans={plans ?? []}
      teams={teamsResult.data ?? []}
      athletes={athletesResult.data ?? []}
      coachTeamId={role === "coach" ? teamId ?? null : null}
    />
  );
}
