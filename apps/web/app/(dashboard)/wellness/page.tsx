import { createClient } from "@/lib/supabase/server";
import { getWellnessCheckin, getAthleteWellnessHistory } from "@athleteiq/db/queries/wellness";
import { getLocalDateString } from "@athleteiq/validators/wellness";
import { WellnessClient } from "./wellness-client";

export default async function WellnessPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Oturum bulunamadı.</p>
      </div>
    );
  }

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, full_name")
    .eq("user_id", user.id)
    .maybeSingle() as { data: { id: string; full_name: string } | null };

  if (!athlete) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Sporcu profili bulunamadı. Koçunuzla iletişime geçin.
        </p>
      </div>
    );
  }

  const today = getLocalDateString();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [todayCheckin, history] = await Promise.all([
    getWellnessCheckin(supabase, athlete.id, today),
    getAthleteWellnessHistory(supabase, athlete.id, getLocalDateString(sevenDaysAgo), today),
  ]);

  return (
    <WellnessClient
      athleteId={athlete.id}
      userId={user.id}
      todayCheckin={todayCheckin}
      history={history}
      today={today}
    />
  );
}
