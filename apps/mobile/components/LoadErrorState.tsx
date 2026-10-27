import { View, Text, TouchableOpacity } from "react-native";

// Sorgu hata/timeout verdiğinde gösterilir — boş sonuçla ("Dinlenme Günü", "program
// yok") KARIŞTIRILMAMALI: hata durumunda kullanıcıya antrenmanı olmadığı söylenmez.
export function LoadErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-4xl mb-3">⚠️</Text>
      <Text className="text-gray-900 font-semibold text-lg text-center">
        Program yüklenemedi
      </Text>
      <Text className="text-gray-500 text-sm text-center mt-1">
        Bağlantınızı kontrol edip tekrar deneyin.
      </Text>
      <TouchableOpacity
        className="bg-blue-700 rounded-xl px-5 py-2.5 mt-4"
        onPress={onRetry}
        activeOpacity={0.75}
      >
        <Text className="text-white font-semibold">Tekrar dene</Text>
      </TouchableOpacity>
    </View>
  );
}
