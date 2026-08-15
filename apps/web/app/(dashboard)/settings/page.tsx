import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getTeamCounts } from "@athleteiq/db/queries";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const [teamsResult, orgResult, teamCounts, orgUserCountResult] = await Promise.all([
    admin.from("teams").select("*").eq("org_id", orgId).order("name"),
    admin.from("organizations").select("id, name, slug, plan, logo_url").eq("id", orgId).single(),
    getTeamCounts(admin, orgId),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId),
  ]);

  return (
    <SettingsClient
      orgId={orgId}
      org={orgResult.data}
      teams={teamsResult.data ?? []}
      teamCounts={Object.fromEntries(teamCounts)}
      orgUserCount={orgUserCountResult.count ?? 0}
    />
  );
}
