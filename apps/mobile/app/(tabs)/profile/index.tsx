import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAthleteProfile } from "@/lib/hooks/useAthleteProfile";
import { revokeWhoopAccess } from "@/lib/wearables";
import type { Database } from "@athleteiq/db/types";

type WearableConnection =
  Database["public"]["Tables"]["wearable_connections"]["Row"];

function InitialAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View className="w-20 h-20 rounded-full bg-blue-700 items-center justify-center">
      <Text className="text-white text-2xl font-black">{initials}</Text>
    </View>
  );
}

function WearableRow({
  provider,
  connection,
  onConnect,
  onDisconnect,
}: {
  provider: "whoop" | "polar";
  connection: WearableConnection | null;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const isConnected = connection?.is_active ?? false;
  const label = provider === "whoop" ? "WHOOP" : "Polar";
  const emoji = provider === "whoop" ? "⌚" : "🔵";

  return (
    <View className="flex-row items-center justify-between py-4 border-b border-gray-50">
      <View className="flex-row items-center">
        <Text className="text-xl mr-3">{emoji}</Text>
        <View>
          <Text className="text-gray-900 font-medium">{label}</Text>
          {isConnected && connection?.last_synced_at && (
            <Text className="text-gray-400 text-xs">
              Son sync:{" "}
              {new Date(connection.last_synced_at).toLocaleDateString("tr-TR")}
            </Text>
          )}
          {!isConnected && (
            <Text className="text-gray-400 text-xs">Bağlı değil</Text>
          )}
        </View>
      </View>
      {isConnected ? (
        <TouchableOpacity
          className="bg-red-50 px-3 py-1.5 rounded-lg"
          onPress={onDisconnect}
        >
          <Text className="text-red-600 text-sm font-medium">Bağlantıyı Kes</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className="bg-blue-700 px-3 py-1.5 rounded-lg"
          onPress={onConnect}
        >
          <Text className="text-white text-sm font-medium">Bağla</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { athlete, loading: athleteLoading } = useAthleteProfile();
  const [connections, setConnections] = useState<WearableConnection[]>([]);
  const [signingOut, setSigningOut] = useState(false);

  const fetchConnections = useCallback(async (athleteId: string) => {
    const { data } = await supabase
      .from("wearable_connections")
      .select("*")
      .eq("athlete_id", athleteId);
    if (data) setConnections(data);
  }, []);

  useEffect(() => {
    if (!athlete) return;
    fetchConnections(athlete.id);
  }, [athlete, fetchConnections]);

  const handleDisconnect = (provider: "whoop" | "polar") => {
    Alert.alert(
      `${provider === "whoop" ? "WHOOP" : "Polar"} Bağlantısını Kes`,
      "Cihaz bağlantısı kesilecek. Mevcut veriler silinmez.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kes",
          style: "destructive",
          onPress: async () => {
            if (!athlete) return;
            if (provider === "whoop") {
              const conn = connections.find(
                (c) => c.provider === "whoop" && c.athlete_id === athlete.id
              );
              if (conn?.access_token) {
                await revokeWhoopAccess(conn.access_token);
              }
            }
            await supabase
              .from("wearable_connections")
              .update({ is_active: false })
              .eq("athlete_id", athlete.id)
              .eq("provider", provider);
            fetchConnections(athlete.id);
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert("Çıkış Yap", "Hesabınızdan çıkmak istiyor musunuz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (athleteLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  const whoopConn =
    connections.find((c) => c.provider === "whoop") ?? null;
  const polarConn =
    connections.find((c) => c.provider === "polar") ?? null;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-700 px-5 pt-14 pb-8 items-center">
        {athlete && <InitialAvatar name={athlete.full_name} />}
        <Text className="text-white text-xl font-bold mt-3">
          {athlete?.full_name ?? "—"}
        </Text>
        {athlete?.position && (
          <Text className="text-blue-200 text-sm mt-0.5">{athlete.position}</Text>
        )}
      </View>

      <View className="p-4">
        {/* Bilgiler */}
        {athlete && (
          <View className="bg-white rounded-2xl px-4 py-1 mb-4 shadow-sm">
            {athlete.birth_date && (
              <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
                <Text className="text-gray-500 text-sm">Doğum Tarihi</Text>
                <Text className="text-gray-900 text-sm font-medium">
                  {new Date(athlete.birth_date).toLocaleDateString("tr-TR")}
                </Text>
              </View>
            )}
            {athlete.height_cm && (
              <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
                <Text className="text-gray-500 text-sm">Boy</Text>
                <Text className="text-gray-900 text-sm font-medium">
                  {athlete.height_cm} cm
                </Text>
              </View>
            )}
            {athlete.weight_kg && (
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-gray-500 text-sm">Kilo</Text>
                <Text className="text-gray-900 text-sm font-medium">
                  {athlete.weight_kg} kg
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Wearable bağlantıları */}
        <Text className="text-gray-900 font-semibold text-base mb-2">
          Cihaz Bağlantıları
        </Text>
        <View className="bg-white rounded-2xl px-4 py-1 mb-4 shadow-sm">
          <WearableRow
            provider="whoop"
            connection={whoopConn}
            onConnect={() => router.push("/(tabs)/profile/connect-whoop" as never)}
            onDisconnect={() => handleDisconnect("whoop")}
          />
          <WearableRow
            provider="polar"
            connection={polarConn}
            onConnect={() => router.push("/(tabs)/profile/connect-polar" as never)}
            onDisconnect={() => handleDisconnect("polar")}
          />
        </View>

        {/* Çıkış */}
        <TouchableOpacity
          className="bg-white rounded-2xl p-4 items-center shadow-sm"
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color="#ef4444" />
          ) : (
            <Text className="text-red-500 font-medium">Çıkış Yap</Text>
          )}
        </TouchableOpacity>

        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
