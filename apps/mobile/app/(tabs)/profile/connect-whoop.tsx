import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { connectWhoop } from "@/lib/wearables";
import { WEARABLES_ENABLED } from "@/lib/features";

export default function ConnectWhoopScreen() {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bayrak kapalıyken (Parti 18F) derin link ile açılsa bile akış başlamaz.
  useEffect(() => {
    if (!WEARABLES_ENABLED) router.replace("/(tabs)/profile");
  }, [router]);

  async function handleConnect() {
    if (!WEARABLES_ENABLED) return;
    setConnecting(true);
    setError(null);

    const result = await connectWhoop();

    setConnecting(false);

    if (result.status === "success") {
      router.back();
      return;
    }
    if (result.status === "denied") {
      return;
    }
    setError(result.message);
  }

  if (!WEARABLES_ENABLED) return null;

  return (
    <View className="flex-1 bg-gray-50 p-5">
      <View className="items-center mt-10 mb-8">
        <Text className="text-5xl mb-4">⌚</Text>
        <Text className="text-xl font-bold text-gray-900">WHOOP Bağla</Text>
        <Text className="text-gray-500 text-sm text-center mt-2 px-4">
          WHOOP hesabınızı bağlayarak recovery, uyku ve strain verilerinizin
          otomatik olarak senkronize olmasını sağlayın.
        </Text>
      </View>

      {error && (
        <View className="bg-red-50 rounded-xl p-4 mb-4">
          <Text className="text-red-600 text-sm">{error}</Text>
        </View>
      )}

      <TouchableOpacity
        className="bg-blue-700 rounded-xl py-4 items-center"
        onPress={handleConnect}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">
            WHOOP ile Bağlan
          </Text>
        )}
      </TouchableOpacity>

      <Text className="text-gray-400 text-xs text-center mt-4">
        WHOOP hesabınızın açılması için tarayıcıya yönlendirileceksiniz.
      </Text>
    </View>
  );
}
