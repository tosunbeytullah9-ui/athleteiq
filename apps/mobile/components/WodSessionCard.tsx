import { View, Text } from "react-native";
import type { Tables } from "@athleteiq/db/types";
import { formatWodSummary } from "@/lib/wodFormat";

type Exercise = Tables<"exercises">;
type Session = Tables<"training_sessions"> & { exercises: Exercise[] };

// CrossFit tarzı (WOD) seans kartı — web'deki program-detail-client.tsx /
// athlete-program-view.tsx'teki WodSessionCard ile aynı mantık: set/yük/tonaj
// YOK, yalnızca format özeti + düz, sıralı hareket listesi.
export function WodSessionCard({ session }: { session: Session }) {
  const movements = (session.exercises ?? [])
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <View>
      <View className="self-start bg-blue-50 px-2.5 py-1 rounded-full mb-3">
        <Text className="text-blue-700 text-xs font-bold">{formatWodSummary(session)}</Text>
      </View>

      {movements.length === 0 ? (
        <Text className="text-gray-400 text-sm italic">Hareket eklenmemiş.</Text>
      ) : (
        movements.map((m, i) => (
          <View key={m.id} className="flex-row items-start py-1.5">
            <View className="w-6 h-6 rounded-md bg-gray-100 items-center justify-center mr-2 mt-0.5">
              <Text className="text-gray-500 text-xs font-semibold">{i + 1}</Text>
            </View>
            <Text className="text-gray-900 text-sm flex-1">
              <Text className="font-medium">{m.name}</Text>
              {m.movement_detail ? <Text className="text-gray-500"> — {m.movement_detail}</Text> : null}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
