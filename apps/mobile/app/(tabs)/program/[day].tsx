import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAthleteProfile } from "@/lib/hooks/useAthleteProfile";
import { ExerciseCard } from "@/components/ExerciseCard";
import { SupersetGroup } from "@/components/SupersetGroup";
import { groupExercisesForRender } from "@/lib/supersetGroups";
import { getDaySessions } from "@athleteiq/db/queries/programs";
import { getAthleteMaxes, buildMaxLookup } from "@athleteiq/db/queries/exercises";
import type { Tables } from "@athleteiq/db/types";

type ExerciseWithSets = Tables<"exercises"> & { exercise_sets: Tables<"exercise_sets">[] };
type SessionWithExercises = Tables<"training_sessions"> & { exercises: ExerciseWithSets[] };

const DAY_LABELS: Record<number, string> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
  7: "Pazar",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  strength: "Kuvvet",
  conditioning: "Kondisyon",
  technical: "Teknik",
  recovery: "Recovery",
  competition: "Yarışma",
};

export default function ProgramDayScreen() {
  const { day, programId } = useLocalSearchParams<{ day: string; programId?: string }>();
  const router = useRouter();
  const { athlete } = useAthleteProfile();
  const [sessions, setSessions] = useState<SessionWithExercises[]>([]);
  const [maxLookup, setMaxLookup] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const dayNum = parseInt(day ?? "1", 10);

  useEffect(() => {
    if (!athlete) return;

    if (!programId) {
      setLoading(false);
      return;
    }

    async function fetchDaySessions() {
      try {
        const [data, athleteMaxes] = await Promise.all([
          getDaySessions(supabase, programId!, dayNum),
          getAthleteMaxes(supabase, athlete!.id),
        ]);

        const withSortedExercises = (data as SessionWithExercises[]).map((s) => ({
          ...s,
          exercises: (s.exercises ?? []).sort(
            (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
          ),
        }));
        setSessions(withSortedExercises);
        setMaxLookup(buildMaxLookup(athleteMaxes));
      } finally {
        setLoading(false);
      }
    }

    fetchDaySessions();
  }, [athlete, dayNum, programId]);

  const totalDuration = sessions.reduce(
    (sum, s) => sum + (s.duration_min ?? 0),
    0
  );
  const totalExercises = sessions.reduce(
    (sum, s) => sum + s.exercises.length,
    0
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-700 px-5 pt-14 pb-5">
        <TouchableOpacity
          className="flex-row items-center mb-3"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#93c5fd" />
          <Text className="text-blue-300 ml-1 text-sm">Program</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">
          {DAY_LABELS[dayNum] ?? `Gün ${dayNum}`}
        </Text>
        {sessions.length > 0 && (
          <View className="flex-row mt-2 gap-4">
            <Text className="text-blue-200 text-sm">
              {sessions.length} seans
            </Text>
            {totalDuration > 0 && (
              <Text className="text-blue-200 text-sm">
                {totalDuration} dk
              </Text>
            )}
            {totalExercises > 0 && (
              <Text className="text-blue-200 text-sm">
                {totalExercises} egzersiz
              </Text>
            )}
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : !programId ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-4xl mb-3">⚠️</Text>
          <Text className="text-gray-900 font-semibold text-lg text-center">
            Program bulunamadı
          </Text>
          <Text className="text-gray-500 text-sm text-center mt-1">
            Lütfen program ekranına geri dönüp tekrar deneyin.
          </Text>
        </View>
      ) : sessions.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-4xl mb-3">🛋️</Text>
          <Text className="text-gray-900 font-semibold text-lg">
            Dinlenme Günü
          </Text>
          <Text className="text-gray-500 text-sm text-center mt-1">
            Bugün için programlanmış antrenman yok.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 p-4">
          {sessions.map((session) => (
            <View key={session.id} className="mb-6">
              {/* Seans başlığı */}
              <View className="flex-row items-center mb-3">
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-lg">
                    {session.title ?? SESSION_TYPE_LABELS[session.session_type ?? ""] ?? "Antrenman"}
                  </Text>
                  {session.session_type && (
                    <Text className="text-gray-500 text-sm capitalize">
                      {SESSION_TYPE_LABELS[session.session_type] ?? session.session_type}
                    </Text>
                  )}
                </View>
                {session.duration_min && (
                  <View className="bg-gray-100 px-3 py-1 rounded-full">
                    <Text className="text-gray-600 text-sm">
                      {session.duration_min} dk
                    </Text>
                  </View>
                )}
              </View>

              {session.description && (
                <View className="bg-blue-50 rounded-xl p-3 mb-3">
                  <Text className="text-blue-800 text-sm">
                    {session.description}
                  </Text>
                </View>
              )}

              {/* Egzersizler */}
              {session.exercises.length === 0 ? (
                <Text className="text-gray-400 text-sm italic">
                  Egzersiz eklenmemiş.
                </Text>
              ) : (
                groupExercisesForRender(session.exercises).map((unit) =>
                  unit.kind === "single" ? (
                    <ExerciseCard
                      key={unit.exercise.id}
                      exercise={unit.exercise}
                      index={unit.index}
                      maxLookup={maxLookup}
                    />
                  ) : (
                    <SupersetGroup key={unit.groupKey} label={unit.label}>
                      {unit.members.map((m) => (
                        <ExerciseCard
                          key={m.exercise.id}
                          exercise={m.exercise}
                          index={m.index}
                          maxLookup={maxLookup}
                        />
                      ))}
                    </SupersetGroup>
                  )
                )
              )}
            </View>
          ))}
          <View className="h-8" />
        </ScrollView>
      )}
    </View>
  );
}
