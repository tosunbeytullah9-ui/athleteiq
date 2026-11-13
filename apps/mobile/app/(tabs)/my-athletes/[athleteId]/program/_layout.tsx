import { Stack } from "expo-router";

export default function CoachProgramLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* [day] kendi ScreenHeader'ını çizer — yerel başlık screenOptions'tan kapalı. */}
      <Stack.Screen name="[day]" />
    </Stack>
  );
}
