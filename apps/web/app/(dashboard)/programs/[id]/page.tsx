import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProgramById } from "@athleteiq/db/queries/programs";
import { getAthleteMaxHistory } from "@athleteiq/db/queries/exercises";
import { ProgramDetailClient } from "./program-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProgramDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const program = await getProgramById(supabase, id).catch(() => null);
  if (!program) notFound();

  // Program bireyselse (athlete_id dolu) tonaj hesabı o sporcunun 1RM'lerini kullanır.
  // Takım programında tek bir "sahip" sporcu yok (2.2.E'deki "Son max" rozeti kararıyla
  // aynı gerekçe) — %1RM setleri bu durumda hep "dahil edilmedi" sayılır.
  const [athleteResult, teamResult, athleteMaxHistory] = await Promise.all([
    program.athlete_id
      ? supabase.from("athletes").select("id, full_name, weight_kg").eq("id", program.athlete_id).single()
      : Promise.resolve({ data: null }),
    program.team_id
      ? supabase.from("teams").select("id, name").eq("id", program.team_id).single()
      : Promise.resolve({ data: null }),
    program.athlete_id ? getAthleteMaxHistory(supabase, program.athlete_id) : Promise.resolve([]),
  ]);

  return (
    <ProgramDetailClient
      program={program}
      athlete={athleteResult.data ?? null}
      team={teamResult.data ?? null}
      athleteMaxHistory={athleteMaxHistory}
    />
  );
}
