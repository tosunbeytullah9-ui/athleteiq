import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { upsertSessionFeedback } from "@athleteiq/db/queries/session-feedback";
import {
  RPE_LABELS,
  SESSION_FEEDBACK_STATUSES,
  SESSION_FEEDBACK_STATUS_LABELS,
  PAIN_AREAS,
  sessionFeedbackSchema,
  computeSessionLoad,
  type SessionFeedbackStatus,
} from "@athleteiq/validators/session-feedback";
import type { Tables } from "@athleteiq/db/types";

type FeedbackRow = Tables<"session_feedback">;

/**
 * Sporcunun bir seans için koça verdiği geri bildirim formu.
 *
 * Neden training_sessions üzerindeki session_rpe/athlete_session_notes kolonları
 * KULLANILMIYOR: o satır takım programlarında tüm takım tarafından paylaşılır,
 * iki sporcunun girdisi birbirini ezer. Geri bildirim (sporcu × seans)
 * granülerliğinde session_feedback tablosuna yazılır.
 */

/** RPE yoğunluk rengi — 1-3 kolay, 4-6 orta, 7-8 zor, 9-10 maksimum. */
function rpeColor(n: number, selected: boolean): string {
  if (!selected) return "bg-gray-100";
  if (n <= 3) return "bg-emerald-600";
  if (n <= 6) return "bg-amber-500";
  if (n <= 8) return "bg-orange-600";
  return "bg-red-600";
}

export function SessionFeedbackSheet({
  visible,
  onClose,
  athleteId,
  sessionId,
  sessionTitle,
  plannedDurationMin,
  existing,
  editable,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  athleteId: string;
  sessionId: string;
  sessionTitle: string;
  plannedDurationMin: number | null;
  existing: FeedbackRow | null;
  editable: boolean;
  onSaved: (row: FeedbackRow) => void;
}) {
  const [status, setStatus] = useState<SessionFeedbackStatus>("completed");
  const [rpe, setRpe] = useState<number | null>(null);
  const [durationText, setDurationText] = useState("");
  const [hasPain, setHasPain] = useState(false);
  const [painArea, setPainArea] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form her açılışta mevcut kayıttan (veya boş+planlanan süreden) tazelenir.
  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (existing) {
      setStatus(existing.status as SessionFeedbackStatus);
      setRpe(existing.rpe);
      setDurationText(existing.duration_min != null ? String(existing.duration_min) : "");
      setHasPain(existing.has_pain);
      setPainArea(existing.pain_area);
      setNote(existing.note ?? "");
    } else {
      setStatus("completed");
      setRpe(null);
      setDurationText(plannedDurationMin != null ? String(plannedDurationMin) : "");
      setHasPain(false);
      setPainArea(null);
      setNote("");
    }
  }, [visible, existing, plannedDurationMin]);

  const isSkipped = status === "skipped";
  const durationMin = durationText.trim() === "" ? null : parseInt(durationText, 10);
  const previewLoad = computeSessionLoad(rpe, durationMin);

  async function handleSave() {
    setError(null);

    // 'skipped' seçildiğinde RPE/süre DB check constraint'i gereği null OLMAK ZORUNDA
    // (session_feedback_load_shape) — formda girilmiş değerler burada temizlenir.
    const payload = {
      status,
      rpe: isSkipped ? null : rpe,
      duration_min: isSkipped ? null : durationMin,
      has_pain: hasPain,
      pain_area: hasPain ? painArea : null,
      note: note.trim() === "" ? null : note.trim(),
    };

    const parsed = sessionFeedbackSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formu kontrol edin.");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const row = (await upsertSessionFeedback(supabase, {
        athlete_id: athleteId,
        session_id: sessionId,
        source: "athlete",
        entered_by: userData.user?.id ?? null,
        ...payload,
      })) as FeedbackRow;
      onSaved(row);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Kaydedilemedi.";
      setError(msg);
      Alert.alert("Kaydedilemedi", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="bg-gray-50 rounded-t-3xl max-h-[88%]">
            {/* Başlık */}
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
              <View className="flex-1 pr-3">
                <Text className="text-gray-900 font-bold text-lg">Antrenmanı Değerlendir</Text>
                <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={1}>
                  {sessionTitle}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1">
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-5" keyboardShouldPersistTaps="handled">
              {/* Koçun yanıtı — varsa en üstte */}
              {existing?.coach_reply ? (
                <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                  <Text className="text-blue-900 font-semibold text-xs mb-1">
                    Koçunuzun yanıtı
                  </Text>
                  <Text className="text-blue-800 text-sm">{existing.coach_reply}</Text>
                </View>
              ) : null}

              {!editable && (
                <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <Text className="text-amber-800 text-sm">
                    Bu antrenmanın üzerinden 7 günden fazla geçtiği için geri bildirim artık
                    düzenlenemiyor.
                  </Text>
                </View>
              )}

              {/* Durum */}
              <Text className="text-gray-900 font-semibold text-base mb-2">Durum</Text>
              <View className="flex-row gap-2 mb-5">
                {SESSION_FEEDBACK_STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    disabled={!editable}
                    onPress={() => setStatus(s)}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      status === s ? "bg-blue-700" : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        status === s ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {SESSION_FEEDBACK_STATUS_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!isSkipped && (
                <>
                  {/* RPE */}
                  <Text className="text-gray-900 font-semibold text-base mb-1">
                    Ne kadar zorlandın? (RPE)
                  </Text>
                  <Text className="text-gray-500 text-xs mb-2">
                    Antrenmanın TAMAMINI düşünerek seç.
                  </Text>
                  <View className="flex-row flex-wrap gap-2 mb-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <TouchableOpacity
                        key={n}
                        disabled={!editable}
                        onPress={() => setRpe(n)}
                        className={`w-[17%] aspect-square rounded-xl items-center justify-center ${rpeColor(
                          n,
                          rpe === n
                        )}`}
                      >
                        <Text
                          className={`font-bold text-base ${
                            rpe === n ? "text-white" : "text-gray-700"
                          }`}
                        >
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text className="text-gray-500 text-sm mb-5 h-5">
                    {rpe != null ? RPE_LABELS[rpe] : ""}
                  </Text>

                  {/* Gerçek süre */}
                  <Text className="text-gray-900 font-semibold text-base mb-1">
                    Gerçek süre (dk)
                  </Text>
                  <Text className="text-gray-500 text-xs mb-2">
                    {plannedDurationMin != null
                      ? `Planlanan ${plannedDurationMin} dk — farklıysa düzelt.`
                      : "Antrenman kaç dakika sürdü?"}
                  </Text>
                  <TextInput
                    editable={editable}
                    value={durationText}
                    onChangeText={(t) => setDurationText(t.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    placeholder="0"
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base"
                  />
                  {previewLoad != null && (
                    <Text className="text-gray-400 text-xs mt-1.5 mb-5">
                      Antrenman yükü: {rpe} × {durationMin} = {previewLoad} AU
                    </Text>
                  )}
                  {previewLoad == null && <View className="mb-5" />}
                </>
              )}

              {/* Ağrı bayrağı */}
              <TouchableOpacity
                disabled={!editable}
                onPress={() => {
                  setHasPain((v) => !v);
                  if (hasPain) setPainArea(null);
                }}
                className={`flex-row items-center rounded-xl px-4 py-3 mb-2 ${
                  hasPain ? "bg-red-50 border border-red-300" : "bg-white border border-gray-200"
                }`}
              >
                <Ionicons
                  name={hasPain ? "checkbox" : "square-outline"}
                  size={22}
                  color={hasPain ? "#dc2626" : "#9ca3af"}
                />
                <Text
                  className={`ml-3 text-base ${
                    hasPain ? "text-red-700 font-semibold" : "text-gray-700"
                  }`}
                >
                  Ağrı / rahatsızlık yaşadım
                </Text>
              </TouchableOpacity>

              {hasPain && (
                <View className="flex-row flex-wrap gap-2 mb-5">
                  {PAIN_AREAS.map((area) => (
                    <TouchableOpacity
                      key={area}
                      disabled={!editable}
                      onPress={() => setPainArea(area)}
                      className={`px-3 py-2 rounded-full ${
                        painArea === area ? "bg-red-600" : "bg-white border border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          painArea === area ? "text-white font-semibold" : "text-gray-700"
                        }`}
                      >
                        {area}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {!hasPain && <View className="mb-3" />}

              {/* Not */}
              <Text className="text-gray-900 font-semibold text-base mb-1">
                Koçuna not (opsiyonel)
              </Text>
              <Text className="text-gray-500 text-xs mb-2">
                Söylemek istediğin başka bir şey var mı?
              </Text>
              <TextInput
                editable={editable}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
                maxLength={2000}
                textAlignVertical="top"
                placeholder="Örn. son sette forma odaklanamadım, ısınma kısa geldi..."
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base min-h-[96px]"
              />

              {error && (
                <Text className="text-red-600 text-sm mt-3">{error}</Text>
              )}

              <View className="h-6" />
            </ScrollView>

            {/* Kaydet */}
            <View className="px-5 pt-3 pb-8 border-t border-gray-200 bg-white">
              <TouchableOpacity
                disabled={!editable || saving}
                onPress={handleSave}
                className={`rounded-xl py-4 items-center ${
                  !editable || saving ? "bg-gray-300" : "bg-blue-700"
                }`}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    {existing ? "Güncelle" : "Gönder"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
