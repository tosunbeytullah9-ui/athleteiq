import type { DbClient } from "./_client";

export type PlatformExercise = {
  id: string;
  name: string;
  name_tr: string | null;
  movement_pattern: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  sport_tags: string[];
  equipment: string[];
  load_type: string | null;
  is_unilateral: boolean | null;
  difficulty: string | null;
  demo_url: string | null;
  instructions: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

export type OrgExerciseCategory = {
  id: string;
  org_id: string;
  name: string;
  name_tr: string | null;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type OrgExercise = {
  id: string;
  org_id: string;
  created_by: string | null;
  updated_by: string | null;
  forked_from_platform: string | null;
  name: string;
  name_tr: string | null;
  movement_pattern: string | null;
  custom_category_id: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  sport_tags: string[];
  equipment: string[];
  load_type: string | null;
  is_unilateral: boolean | null;
  difficulty: string | null;
  demo_url: string | null;
  instructions: string | null;
  coach_notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Athlete1RMRecord = {
  id: string;
  athlete_id: string;
  exercise_id: string | null;
  exercise_source: string | null;
  exercise_name: string;
  weight_kg: number;
  test_date: string;
  notes: string | null;
  created_at: string | null;
};

export type CombinedExercise =
  | (PlatformExercise & { _source: "platform"; custom_category_id?: null })
  | (OrgExercise & { _source: "org" });

export interface GetExercisesFilters {
  movement_pattern?: string;
  custom_category_id?: string;
  sport_tag?: string;
  search?: string;
  org_id?: string;
  source?: "platform" | "org" | "all";
}

export async function getPlatformExercises(
  client: DbClient,
  filters?: Pick<GetExercisesFilters, "movement_pattern" | "sport_tag" | "search">
): Promise<PlatformExercise[]> {
  let query = (client as any)
    .from("platform_exercises")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (filters?.movement_pattern) {
    query = query.eq("movement_pattern", filters.movement_pattern);
  }
  if (filters?.sport_tag) {
    query = query.contains("sport_tags", [filters.sport_tag]);
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,name_tr.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPlatformExercisesAdmin(
  client: DbClient
): Promise<PlatformExercise[]> {
  const { data, error } = await (client as any)
    .from("platform_exercises")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function createPlatformExercise(
  client: DbClient,
  data: Omit<PlatformExercise, "id" | "created_at">
): Promise<PlatformExercise> {
  const { data: result, error } = await (client as any)
    .from("platform_exercises")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updatePlatformExercise(
  client: DbClient,
  id: string,
  data: Partial<Omit<PlatformExercise, "id" | "created_at">>
): Promise<PlatformExercise> {
  const { data: result, error } = await (client as any)
    .from("platform_exercises")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function getOrgExercises(
  client: DbClient,
  orgId: string,
  filters?: Pick<GetExercisesFilters, "movement_pattern" | "custom_category_id" | "search">
): Promise<OrgExercise[]> {
  let query = (client as any)
    .from("org_exercises")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("name");

  if (filters?.movement_pattern) {
    query = query.eq("movement_pattern", filters.movement_pattern);
  }
  if (filters?.custom_category_id) {
    query = query.eq("custom_category_id", filters.custom_category_id);
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,name_tr.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getExercises(
  client: DbClient,
  filters?: GetExercisesFilters
): Promise<CombinedExercise[]> {
  const source = filters?.source ?? "all";
  const results: CombinedExercise[] = [];

  if (source === "platform" || source === "all") {
    const platform = await getPlatformExercises(client, filters);
    for (const ex of platform) {
      results.push({ ...ex, _source: "platform" as const, custom_category_id: null });
    }
  }

  if ((source === "org" || source === "all") && filters?.org_id) {
    const org = await getOrgExercises(client, filters.org_id, filters);
    for (const ex of org) {
      results.push({ ...ex, _source: "org" as const });
    }
  }

  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

export async function createOrgExercise(
  client: DbClient,
  data: Omit<OrgExercise, "id" | "created_at" | "updated_at">
): Promise<OrgExercise> {
  const { data: result, error } = await (client as any)
    .from("org_exercises")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updateOrgExercise(
  client: DbClient,
  id: string,
  data: Partial<Omit<OrgExercise, "id" | "org_id" | "created_at">>
): Promise<OrgExercise> {
  const { data: result, error } = await (client as any)
    .from("org_exercises")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function deleteOrgExercise(
  client: DbClient,
  id: string
): Promise<void> {
  const { error } = await (client as any)
    .from("org_exercises")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function getOrgCategories(
  client: DbClient,
  orgId: string
): Promise<OrgExerciseCategory[]> {
  const { data, error } = await (client as any)
    .from("org_exercise_categories")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function createOrgCategory(
  client: DbClient,
  data: Omit<OrgExerciseCategory, "id" | "created_at" | "updated_at">
): Promise<OrgExerciseCategory> {
  const { data: result, error } = await (client as any)
    .from("org_exercise_categories")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updateOrgCategory(
  client: DbClient,
  id: string,
  data: Partial<Omit<OrgExerciseCategory, "id" | "org_id" | "created_at">>
): Promise<OrgExerciseCategory> {
  const { data: result, error } = await (client as any)
    .from("org_exercise_categories")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function deleteOrgCategory(
  client: DbClient,
  id: string
): Promise<void> {
  const { error } = await (client as any)
    .from("org_exercise_categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function forkPlatformExercise(
  client: DbClient,
  platformExerciseId: string,
  orgId: string,
  userId: string
): Promise<OrgExercise> {
  const { data: platform, error: fetchError } = await (client as any)
    .from("platform_exercises")
    .select("*")
    .eq("id", platformExerciseId)
    .single();

  if (fetchError || !platform) throw fetchError ?? new Error("Platform exercise not found");

  const payload: Omit<OrgExercise, "id" | "created_at" | "updated_at"> = {
    org_id: orgId,
    created_by: userId,
    updated_by: null,
    forked_from_platform: platformExerciseId,
    name: platform.name,
    name_tr: platform.name_tr,
    movement_pattern: platform.movement_pattern,
    custom_category_id: null,
    primary_muscles: platform.primary_muscles ?? [],
    secondary_muscles: platform.secondary_muscles ?? [],
    sport_tags: platform.sport_tags ?? [],
    equipment: platform.equipment ?? [],
    load_type: platform.load_type,
    is_unilateral: platform.is_unilateral,
    difficulty: platform.difficulty,
    demo_url: platform.demo_url,
    instructions: platform.instructions,
    coach_notes: null,
    is_active: true,
  };

  return createOrgExercise(client, payload);
}

export async function getAthleteMaxes(
  client: DbClient,
  athleteId: string
): Promise<Athlete1RMRecord[]> {
  const { data, error } = await (client as any)
    .from("athlete_1rm_records")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("test_date", { ascending: false });

  if (error) throw error;

  // En güncel 1RM'i her egzersiz için döndür
  const seen = new Set<string>();
  const latest: Athlete1RMRecord[] = [];
  for (const r of (data ?? []) as Athlete1RMRecord[]) {
    if (!seen.has(r.exercise_name)) {
      seen.add(r.exercise_name);
      latest.push(r);
    }
  }
  return latest;
}

export async function create1RMRecord(
  client: DbClient,
  data: Omit<Athlete1RMRecord, "id" | "created_at">
): Promise<Athlete1RMRecord> {
  const { data: result, error } = await (client as any)
    .from("athlete_1rm_records")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result;
}

/** Her egzersiz adı için en güncel 1RM kaydına hızlı erişim. */
export function buildMaxLookup(athleteMaxes: Athlete1RMRecord[]): Map<string, number> {
  const lookup = new Map<string, number>();
  for (const record of athleteMaxes) {
    if (!lookup.has(record.exercise_name)) {
      lookup.set(record.exercise_name, record.weight_kg);
    }
  }
  return lookup;
}

/** %1RM -> gerçek kg. 1RM kaydı yoksa null (hata değil). */
export function resolveOneRepMaxKg(
  exerciseName: string,
  percent1rm: number,
  maxLookup: Map<string, number>
): number | null {
  const oneRm = maxLookup.get(exerciseName);
  if (oneRm == null) return null;
  return (percent1rm / 100) * oneRm;
}
