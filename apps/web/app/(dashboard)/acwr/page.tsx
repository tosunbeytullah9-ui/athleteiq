import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getLatestAcwrByOrg } from "@athleteiq/db/queries/acwr";
import { AcwrClient } from "./acwr-client";

export default async function AcwrPage() {
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

  const [athletesResult, latestAcwr] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, full_name, team_id")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("full_name"),
    getLatestAcwrByOrg(supabase, orgId),
  ]);

  return <AcwrClient athletes={athletesResult.data ?? []} latestAcwr={latestAcwr} />;
}
