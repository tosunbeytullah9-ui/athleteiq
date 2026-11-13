import { Tabs } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { Calendar, Activity, Trophy, User, Users } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BRAND_COLOR } from "@athleteiq/validators/brand";
import { useAuth } from "@/lib/auth";

// Simge + etiket alanı (eski height 64 − paddingBottom 8). Alt boşluk ev göstergesi
// (home indicator) kadar, en az eski 8 — göstergesiz cihazlarda görünüm birebir aynı.
const TAB_BAR_CONTENT_HEIGHT = 56;

export default function TabsLayout() {
  const { session, loading, role, roleLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarPaddingBottom = Math.max(insets.bottom, 8);

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: BRAND_COLOR,
    tabBarInactiveTintColor: "#9C9A92",
    tabBarStyle: {
      backgroundColor: "#FFFFFF",
      borderTopColor: "#E8E6DE",
      paddingBottom: tabBarPaddingBottom,
      height: TAB_BAR_CONTENT_HEIGHT + tabBarPaddingBottom,
    },
  } as const;

  // Oturum kapanınca root layout /(auth)/login'e yönlendirir; o gerçekleşene
  // kadar burada eski rol verisiyle sekme render etmemek için boş dön.
  if (loading || !session) {
    return null;
  }

  if (roleLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  const isCoachOrAdmin = role === "coach" || role === "admin";

  if (isCoachOrAdmin) {
    return (
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen
          name="my-athletes"
          options={{
            title: "Sporcularım",
            tabBarIcon: ({ color }) => <Users size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="coach-profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color }) => <User size={22} color={color} />,
          }}
        />
        <Tabs.Screen name="program" options={{ href: null }} />
        <Tabs.Screen name="recovery" options={{ href: null }} />
        <Tabs.Screen name="competitions" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    );
  }

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="program"
        options={{
          title: "Program",
          tabBarIcon: ({ color }) => <Calendar size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recovery"
        options={{
          title: "Recovery",
          tabBarIcon: ({ color }) => <Activity size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="competitions"
        options={{
          title: "Yarışmalar",
          tabBarIcon: ({ color }) => <Trophy size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="my-athletes" options={{ href: null }} />
      <Tabs.Screen name="coach-profile" options={{ href: null }} />
    </Tabs>
  );
}
