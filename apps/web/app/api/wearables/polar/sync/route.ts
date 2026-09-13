import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  PolarClient,
  commitTransaction,
  fetchExerciseTransaction,
  normalizePolarMetrics,
} from "@athleteiq/integrations/polar";
import type { PolarExercise } from "@athleteiq/integrations/polar";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Polar'da WHOOP'un aksine webhook yok — sporcu (kendi /wearables sayfasından)
// veya koç/admin (sporcunun /wearables/[athleteId] detay sayfasından) bu
// route'u manuel tetikleyerek son verileri çeker. Yetki kontrolü RLS'e
// devredilir: çağıranın kendi cookie oturumuyla athletes satırını okuyabiliyor
// olması (self / admin / coach-team) yeterli koşuldur.

// "PT1H2M30S" → 3750 (saniye). Polar exercise.duration ISO-8601 duration string.
function parseIsoDuration(iso: string): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return Math.round(hours * 3600 + minutes * 60 + seconds);
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

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: connection } = await admin
    .from("wearable_connections")
    .select("id, access_token, provider_user_id")
    .eq("athlete_id", athleteId)
    .eq("provider", "polar")
    .eq("is_active", true)
    .maybeSingle();

  if (!connection?.provider_user_id) {
    return NextResponse.json({ error: "Polar bağlantısı bulunamadı" }, { status: 404 });
  }

  const client = new PolarClient();

  let metricsSynced = 0;
  let exercisesSynced = 0;
  let metricsError: string | null = null;
  let exercisesError: string | null = null;

  // Direct pull (nightly-recharge/sleep) ve transaction pull (egzersizler)
  // birbirinden BAĞIMSIZ iki Polar ürünü/uç noktası — biri erişim sorunu
  // yaşasa bile diğeri çalışabilmeli, bu yüzden ayrı try/catch'lerde.
  try {
    const [recharges, sleeps] = await Promise.all([
      client.getNightlyRechargeResults(connection.access_token),
      client.getSleepResults(connection.access_token),
    ]);

    for (const recharge of recharges) {
      const sleep = sleeps.find((s) => s.date === recharge.date) ?? null;
      const metrics = normalizePolarMetrics(athleteId, recharge, sleep);

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
          raw_data: { recharge, sleep },
        },
        { onConflict: "athlete_id,provider,metric_date" }
      );
      metricsSynced++;
    }
  } catch (err) {
    console.error("Polar nightly-recharge/sleep sync error:", err);
    metricsError = err instanceof Error ? err.message : "Toparlanma/uyku verisi çekilemedi";
  }

  try {
    // SIRA ZORUNLU: önce işle/kaydet, sonra commit et (bkz. CLAUDE.md §6 Agent 5) —
    // commit sonrası aynı veri Polar'dan bir daha gelmez.
    const tx = await fetchExerciseTransaction(connection.access_token, connection.provider_user_id);
    if (tx) {
      const rows = tx.exercises.map((ex: PolarExercise) => ({
        athlete_id: athleteId,
        polar_exercise_id: ex.id,
        sport: ex.sport,
        start_time: ex.start_time,
        duration_sec: parseIsoDuration(ex.duration),
        calories: ex.calories,
        distance_meter: ex.distance ?? null,
        avg_hr: ex.heart_rate?.average ?? null,
        max_hr: ex.heart_rate?.maximum ?? null,
        training_load: ex.training_load ?? null,
        raw_data: ex,
      }));

      if (rows.length > 0) {
        await admin.from("polar_exercises").upsert(rows, { onConflict: "polar_exercise_id" });
        exercisesSynced = rows.length;
      }

      await commitTransaction(connection.access_token, connection.provider_user_id, tx.transactionId);
    }
  } catch (err) {
    console.error("Polar exercise transaction sync error:", err);
    exercisesError = err instanceof Error ? err.message : "Antrenman verisi çekilemedi";
  }

  await admin
    .from("wearable_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  if (metricsError && exercisesError) {
    return NextResponse.json({ error: `${metricsError} / ${exercisesError}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, metricsSynced, exercisesSynced, metricsError, exercisesError });
}
