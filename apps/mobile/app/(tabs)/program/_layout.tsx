import { Stack } from "expo-router";
import { BRAND_COLOR } from "@athleteiq/validators/brand";

export default function ProgramLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* [day] kendi ScreenHeader'ını çizer — yerel başlık screenOptions'tan kapalı. */}
      <Stack.Screen name="[day]" />
      <Stack.Screen
        name="checkin"
        options={{
          headerShown: true,
          headerTitle: "Sabah Değerlendirmesi",
          headerBackTitle: "Geri",
          headerTintColor: BRAND_COLOR,
        }}
      />
    </Stack>
  );
}
