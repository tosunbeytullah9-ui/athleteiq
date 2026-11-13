import { Stack } from "expo-router";
import { BRAND_COLOR } from "@athleteiq/validators/brand";

export default function ProgramLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[day]"
        options={{
          headerShown: true,
          headerTitle: "Günlük Program",
          headerBackTitle: "Geri",
          headerTintColor: BRAND_COLOR,
        }}
      />
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
