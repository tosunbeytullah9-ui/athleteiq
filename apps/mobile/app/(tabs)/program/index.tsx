import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAthleteProfile } from "@/lib/hooks/useAthleteProfile";
import {
  getProgramSessionsSummary,
  isDateActive,
  sortAthletePrograms,
} from "@athleteiq/db/queries/programs";
import { ProgramTabStrip } from "@/components/ProgramTabStrip";
import type { Tables } from "@athleteiq/db/types";

type TrainingProgram = Tables<"training_programs">;
type SessionSummary = Pick<
  Tables<"training_sessions">,
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

export default function ProgramScreen() {
  const router = useRouter();
  const { athlete, loading: athleteLoading } = useAthleteProfile();
  const [activePrograms, setActivePrograms] = useState<TrainingProgram[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [tabSessions, setTabSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const fetchPrograms = useCallback(async (athleteId: string) => {
    const { data, error } = await supabase.rpc("get_athlete_programs", {
      p_athlete_id: athleteId,
    });

    if (!error && data) {
      const today = new Date().toISOString().slice(0, 10);
      const active = sortAthletePrograms(data.filter((p) => isDateActive(p, today)));
      setActivePrograms(active);
      setActiveTabIndex((prev) => (prev < active.length ? prev : 0));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!athlete) {
      setLoading(false);
      return;
    }

    // Önce veriyi çek — realtime aboneliğinden bağımsız. Subscribe takılsa bile
    // program listesi gelir.
    fetchPrograms(athlete.id);

    // Realtime: TÜM training_programs değişikliklerini dinle (filtre YOK).
    // Postgres realtime filtresi (is_published=eq.true) yalnızca satır filtreye
    // UYDUĞUNDA fire eder; unpublish (true→false) olayını kaçırır ve program
    // ekranda takılı kalır. Bu yüzden filtreyi kaldırıp eşleştirmeyi client'ta
    // yapıyoruz: her değişimde fetchPrograms yeniden çalışır ve yalnızca bu
    // sporcuya ait (get_athlete_programs'ın filtrelediği) programları döndürür.
    const channel = supabase
      .channel(`programs-athlete-${athlete.id}`)
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

  // Seçili sekmenin seans özetini çek — sekme değişince veya program listesi
  // güncellenince yeniden çalışır.
  useEffect(() => {
    const current = activePrograms[activeTabIndex];
    if (!current) {
      setTabSessions([]);
      return;
    }
    let cancelled = false;
    getProgramSessionsSummary(supabase, current.id).then((data) => {
      if (!cancelled) setTabSessions(data);
    });
    return () => {
      cancelled = true;
    };
  }, [activePrograms, activeTabIndex]);

  if (athleteLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  if (!athlete) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-8">
        <Text className="text-gray-500 text-center">
          Sporcu profili bulunamadı. Yöneticinizle iletişime geçin.
        </Text>
      </View>
    );
  }

  const activeProgram = activePrograms[activeTabIndex] ?? null;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
      }
    >
      {/* Header */}
      <View className="bg-blue-700 px-5 pt-14 pb-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-blue-200 text-sm">Merhaba,</Text>
            <Text className="text-white text-2xl font-bold">
              {athlete.full_name.split(" ")[0]}
            </Text>
          </View>
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

      {activePrograms.length > 1 && (
        <ProgramTabStrip
          tabs={activePrograms.map((p) => ({
            id: p.id,
            label: p.discipline?.trim() || p.title,
          }))}
          activeIndex={activeTabIndex}
          onSelect={setActiveTabIndex}
        />
      )}

      <View className="p-4">
        {activePrograms.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center mt-4">
            <Text className="text-4xl mb-3">📋</Text>
            <Text className="text-gray-900 font-semibold text-lg text-center">
              Henüz program yok
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-1">
              Antrenörünüz program yayınladığında burada görünecek.
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
              const sessions = tabSessions
                .filter((s) => s.day_of_week === dayNum)
                .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

              const isToday =
                new Date().getDay() === (dayNum === 7 ? 0 : dayNum);

              return (
                <TouchableOpacity
                  key={dayNum}
                  className={`mb-2 rounded-2xl overflow-hidden ${
                    sessions.length === 0 ? "opacity-50" : ""
                  }`}
                  disabled={sessions.length === 0}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/program/[day]",
                      params: { day: String(dayNum), programId: activeProgram!.id },
                    })
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
                      {sessions.length === 0 ? (
                        <Text
                          className={`text-sm ${
                            isToday ? "text-blue-200" : "text-gray-400"
                          }`}
                        >
                          Dinlenme
                        </Text>
                      ) : (
                        <View className="flex-row flex-wrap gap-1">
                          {sessions.map((s) => {
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

                    {sessions.length > 0 && (
                      <Text
                        className={`text-xs ${
                          isToday ? "text-blue-200" : "text-gray-400"
                        }`}
                      >
                        {sessions.reduce(
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
