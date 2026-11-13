import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getAthleteById } from "@athleteiq/db/queries/athletes";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { WEARABLES_ENABLED } from "@/lib/features";
import { ScreenHeader } from "@/components/ScreenHeader";
import type { Database } from "@athleteiq/db/types";

type Athlete = Database["public"]["Tables"]["athletes"]["Row"];

const ALL_CARDS = [
  { key: "program", label: "Program", emoji: "📋" },
  { key: "recovery", label: "Recovery", emoji: "💪" },
  { key: "competitions", label: "Yarışmalar", emoji: "🏆" },
] as const;

// Wearable kapalıyken Recovery kartı yok (Parti 18K, App Store 2.1).
const CARDS = ALL_CARDS.filter((card) => WEARABLES_ENABLED || card.key !== "recovery");

export default function AthleteHubScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const router = useRouter();
  const { role, orgId, teamId } = useAuth();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!athleteId || !orgId) return;
    let mounted = true;

    (getAthleteById(supabase, athleteId) as Promise<Athlete>)
      .then((data) => {
        if (!mounted) return;
        const authorized =
          data.org_id === orgId &&
          (role === "admin" || (role === "coach" && data.team_id === teamId));
        if (!authorized) {
          setNotFound(true);
        } else {
          setAthlete(data);
        }
      })
      .catch(() => {
        if (mounted) setNotFound(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [athleteId, orgId, role, teamId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  if (notFound || !athlete) {
    return (
      <View className="flex-1 bg-gray-50">
        <ScreenHeader back={{ label: "Sporcularım", onPress: () => router.back() }} />
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
    <View className="flex-1 bg-gray-50">
      <ScreenHeader
        title={athlete.full_name}
        back={{ label: "Sporcularım", onPress: () => router.back() }}
      />

      <View className="p-4">
        {CARDS.map((card) => (
          <TouchableOpacity
            key={card.key}
            className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex-row items-center"
            onPress={() =>
              router.push(`/(tabs)/my-athletes/${athleteId}/${card.key}` as never)
            }
          >
            <Text className="text-2xl mr-3">{card.emoji}</Text>
            <Text className="text-gray-900 font-semibold text-base flex-1">
              {card.label}
            </Text>
            <Text className="text-gray-300 text-xl">›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
