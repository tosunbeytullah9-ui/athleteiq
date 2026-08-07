import { createClient } from "@/lib/supabase/server";
import { getPlatformExercisesAdmin } from "@athleteiq/db/queries/exercises";
import { ExercisesClient } from "./exercises-client";

export default async function AdminExercisesPage() {
  const supabase = await createClient();
  const exercises = await getPlatformExercisesAdmin(supabase as any);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Super Admin — Egzersiz Kütüphanesi
        </h1>
        <p className="text-muted-foreground mt-1">
          Platform geneli, salt-okunur değil — {exercises.length} egzersiz
        </p>
      </div>
      <ExercisesClient initialExercises={exercises} />
    </div>
  );
}
