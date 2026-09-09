import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCompetitions } from "@athleteiq/db/queries/competitions";
import { getAthletes } from "@athleteiq/db/queries/athletes";
import { CompetitionsClient } from "./competitions-client";

export default async function CompetitionsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  const [competitions, teamsResult, athletes] = await Promise.all([
    getCompetitions(supabase, orgId),
    supabase.from("teams").select("id, name").eq("org_id", orgId).order("name"),
    getAthletes(supabase, orgId),
  ]);

  return (
    <CompetitionsClient
      orgId={orgId}
      competitions={competitions}
      teams={teamsResult.data ?? []}
      athletes={athletes.map((a: { id: string; full_name: string; team_id: string | null }) => ({
        id: a.id,
        full_name: a.full_name,
        team_id: a.team_id,
      }))}
    />
  );
}
