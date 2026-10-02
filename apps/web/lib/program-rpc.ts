import type {
  ExerciseFormValues,
  ExerciseSetFormValues,
} from "@/components/features/program-builder/exercise-list";
import type { WodMovementFormValues } from "@/components/features/program-builder/wod-session-fields";
import {
  SEGMENT_TYPE_LABELS,
  enduranceSegmentToRow,
  isEmptySegment,
  suggestedDurationMin,
  type EnduranceSegmentFormValues,
} from "@athleteiq/validators/endurance";

// lib/program-form-schema.ts'teki sessionFormSchema'nın (new-program-client.tsx
// ve week-editor-form.tsx ortak kullanır) ürettiği şeklin TypeScript tarifi —
// yapısal tipleme sayesinde formların `data.sessions`'ı buraya doğrudan geçer.
export interface SessionFormValues {
  day_of_week: number;
  session_type?: "strength" | "conditioning" | "technical" | "recovery" | "competition";
  title?: string;
  duration_min?: number;
  exercises: ExerciseFormValues[];
  // CrossFit tarzı (WOD) seans alanları — hepsi opsiyonel, boşsa (mevcut
  // programlar) davranış değişmez. workout_format doluysa exercises YERİNE
  // wod_movements gönderilir (bkz. buildSessionsPayload).
  workout_format?: string;
  /** Dakika cinsinden (form alanı) — buildSessionsPayload saniyeye çevirir. */
  time_cap_min?: number;
  rounds?: number;
  work_sec?: number;
  interval_rest_sec?: number;
  wod_movements?: WodMovementFormValues[];
  // Dayanıklılık seansı — endurance_modality doluysa exercises YERİNE
  // endurance_segments gönderilir (bkz. buildSessionsPayload). workout_format
  // ile birlikte dolu olamaz (DB check constraint), payload bunu garanti eder.
  endurance_modality?: string;
  endurance_segments?: EnduranceSegmentFormValues[];
}

// --- Sayı temizliği ---------------------------------------------------------
// Form şemaları bilinçli olarak gevşek (lib/program-form-schema.ts) — hiçbir
// alan kaydı engellemez. Bu yüzden DB'ye gidecek her sayı burada temizlenir:
// boş/NaN/≤0 değer null olur, isimsiz satırlar atlanır. Böylece yarım
// doldurulmuş bir form da kaydedilir, DB check'leri de asla ihlal edilmez.
function positiveNumber(n: number | undefined | null): number | null {
  return n != null && Number.isFinite(n) && n > 0 ? n : null;
}

function positiveInt(n: number | undefined | null): number | null {
  const v = positiveNumber(n);
  return v == null ? null : Math.max(1, Math.round(v));
}

function nonEmpty(text: string | undefined | null): string | null {
  return text?.trim() ? text.trim() : null;
}

// Set bazlı yük tipini exercise_sets kolonlarına çevirir — yalnızca seçili
// tipin kolonu dolar, diğerleri null (temiz veri, çakışma riski yok).
export function setToInsertColumns(set: ExerciseSetFormValues) {
  const rpe = positiveNumber(set.rpe);
  return {
    load_kg: set.load_type === "kg" ? positiveNumber(set.load_kg) : null,
    percent_1rm: set.load_type === "percent_1rm" ? positiveNumber(set.percent_1rm) : null,
    is_bodyweight: set.load_type === "bodyweight",
    band_resistance: set.load_type === "band" ? set.band_resistance ?? null : null,
    rpe: rpe != null && rpe <= 10 ? rpe : null,
  };
}

// ProgramForm.sessions'ı create_program_with_weeks/update_program_week
// RPC'lerinin p_sessions jsonb'sine çevirir. Anahtar isimleri RPC'lerin
// ->>'...' okumalarıyla (018_create_program_with_weeks.sql,
// 019_shared_session_tree_insert.sql'e taşındı) birebir eşleşmeli —
// özellikle egzersizin set listesi RPC'de "sets" anahtarı altında
// okunuyor, form state'indeki "exercise_sets" değil.
// WOD hareketini exercises insert şekline çevirir — set/yük YOK, yalnızca
// serbest metin movement_detail (bkz. wod-session-fields.tsx).
function buildWodMovementExercise(movement: WodMovementFormValues, exIdx: number) {
  return {
    name: movement.name.trim(),
    category: null,
    rest_sec: null,
    notes: nonEmpty(movement.notes),
    order_index: exIdx,
    superset_group: null,
    superset_order: 0,
    movement_detail: nonEmpty(movement.movement_detail),
    sets: [],
  };
}

// Dayanıklılık bölümünü exercises insert şekline çevirir — set YOK, bölüm
// alanları segment_* kolonlarına (20261002113316_endurance_sessions_and_block_copy.sql).
// exercises.name NOT NULL: koç ad yazmadıysa bölüm tipinin etiketi kullanılır.
function buildEnduranceSegmentExercise(segment: EnduranceSegmentFormValues, exIdx: number) {
  const row = enduranceSegmentToRow(segment);
  return {
    name: segment.name?.trim() || SEGMENT_TYPE_LABELS[segment.segment_type] || "Bölüm",
    category: null,
    rest_sec: row.rest_sec,
    notes: nonEmpty(segment.notes),
    order_index: exIdx,
    superset_group: null,
    superset_order: 0,
    movement_detail: null,
    segment_type: row.segment_type,
    segment_repeats: row.segment_repeats,
    segment_distance_m: row.segment_distance_m,
    segment_duration_sec: row.segment_duration_sec,
    intensity_zone: row.intensity_zone,
    intensity_target: row.intensity_target,
    segment_recovery_target: row.segment_recovery_target,
    sets: [],
  };
}

function buildStandardExercises(session: SessionFormValues) {
  return session.exercises
    .filter((ex) => ex.name?.trim())
    .map((ex, exIdx) => ({
      name: ex.name.trim(),
      category: ex.category ?? null,
      rest_sec: positiveInt(ex.rest_sec),
      notes: nonEmpty(ex.notes),
      order_index: exIdx,
      superset_group: ex.superset_group ?? null,
      superset_order: ex.superset_order ?? 0,
      sets: ex.exercise_sets.map((set, setIdx) => ({
        set_number: setIdx + 1,
        reps: ex.is_duration_based ? null : positiveInt(set.reps),
        duration_sec: ex.is_duration_based ? positiveInt(set.duration_sec) : null,
        notes: nonEmpty(set.notes),
        ...setToInsertColumns(set),
      })),
    }));
}

export function buildSessionsPayload(sessions: SessionFormValues[]) {
  return sessions.map((session, sessionIdx) => {
    // Seans yapısı: dayanıklılık > WOD > standart. Yapı değiştirilince formda
    // kalan diğer yapının verisi (eski hareketler/bölümler) GÖNDERİLMEZ.
    const isEndurance = !!session.endurance_modality;
    const isWod = !isEndurance && !!session.workout_format;
    const segments = isEndurance
      ? (session.endurance_segments ?? []).filter((s) => !isEmptySegment(s))
      : [];
    const timeCapMin = positiveNumber(session.time_cap_min);

    return {
      day_of_week: session.day_of_week,
      session_type: session.session_type ?? null,
      title: nonEmpty(session.title),
      // Dayanıklılık seansında süre boş bırakıldıysa bölümlerden hesaplanan
      // süre yazılır — sporcunun geri bildirim formu planlanan süreyi buradan alır.
      duration_min:
        positiveInt(session.duration_min) ??
        (isEndurance ? suggestedDurationMin(segments.map(enduranceSegmentToRow)) : null),
      order_index: sessionIdx,
      workout_format: isWod ? session.workout_format : null,
      time_cap_sec: isWod && timeCapMin != null ? Math.round(timeCapMin * 60) : null,
      rounds: isWod ? positiveInt(session.rounds) : null,
      work_sec: isWod ? positiveInt(session.work_sec) : null,
      interval_rest_sec: isWod ? positiveInt(session.interval_rest_sec) : null,
      endurance_modality: isEndurance ? session.endurance_modality : null,
      exercises: isEndurance
        ? segments.map((seg, exIdx) => buildEnduranceSegmentExercise(seg, exIdx))
        : isWod
          ? (session.wod_movements ?? [])
              .filter((m) => m.name?.trim())
              .map((m, exIdx) => buildWodMovementExercise(m, exIdx))
          : buildStandardExercises(session),
    };
  });
}

// RPC'lerin RAISE EXCEPTION mesajlarını (018_create_program_with_weeks.sql,
// 020_update_program_week.sql, 021_propagate_week.sql) kısa, okunaklı bir
// kullanıcı mesajına çevirir — ham Postgres/plpgsql hatası forma direkt
// yansımasın (BUGS.md'deki "ham hata mesajı" şikayetinin genellenmiş hali).
export function mapRpcError(rawMessage: string): string {
  if (rawMessage.includes("yetkisiz")) {
    return "Bu işlemi yapmaya yetkiniz yok.";
  }
  if (rawMessage.includes("program bulunamadı")) {
    return "Program bulunamadı.";
  }
  if (rawMessage.includes("p_team_id ve p_athlete_id")) {
    return "Program kapsamı (takım veya sporcu) hatalı seçilmiş.";
  }
  if (rawMessage.includes("week_number") || rawMessage.toLowerCase().includes("between 1 and 52")) {
    return "Seçilen başlangıç tarihi ve hafta sayısı geçerli bir takvim yılına sığmıyor. Farklı bir başlangıç tarihi deneyin.";
  }
  // propagate_week_to_future (021_propagate_week.sql) — normalde UI bu iki
  // durumda butonu hiç göstermiyor, ama bir yarış durumunda (başka bir
  // sekmede blok/haftalar değiştiyse) RPC'nin kendisi yine de reddedebilir.
  if (rawMessage.includes("bu program bir bloğun parçası değil")) {
    return "Bu program bir hafta bloğunun parçası değil, yayılamaz.";
  }
  if (rawMessage.includes("sonraki hafta yok")) {
    return "Bu zaten bloktaki son hafta, uygulanacak sonraki hafta yok.";
  }
  // copy_program_block
  if (rawMessage.includes("hedef bulunamadı")) {
    return "Seçilen takım veya sporcu bulunamadı.";
  }
  if (rawMessage.includes("Bu sporcu sizin takımınızda değil")) {
    return "Yalnızca kendi takımınıza ait programlarla çalışabilirsiniz.";
  }
  if (rawMessage.includes("başlangıç tarihi gerekli")) {
    return "Başlangıç tarihi seçin.";
  }
  return "Program kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.";
}
