import type {
  ExerciseFormValues,
  ExerciseSetFormValues,
} from "@/components/features/program-builder/exercise-list";
import type { WodMovementFormValues } from "@/components/features/program-builder/wod-session-fields";
import {
  SEGMENT_TYPE_LABELS,
  enduranceSegmentToRow,
  suggestedDurationMin,
  type EnduranceSegmentFormValues,
} from "@athleteiq/validators/endurance";

// new-program-client.tsx ve edit-program-client.tsx'in birebir aynı
// sessionSchema'sından (z.infer) türeyen şekil — iki dosya da kendi zod
// nesnesini tanımlıyor (nominal olarak farklı ama yapısal olarak özdeş),
// bu yüzden burada ayrı bir zod şeması İCAT ETMİYORUZ, sadece o iki
// şemanın da üreteceği yapıyı TypeScript seviyesinde tarif ediyoruz —
// yapısal tipleme sayesinde her iki dosyanın da `data.sessions`'ı buraya
// doğrudan geçilebiliyor.
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

// Set bazlı yük tipini exercise_sets kolonlarına çevirir — yalnızca seçili
// tipin kolonu dolar, diğerleri null (temiz veri, çakışma riski yok).
export function setToInsertColumns(set: ExerciseSetFormValues) {
  return {
    load_kg: set.load_type === "kg" ? set.load_kg ?? null : null,
    percent_1rm: set.load_type === "percent_1rm" ? set.percent_1rm ?? null : null,
    is_bodyweight: set.load_type === "bodyweight",
    band_resistance: set.load_type === "band" ? set.band_resistance ?? null : null,
    rpe: set.rpe ?? null,
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
    name: movement.name,
    category: null,
    rest_sec: null,
    notes: movement.notes ?? null,
    order_index: exIdx,
    superset_group: null,
    superset_order: 0,
    movement_detail: movement.movement_detail ?? null,
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
    notes: segment.notes?.trim() || null,
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
  return session.exercises.map((ex, exIdx) => ({
    name: ex.name,
    category: ex.category ?? null,
    rest_sec: ex.rest_sec ?? null,
    notes: ex.notes ?? null,
    order_index: exIdx,
    superset_group: ex.superset_group ?? null,
    superset_order: ex.superset_order ?? 0,
    sets: ex.exercise_sets.map((set, setIdx) => ({
      set_number: setIdx + 1,
      reps: ex.is_duration_based ? null : set.reps ?? null,
      duration_sec: ex.is_duration_based ? set.duration_sec ?? null : null,
      notes: set.notes ?? null,
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
    const segments = isEndurance ? (session.endurance_segments ?? []) : [];
    const durationMin =
      session.duration_min != null && Number.isFinite(session.duration_min)
        ? session.duration_min
        : null;

    return {
      day_of_week: session.day_of_week,
      session_type: session.session_type ?? null,
      title: session.title ?? null,
      // Dayanıklılık seansında süre boş bırakıldıysa bölümlerden hesaplanan
      // süre yazılır — sporcunun geri bildirim formu planlanan süreyi buradan alır.
      duration_min:
        durationMin ?? (isEndurance ? suggestedDurationMin(segments.map(enduranceSegmentToRow)) : null),
      order_index: sessionIdx,
      workout_format: isWod ? session.workout_format : null,
      time_cap_sec: isWod && session.time_cap_min != null ? session.time_cap_min * 60 : null,
      rounds: isWod ? session.rounds ?? null : null,
      work_sec: isWod ? session.work_sec ?? null : null,
      interval_rest_sec: isWod ? session.interval_rest_sec ?? null : null,
      endurance_modality: isEndurance ? session.endurance_modality : null,
      exercises: isEndurance
        ? segments.map((seg, exIdx) => buildEnduranceSegmentExercise(seg, exIdx))
        : isWod
          ? (session.wod_movements ?? []).map((m, exIdx) => buildWodMovementExercise(m, exIdx))
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
