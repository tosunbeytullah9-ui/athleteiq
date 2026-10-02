import { View, Text } from "react-native";
import type { Tables } from "@athleteiq/db/types";
import {
  SEGMENT_TYPE_LABELS,
  describeSegment,
  formatDuration,
  formatEnduranceSummary,
  summarizeEnduranceSegments,
} from "@athleteiq/validators/endurance";

type Exercise = Tables<"exercises">;
type Session = Tables<"training_sessions"> & { exercises: Exercise[] };

// Dayanıklılık seansı kartı — web'deki endurance-session-card.tsx ile aynı
// mantık; hesap/metinler @athleteiq/validators/endurance'tan (tek kaynak).
// Set/yük yok: bölümler sırayla, her biri hacim + yoğunluk + toparlanma.

const SEGMENT_DOT: Record<string, string> = {
  warmup: "bg-amber-400",
  steady: "bg-sky-500",
  interval: "bg-rose-500",
  recovery: "bg-emerald-500",
  cooldown: "bg-slate-400",
};

const ZONE_COLORS = ["bg-sky-300", "bg-emerald-400", "bg-yellow-400", "bg-orange-500", "bg-red-600"];

export function EnduranceSessionCard({ session }: { session: Session }) {
  const segments = (session.exercises ?? [])
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const summary = summarizeEnduranceSegments(segments);
  const zoneTotal = summary.zoneWorkSec.reduce((a, b) => a + b, 0);

  return (
    <View>
      <View className="self-start bg-blue-50 px-2.5 py-1 rounded-full mb-2">
        <Text className="text-blue-700 text-xs font-bold">
          {formatEnduranceSummary(session.endurance_modality, segments)}
        </Text>
      </View>

      {zoneTotal > 0 && (
        <View className="mb-3">
          <View className="flex-row h-1.5 rounded-full overflow-hidden bg-gray-100">
            {summary.zoneWorkSec.map((sec, i) =>
              sec > 0 ? (
                <View key={i} className={ZONE_COLORS[i]} style={{ flex: sec }} />
              ) : null
            )}
          </View>
          <View className="flex-row flex-wrap mt-1">
            {summary.zoneWorkSec.map((sec, i) =>
              sec > 0 ? (
                <Text key={i} className="text-gray-500 text-[11px] mr-2">
                  Z{i + 1} {formatDuration(sec)}
                </Text>
              ) : null
            )}
          </View>
        </View>
      )}

      {segments.length === 0 ? (
        <Text className="text-gray-400 text-sm italic">Bölüm eklenmemiş.</Text>
      ) : (
        segments.map((seg) => {
          const desc = describeSegment(seg, session.endurance_modality);
          const typeLabel = SEGMENT_TYPE_LABELS[seg.segment_type ?? ""] ?? "Bölüm";
          const customName = seg.name && seg.name !== typeLabel ? seg.name : null;
          return (
            <View key={seg.id} className="flex-row items-start py-1.5">
              <View
                className={`w-2.5 h-2.5 rounded-full mr-2.5 mt-1.5 ${SEGMENT_DOT[seg.segment_type ?? ""] ?? "bg-gray-400"}`}
              />
              <View className="flex-1">
                <Text className="text-gray-500 text-[11px] font-bold uppercase">
                  {typeLabel}
                  {customName ? <Text className="normal-case font-normal"> · {customName}</Text> : null}
                </Text>
                <Text className="text-gray-900 text-sm">
                  <Text className="font-semibold">{desc.volume}</Text>
                  {desc.intensity ? <Text className="text-gray-500"> · {desc.intensity}</Text> : null}
                  {desc.pace ? <Text className="text-gray-500"> · ≈ {desc.pace}</Text> : null}
                </Text>
                {desc.recovery ? <Text className="text-gray-500 text-xs">{desc.recovery}</Text> : null}
                {seg.notes ? <Text className="text-gray-400 text-xs italic">{seg.notes}</Text> : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
