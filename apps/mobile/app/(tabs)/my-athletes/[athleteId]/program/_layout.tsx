import { Stack } from "expo-router";
import { BRAND_COLOR } from "@athleteiq/validators/brand";

export default function CoachProgramLayout() {
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
    </Stack>
  );
}
