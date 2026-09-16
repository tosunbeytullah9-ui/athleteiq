import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  FitbitClient,
  normalizeFitbitMetrics,
  refreshToken as refreshFitbitToken,
} from "@athleteiq/integrations/fitbit";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toLocalDateString } from "@/lib/date";

// Fitbit'te WHOOP gibi access token'lar sona eriyor (8sa) — Polar'ın aksine
// burada ensureFreshToken gerekli. Sporcu (kendi /wearables sayfasından) veya
// koç/admin (sporcunun /wearables/[athleteId] detay sayfasından) bu route'u
// manuel tetikler (Fitbit'in gerçek webhook desteği — Subscriptions API —
// bilinçli olarak ertelendi, bkz. CLAUDE.md).

async function ensureFreshToken(
  admin: SupabaseClient,
  connection: {
    id: string;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: string | null;
  },
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

  const tokens = await refreshFitbitToken(connection.refresh_token, clientId, clientSecret);

  await admin
    .from("wearable_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id);

  return tokens.access_token;
}

export async function POST(request: Request) {
  const { athleteId } = (await request.json()) as { athleteId?: string };
  if (!athleteId) {
    return NextResponse.json({ error: "athleteId gerekli" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  // Yetki kontrolü: RLS (athletes_select) self/admin/coach-team dışındakiler
  // için satırı hiç döndürmez.
  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("id", athleteId)
    .maybeSingle();
  if (!athlete) {
    return NextResponse.json({ error: "Sporcu bulunamadı veya yetkiniz yok" }, { status: 403 });
  }

  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Fitbit yapılandırması eksik" }, { status: 500 });
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: connection } = await admin
    .from("wearable_connections")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("athlete_id", athleteId)
    .eq("provider", "fitbit")
    .eq("is_active", true)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "Fitbit bağlantısı bulunamadı" }, { status: 404 });
  }

  let accessToken: string;
  try {
    accessToken = await ensureFreshToken(admin, connection, clientId, clientSecret);
  } catch (err) {
    console.error("Fitbit token refresh error:", err);
    return NextResponse.json({ error: "Fitbit token yenilenemedi" }, { status: 502 });
  }

  const client = new FitbitClient();
  const today = toLocalDateString(new Date());
  const rangeStart = toLocalDateString(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000));
  const tomorrow = toLocalDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));

  let metricsSynced = 0;
  let activitiesSynced = 0;
  let metricsError: string | null = null;
  let activitiesError: string | null = null;

  try {
    const [sleeps, heartRateDays, hrvDays] = await Promise.all([
      client.getSleepLogRange(accessToken, rangeStart, today),
      client.getHeartRateRange(accessToken, today, "30d"),
      client.getHrvRange(accessToken, rangeStart, today),
    ]);

    const dates = new Set<string>([
      ...sleeps.map((s) => s.dateOfSleep),
      ...heartRateDays.map((h) => h.dateTime),
      ...hrvDays.map((h) => h.dateTime),
    ]);

    for (const date of dates) {
      if (date < rangeStart || date > today) continue; // heartRate 30d penceresini 14 güne kırp
      const sleep = sleeps.find((s) => s.dateOfSleep === date) ?? null;
      const heartRateDay = heartRateDays.find((h) => h.dateTime === date) ?? null;
      const hrvDay = hrvDays.find((h) => h.dateTime === date) ?? null;
      const metrics = normalizeFitbitMetrics(athleteId, date, sleep, heartRateDay, hrvDay);

      await admin.from("wearable_daily_metrics").upsert(
        {
          athlete_id: metrics.athleteId,
          provider: metrics.provider,
          metric_date: metrics.metricDate,
          recovery_score: metrics.recoveryScore,
          hrv_rmssd: metrics.hrvRmssd,
          resting_hr: metrics.restingHr,
          spo2: metrics.spo2,
          sleep_score: metrics.sleepScore,
          total_sleep_min: metrics.totalSleepMin,
          deep_sleep_min: metrics.deepSleepMin,
          rem_sleep_min: metrics.remSleepMin,
          sleep_efficiency: metrics.sleepEfficiency,
          strain_score: metrics.strainScore,
          muscle_load: metrics.muscleLoad,
          active_calories: metrics.activeCalories,
          raw_data: { sleep, heartRateDay, hrvDay },
        },
        { onConflict: "athlete_id,provider,metric_date" }
      );
      metricsSynced++;
    }
  } catch (err) {
    console.error("Fitbit sleep/heartrate/hrv sync error:", err);
    metricsError = err instanceof Error ? err.message : "Uyku/kalp atışı verisi çekilemedi";
  }

  try {
    const activities = await client.getActivityLogList(accessToken, {
      beforeDate: tomorrow,
      sort: "desc",
      limit: 20,
    });

    if (activities.length > 0) {
      const rows = activities.map((a) => ({
        athlete_id: athleteId,
        fitbit_log_id: String(a.logId),
        activity_name: a.activityName ?? null,
        start_time: a.startTime,
        duration_sec: a.duration != null ? Math.round(a.duration / 1000) : null,
        calories: a.calories ?? null,
        avg_hr: a.averageHeartRate ?? null,
        // Fitbit "distance" kullanıcının hesap ayarındaki birimde (km veya mil)
        // dönüyor, birim garantisi yok — yanlış etiketlemek yerine null bırakılır,
        // ham değer raw_data'da saklanır.
        distance_meter: null,
        raw_data: a,
      }));
      await admin.from("fitbit_activities").upsert(rows, { onConflict: "fitbit_log_id" });
      activitiesSynced = rows.length;
    }
  } catch (err) {
    console.error("Fitbit activity log sync error:", err);
    activitiesError = err instanceof Error ? err.message : "Antrenman verisi çekilemedi";
  }

  await admin
    .from("wearable_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  if (metricsError && activitiesError) {
    return NextResponse.json({ error: `${metricsError} / ${activitiesError}` }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    metricsSynced,
    exercisesSynced: activitiesSynced,
    metricsError,
    exercisesError: activitiesError,
  });
}
