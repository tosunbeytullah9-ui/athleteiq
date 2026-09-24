import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAthletes } from "@athleteiq/db/queries/athletes";
import type { Tables } from "@athleteiq/db/types";
import { AthleteImportClient } from "./athlete-import-client";

export default async function AthleteImportPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;

  if (!orgId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  // Takımlar RLS ile zaten daraltılı (coach yalnızca kendi takımını görür),
  // bu yüzden içe aktarmanın hedef takım listesi de otomatik daralır.
  const [{ data: teams }, athleteRows] = await Promise.all([
    supabase.from("teams").select("id, name").eq("org_id", orgId).order("name"),
    getAthletes(supabase, orgId, { includeInactive: true }),
  ]);

  const athletes: Tables<"athletes">[] = athleteRows;

  return (
    <AthleteImportClient
      orgId={orgId}
      teams={teams ?? []}
      existingAthletes={athletes.map((a) => ({ full_name: a.full_name, team_id: a.team_id }))}
      existingUsernames={athletes
        .map((a) => a.username)
        .filter((u): u is string => Boolean(u))}
    />
  );
}
