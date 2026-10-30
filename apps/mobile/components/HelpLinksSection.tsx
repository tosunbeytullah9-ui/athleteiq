import { View, Text, TouchableOpacity } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink } from "lucide-react-native";
import { PRIVACY_URL, SUPPORT_URL } from "@athleteiq/validators/brand";

// Profildeki "Yardım" bölümü (Parti 18E — App Store gizlilik/destek erişimi).
// Adresler canlı siteye sabit: EXPO_PUBLIC_APP_URL geliştirmede yerel sunucuyu
// gösterdiği için burada kullanılmaz.

const LINKS = [
  { label: "Gizlilik Politikası", url: PRIVACY_URL, hint: "Gizlilik politikasını tarayıcıda açar" },
  { label: "Destek", url: SUPPORT_URL, hint: "Destek sayfasını tarayıcıda açar" },
] as const;

export function HelpLinksSection() {
  return (
    <View className="mt-6">
      <Text className="text-gray-900 font-semibold text-base mb-2">Yardım</Text>
      <View className="bg-white rounded-2xl px-4 py-1 shadow-sm">
        {LINKS.map((link, i) => (
          <TouchableOpacity
            key={link.url}
            className={`flex-row justify-between items-center py-3${
              i < LINKS.length - 1 ? " border-b border-gray-50" : ""
            }`}
            onPress={() => WebBrowser.openBrowserAsync(link.url)}
            accessibilityRole="link"
            accessibilityLabel={link.label}
            accessibilityHint={link.hint}
          >
            <Text className="text-gray-900 text-sm font-medium">{link.label}</Text>
            <ExternalLink size={16} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
