import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAthletes } from "@athleteiq/db/queries/athletes";
import { getLatestAcwrByOrg } from "@athleteiq/db/queries/acwr";
import { AthletesClient } from "./athletes-client";

export default async function AthletesPage() {
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

  const [{ data: teams }, athletes, latestAcwr] = await Promise.all([
    supabase.from("teams").select("id, name").eq("org_id", orgId),
    getAthletes(supabase, orgId, { includeInactive: true }),
    getLatestAcwrByOrg(supabase, orgId),
  ]);

  return (
    <AthletesClient
      athletes={athletes}
      teams={teams ?? []}
      orgId={orgId}
      latestAcwr={latestAcwr}
    />
  );
}
