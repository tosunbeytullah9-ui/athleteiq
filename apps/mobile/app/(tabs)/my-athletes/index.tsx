import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { getAthletes } from "@athleteiq/db/queries/athletes";
import { getTeams } from "@athleteiq/db/queries/teams";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { ScreenHeader } from "@/components/ScreenHeader";
import type { Database } from "@athleteiq/db/types";

type Athlete = Database["public"]["Tables"]["athletes"]["Row"];
type Team = Database["public"]["Tables"]["teams"]["Row"];

export default function MyAthletesScreen() {
  const router = useRouter();
  const { orgId, roleLoading } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [teamMap, setTeamMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (org: string) => {
    const [athleteRows, teamRows] = await Promise.all([
      getAthletes(supabase, org) as Promise<Athlete[]>,
      getTeams(supabase, org) as Promise<Team[]>,
    ]);
    setAthletes(athleteRows ?? []);
    setTeamMap(Object.fromEntries((teamRows ?? []).map((t) => [t.id, t.name])));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (roleLoading) return;
    if (!orgId) {
      setLoading(false);
      return;
    }
    fetchData(orgId);
  }, [orgId, roleLoading, fetchData]);

  const onRefresh = () => {
    if (!orgId) return;
    setRefreshing(true);
    fetchData(orgId);
  };

  if (roleLoading || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Sporcularım" subtitle={`${athletes.length} sporcu`} />

      <ScrollView
        className="flex-1 bg-gray-50"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
        }
      >
        <View className="p-4">
          {athletes.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">🏃</Text>
              <Text className="text-gray-900 font-semibold text-lg text-center">
                Henüz sporcu yok
              </Text>
              <Text className="text-gray-500 text-sm text-center mt-2">
                Organizasyonunuzda/takımınızda kayıtlı sporcu bulunmuyor.
              </Text>
            </View>
          ) : (
            athletes.map((athlete) => (
              <TouchableOpacity
                key={athlete.id}
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex-row items-center justify-between"
                onPress={() => router.push(`/(tabs)/my-athletes/${athlete.id}` as never)}
              >
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-base">
                    {athlete.full_name}
                  </Text>
                  {athlete.team_id && teamMap[athlete.team_id] && (
                    <Text className="text-gray-500 text-sm mt-0.5">
                      {teamMap[athlete.team_id]}
                    </Text>
                  )}
                </View>
                <Text className="text-gray-300 text-xl">›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
