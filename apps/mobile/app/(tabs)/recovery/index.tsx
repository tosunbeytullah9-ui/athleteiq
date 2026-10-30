import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { WEARABLES_ENABLED } from "@/lib/features";
import { useAthleteProfile } from "@/lib/hooks/useAthleteProfile";
import type { Database } from "@athleteiq/db/types";
import { addDaysYmd, formatYmdTr, todayInIstanbul, todayLocal } from "@athleteiq/validators/date";

type WearableMetric =
  Database["public"]["Tables"]["wearable_daily_metrics"]["Row"];

function RecoveryRing({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <View className="w-28 h-28 rounded-full bg-gray-100 items-center justify-center">
        <Text className="text-gray-400 text-2xl">—</Text>
      </View>
    );
  }

  const color =
    score >= 67
      ? "border-green-400"
      : score >= 34
      ? "border-yellow-400"
      : "border-red-400";

  const textColor =
    score >= 67
      ? "text-green-600"
      : score >= 34
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <View
      className={`w-28 h-28 rounded-full border-8 ${color} items-center justify-center`}
    >
      <Text className={`text-3xl font-black ${textColor}`}>
        {Math.round(score)}
      </Text>
      <Text className="text-gray-400 text-xs">/ 100</Text>
    </View>
  );
}

function MetricRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
}) {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
      <Text className="text-gray-500 text-sm">{label}</Text>
      <Text className="text-gray-900 font-semibold text-sm">
        {value != null ? `${value} ${unit}` : "—"}
      </Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  // metric_date saatsiz takvim günü — new Date(str) UTC gece yarısı olurdu (Parti 18T).
  return formatYmdTr(dateStr, { withYear: false });
}

export default function RecoveryScreen() {
  const { athlete, loading: athleteLoading } = useAthleteProfile();
  const [metrics, setMetrics] = useState<WearableMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);

  async function fetchData(athleteId: string) {
    // Wearable bağlantısı var mı?
    const { data: conn } = await supabase
      .from("wearable_connections")
      .select("id, provider, last_synced_at")
      .eq("athlete_id", athleteId)
      .eq("is_active", true)
      .limit(1);

    setConnected((conn?.length ?? 0) > 0);

    // Son 7 günlük metrikler
    // [bugün-7, bugün] — "bugün" telefonun takvim günü (todayLocal). Üst sınır olmadan
    // ileri tarihli bir satır "son ölçüm" olarak görünürdü; ancak metric_date sağlayıcının
    // (UTC/İstanbul) gününden türediği için üst sınır ikisinden ilerideki olur — aksi
    // halde ABD'deki bir telefonda akşam saatlerinde en yeni ölçüm gizlenirdi.
    const local = todayLocal();
    const istanbul = todayInIstanbul();
    const today = istanbul > local ? istanbul : local;
    const since = addDaysYmd(local, -7);

    const { data } = await supabase
      .from("wearable_daily_metrics")
      .select("*")
      .eq("athlete_id", athleteId)
      .gte("metric_date", since)
      .lte("metric_date", today)
      .order("metric_date", { ascending: false });

    if (data) setMetrics(data);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    if (!athlete) {
      setLoading(false);
      return;
    }
    fetchData(athlete.id);
  }, [athlete]);

  const onRefresh = () => {
    if (!athlete) return;
    setRefreshing(true);
    fetchData(athlete.id);
  };

  if (athleteLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  const latest = metrics[0] ?? null;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
      }
    >
      {/* Header */}
      <View className="bg-blue-700 px-5 pt-14 pb-6">
        <Text className="text-white text-2xl font-bold">Recovery</Text>
        <Text className="text-blue-200 text-sm mt-1">
          {latest ? formatDate(latest.metric_date) : "Bugün"}
        </Text>
      </View>

      <View className="p-4">
        {!connected ? (
          /* Wearable bağlı değil */
          <View className="bg-white rounded-2xl p-6 items-center mt-2">
            <Text className="text-4xl mb-3">⌚</Text>
            <Text className="text-gray-900 font-semibold text-lg text-center">
              {WEARABLES_ENABLED ? "Wearable Bağlı Değil" : "Recovery verileri yakında"}
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-2">
              {WEARABLES_ENABLED
                ? "Recovery verilerini görmek için Profil ekranından WHOOP cihazınızı bağlayın. Polar ve Fitbit bağlantıları web panelinden yapılır."
                : "Giyilebilir cihaz entegrasyonu yakında eklenecek."}
            </Text>
          </View>
        ) : metrics.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center mt-2">
            <Text className="text-4xl mb-3">📡</Text>
            <Text className="text-gray-900 font-semibold text-lg text-center">
              Veri Bekleniyor
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-2">
              Cihazınız bağlı. İlk veriler yakında senkronize edilecek.
            </Text>
          </View>
        ) : (
          <>
            {/* Recovery skoru */}
            <View className="bg-white rounded-2xl p-5 items-center mb-4 shadow-sm">
              <RecoveryRing score={latest?.recovery_score ?? null} />
              <Text className="text-gray-900 font-bold text-lg mt-3">
                Recovery Skoru
              </Text>
              <Text className="text-gray-400 text-sm">
                {latest
                  ? latest.provider === "whoop"
                    ? "WHOOP"
                    : "Polar"
                  : ""}{" "}
                · {latest ? formatDate(latest.metric_date) : ""}
              </Text>
            </View>

            {/* Metrik detayları */}
            {latest && (
              <View className="bg-white rounded-2xl px-4 py-1 mb-4 shadow-sm">
                <MetricRow
                  label="HRV (RMSSD)"
                  value={latest.hrv_rmssd}
                  unit="ms"
                />
                <MetricRow
                  label="İstirahat Kalp Hızı"
                  value={latest.resting_hr}
                  unit="bpm"
                />
                <MetricRow
                  label="SpO₂"
                  value={latest.spo2}
                  unit="%"
                />
                <MetricRow
                  label="Uyku Skoru"
                  value={latest.sleep_score}
                  unit="/ 100"
                />
                <MetricRow
                  label="Toplam Uyku"
                  value={
                    latest.total_sleep_min
                      ? Math.round(latest.total_sleep_min / 60 * 10) / 10
                      : null
                  }
                  unit="saat"
                />
                <MetricRow
                  label="Strain"
                  value={latest.strain_score}
                  unit="/ 21"
                />
              </View>
            )}

            {/* 7 günlük trend */}
            {metrics.length > 1 && (
              <>
                <Text className="text-gray-900 font-semibold text-base mb-3">
                  Son 7 Gün
                </Text>
                {metrics.map((m) => (
                  <View
                    key={m.id}
                    className="bg-white rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-500 text-sm">
                      {formatDate(m.metric_date)}
                    </Text>
                    <View className="flex-row items-center gap-3">
                      {m.recovery_score != null && (
                        <View
                          className={`px-2.5 py-1 rounded-full ${
                            m.recovery_score >= 67
                              ? "bg-green-100"
                              : m.recovery_score >= 34
                              ? "bg-yellow-100"
                              : "bg-red-100"
                          }`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              m.recovery_score >= 67
                                ? "text-green-700"
                                : m.recovery_score >= 34
                                ? "text-yellow-700"
                                : "text-red-700"
                            }`}
                          >
                            {Math.round(m.recovery_score)}%
                          </Text>
                        </View>
                      )}
                      {m.resting_hr && (
                        <Text className="text-gray-400 text-sm">
                          {m.resting_hr} bpm
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
