import { Stack } from "expo-router";
import { BRAND_COLOR } from "@athleteiq/validators/brand";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="connect-whoop"
        options={{
          headerShown: true,
          headerTitle: "WHOOP Bağlantısı",
          headerBackTitle: "Geri",
          headerTintColor: BRAND_COLOR,
        }}
      />
    </Stack>
  );
}
