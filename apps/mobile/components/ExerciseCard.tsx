import { View, Text } from "react-native";
import type { Tables } from "@athleteiq/db/types";
import { resolveOneRepMaxKg } from "@athleteiq/db/queries/exercises";

type ExerciseSetRow = Tables<"exercise_sets">;
type Exercise = Tables<"exercises"> & { exercise_sets: ExerciseSetRow[] };

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  maxLookup: Map<string, number>;
}

const BAND_LABELS: Record<string, string> = {
  soft: "Yumuşak",
  medium: "Orta",
  hard: "Sert",
};

function formatSetReps(set: ExerciseSetRow): string {
  if (set.duration_sec != null) return `${set.duration_sec} sn`;
  if (set.reps != null) return `${set.reps} tekrar`;
  return "—";
}

function formatSetLoad(
  set: ExerciseSetRow,
  exerciseName: string,
  maxLookup: Map<string, number>
): string {
  if (set.band_resistance) return `${BAND_LABELS[set.band_resistance] ?? set.band_resistance} bant`;
  if (set.is_bodyweight) return "Vücut ağırlığı";
  if (set.percent_1rm != null) {
    const resolvedKg = resolveOneRepMaxKg(exerciseName, set.percent_1rm, maxLookup);
    if (resolvedKg != null) {
      return `%${set.percent_1rm} (${resolvedKg.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} kg)`;
    }
    return `%${set.percent_1rm}`;
  }
  if (set.load_kg != null) return `${set.load_kg} kg`;
  return "—";
}

export function ExerciseCard({ exercise, index, maxLookup }: ExerciseCardProps) {
  const sets = (exercise.exercise_sets ?? []).slice().sort((a, b) => a.set_number - b.set_number);

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-start">
        {/* Sıra numarası */}
        <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center mr-3 mt-0.5">
          <Text className="text-blue-700 font-bold text-sm">{index + 1}</Text>
        </View>

        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            {/* Egzersiz adı */}
            <Text className="text-gray-900 font-semibold text-base leading-tight flex-1">
              {exercise.name}
            </Text>
            {exercise.rest_sec ? (
              <View className="bg-orange-50 px-2.5 py-1 rounded-lg shrink-0">
                <Text className="text-orange-600 text-xs">Dinlenme {exercise.rest_sec}sn</Text>
              </View>
            ) : null}
          </View>

          {/* Notlar */}
          {exercise.notes ? (
            <Text className="text-gray-400 text-sm mt-1 italic">{exercise.notes}</Text>
          ) : null}

          {/* Setler */}
          {sets.length === 0 ? (
            <Text className="text-gray-400 text-sm mt-2">
              Bu egzersiz için set tanımlanmamış.
            </Text>
          ) : (
            <View className="mt-2">
              {sets.map((set, i) => (
                <View
                  key={set.id}
                  className={`flex-row items-center py-1 ${
                    i < sets.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <Text className="text-gray-400 text-xs w-6">{set.set_number}</Text>
                  <Text className="text-gray-700 text-sm flex-1">{formatSetReps(set)}</Text>
                  <Text className="text-blue-700 text-sm font-medium flex-1">
                    {formatSetLoad(set, exercise.name, maxLookup)}
                  </Text>
                  <Text className="text-gray-500 text-xs w-14 text-right">
                    {set.rpe != null ? `RPE ${set.rpe}` : "—"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
