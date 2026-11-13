import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/lib/auth";
import { BRAND_COLOR } from "@athleteiq/validators/brand";

export default function Index() {
  const { session, loading, role, roleLoading } = useAuth();

  if (loading || roleLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color={BRAND_COLOR} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  const isCoachOrAdmin = role === "coach" || role === "admin";
  return <Redirect href={isCoachOrAdmin ? "/(tabs)/my-athletes" : "/(tabs)/program"} />;
}
