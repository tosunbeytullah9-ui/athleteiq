import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { confirmSignOut } from "@/lib/signOut";
import { AccountDeletionSection } from "@/components/AccountDeletionSection";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Antrenör",
};

export default function CoachProfileScreen() {
  const { session, role, orgId } = useAuth();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!orgId) {
      setOrgLoading(false);
      return;
    }
    supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setOrgName(data?.name ?? null);
        setOrgLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orgId]);

  const handleSignOut = () => confirmSignOut(() => setSigningOut(true));

  if (orgLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : "—";

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-blue-700 px-5 pt-14 pb-8 items-center">
        <Text className="text-white text-xl font-bold mt-3">{session?.user.email ?? "—"}</Text>
        <Text className="text-blue-200 text-sm mt-0.5">{roleLabel}</Text>
      </View>

      <View className="p-4">
        <View className="bg-white rounded-2xl px-4 py-1 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
            <Text className="text-gray-500 text-sm">E-posta</Text>
            <Text className="text-gray-900 text-sm font-medium">{session?.user.email ?? "—"}</Text>
          </View>
          <View className="flex-row justify-between items-center py-3 border-b border-gray-50">
            <Text className="text-gray-500 text-sm">Organizasyon</Text>
            <Text className="text-gray-900 text-sm font-medium">{orgName ?? "—"}</Text>
          </View>
          <View className="flex-row justify-between items-center py-3">
            <Text className="text-gray-500 text-sm">Rol</Text>
            <Text className="text-gray-900 text-sm font-medium">{roleLabel}</Text>
          </View>
        </View>

        <TouchableOpacity
          className="bg-white rounded-2xl p-4 items-center shadow-sm"
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color="#ef4444" />
          ) : (
            <Text className="text-red-500 font-medium">Çıkış Yap</Text>
          )}
        </TouchableOpacity>

        <AccountDeletionSection isStaff />

        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
