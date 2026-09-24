import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAthletes } from "@athleteiq/db/queries/athletes";
import type { Tables } from "@athleteiq/db/types";
import { ProgramImportClient } from "./program-import-client";

export default async function ProgramImportPage() {
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

  const [{ data: teams }, athleteRows] = await Promise.all([
    supabase.from("teams").select("id, name").eq("org_id", orgId).order("name"),
    getAthletes(supabase, orgId),
  ]);

  const athletes: Tables<"athletes">[] = athleteRows;

  return (
    <ProgramImportClient
      orgId={orgId}
      teams={teams ?? []}
      athletes={athletes.map((a) => ({
        id: a.id,
        full_name: a.full_name,
        team_id: a.team_id,
        training_group: a.training_group,
        position: a.position,
      }))}
    />
  );
}
