import { createClient } from "@/lib/supabase/server";
import { getWellnessCheckin, getAthleteWellnessHistory } from "@athleteiq/db/queries/wellness";
import { istanbulDateOffset, todayInIstanbul } from "@athleteiq/validators/date";
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

  // İstanbul takvimi — sunucu (Vercel) UTC'de çalışır; yerel/UTC tarih Türkiye'de
  // 00:00–03:00 arası check-in'i önceki güne yazıyordu (Parti 18T).
  const today = todayInIstanbul();

  const [todayCheckin, history] = await Promise.all([
    getWellnessCheckin(supabase, athlete.id, today),
    getAthleteWellnessHistory(supabase, athlete.id, istanbulDateOffset(-7), today),
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
