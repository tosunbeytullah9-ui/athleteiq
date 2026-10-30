import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useAthleteProfile } from "@/lib/hooks/useAthleteProfile";
import type { Database } from "@athleteiq/db/types";
import { daysBetweenYmd, formatYmdTr, parseYmd, todayLocal } from "@athleteiq/validators/date";

type Competition = Database["public"]["Tables"]["competitions"]["Row"];

const LEVEL_LABELS: Record<string, string> = {
  international: "Uluslararası",
  national: "Ulusal",
  regional: "Bölgesel",
  local: "Yerel",
};

const LEVEL_COLORS: Record<string, string> = {
  international: "bg-purple-100 text-purple-700",
  national: "bg-red-100 text-red-700",
  regional: "bg-orange-100 text-orange-700",
  local: "bg-gray-100 text-gray-600",
};

// competition_date saatsiz takvim günüdür — new Date(str) UTC gece yarısı olur ve
// UTC'nin batısındaki bir telefonda bir gün önceyi gösterirdi (Parti 18T). "Bugün"
// telefonun yerel takvim günü (todayLocal): yurt dışındaki sporcu kendi gününü görür.
function formatDate(dateStr: string | null): string {
  return formatYmdTr(dateStr);
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr || !parseYmd(dateStr)) return null;
  return daysBetweenYmd(todayLocal(), dateStr);
}

function CountdownBadge({ dateStr }: { dateStr: string | null }) {
  const days = daysUntil(dateStr);
  if (days === null) return null;

  if (days < 0) {
    return (
      <View className="bg-gray-100 px-2 py-0.5 rounded-full">
        <Text className="text-gray-500 text-xs">{Math.abs(days)} gün önce</Text>
      </View>
    );
  }
  if (days === 0) {
    return (
      <View className="bg-red-500 px-2 py-0.5 rounded-full">
        <Text className="text-white text-xs font-bold">Bugün!</Text>
      </View>
    );
  }
  if (days <= 7) {
    return (
      <View className="bg-red-100 px-2 py-0.5 rounded-full">
        <Text className="text-red-700 text-xs font-semibold">{days} gün kaldı</Text>
      </View>
    );
  }
  if (days <= 30) {
    return (
      <View className="bg-orange-100 px-2 py-0.5 rounded-full">
        <Text className="text-orange-700 text-xs">{days} gün kaldı</Text>
      </View>
    );
  }
  return (
    <View className="bg-gray-100 px-2 py-0.5 rounded-full">
      <Text className="text-gray-500 text-xs">{days} gün kaldı</Text>
    </View>
  );
}

export default function CompetitionsScreen() {
  const { athlete, loading: athleteLoading } = useAthleteProfile();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchCompetitions(orgId: string) {
    const { data } = await supabase
      .from("competitions")
      .select("*")
      .eq("org_id", orgId)
      .order("competition_date", { ascending: true });

    if (data) setCompetitions(data);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    if (!athlete) {
      setLoading(false);
      return;
    }
    fetchCompetitions(athlete.org_id);
  }, [athlete]);

  const onRefresh = () => {
    if (!athlete) return;
    setRefreshing(true);
    fetchCompetitions(athlete.org_id);
  };

  // String karşılaştırma — bugünkü yarışma "yaklaşan"da kalır.
  const today = todayLocal();

  const upcoming = competitions.filter((c) => {
    if (!c.competition_date) return true;
    return c.competition_date >= today;
  });
  const past = competitions.filter((c) => {
    if (!c.competition_date) return false;
    return c.competition_date < today;
  });

  if (athleteLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1d4ed8" />
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
        <Text className="text-white text-2xl font-bold">Yarışmalar</Text>
        <Text className="text-blue-200 text-sm mt-1">
          {upcoming.length} yaklaşan etkinlik
        </Text>
      </View>

      <View className="p-4">
        {/* Yaklaşan */}
        {upcoming.length > 0 && (
          <>
            <Text className="text-gray-900 font-semibold text-base mb-3">
              Yaklaşan
            </Text>
            {upcoming.map((comp) => {
              const levelStyle =
                LEVEL_COLORS[comp.level ?? ""] ?? "bg-gray-100 text-gray-600";
              return (
                <View
                  key={comp.id}
                  className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="text-gray-900 font-semibold text-base leading-tight">
                        {comp.name}
                      </Text>
                      {comp.location && (
                        <View className="flex-row items-center mt-1">
                          <Text className="text-gray-400 text-sm">
                            📍 {comp.location}
                          </Text>
                        </View>
                      )}
                      <Text className="text-gray-500 text-sm mt-0.5">
                        {formatDate(comp.competition_date)}
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      {comp.level && (
                        <View
                          className={`px-2 py-0.5 rounded-full ${levelStyle.split(" ")[0]}`}
                        >
                          <Text
                            className={`text-xs font-medium ${levelStyle.split(" ")[1]}`}
                          >
                            {LEVEL_LABELS[comp.level] ?? comp.level}
                          </Text>
                        </View>
                      )}
                      <CountdownBadge dateStr={comp.competition_date} />
                    </View>
                  </View>
                  {comp.notes && (
                    <Text className="text-gray-400 text-sm mt-2 italic">
                      {comp.notes}
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Geçmiş */}
        {past.length > 0 && (
          <>
            <Text className="text-gray-500 font-semibold text-sm mb-3 mt-2">
              GEÇMİŞ
            </Text>
            {past
              .slice()
              .reverse()
              .map((comp) => (
                <View
                  key={comp.id}
                  className="bg-white rounded-2xl p-4 mb-3 opacity-60"
                >
                  <Text className="text-gray-700 font-medium">{comp.name}</Text>
                  <Text className="text-gray-400 text-sm">
                    {formatDate(comp.competition_date)}
                    {comp.location ? ` · ${comp.location}` : ""}
                  </Text>
                </View>
              ))}
          </>
        )}

        {competitions.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">🏆</Text>
            <Text className="text-gray-500 text-center">
              Kayıtlı olduğunuz bir yarışma yok.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
