import { z } from "zod";

export const ATTENDANCE_STATUSES = ["present", "late", "excused", "absent"] as const;

export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);

export const markAttendanceSchema = z.object({
  athlete_id: z.string().uuid(),
  session_date: z.string().min(1, "Tarih gerekli"),
  status: attendanceStatusSchema,
  notes: z.string().optional().nullable(),
});

export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
