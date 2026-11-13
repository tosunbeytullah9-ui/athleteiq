import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/lib/auth";

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [session, loading, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* Varsayılan koyu simge: açık zeminli ekranlar (giriş, yükleniyor, yerel başlıklı
          ekranlar). Mavi başlıklı ekranlarda odaktaki ScreenHeader "light" ile ezer. */}
      <StatusBar style="dark" />
      <RootLayoutNav />
    </AuthProvider>
  );
}
