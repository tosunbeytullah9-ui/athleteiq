import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import {
  cancelAccountDeletionRequest,
  getMyLatestDeletionRequest,
  requestAccountDeletion,
  type AccountDeletionRequest,
} from "@athleteiq/db/queries/account-deletion";
import { ACCOUNT_DELETION_DUE_DAYS } from "@athleteiq/validators/account-deletion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

// Uygulama içi hesap silme talebi (Parti 18B — App Store 5.1.1(v) + KVKK m.11/13).
// Talep kurum yöneticisine düşer ve en geç 30 gün içinde web'den işlenir
// (process-account-deletion). Bu bileşen yalnızca talep oluşturur / geri alır.

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message);
    if (message === "yetkisiz") return "Bu işlem için yetkiniz yok.";
    return message;
  }
  return "Bir hata oluştu, lütfen tekrar deneyin.";
}

export function AccountDeletionSection({ isStaff }: { isStaff: boolean }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  // Süper admin kurtarma/silme yolu yalnızca Supabase Dashboard — RPC de reddeder.
  const isSuperAdmin = session?.user.app_metadata?.["platform_role"] === "super_admin";

  const [latest, setLatest] = useState<AccountDeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setLatest(await getMyLatestDeletionRequest(supabase, userId));
    } catch {
      setLatest(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!userId || isSuperAdmin) return null;

  const pending = latest?.status === "pending" ? latest : null;
  const rejected = latest?.status === "rejected" ? latest : null;

  const handleRequest = () => {
    const message =
      `Silme talebiniz kurumunuzun yöneticisine iletilir ve en geç ${ACCOUNT_DELETION_DUE_DAYS} gün içinde işlenir. ` +
      "Tamamlandığında hesabınız ile antrenman, wellness, test, yarışma ve cihaz verileriniz kalıcı olarak silinir ve bu işlem geri alınamaz." +
      (isStaff ? " Oluşturduğunuz programlar kurumunuzda kalır." : "") +
      " Talep işlenene kadar uygulamayı kullanmaya devam edebilir ve talebinizi geri alabilirsiniz.";

    Alert.alert("Hesabımı Sil", message, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Talep Oluştur",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            setLatest(await requestAccountDeletion(supabase));
          } catch (err) {
            Alert.alert("Talep oluşturulamadı", errorMessage(err));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert("Talebi Geri Al", "Hesap silme talebiniz geri alınacak.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Geri Al",
        onPress: async () => {
          setBusy(true);
          try {
            setLatest(await cancelAccountDeletionRequest(supabase));
          } catch (err) {
            Alert.alert("Talep geri alınamadı", errorMessage(err));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View className="mt-6">
      <Text className="text-gray-900 font-semibold text-base mb-2">Hesap</Text>

      {loading ? (
        <View className="bg-white rounded-2xl p-4 items-center shadow-sm">
          <ActivityIndicator color="#9ca3af" />
        </View>
      ) : pending ? (
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-gray-900 text-sm">
            Silme talebiniz {formatDate(pending.requested_at)} tarihinde alındı. En geç{" "}
            {formatDate(pending.due_at)} tarihine kadar işlenecek.
          </Text>
          <TouchableOpacity
            className="mt-3 border border-gray-300 rounded-xl py-3 items-center"
            onPress={handleCancel}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <Text className="text-gray-700 font-medium">Talebi Geri Al</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {rejected?.admin_note ? (
            <View className="bg-amber-50 rounded-2xl p-4 mb-3">
              <Text className="text-amber-800 text-sm">
                Talebiniz reddedildi: {rejected.admin_note}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            className="bg-white border border-red-300 rounded-2xl p-4 items-center shadow-sm"
            onPress={handleRequest}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text className="text-red-600 font-medium">Hesabımı Sil</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
