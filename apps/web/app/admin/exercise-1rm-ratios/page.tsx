import { createClient } from "@/lib/supabase/server";
import { getExercise1RMRatios } from "@athleteiq/db/queries/exercises";
import { RatiosClient } from "./ratios-client";

export default async function AdminExercise1RMRatiosPage() {
  const supabase = await createClient();
  const ratios = await getExercise1RMRatios(supabase as any);

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
      <RatiosClient initialRatios={ratios} />
    </div>
  );
}
