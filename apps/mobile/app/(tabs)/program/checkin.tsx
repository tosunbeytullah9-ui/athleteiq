import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useAthleteProfile } from "@/lib/hooks/useAthleteProfile";
import {
  getWellnessCheckin,
  getAthleteWellnessHistory,
  upsertWellnessCheckin,
} from "@athleteiq/db/queries/wellness";
import {
  computeWellnessTotal,
  getLocalDateString,
  wellnessCheckinSchema,
} from "@athleteiq/validators/wellness";
import type { Tables } from "@athleteiq/db/types";

type WellnessRow = Tables<"wellness_checkins">;
type ScaleField = "sleep_quality" | "soreness" | "stress" | "fatigue" | "mood";

// Yalnızca uç değerler (1 ve 5) için Türkçe etiket veriliyor — standart Likert
// uçlandırma konvansiyonu. Sporcu hiçbir zaman "5 iyi mi kötü mü" diye
// düşünmek zorunda kalmasın diye her satırda bu iki uç her zaman görünür.
const SCALE_ITEMS: { field: ScaleField; title: string; low: string; high: string }[] = [
  { field: "sleep_quality", title: "Uyku Kalitesi", low: "Çok kötü uyudum", high: "Çok iyi uyudum" },
  { field: "soreness", title: "Kas Ağrısı", low: "Çok ağrılıyım", high: "Hiç ağrım yok" },
  { field: "fatigue", title: "Yorgunluk", low: "Çok yorgunum", high: "Çok dinçim" },
  { field: "stress", title: "Stres", low: "Çok stresliyim", high: "Hiç stresli değilim" },
  { field: "mood", title: "Ruh Hali", low: "Çok kötü", high: "Çok iyi" },
];

function WellnessScaleSelector({
  title,
  low,
  high,
  value,
  onChange,
}: {
  title: string;
  low: string;
  high: string;
  value: number | undefined;
  onChange: (n: number) => void;
}) {
  return (
    <View className="mb-5">
      <Text className="text-gray-900 font-semibold text-base mb-2">{title}</Text>
      <View className="flex-row items-center justify-between">
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              value === n ? "bg-blue-700" : "bg-gray-100"
            }`}
          >
            <Text
              className={`font-bold text-base ${value === n ? "text-white" : "text-gray-700"}`}
            >
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View className="flex-row justify-between mt-1.5">
        <Text className="text-gray-400 text-xs flex-1">{low}</Text>
        <Text className="text-gray-400 text-xs flex-1 text-right">{high}</Text>
      </View>
    </View>
  );
}

function formatHistoryDate(checkinDate: string) {
  const d = new Date(`${checkinDate}T00:00:00`);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
}

function HistoryRow({
  checkin,
  isToday,
  onEdit,
}: {
  checkin: WellnessRow;
  isToday: boolean;
  onEdit: () => void;
}) {
  return (
    <View className="bg-white rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between">
      <Text className="text-gray-500 text-sm">{formatHistoryDate(checkin.checkin_date)}</Text>
      <View className="flex-row items-center gap-3">
        <Text className="text-gray-900 font-semibold text-sm">
          {checkin.wellness_total ?? "—"}/25
        </Text>
        {checkin.sleep_hours != null && (
          <Text className="text-gray-400 text-xs">{checkin.sleep_hours} sa uyku</Text>
        )}
        {isToday && (
          <TouchableOpacity onPress={onEdit}>
            <Text className="text-blue-700 text-sm font-medium">Düzenle</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function CheckinScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { athlete, loading: athleteLoading } = useAthleteProfile();
  const todayLocal = useMemo(() => getLocalDateString(), []);
  const scrollRef = useRef<ScrollView>(null);

  const [values, setValues] = useState<Partial<Record<ScaleField, number>>>({});
  const [sleepHoursText, setSleepHoursText] = useState("");
  const [notes, setNotes] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<WellnessRow[]>([]);

  useEffect(() => {
    if (!athlete) {
      if (!athleteLoading) setDataLoading(false);
      return;
    }

    async function load() {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [today, hist] = await Promise.all([
        getWellnessCheckin(supabase, athlete!.id, todayLocal),
        getAthleteWellnessHistory(
          supabase,
          athlete!.id,
          getLocalDateString(sevenDaysAgo),
          todayLocal
        ),
      ]);

      if (today) {
        setValues({
          sleep_quality: today.sleep_quality,
          soreness: today.soreness,
          stress: today.stress,
          fatigue: today.fatigue,
          mood: today.mood,
        });
        setSleepHoursText(today.sleep_hours != null ? String(today.sleep_hours) : "");
        setNotes(today.notes ?? "");
      }
      setHistory(hist);
      setDataLoading(false);
    }

    load();
  }, [athlete, athleteLoading, todayLocal]);

  const allAnswered = SCALE_ITEMS.every((item) => values[item.field] !== undefined);
  const total = allAnswered ? computeWellnessTotal(values as Record<ScaleField, number>) : null;

  function parseSleepHours(): number | null {
    if (!sleepHoursText.trim()) return null;
    const n = parseFloat(sleepHoursText.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  async function handleSave() {
    if (!athlete || !session || !allAnswered) return;

    const parsed = wellnessCheckinSchema.safeParse({
      ...values,
      sleep_hours: parseSleepHours(),
      notes: notes.trim() || undefined,
    });

    if (!parsed.success) {
      Alert.alert("Hata", parsed.error.issues[0]?.message ?? "Form geçersiz, kontrol edin.");
      return;
    }

    setSaving(true);
    try {
      await upsertWellnessCheckin(supabase, {
        athlete_id: athlete.id,
        checkin_date: todayLocal,
        sleep_quality: parsed.data.sleep_quality,
        soreness: parsed.data.soreness,
        stress: parsed.data.stress,
        fatigue: parsed.data.fatigue,
        mood: parsed.data.mood,
        sleep_hours: parsed.data.sleep_hours ?? null,
        notes: parsed.data.notes ?? null,
        source: "athlete",
        entered_by: session.user.id,
      });
      router.back();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Kaydedilemedi, tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  if (athleteLoading || dataLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  if (!athlete) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-8">
        <Text className="text-gray-500 text-center">
          Sporcu profili bulunamadı. Yöneticinizle iletişime geçin.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16 }}
    >
      <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm items-center">
        <Text className="text-gray-400 text-xs uppercase tracking-wider mb-1">Toplam</Text>
        <Text className="text-gray-900 text-3xl font-black">
          {total ?? "…"}
          <Text className="text-gray-400 text-lg font-normal">/25</Text>
        </Text>
      </View>

      <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        {SCALE_ITEMS.map((item) => (
          <WellnessScaleSelector
            key={item.field}
            title={item.title}
            low={item.low}
            high={item.high}
            value={values[item.field]}
            onChange={(n) => setValues((prev) => ({ ...prev, [item.field]: n }))}
          />
        ))}

        <Text className="text-sm font-medium text-gray-700 mb-1">
          Uyku Süresi (saat, opsiyonel)
        </Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 mb-4"
          placeholder="ör. 7.5"
          keyboardType="decimal-pad"
          value={sleepHoursText}
          onChangeText={setSleepHoursText}
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Not (opsiyonel)</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
          placeholder="Eklemek istediğin bir şey var mı?"
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      <TouchableOpacity
        className="rounded-xl py-4 items-center mb-6"
        style={{ backgroundColor: allAnswered ? "#1d4ed8" : "#93c5fd" }}
        onPress={handleSave}
        disabled={!allAnswered || saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">Kaydet</Text>
        )}
      </TouchableOpacity>

      <Text className="text-gray-900 font-semibold text-base mb-3">Son 7 Gün</Text>
      {history.length === 0 ? (
        <Text className="text-gray-400 text-sm italic mb-6">Henüz kayıt yok.</Text>
      ) : (
        history.map((h) => (
          <HistoryRow
            key={h.id}
            checkin={h}
            isToday={h.checkin_date === todayLocal}
            onEdit={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          />
        ))
      )}
    </ScrollView>
  );
}
