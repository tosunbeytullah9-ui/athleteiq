import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useCoachAthlete } from "@/lib/hooks/useCoachAthlete";
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

export default function CoachRecoveryScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const router = useRouter();
  const { athlete, loading: athleteLoading, notFound } = useCoachAthlete(athleteId);
  const [metrics, setMetrics] = useState<WearableMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);

  async function fetchData(athleteRowId: string) {
    // Wearable bağlantısı var mı?
    const { data: conn } = await supabase
      .from("wearable_connections")
      .select("id, provider, last_synced_at")
      .eq("athlete_id", athleteRowId)
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
      .eq("athlete_id", athleteRowId)
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

  if (notFound || !athlete) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-blue-700 px-5 pt-14 pb-6">
          <TouchableOpacity
            className="flex-row items-center mb-3"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color="#93c5fd" />
            <Text className="text-blue-300 ml-1 text-sm">Geri</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-4xl mb-3">🔍</Text>
          <Text className="text-gray-900 font-semibold text-lg text-center">
            Sporcu bulunamadı
          </Text>
          <Text className="text-gray-500 text-sm text-center mt-2">
            Bu sporcuya erişim yetkiniz yok veya kayıt bulunamadı.
          </Text>
        </View>
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
        <TouchableOpacity
          className="flex-row items-center mb-3"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#93c5fd" />
          <Text className="text-blue-300 ml-1 text-sm">Geri</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">{athlete.full_name}</Text>
        <Text className="text-blue-200 text-sm mt-1">
          Recovery · {latest ? formatDate(latest.metric_date) : "Bugün"}
        </Text>
      </View>

      <View className="p-4">
        {!connected ? (
          /* Wearable bağlı değil */
          <View className="bg-white rounded-2xl p-6 items-center mt-2">
            <Text className="text-4xl mb-3">⌚</Text>
            <Text className="text-gray-900 font-semibold text-lg text-center">
              Wearable Bağlı Değil
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-2">
              Bu sporcunun WHOOP veya Polar cihazı henüz bağlı değil.
            </Text>
          </View>
        ) : metrics.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center mt-2">
            <Text className="text-4xl mb-3">📡</Text>
            <Text className="text-gray-900 font-semibold text-lg text-center">
              Veri Bekleniyor
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-2">
              Cihaz bağlı. İlk veriler yakında senkronize edilecek.
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
