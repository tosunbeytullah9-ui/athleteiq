import type { ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  title?: string;
  subtitle?: string;
  /** Başlığın sağındaki öğe (örn. canlı bağlantı göstergesi). */
  right?: ReactNode;
  back?: { label: string; onPress: () => void };
  /** Başlık + alt başlık yerine özel içerik (profil avatarı, selamlama). */
  children?: ReactNode;
  /** Alt boşluk / hizalama sınıfları. */
  className?: string;
};

// Ekranın üstüne sabit mavi başlık. Üst boşluk sabit değil, cihazın safe area'sı + 12 —
// Dynamic Island'lı iPhone'da başlık durum çubuğuyla çakışmaz. ScrollView'un
// DIŞINDA kullanılır; içerik kaydırılınca durum çubuğunun altına girmez.
export function ScreenHeader({
  title,
  subtitle,
  right,
  back,
  children,
  className = "pb-6",
}: Props) {
  const insets = useSafeAreaInsets();
  // Durum çubuğu simgeleri mavi zeminde açık. Yalnızca odaktaki ekran bastırır —
  // RN StatusBar girdileri mount sırasıyla birleşir, unmount olunca kök layout'un
  // koyu varsayılanına döner (yerel başlıklı / açık zeminli ekranlar).
  const isFocused = useIsFocused();

  return (
    <View
      className={`bg-blue-700 px-5 ${className}`}
      style={{ paddingTop: insets.top + 12 }}
    >
      {isFocused && <StatusBar style="light" />}
      {back && (
        <TouchableOpacity
          className="flex-row items-center mb-3"
          onPress={back.onPress}
        >
          <Ionicons name="chevron-back" size={20} color="#93c5fd" />
          <Text className="text-blue-300 ml-1 text-sm">{back.label}</Text>
        </TouchableOpacity>
      )}
      {children ?? (
        <>
          {title !== undefined &&
            (right ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-white text-2xl font-bold">{title}</Text>
                {right}
              </View>
            ) : (
              <Text className="text-white text-2xl font-bold">{title}</Text>
            ))}
          {subtitle !== undefined && (
            <Text className="text-blue-200 text-sm mt-1">{subtitle}</Text>
          )}
        </>
      )}
    </View>
  );
}
