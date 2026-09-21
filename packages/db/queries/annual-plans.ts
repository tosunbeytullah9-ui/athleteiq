import type { DbClient } from "./_client";
import type { TablesInsert, TablesUpdate } from "../types";

/**
 * Yıllık (sezonluk) periyodizasyon planı sorguları.
 * Şema/RLS: supabase/migrations/20260921081206_annual_plans.sql
 *
 * RLS zaten org/takım kapsamını daraltır (coach yalnızca kendi takımı) —
 * bu fonksiyonlarda ayrıca rol bazlı dallanma YAPILMAZ, attendance/programs
 * sorgularındaki desenle aynı.
 */

// ---------------------------------------------
// Antrenman sistemi kütüphanesi (org'a özel satır başlıkları)
// ---------------------------------------------

export async function getAnnualPlanMethods(
  client: DbClient,
  orgId: string,
  options: { includeInactive?: boolean } = {}
) {
  let query = client
    .from("annual_plan_methods")
    .select("*")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!options.includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createAnnualPlanMethod(
  client: DbClient,
  method: TablesInsert<"annual_plan_methods">
) {
  const { data, error } = await client
    .from("annual_plan_methods")
    .insert(method)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAnnualPlanMethod(
  client: DbClient,
  id: string,
  updates: TablesUpdate<"annual_plan_methods">
) {
  const { data, error } = await client
    .from("annual_plan_methods")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Bir organizasyonun kütüphanesini verilen varsayılanlarla TOHUMLAR.
 * Idempotent: zaten satır varsa hiçbir şey yapmaz ve mevcut satırları döner —
 * bu yüzden "plan oluşturulurken koşulsuz çağır" güvenlidir.
 *
 * Yarış koşulu (iki koç aynı anda ilk planı oluşturursa) unique index
 * (org_id, lower(name)) tarafından yakalanır; ikinci çağrı 23505 alır ve
 * mevcut satırları okuyarak devam eder — tohumlama başarısızlığı plan
 * oluşturmayı DÜŞÜRMEZ.
 */
export async function seedAnnualPlanMethods(
  client: DbClient,
  orgId: string,
  defaults: readonly { name: string; color: string }[],
  createdBy?: string | null
) {
  const existing = await getAnnualPlanMethods(client, orgId, { includeInactive: true });
  if (existing.length > 0) return existing;

  const { error } = await client.from("annual_plan_methods").insert(
    defaults.map((m, i) => ({
      org_id: orgId,
      name: m.name,
      color: m.color,
      sort_order: i,
      created_by: createdBy ?? null,
    }))
  );

  // 23505 = unique_violation → başka biri bizden önce tohumladı, sorun değil.
  if (error && (error as { code?: string }).code !== "23505") throw error;

  return getAnnualPlanMethods(client, orgId, { includeInactive: true });
}

// ---------------------------------------------
// Planlar
// ---------------------------------------------

export async function getAnnualPlans(client: DbClient, orgId: string) {
  const { data, error } = await client
    .from("annual_plans")
    .select("*, teams(id, name), athletes(id, full_name, team_id)")
    .eq("org_id", orgId)
    .order("season_start", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAnnualPlan(client: DbClient, id: string) {
  const { data, error } = await client
    .from("annual_plans")
    .select("*, teams(id, name), athletes(id, full_name, team_id)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAnnualPlan(
  client: DbClient,
  plan: TablesInsert<"annual_plans">
) {
  const { data, error } = await client.from("annual_plans").insert(plan).select().single();
  if (error) throw error;
  return data;
}

export async function updateAnnualPlan(
  client: DbClient,
  id: string,
  updates: TablesUpdate<"annual_plans">
) {
  const { data, error } = await client
    .from("annual_plans")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAnnualPlan(client: DbClient, id: string): Promise<void> {
  const { error } = await client.from("annual_plans").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------
// Hafta bağlamı + ızgara hücreleri
// ---------------------------------------------

export async function getAnnualPlanWeeks(client: DbClient, planId: string) {
  const { data, error } = await client
    .from("annual_plan_weeks")
    .select("*")
    .eq("plan_id", planId)
    .order("week_index", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getAnnualPlanCells(client: DbClient, planId: string) {
  const { data, error } = await client
    .from("annual_plan_cells")
    .select("*")
    .eq("plan_id", planId);

  if (error) throw error;
  return data;
}

/**
 * Bir haftanın bağlam satırını (yoğunluk/faz/yer/not) yazar. Tüm alanlar
 * boşaltıldıysa satırı SİLER — seyrek tablo sözleşmesi (bkz. migration).
 */
export async function upsertAnnualPlanWeek(
  client: DbClient,
  planId: string,
  week: {
    week_index: number;
    intensity_pct?: number | null;
    phase?: string | null;
    location?: string | null;
    notes?: string | null;
  }
): Promise<void> {
  const isEmpty =
    week.intensity_pct == null &&
    !week.phase?.trim() &&
    !week.location?.trim() &&
    !week.notes?.trim();

  if (isEmpty) {
    const { error } = await client
      .from("annual_plan_weeks")
      .delete()
      .eq("plan_id", planId)
      .eq("week_index", week.week_index);
    if (error) throw error;
    return;
  }

  const { error } = await client.from("annual_plan_weeks").upsert(
    {
      plan_id: planId,
      week_index: week.week_index,
      intensity_pct: week.intensity_pct ?? null,
      phase: week.phase?.trim() || null,
      location: week.location?.trim() || null,
      notes: week.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "plan_id,week_index" }
  );
  if (error) throw error;
}

/**
 * Tek bir ızgara hücresini yazar. sessions <= 0 ise satırı SİLER —
 * annual_plan_cells seyrektir ve DB check'i `sessions >= 1` olduğu için
 * 0'ı yazmaya çalışmak zaten hata verirdi.
 */
export async function setAnnualPlanCell(
  client: DbClient,
  planId: string,
  methodId: string,
  weekIndex: number,
  sessions: number
): Promise<void> {
  if (sessions <= 0) {
    const { error } = await client
      .from("annual_plan_cells")
      .delete()
      .eq("plan_id", planId)
      .eq("method_id", methodId)
      .eq("week_index", weekIndex);
    if (error) throw error;
    return;
  }

  const { error } = await client.from("annual_plan_cells").upsert(
    {
      plan_id: planId,
      method_id: methodId,
      week_index: weekIndex,
      sessions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "plan_id,method_id,week_index" }
  );
  if (error) throw error;
}

/**
 * Bir haftanın TÜM hücrelerini başka haftalara kopyalar — Excel'de blok
 * seçip sağa sürüklemenin karşılığı. Hedef haftaların mevcut hücreleri
 * önce temizlenir, böylece kaynak haftada boş olan satır hedefte de boşalır
 * (kısmi/karışık bir hafta bırakmaz).
 */
export async function copyAnnualPlanWeek(
  client: DbClient,
  planId: string,
  sourceWeek: number,
  targetWeeks: number[]
): Promise<void> {
  const targets = targetWeeks.filter((w) => w !== sourceWeek);
  if (targets.length === 0) return;

  const { data: sourceCells, error: readError } = await client
    .from("annual_plan_cells")
    .select("method_id, sessions")
    .eq("plan_id", planId)
    .eq("week_index", sourceWeek);
  if (readError) throw readError;

  const { error: clearError } = await client
    .from("annual_plan_cells")
    .delete()
    .eq("plan_id", planId)
    .in("week_index", targets);
  if (clearError) throw clearError;

  const rows = (sourceCells ?? []).flatMap((cell: { method_id: string; sessions: number }) =>
    targets.map((week_index) => ({
      plan_id: planId,
      method_id: cell.method_id,
      week_index,
      sessions: cell.sessions,
    }))
  );
  if (rows.length === 0) return;

  const { error: insertError } = await client.from("annual_plan_cells").insert(rows);
  if (insertError) throw insertError;
}
