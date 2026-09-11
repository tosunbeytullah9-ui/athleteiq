import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-whoop-signature, x-whoop-signature-timestamp",
};

const WHOOP_API = "https://api.prod.whoop.com/developer/v2";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

// bkz. developer.whoop.com/docs/developing/webhooks — timestamp header'ı ham
// body'nin ÖNÜNE eklenip HMAC-SHA256 imzalanır, ardından base64 karşılaştırılır.
// (Önceki sürümde bu prepend adımı eksikti — her imza doğrulaması başarısız olurdu.)
async function verifySignature(
  body: string,
  timestamp: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  let sigBytes: Uint8Array;
  try {
    sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }
  return crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(timestamp + body)
  );
}

interface WebhookEvent {
  user_id: number;
  id: number | string;
  type: string;
  trace_id?: string;
}

interface WearableConnectionRow {
  id: string;
  athlete_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
}

async function ensureFreshToken(
  supabase: ReturnType<typeof createClient>,
  connection: WearableConnectionRow,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0;
  const refreshThreshold = Date.now() + 5 * 60 * 1000;

  if (expiresAt >= refreshThreshold || !connection.refresh_token) {
    return connection.access_token;
  }

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`WHOOP token refresh failed: ${res.status}`);
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await supabase
    .from("wearable_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id);

  return tokens.access_token;
}

async function fetchLatest<T>(path: string, accessToken: string): Promise<T | null> {
  const res = await fetch(`${WHOOP_API}${path}?limit=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    console.error(`WHOOP GET ${path} failed: ${res.status}`);
    return null;
  }
  const data = (await res.json()) as { records: T[] };
  return data.records?.[0] ?? null;
}

// score_state SCORED değilse (PENDING_SCORE/UNSCORABLE) score alanı null gelir —
// bkz. developer.whoop.com/docs/tutorials/get-current-recovery-score.
interface WHOOPCycle {
  id: number;
  start: string;
  score_state: string;
  score: { strain: number; kilojoule: number; average_heart_rate: number; max_heart_rate: number } | null;
}
interface WHOOPSleep {
  start: string;
  score_state: string;
  score: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
    };
    sleep_performance_percentage?: number;
    sleep_efficiency_percentage?: number;
  } | null;
}
interface WHOOPRecovery {
  created_at: string;
  score_state: string;
  score: {
    recovery_score: number;
    hrv_rmssd_milli: number;
    resting_heart_rate: number;
    spo2_percentage?: number;
  } | null;
}

async function syncAthleteWhoopData(
  supabase: ReturnType<typeof createClient>,
  connection: WearableConnectionRow,
  accessToken: string
) {
  const [cycle, sleep, recovery] = await Promise.all([
    fetchLatest<WHOOPCycle>("/cycle", accessToken),
    fetchLatest<WHOOPSleep>("/activity/sleep", accessToken),
    fetchLatest<WHOOPRecovery>("/recovery", accessToken),
  ]);

  const metricDate = (
    recovery?.created_at ??
    sleep?.start ??
    cycle?.start ??
    new Date().toISOString()
  ).slice(0, 10);

  const totalSleepMin = sleep?.score
    ? Math.round(
        (sleep.score.stage_summary.total_in_bed_time_milli -
          sleep.score.stage_summary.total_awake_time_milli) /
          60000
      )
    : null;

  await supabase.from("wearable_daily_metrics").upsert(
    {
      athlete_id: connection.athlete_id,
      provider: "whoop",
      metric_date: metricDate,
      recovery_score: recovery?.score?.recovery_score ?? null,
      hrv_rmssd: recovery?.score?.hrv_rmssd_milli ?? null,
      resting_hr: recovery?.score?.resting_heart_rate ?? null,
      spo2: recovery?.score?.spo2_percentage ?? null,
      sleep_score: sleep?.score?.sleep_performance_percentage ?? null,
      total_sleep_min: totalSleepMin,
      deep_sleep_min: sleep?.score
        ? Math.round(sleep.score.stage_summary.total_slow_wave_sleep_time_milli / 60000)
        : null,
      rem_sleep_min: sleep?.score
        ? Math.round(sleep.score.stage_summary.total_rem_sleep_time_milli / 60000)
        : null,
      sleep_efficiency: sleep?.score?.sleep_efficiency_percentage ?? null,
      strain_score: cycle?.score?.strain ?? null,
      active_calories: cycle?.score ? Math.round(cycle.score.kilojoule / 4.184) : null,
      raw_data: { cycle, sleep, recovery },
    },
    { onConflict: "athlete_id,provider,metric_date" }
  );

  if (cycle) {
    await supabase.from("whoop_cycles").upsert(
      {
        athlete_id: connection.athlete_id,
        whoop_cycle_id: String(cycle.id),
        cycle_start: cycle.start,
        strain_score: cycle.score?.strain ?? null,
        avg_hr: cycle.score?.average_heart_rate ?? null,
        max_hr: cycle.score?.max_heart_rate ?? null,
        kilojoules: cycle.score?.kilojoule ?? null,
        raw_data: cycle,
      },
      { onConflict: "whoop_cycle_id" }
    );
  }

  await supabase
    .from("wearable_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const body = await req.text();
  const signature = req.headers.get("x-whoop-signature") ?? "";
  const timestamp = req.headers.get("x-whoop-signature-timestamp") ?? "";
  const secret = Deno.env.get("WHOOP_WEBHOOK_SECRET")!;

  const valid = await verifySignature(body, timestamp, signature, secret);
  if (!valid) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(body) as WebhookEvent;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Silme event'leri şu an işlenmiyor (ilgili metrik satırlarının temizliği
  // ileri bir partiye bırakıldı) — 200 dönülür ki WHOOP tekrar denemesin.
  if (!event.type.endsWith(".updated")) {
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: connection } = await supabase
    .from("wearable_connections")
    .select("id, athlete_id, access_token, refresh_token, token_expires_at")
    .eq("provider", "whoop")
    .eq("provider_user_id", String(event.user_id))
    .eq("is_active", true)
    .maybeSingle<WearableConnectionRow>();

  if (!connection) {
    console.log(`WHOOP webhook: no active connection for user_id ${event.user_id}`);
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const clientId = Deno.env.get("WHOOP_CLIENT_ID")!;
    const clientSecret = Deno.env.get("WHOOP_CLIENT_SECRET")!;
    const accessToken = await ensureFreshToken(supabase, connection, clientId, clientSecret);
    await syncAthleteWhoopData(supabase, connection, accessToken);
  } catch (err) {
    console.error("WHOOP webhook sync error:", err);
    // 200 döndürülür — token/geçici API hatasında WHOOP'un 5 kez tekrar
    // denemesi (bkz. rate-limit + retry dokümantasyonu) burada faydasız,
    // bir sonraki webhook veya cron senkronu zaten güncel veriyi getirecek.
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
