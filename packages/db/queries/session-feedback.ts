import type { DbClient } from "./_client";
import type { TablesInsert } from "../types";

// Metot kısayolu (property değil) bilinçli: supabase-js'in rpc() imzası fonksiyon
// adını literal union olarak daraltır; property syntax'te strictFunctionTypes bunu
// reddeder, metot kısayolu bivariant olduğu için tipli istemci sorunsuz geçer.
type RpcClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(fn: string, args?: Record<string, unknown>): any;
};

/**
 * session_load GENERATED kolondur (rpe * duration_min) — payload'a konursa
 * Postgres reddeder. session_date de trigger tarafından programdan hesaplanır,
 * gönderilse bile EZİLİR. coach_* kolonları INSERT'te trigger ile sıfırlanır ve
 * normal UPDATE ile yazılamaz (yalnızca markSessionFeedbackRead /
 * replyToSessionFeedback RPC'lerinden) — bu yüzden hepsi tipten çıkarılır.
 */
export type SessionFeedbackUpsertInput = Omit<
  TablesInsert<"session_feedback">,
  | "id"
  | "session_load"
  | "session_date"
  | "coach_read_at"
  | "coach_read_by"
  | "coach_reply"
  | "coach_replied_at"
  | "coach_replied_by"
  | "created_at"
  | "updated_at"
  | "submitted_at"
>;

/** Bir sporcunun verilen seanslar için girdiği geri bildirimler (gün/hafta görünümü). */
export async function getSessionFeedbackForSessions(
  client: DbClient,
  athleteId: string,
  sessionIds: string[]
) {
  if (sessionIds.length === 0) return [];

  const { data, error } = await client
    .from("session_feedback")
    .select("*")
    .eq("athlete_id", athleteId)
    .in("session_id", sessionIds);

  if (error) throw error;
  return data;
}

/**
 * Upsert (athlete_id, session_id) — sporcu aynı seansın geri bildirimini
 * düzeltebilir. ON CONFLICT DO UPDATE dalı session_feedback_update_athlete
 * politikasıyla izinlidir (tarih penceresi: son 7 gün).
 */
export async function upsertSessionFeedback(
  client: DbClient,
  feedback: SessionFeedbackUpsertInput
) {
  const { data, error } = await client
    .from("session_feedback")
    .upsert(feedback, { onConflict: "athlete_id,session_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Sporcunun kendi geri bildirim geçmişi (koç yanıtları dahil). */
export async function getAthleteFeedbackHistory(
  client: DbClient,
  athleteId: string,
  from: string,
  to: string
) {
  const { data, error } = await client
    .from("session_feedback")
    .select("*")
    .eq("athlete_id", athleteId)
    .gte("session_date", from)
    .lte("session_date", to)
    .order("session_date", { ascending: false });

  if (error) throw error;
  return data;
}

export interface FeedbackInboxRow {
  id: string;
  athlete_id: string;
  athlete_name: string;
  session_id: string;
  session_title: string | null;
  session_type: string | null;
  program_title: string | null;
  session_date: string;
  status: string;
  rpe: number | null;
  duration_min: number | null;
  session_load: number | null;
  has_pain: boolean;
  pain_area: string | null;
  note: string | null;
  source: string;
  submitted_at: string | null;
  coach_read_at: string | null;
  coach_reply: string | null;
  coach_replied_at: string | null;
}

function mapInboxRow(r: Record<string, unknown>): FeedbackInboxRow {
  const athlete = r.athletes as { full_name?: string } | null;
  const session = r.training_sessions as
    | {
        title?: string | null;
        session_type?: string | null;
        training_programs?: { title?: string | null } | null;
      }
    | null;

  return {
    id: r.id as string,
    athlete_id: r.athlete_id as string,
    athlete_name: athlete?.full_name ?? "—",
    session_id: r.session_id as string,
    session_title: session?.title ?? null,
    session_type: session?.session_type ?? null,
    program_title: session?.training_programs?.title ?? null,
    session_date: r.session_date as string,
    status: r.status as string,
    rpe: (r.rpe as number | null) ?? null,
    duration_min: (r.duration_min as number | null) ?? null,
    session_load: (r.session_load as number | null) ?? null,
    has_pain: Boolean(r.has_pain),
    pain_area: (r.pain_area as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    source: r.source as string,
    submitted_at: (r.submitted_at as string | null) ?? null,
    coach_read_at: (r.coach_read_at as string | null) ?? null,
    coach_reply: (r.coach_reply as string | null) ?? null,
    coach_replied_at: (r.coach_replied_at as string | null) ?? null,
  };
}

const INBOX_SELECT =
  "id, athlete_id, session_id, session_date, status, rpe, duration_min, session_load, " +
  "has_pain, pain_area, note, source, submitted_at, coach_read_at, coach_reply, coach_replied_at, " +
  "athletes!inner(org_id, full_name), " +
  "training_sessions!inner(title, session_type, program_id, training_programs!inner(title))";

/**
 * Koç/admin gelen kutusu. session_feedback'te org_id kolonu YOK (012_wellness.sql
 * ile aynı tercih) — org filtresi athletes!inner üzerinden yapılır, tıpkı
 * getOrgWellnessCheckins gibi. RLS koçu zaten kendi takımına daraltır.
 */
export async function getOrgSessionFeedback(
  client: DbClient,
  orgId: string,
  from: string,
  to: string
): Promise<FeedbackInboxRow[]> {
  const { data, error } = await client
    .from("session_feedback")
    .select(INBOX_SELECT)
    .eq("athletes.org_id", orgId)
    .gte("session_date", from)
    .lte("session_date", to)
    .order("session_date", { ascending: false })
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapInboxRow);
}

/** Bir programın (haftanın) tüm seanslarına gelen geri bildirimler — koç program detayı. */
export async function getProgramSessionFeedback(
  client: DbClient,
  programId: string
): Promise<FeedbackInboxRow[]> {
  const { data, error } = await client
    .from("session_feedback")
    .select(INBOX_SELECT)
    .eq("training_sessions.program_id", programId)
    .order("session_date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapInboxRow);
}

export interface PainAlertRow {
  id: string;
  athlete_id: string;
  athlete_name: string;
  session_date: string;
  pain_area: string | null;
  note: string | null;
  submitted_at: string | null;
}

/**
 * Koçun HENÜZ OKUMADIĞI ağrı bildirimleri — sidebar rozeti ve anlık uyarı için.
 *
 * Ayrı bir "bildirim kuyruğu" tablosu bilinçli olarak AÇILMADI: "okunmamış ağrı"
 * durumu zaten session_feedback'te tutuluyor (has_pain + coach_read_at is null),
 * ikinci bir yerde tutmak iki kaynağı senkron tutma yükü getirirdi. Tarih sınırı
 * da yok — 3 hafta önce okunmamış bir ağrı bildirimi hâlâ okunmamıştır.
 *
 * RLS (session_feedback_select) koçu kendi takımına, admin'i kendi org'una
 * daraltır; burada ek bir filtre gerekmez.
 */
export async function getUnreadPainFeedback(
  client: DbClient,
  limit = 50
): Promise<PainAlertRow[]> {
  const { data, error } = await client
    .from("session_feedback")
    .select("id, athlete_id, session_date, pain_area, note, submitted_at, athletes!inner(full_name)")
    .eq("has_pain", true)
    .is("coach_read_at", null)
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((r: Record<string, unknown>) => {
    const athlete = r.athletes as { full_name?: string } | null;
    return {
      id: r.id as string,
      athlete_id: r.athlete_id as string,
      athlete_name: athlete?.full_name ?? "—",
      session_date: r.session_date as string,
      pain_area: (r.pain_area as string | null) ?? null,
      note: (r.note as string | null) ?? null,
      submitted_at: (r.submitted_at as string | null) ?? null,
    };
  });
}

/**
 * coach_read_at / coach_reply kolonları BEFORE UPDATE guard trigger'ıyla normal
 * UPDATE'e kapalıdır — tek yazma yolu bu iki SECURITY DEFINER RPC'dir. İkisi de
 * kendi içinde coalesce(..., false) yetki kontrolü yapar (§4.1).
 */
export async function markSessionFeedbackRead(client: RpcClient, feedbackId: string) {
  const { error } = await client.rpc("mark_session_feedback_read", {
    p_feedback_id: feedbackId,
  });
  if (error) throw error;
}

export async function replyToSessionFeedback(
  client: RpcClient,
  feedbackId: string,
  reply: string | null
) {
  const { error } = await client.rpc("reply_to_session_feedback", {
    p_feedback_id: feedbackId,
    p_reply: reply,
  });
  if (error) throw error;
}
