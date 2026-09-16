import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeFeatures,
  ALGORITHM_VERSION,
  type DailyMetricRow,
  type WorkoutRow,
  type WellnessRow,
} from "./features.ts";
import { buildPayload } from "./payload.ts";
import { callLLM, type LLMConfig } from "./llm.ts";
import { PROMPT_VERSION } from "./prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RATE_LIMIT_MAX_PER_DAY = 5;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function todayIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1-2. Yetki kontrolü — çağıranın Authorization başlığıyla anon-key
    // istemcisi, rpc('is_super_admin') true dönmezse 403.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const [{ data: isSuperAdmin, error: rpcError }, { data: userData, error: userError }] =
      await Promise.all([
        supabaseAnon.rpc("is_super_admin"),
        supabaseAnon.auth.getUser(),
      ]);

    if (rpcError || isSuperAdmin !== true) {
      return json({ error: "forbidden" }, 403);
    }
    if (userError || !userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const callerId = userData.user.id;

    // 3. Özellik bayrağı
    if (Deno.env.get("AI_ENABLED") !== "true") {
      return json({ error: "ai_disabled" }, 503);
    }

    const aiBaseUrl = Deno.env.get("AI_BASE_URL");
    const aiApiKey = Deno.env.get("AI_API_KEY");
    const aiModel = Deno.env.get("AI_MODEL");
    if (!aiBaseUrl || !aiApiKey || !aiModel) {
      console.error("athlete-ai-insight: AI_BASE_URL/AI_API_KEY/AI_MODEL eksik");
      return json({ error: "ai_disabled" }, 503);
    }

    // 4. Girdi doğrulama
    let body: { athlete_id?: string; date?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }

    const athleteId = body.athlete_id;
    if (!athleteId || !UUID_RE.test(athleteId)) {
      return json({ error: "invalid_athlete_id" }, 400);
    }

    let insightDate: string;
    if (body.date !== undefined) {
      if (typeof body.date !== "string" || !isValidDateString(body.date)) {
        return json({ error: "invalid_date" }, 400);
      }
      insightDate = body.date;
    } else {
      insightDate = todayIstanbul();
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 5. Rate limit — bu sporcu için son 24 saatte oluşturulan kayıt sayısı
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: rateLimitError } = await supabaseService
      .from("athlete_ai_insights")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", athleteId)
      .gte("created_at", since);

    if (rateLimitError) {
      console.error("athlete-ai-insight: rate limit sorgusu başarısız:", rateLimitError.message);
      return json({ error: "internal_error" }, 500);
    }
    if ((recentCount ?? 0) >= RATE_LIMIT_MAX_PER_DAY) {
      return json({ error: "rate_limited" }, 429);
    }

    // 6. Veri yükleme (service role)
    const { data: athlete, error: athleteError } = await supabaseService
      .from("athletes")
      .select("id, birth_date, gender, position, is_active")
      .eq("id", athleteId)
      .maybeSingle();

    if (athleteError || !athlete || !athlete.is_active) {
      return json({ error: "athlete_not_found" }, 404);
    }

    const metricsStart = addDays(insightDate, -41);
    const workoutsStart = `${addDays(insightDate, -8)}T00:00:00.000Z`;
    const workoutsEnd = `${addDays(insightDate, 1)}T00:00:00.000Z`;
    const wellnessStart = addDays(insightDate, -13);

    const [metricsRes, workoutsRes, wellnessRes] = await Promise.all([
      supabaseService
        .from("wearable_daily_metrics")
        .select(
          "metric_date, recovery_score, hrv_rmssd, resting_hr, spo2, total_sleep_min, sleep_score, sleep_efficiency, deep_sleep_min, rem_sleep_min, strain_score, raw_data"
        )
        .eq("athlete_id", athleteId)
        .eq("provider", "whoop")
        .gte("metric_date", metricsStart)
        .lte("metric_date", insightDate)
        .order("metric_date"),
      supabaseService
        .from("whoop_workouts")
        .select("start_time, end_time, sport_name, strain_score, raw_data")
        .eq("athlete_id", athleteId)
        .gte("start_time", workoutsStart)
        .lt("start_time", workoutsEnd),
      supabaseService
        .from("wellness_checkins")
        .select("checkin_date, sleep_quality, soreness, stress, fatigue, mood, sleep_hours, wellness_total")
        .eq("athlete_id", athleteId)
        .gte("checkin_date", wellnessStart)
        .lte("checkin_date", insightDate)
        .order("checkin_date", { ascending: false }),
    ]);

    if (metricsRes.error || workoutsRes.error || wellnessRes.error) {
      console.error(
        "athlete-ai-insight: veri yükleme hatası:",
        metricsRes.error?.message,
        workoutsRes.error?.message,
        wellnessRes.error?.message
      );
      return json({ error: "internal_error" }, 500);
    }

    // 7. İşlem akışı
    const features = computeFeatures({
      insightDate,
      dailyMetrics: (metricsRes.data ?? []) as DailyMetricRow[],
      workouts: (workoutsRes.data ?? []) as WorkoutRow[],
      wellness: (wellnessRes.data ?? []) as WellnessRow[],
      athlete: { birth_date: athlete.birth_date, gender: athlete.gender, position: athlete.position },
    });

    const baseRow = {
      athlete_id: athleteId,
      insight_date: insightDate,
      features,
      prompt_version: PROMPT_VERSION,
      algorithm_version: ALGORITHM_VERSION,
      created_by: callerId,
    };

    if (features.insufficient) {
      const { data: inserted, error: insertError } = await supabaseService
        .from("athlete_ai_insights")
        .insert({
          ...baseRow,
          status: "insufficient_data",
          confidence: null,
          output: null,
          payload_sent: null,
          provider_base_url: null,
          model: null,
          tokens_in: null,
          tokens_out: null,
          latency_ms: null,
          error_code: null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("athlete-ai-insight: kayıt hatası (insufficient_data):", insertError.message);
        return json({ error: "internal_error" }, 500);
      }
      return json(inserted, 200);
    }

    const payload = buildPayload(
      { birth_date: athlete.birth_date, gender: athlete.gender, position: athlete.position },
      insightDate,
      features
    );

    const llmConfig: LLMConfig = { baseUrl: aiBaseUrl, apiKey: aiApiKey, model: aiModel };
    const providerHost = (() => {
      try {
        return new URL(aiBaseUrl).host;
      } catch {
        return null;
      }
    })();

    const result = await callLLM(llmConfig, payload, features.confidence_cap);

    if (result.status === "error") {
      const { error: insertError } = await supabaseService.from("athlete_ai_insights").insert({
        ...baseRow,
        status: "error",
        confidence: null,
        output: null,
        payload_sent: payload,
        provider_base_url: providerHost,
        model: aiModel,
        tokens_in: null,
        tokens_out: null,
        latency_ms: result.latencyMs,
        error_code: result.errorCode,
      });

      if (insertError) {
        console.error("athlete-ai-insight: kayıt hatası (error):", insertError.message);
      }
      return json({ error: result.errorCode }, 502);
    }

    const { data: inserted, error: insertError } = await supabaseService
      .from("athlete_ai_insights")
      .insert({
        ...baseRow,
        status: "ok",
        confidence: result.confidence,
        output: result.output,
        payload_sent: payload,
        provider_base_url: providerHost,
        model: aiModel,
        tokens_in: result.tokensIn,
        tokens_out: result.tokensOut,
        latency_ms: result.latencyMs,
        error_code: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("athlete-ai-insight: kayıt hatası (ok):", insertError.message);
      return json({ error: "internal_error" }, 500);
    }

    return json(inserted, 200);
  } catch (err) {
    console.error("athlete-ai-insight: beklenmedik hata:", err instanceof Error ? err.message : "unknown");
    return json({ error: "internal_error" }, 500);
  }
});
