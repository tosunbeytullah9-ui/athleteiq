import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAthleteById } from "@athleteiq/db/queries/athletes";
import { getAthleteWellnessHistory } from "@athleteiq/db/queries/wellness";
import { ReadinessDetailClient } from "./readiness-detail-client";

interface Props {
  params: Promise<{ athleteId: string }>;
}

export default async function ReadinessDetailPage({ params }: Props) {
  const { athleteId } = await params;
  const supabase = await createClient();

  const athlete = await getAthleteById(supabase, athleteId).catch(() => null);
  if (!athlete) notFound();

  // Kronolojik bir liste — "bugün mü değil mi" ayrımı yapılmıyor, bu yüzden
  // sunucu saatiyle gevşek bir 15 günlük pencere yeterli (readiness-client.tsx'in
  // aksine burada client-taraflı yerel tarih hesaplamasına ihtiyaç yok).
  const now = new Date();
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 15);
  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() + 1);

  const history = await getAthleteWellnessHistory(
    supabase,
    athleteId,
    from.toISOString().slice(0, 10),
    to.toISOString().slice(0, 10)
  );

  return <ReadinessDetailClient athlete={athlete} history={history} />;
}
