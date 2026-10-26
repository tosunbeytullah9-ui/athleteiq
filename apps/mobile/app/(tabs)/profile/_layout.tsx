import { Stack } from "expo-router";

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
          headerTintColor: "#534AB7",
        }}
      />
    </Stack>
  );
}
