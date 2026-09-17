"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, MessageSquare, Pencil } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { createClient } from "@/lib/supabase/client";
import { upsertSessionFeedback } from "@athleteiq/db/queries/session-feedback";
import {
  sessionFeedbackSchema,
  computeSessionLoad,
  isFeedbackEditable,
  RPE_LABELS,
  PAIN_AREAS,
  SESSION_FEEDBACK_STATUSES,
  SESSION_FEEDBACK_STATUS_LABELS,
  type SessionFeedbackStatus,
} from "@athleteiq/validators/session-feedback";
import { getLocalDateString } from "@athleteiq/validators/wellness";
import type { Tables } from "@athleteiq/db/types";

type FeedbackRow = Tables<"session_feedback">;

/**
 * Sporcunun web'den verdiği seans geri bildirimi — mobildeki
 * SessionFeedbackSheet'in web karşılığı. Wellness'ta olduğu gibi (Parti
 * 03.09.2026 Eksiklikler §3) akış önce mobilde vardı, web'de de simetrik
 * olarak sunuluyor: sporcuların bir kısmı telefon yerine tarayıcı kullanıyor.
 */

function rpeClass(n: number, selected: boolean): string {
  if (!selected) return "bg-muted text-muted-foreground hover:bg-muted/70";
  if (n <= 3) return "bg-emerald-600 text-white";
  if (n <= 6) return "bg-amber-500 text-white";
  if (n <= 8) return "bg-orange-600 text-white";
  return "bg-red-600 text-white";
}

export function AthleteFeedbackCard({
  athleteId,
  sessionId,
  plannedDurationMin,
  sessionDate,
  initial,
  onSaved,
}: {
  athleteId: string;
  sessionId: string;
  plannedDurationMin: number | null;
  sessionDate: string | null;
  initial: FeedbackRow | null;
  onSaved: (row: FeedbackRow) => void;
}) {
  const editable = isFeedbackEditable(sessionDate, getLocalDateString());
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<FeedbackRow | null>(initial);

  const [status, setStatus] = useState<SessionFeedbackStatus>(
    (initial?.status as SessionFeedbackStatus) ?? "completed"
  );
  const [rpe, setRpe] = useState<number | null>(initial?.rpe ?? null);
  const [durationText, setDurationText] = useState(
    initial?.duration_min != null
      ? String(initial.duration_min)
      : plannedDurationMin != null
        ? String(plannedDurationMin)
        : ""
  );
  const [hasPain, setHasPain] = useState(initial?.has_pain ?? false);
  const [painArea, setPainArea] = useState<string | null>(initial?.pain_area ?? null);
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSkipped = status === "skipped";
  const durationMin = durationText.trim() === "" ? null : parseInt(durationText, 10);
  const previewLoad = computeSessionLoad(rpe, durationMin);

  async function handleSave() {
    setError(null);

    // status='skipped' iken rpe/duration DB check constraint'i gereği null olmalı.
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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const saved = (await upsertSessionFeedback(supabase, {
        athlete_id: athleteId,
        session_id: sessionId,
        source: "athlete",
        entered_by: user?.id ?? null,
        ...payload,
      })) as FeedbackRow;
      setRow(saved);
      onSaved(saved);
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    if (!row) {
      if (!editable) return null;
      return (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => setOpen(true)}
        >
          <MessageSquare className="h-4 w-4" />
          Antrenmanı Değerlendir
        </Button>
      );
    }

    return (
      <div className="mt-3 rounded-lg border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium">
            {SESSION_FEEDBACK_STATUS_LABELS[row.status as SessionFeedbackStatus]}
          </span>
          {row.rpe != null && (
            <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold">
              RPE {row.rpe} · {RPE_LABELS[row.rpe]}
            </span>
          )}
          {row.duration_min != null && (
            <span className="text-xs text-muted-foreground">{row.duration_min} dk</span>
          )}
          {row.has_pain && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-3 w-3" />
              Ağrı{row.pain_area ? `: ${row.pain_area}` : ""}
            </span>
          )}
          {editable && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Düzenle
            </Button>
          )}
        </div>

        {row.note && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{row.note}</p>
        )}

        {row.coach_reply && (
          <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-blue-900">Koçunuzun yanıtı</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-blue-800">{row.coach_reply}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-semibold">Durum</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SESSION_FEEDBACK_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                status === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {SESSION_FEEDBACK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {!isSkipped && (
        <>
          <div>
            <p className="text-sm font-semibold">Ne kadar zorlandınız? (RPE)</p>
            <p className="text-xs text-muted-foreground">
              Antrenmanın tamamını düşünerek seçin.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRpe(n)}
                  className={`h-9 w-9 rounded-md text-sm font-bold transition-colors ${rpeClass(
                    n,
                    rpe === n
                  )}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 h-4 text-xs text-muted-foreground">
              {rpe != null ? RPE_LABELS[rpe] : ""}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold">Gerçek süre (dk)</p>
            <p className="text-xs text-muted-foreground">
              {plannedDurationMin != null
                ? `Planlanan ${plannedDurationMin} dk — farklıysa düzeltin.`
                : "Antrenman kaç dakika sürdü?"}
            </p>
            <input
              inputMode="numeric"
              value={durationText}
              onChange={(e) => setDurationText(e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-2 flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {previewLoad != null && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Antrenman yükü: {rpe} × {durationMin} = {previewLoad} AU
              </p>
            )}
          </div>
        </>
      )}

      <div>
        <button
          type="button"
          onClick={() => {
            setHasPain((v) => !v);
            if (hasPain) setPainArea(null);
          }}
          className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
            hasPain ? "border-red-300 bg-red-50 text-red-700" : "hover:bg-muted/50"
          }`}
        >
          <span
            className={`flex h-4 w-4 items-center justify-center rounded border ${
              hasPain ? "border-red-600 bg-red-600 text-white" : "border-input"
            }`}
          >
            {hasPain && <Check className="h-3 w-3" />}
          </span>
          Ağrı / rahatsızlık yaşadım
        </button>

        {hasPain && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PAIN_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setPainArea(area)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  painArea === area
                    ? "bg-red-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold">Koçunuza not (opsiyonel)</p>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          placeholder="Söylemek istediğiniz başka bir şey var mı?"
          className="mt-2 flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" disabled={saving} onClick={handleSave}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {row ? "Güncelle" : "Gönder"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
