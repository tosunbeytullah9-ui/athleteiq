"use client";

import Link from "next/link";
import { AlertTriangle, MessageSquare } from "lucide-react";
import type { FeedbackInboxRow } from "@athleteiq/db/queries/session-feedback";
import {
  SESSION_FEEDBACK_STATUS_LABELS,
  RPE_LABELS,
  type SessionFeedbackStatus,
} from "@athleteiq/validators/session-feedback";

/**
 * Koç program detayında bir seansın altındaki geri bildirim özeti (salt-okunur).
 * Yanıtlama / okundu işaretleme akışı /feedback sayfasındadır — burada yalnızca
 * "bu seansa kim ne dedi" görünür, böylece program görünümü kalabalıklaşmaz.
 */
function rpeClass(rpe: number): string {
  if (rpe <= 3) return "bg-emerald-100 text-emerald-700";
  if (rpe <= 6) return "bg-amber-100 text-amber-700";
  if (rpe <= 8) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export function SessionFeedbackStrip({ rows }: { rows: FeedbackInboxRow[] }) {
  if (rows.length === 0) return null;

  const unread = rows.filter((r) => !r.coach_read_at).length;
  const painCount = rows.filter((r) => r.has_pain).length;

  return (
    <div className="border-t bg-muted/20 px-6 py-3">
      <div className="mb-2 flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">
          Sporcu geri bildirimi ({rows.length})
        </span>
        {unread > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
            {unread} okunmamış
          </span>
        )}
        {painCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            <AlertTriangle className="h-3 w-3" />
            {painCount} ağrı
          </span>
        )}
        <Link
          href="/feedback"
          className="ml-auto text-xs font-medium text-primary hover:underline"
        >
          Akışta aç
        </Link>
      </div>

      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{r.athlete_name}</span>
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px]">
              {SESSION_FEEDBACK_STATUS_LABELS[r.status as SessionFeedbackStatus]}
            </span>
            {r.rpe != null && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${rpeClass(r.rpe)}`}
                title={RPE_LABELS[r.rpe]}
              >
                RPE {r.rpe}
              </span>
            )}
            {r.duration_min != null && (
              <span className="text-xs text-muted-foreground">{r.duration_min} dk</span>
            )}
            {r.has_pain && (
              <span className="flex items-center gap-1 text-xs font-medium text-red-700">
                <AlertTriangle className="h-3 w-3" />
                {r.pain_area ?? "Ağrı"}
              </span>
            )}
            {r.note && (
              <span className="w-full truncate text-xs text-muted-foreground sm:w-auto sm:flex-1">
                “{r.note}”
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
