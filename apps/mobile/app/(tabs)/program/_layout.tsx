import { Stack } from "expo-router";

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
          headerTintColor: "#534AB7",
        }}
      />
      <Stack.Screen
        name="checkin"
        options={{
          headerShown: true,
          headerTitle: "Sabah Değerlendirmesi",
          headerBackTitle: "Geri",
          headerTintColor: "#534AB7",
        }}
      />
    </Stack>
  );
}
