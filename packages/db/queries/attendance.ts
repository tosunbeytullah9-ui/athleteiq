import type { DbClient } from "./_client";
import type { TablesInsert } from "../types";

// recorded_by/created_at/updated_at are DB-managed (auth.uid() taraflı yazımda
// recorded_by client'tan gönderilir, ama id/timestamps hiçbir zaman gönderilmez).
export type AttendanceUpsertInput = Omit<
  TablesInsert<"attendance_records">,
  "id" | "created_at" | "updated_at"
>;

export async function getAttendanceForTeamAndDate(
  client: DbClient,
  teamId: string,
  date: string
) {
  const { data, error } = await client
    .from("attendance_records")
    .select("*")
    .eq("team_id", teamId)
    .eq("session_date", date);

  if (error) throw error;
  return data;
}

export async function getAttendanceHistory(
  client: DbClient,
  teamId: string,
  from: string,
  to: string
) {
  const { data, error } = await client
    .from("attendance_records")
    .select("*")
    .eq("team_id", teamId)
    .gte("session_date", from)
    .lte("session_date", to)
    .order("session_date", { ascending: false });

  if (error) throw error;
  return data;
}

// attendance_write RLS politikası (042_attendance.sql) UPDATE'i de kapsıyor
// (wellness_checkins gibi — acwr_logs'un eski eksikliği burada YOK), bu yüzden
// upsert'in ON CONFLICT DO UPDATE dalı sorunsuz çalışır.
export async function upsertAttendanceRecords(
  client: DbClient,
  records: AttendanceUpsertInput[]
) {
  if (records.length === 0) return [];

  const { data, error } = await client
    .from("attendance_records")
    .upsert(records, { onConflict: "athlete_id,session_date" })
    .select();

  if (error) throw error;
  return data;
}
