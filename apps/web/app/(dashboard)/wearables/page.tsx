import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getWearableConnection, getWearableConnections } from "@athleteiq/db/queries/wearables";
import { WearablesClient } from "./wearables-client";
import { AthleteWearableClient } from "./athlete-wearable-client";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function WearablesPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;
  const role = cookieStore.get("aiq_role")?.value;

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  if (role === "athlete") {
    const { status } = await searchParams;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: athlete } = user
      ? await supabase
          .from("athletes")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };

    if (!athlete) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Sporcu profili bulunamadı. Koçunuzla iletişime geçin.
          </p>
        </div>
      );
    }

    const connection = await getWearableConnection(supabase, athlete.id, "whoop");
    return <AthleteWearableClient connection={connection} status={status ?? null} />;
  }

  const [connections, athletesResult] = await Promise.all([
    getWearableConnections(supabase, orgId),
    supabase
      .from("athletes")
      .select("id, full_name")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <WearablesClient
      connections={connections}
      athletes={athletesResult.data ?? []}
    />
  );
}
