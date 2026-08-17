import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { resolveLoginIdentifier } from "@athleteiq/validators";

export default function LoginScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  async function handlePasswordLogin() {
    if (!identifier || !password) {
      Alert.alert("Hata", "Kullanıcı adı ve şifre gerekli.");
      return;
    }
    const resolved = resolveLoginIdentifier(identifier);
    if (!resolved.ok) {
      Alert.alert(
        "Hata",
        resolved.reason === "email_rejected"
          ? "E-posta ile giriş kaldırıldı. Kullanıcı adınızı kullanici@organizasyon biçiminde girin."
          : "Kullanıcı adınızı kullanici@organizasyon biçiminde girin."
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: resolved.email,
      password,
    });
    setLoading(false);
    if (error) Alert.alert("Giriş hatası", "Kullanıcı adı veya şifre hatalı");
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center p-8">
        {/* Logo */}
        <View className="mb-10 items-center">
          <View className="w-16 h-16 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: "#534AB7" }}>
            <Text className="text-white text-2xl font-black">A</Text>
          </View>
          <Text className="text-3xl font-black text-gray-900">AthleteIQ</Text>
          <Text className="mt-1 text-gray-500">Sporcu platformuna giriş yapın</Text>
        </View>

        {/* Kullanıcı adı */}
        <Text className="text-sm font-medium text-gray-700 mb-1">Kullanıcı adı</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
          placeholder="ahmet.yilmaz@tgf"
          autoCapitalize="none"
          autoComplete="username"
          value={identifier}
          onChangeText={setIdentifier}
        />
        <Text className="text-xs text-gray-500 mb-4">
          Kullanıcı adınız ve organizasyon kodunuz. Bilmiyorsanız yöneticinizle iletişime
          geçin.
        </Text>

        <Text className="text-sm font-medium text-gray-700 mb-1">Şifre</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 mb-6"
          placeholder="••••••••"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          className="rounded-xl py-4 items-center"
          style={{ backgroundColor: "#534AB7" }}
          onPress={handlePasswordLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Giriş Yap
            </Text>
          )}
        </TouchableOpacity>

        <Text className="mt-4 text-center text-xs text-gray-500">
          Şifrenizi unuttuysanız yöneticinizle iletişime geçin.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
