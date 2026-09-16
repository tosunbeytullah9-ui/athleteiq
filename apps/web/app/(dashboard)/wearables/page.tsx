import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  getWearableConnection,
  getWearableConnections,
  getWearableMetrics,
} from "@athleteiq/db/queries/wearables";
import { toLocalDateString } from "@/lib/date";
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

    const today = toLocalDateString(new Date());
    const weekAgo = toLocalDateString(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

    const [whoopConnection, polarConnection, fitbitConnection] = await Promise.all([
      getWearableConnection(supabase, athlete.id, "whoop"),
      getWearableConnection(supabase, athlete.id, "polar"),
      getWearableConnection(supabase, athlete.id, "fitbit"),
    ]);

    const [whoopMetrics, polarMetrics, fitbitMetrics] = await Promise.all([
      whoopConnection?.is_active
        ? getWearableMetrics(supabase, athlete.id, "whoop", weekAgo, today)
        : Promise.resolve([]),
      polarConnection?.is_active
        ? getWearableMetrics(supabase, athlete.id, "polar", weekAgo, today)
        : Promise.resolve([]),
      fitbitConnection?.is_active
        ? getWearableMetrics(supabase, athlete.id, "fitbit", weekAgo, today)
        : Promise.resolve([]),
    ]);

    return (
      <AthleteWearableClient
        whoopConnection={whoopConnection}
        whoopMetrics={whoopMetrics}
        polarConnection={polarConnection}
        polarMetrics={polarMetrics}
        fitbitConnection={fitbitConnection}
        fitbitMetrics={fitbitMetrics}
        status={status ?? null}
      />
    );
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
