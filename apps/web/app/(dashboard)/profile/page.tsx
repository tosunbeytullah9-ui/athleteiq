import { createClient } from "@/lib/supabase/server";
import { getAthleteMaxes } from "@athleteiq/db/queries/exercises";
import { getTestResults } from "@athleteiq/db/queries/tests";
import type { Tables } from "@athleteiq/db/types";
import { ProfileClient } from "./profile-client";

type AthleteProfile = Tables<"athletes"> & {
  teams: { name: string } | null;
  organizations: { name: string } | null;
};

export default async function ProfilePage() {
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

  const { data: athlete } = (await supabase
    .from("athletes")
    .select("*, teams(name), organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle()) as { data: AthleteProfile | null };

  if (!athlete) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Sporcu profili bulunamadı. Koçunuzla iletişime geçin.
        </p>
      </div>
    );
  }

  const [maxes, testResults] = await Promise.all([
    getAthleteMaxes(supabase, athlete.id),
    getTestResults(supabase, athlete.id),
  ]);

  // test_results'ta her test_type için en güncel kaydı al (getTestResults zaten
  // test_date desc sıralı döner — ilk görülen en güncel olan).
  const latestTestByType = new Map<string, (typeof testResults)[number]>();
  for (const t of testResults) {
    if (!latestTestByType.has(t.test_type)) latestTestByType.set(t.test_type, t);
  }

  return (
    <ProfileClient
      athlete={athlete}
      maxes={maxes}
      latestTests={[...latestTestByType.values()]}
    />
  );
}
