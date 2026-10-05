import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getPlatformExercises } from "@athleteiq/db/queries/exercises";
import { getDrillDiagrams } from "@athleteiq/db/queries/drills";
import { ExercisesClient } from "./exercises-client";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ drills?: string }>;
}) {
  const { drills: drillsParam } = await searchParams;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;
  const userRole = cookieStore.get("aiq_role")?.value ?? "coach";

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Oturum bulunamadı.</p>
      </div>
    );
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Drill diyagramları kullanıcının KENDİ oturumuyla çekilir (service role DEĞİL) —
  // RLS yalnızca koç/admin'e açar, sporcu bu sayfaya zaten giremez.
  const canSeeDrills = userRole === "admin" || userRole === "coach";
  const [platformExercises, orgExercises, categories, drills] = await Promise.all([
    getPlatformExercises(supabase),
    admin.from("org_exercises").select("*").eq("org_id", orgId).order("name"),
    admin.from("org_exercise_categories").select("*").eq("org_id", orgId).order("name"),
    canSeeDrills ? getDrillDiagrams(supabase, orgId).catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <ExercisesClient
      platformExercises={platformExercises}
      orgExercises={(orgExercises.data ?? []) as Parameters<typeof ExercisesClient>[0]["orgExercises"]}
      categories={(categories.data ?? []) as Parameters<typeof ExercisesClient>[0]["categories"]}
      orgId={orgId}
      userId={user.id}
      userRole={userRole}
      drills={drills}
      initialDrillFilter={drillsParam === "1"}
    />
  );
}
