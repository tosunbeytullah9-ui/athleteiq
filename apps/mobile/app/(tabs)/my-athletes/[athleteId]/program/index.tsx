import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useCoachAthlete } from "@/lib/hooks/useCoachAthlete";
import { LoadErrorState } from "@/components/LoadErrorState";
import {
  getActiveAthletePrograms,
  getProgramSessionsSummary,
} from "@athleteiq/db/queries/programs";
import { dayOfWeekInIstanbul, todayInIstanbul } from "@athleteiq/validators/date";
import type { Database } from "@athleteiq/db/types";

type TrainingProgram = Database["public"]["Tables"]["training_programs"]["Row"];
type SessionSummary = Pick<
  Database["public"]["Tables"]["training_sessions"]["Row"],
  "id" | "day_of_week" | "session_type" | "title" | "duration_min" | "order_index"
>;

const DAY_LABELS: Record<number, string> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
  7: "Pazar",
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  strength: "bg-red-100 text-red-700",
  conditioning: "bg-orange-100 text-orange-700",
  technical: "bg-blue-100 text-blue-700",
  recovery: "bg-green-100 text-green-700",
  competition: "bg-purple-100 text-purple-700",
};

export default function CoachProgramScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const router = useRouter();
  const { athlete, loading: athleteLoading, notFound } = useCoachAthlete(athleteId);
  const [activeProgram, setActiveProgram] = useState<TrainingProgram | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  // Sorgu hatası ≠ aktif program yok.
  const [loadError, setLoadError] = useState(false);

  // Aktif hafta sporcunun kendi ekranıyla AYNI kuraldan: get_athlete_programs
  // (yayınlanmış, arşivsiz, antrenman grubu eşleşen) → bugünü (İstanbul) kapsayan →
  // sporcu-kapsamlı önce. Eskiden en büyük start_date seçiliyordu → bloğun son haftası.
  const fetchPrograms = useCallback(async (athleteRowId: string) => {
    try {
      const [first] = await getActiveAthletePrograms(supabase, athleteRowId, todayInIstanbul());
      const summary = first ? await getProgramSessionsSummary(supabase, first.id) : [];
      setActiveProgram(first ?? null);
      setSessions(summary);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!athlete) {
      setLoading(false);
      return;
    }

    // Aynı desen: athlete/program/index.tsx ile birebir — filtresiz realtime abonelik,
    // is_published=eq.true filtresi unpublish (true→false) geçişini kaçırdığı için.
    fetchPrograms(athlete.id);

    const channel = supabase
      .channel(`coach-programs-athlete-${athlete.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_programs",
        },
        () => {
          fetchPrograms(athlete.id);
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athlete, fetchPrograms]);

  const onRefresh = useCallback(() => {
    if (!athlete) return;
    setRefreshing(true);
    fetchPrograms(athlete.id);
  }, [athlete, fetchPrograms]);

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
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-2xl font-bold">{athlete.full_name}</Text>
          <View className="flex-row items-center">
            <View
              className={`w-2 h-2 rounded-full mr-2 ${
                realtimeConnected ? "bg-green-400" : "bg-yellow-400"
              }`}
            />
            <Text className="text-blue-200 text-xs">
              {realtimeConnected ? "Canlı" : "Bağlanıyor"}
            </Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        {loadError ? (
          <LoadErrorState onRetry={onRefresh} />
        ) : !activeProgram ? (
          <View className="bg-white rounded-2xl p-8 items-center mt-4">
            <Text className="text-4xl mb-3">📋</Text>
            <Text className="text-gray-900 font-semibold text-lg text-center">
              Bu sporcu için aktif program yok
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-1">
              Bir program yayınlandığında burada görünecek.
            </Text>
          </View>
        ) : (
          <>
            {/* Aktif program başlığı */}
            {activeProgram && (
              <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs text-blue-700 font-semibold uppercase tracking-wider">
                    Aktif Program
                  </Text>
                  {activeProgram.phase && (
                    <View className="bg-blue-50 px-2 py-0.5 rounded-full">
                      <Text className="text-blue-700 text-xs capitalize">
                        {activeProgram.phase}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-gray-900 text-lg font-bold">
                  {activeProgram.title}
                </Text>
                {activeProgram.week_number && (
                  <Text className="text-gray-400 text-sm mt-0.5">
                    Hafta {activeProgram.week_number}
                  </Text>
                )}
              </View>
            )}

            {/* Haftalık görünüm */}
            <Text className="text-gray-900 font-semibold text-base mb-3">
              Haftalık Program
            </Text>
            {Array.from({ length: 7 }, (_, i) => i + 1).map((dayNum) => {
              const daySessions = sessions
                .filter((s) => s.day_of_week === dayNum)
                .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

              const isToday = dayOfWeekInIstanbul() === dayNum;

              return (
                <TouchableOpacity
                  key={dayNum}
                  className={`mb-2 rounded-2xl overflow-hidden ${
                    daySessions.length === 0 ? "opacity-50" : ""
                  }`}
                  disabled={daySessions.length === 0}
                  onPress={() =>
                    router.push(
                      `/(tabs)/my-athletes/${athleteId}/program/${dayNum}?programId=${activeProgram.id}` as never
                    )
                  }
                  activeOpacity={0.75}
                >
                  <View
                    className={`flex-row items-center px-4 py-3 ${
                      isToday ? "bg-blue-700" : "bg-white"
                    }`}
                  >
                    <View className="w-14">
                      <Text
                        className={`font-semibold text-sm ${
                          isToday ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {DAY_LABELS[dayNum]}
                      </Text>
                      {isToday && (
                        <Text className="text-blue-200 text-xs">Bugün</Text>
                      )}
                    </View>

                    <View className="flex-1 ml-3">
                      {daySessions.length === 0 ? (
                        <Text
                          className={`text-sm ${
                            isToday ? "text-blue-200" : "text-gray-400"
                          }`}
                        >
                          Dinlenme
                        </Text>
                      ) : (
                        <View className="flex-row flex-wrap gap-1">
                          {daySessions.map((s) => {
                            const colorClass =
                              SESSION_TYPE_COLORS[s.session_type ?? ""] ??
                              "bg-gray-100 text-gray-600";
                            return (
                              <View
                                key={s.id}
                                className={`px-2 py-0.5 rounded-full ${
                                  isToday
                                    ? "bg-blue-500"
                                    : colorClass.split(" ")[0]
                                }`}
                              >
                                <Text
                                  className={`text-xs font-medium ${
                                    isToday
                                      ? "text-white"
                                      : colorClass.split(" ")[1]
                                  }`}
                                >
                                  {s.title ?? s.session_type}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>

                    {daySessions.length > 0 && (
                      <Text
                        className={`text-xs ${
                          isToday ? "text-blue-200" : "text-gray-400"
                        }`}
                      >
                        {daySessions.reduce(
                          (sum, s) => sum + (s.duration_min ?? 0),
                          0
                        )}{" "}
                        dk
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>
    </ScrollView>
  );
}
