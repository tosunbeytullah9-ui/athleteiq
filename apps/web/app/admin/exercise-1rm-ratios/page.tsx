import { createClient } from "@/lib/supabase/server";
import { getExercise1RMRatios, getPlatformExercises } from "@athleteiq/db/queries/exercises";
import { RatiosClient } from "./ratios-client";

export default async function AdminExercise1RMRatiosPage() {
  const supabase = await createClient();
  const [ratios, platformExercises] = await Promise.all([
    getExercise1RMRatios(supabase as any),
    getPlatformExercises(supabase as any),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Super Admin — 1RM Oran İlişkileri
        </h1>
        <p className="text-muted-foreground mt-1">
          Sporcunun bir egzersizde doğrudan 1RM kaydı yoksa, ilişkili bir temel egzersizden
          tahmini hesaplamak için kullanılır — {ratios.length} ilişki
        </p>
      </div>
      <RatiosClient initialRatios={ratios} platformExercises={platformExercises} />
    </div>
  );
}
