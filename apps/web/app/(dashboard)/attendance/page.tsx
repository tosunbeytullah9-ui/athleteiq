import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AttendanceClient } from "./attendance-client";

export default async function AttendancePage() {
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

  // teams_select (034_teams_rls_fix.sql): org'daki her üye tüm takımları görebilir.
  // athletes_select (002_rls.sql + 025): coach için RLS zaten kendi takımına daraltır,
  // admin için org geneli döner — burada rol bazlı ayrı bir sorgu yazmaya gerek yok.
  const [teamsResult, athletesResult] = await Promise.all([
    supabase.from("teams").select("id, name").eq("org_id", orgId).order("name"),
    supabase
      .from("athletes")
      .select("id, full_name, team_id")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <AttendanceClient
      orgId={orgId}
      teams={teamsResult.data ?? []}
      athletes={athletesResult.data ?? []}
      defaultTeamId={role === "coach" ? teamId ?? null : null}
    />
  );
}
