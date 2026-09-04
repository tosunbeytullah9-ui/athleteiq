"use client";

import { useState } from "react";
import { Sunrise } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { Card, CardContent } from "@athleteiq/ui/components/card";
import { createClient } from "@/lib/supabase/client";
import { upsertWellnessCheckin } from "@athleteiq/db/queries/wellness";
import {
  computeWellnessTotal,
  wellnessCheckinSchema,
} from "@athleteiq/validators/wellness";
import { toast } from "@/components/ui/use-toast";
import type { Tables } from "@athleteiq/db/types";

type WellnessRow = Tables<"wellness_checkins">;
type ScaleField = "sleep_quality" | "soreness" | "stress" | "fatigue" | "mood";

// Yalnızca uç değerler (1 ve 5) için Türkçe etiket veriliyor — mobile'daki
// checkin.tsx ile aynı konvansiyon (bkz. apps/mobile/app/(tabs)/program/checkin.tsx).
const SCALE_ITEMS: { field: ScaleField; title: string; low: string; high: string }[] = [
  { field: "sleep_quality", title: "Uyku Kalitesi", low: "Çok kötü uyudum", high: "Çok iyi uyudum" },
  { field: "soreness", title: "Kas Ağrısı", low: "Çok ağrılıyım", high: "Hiç ağrım yok" },
  { field: "fatigue", title: "Yorgunluk", low: "Çok yorgunum", high: "Çok dinçim" },
  { field: "stress", title: "Stres", low: "Çok stresliyim", high: "Hiç stresli değilim" },
  { field: "mood", title: "Ruh Hali", low: "Çok kötü", high: "Çok iyi" },
];

interface Props {
  athleteId: string;
  userId: string;
  todayCheckin: WellnessRow | null;
  history: WellnessRow[];
  today: string;
}

function ScaleSelector({
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
    <div className="mb-5">
      <p className="font-medium text-sm mb-2">{title}</p>
      <div className="flex items-center justify-between gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-10 w-10 rounded-full text-sm font-semibold transition-colors ${
              value === n
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">{low}</span>
        <span className="text-xs text-muted-foreground">{high}</span>
      </div>
    </div>
  );
}

function formatHistoryDate(checkinDate: string) {
  const d = new Date(`${checkinDate}T00:00:00`);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
}

export function WellnessClient({ athleteId, userId, todayCheckin, history, today }: Props) {
  const [values, setValues] = useState<Partial<Record<ScaleField, number>>>(
    todayCheckin
      ? {
          sleep_quality: todayCheckin.sleep_quality,
          soreness: todayCheckin.soreness,
          stress: todayCheckin.stress,
          fatigue: todayCheckin.fatigue,
          mood: todayCheckin.mood,
        }
      : {}
  );
  const [sleepHoursText, setSleepHoursText] = useState(
    todayCheckin?.sleep_hours != null ? String(todayCheckin.sleep_hours) : ""
  );
  const [notes, setNotes] = useState(todayCheckin?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [rows, setRows] = useState(history);

  const allAnswered = SCALE_ITEMS.every((item) => values[item.field] !== undefined);
  const total = allAnswered ? computeWellnessTotal(values as Record<ScaleField, number>) : null;

  function parseSleepHours(): number | null {
    if (!sleepHoursText.trim()) return null;
    const n = parseFloat(sleepHoursText.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  async function handleSave() {
    if (!allAnswered) return;

    const parsed = wellnessCheckinSchema.safeParse({
      ...values,
      sleep_hours: parseSleepHours(),
      notes: notes.trim() || undefined,
    });

    if (!parsed.success) {
      toast({
        title: "Form geçersiz",
        description: parsed.error.issues[0]?.message,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const saved = await upsertWellnessCheckin(supabase, {
        athlete_id: athleteId,
        checkin_date: today,
        sleep_quality: parsed.data.sleep_quality,
        soreness: parsed.data.soreness,
        stress: parsed.data.stress,
        fatigue: parsed.data.fatigue,
        mood: parsed.data.mood,
        sleep_hours: parsed.data.sleep_hours ?? null,
        notes: parsed.data.notes ?? null,
        source: "athlete",
        entered_by: userId,
      });
      setRows((prev) => {
        const withoutToday = prev.filter((r) => r.checkin_date !== today);
        return [saved, ...withoutToday];
      });
      toast({ title: "Wellness kaydedildi" });
    } catch (err: unknown) {
      toast({
        title: "Kaydedilemedi",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sunrise className="h-5 w-5" />
          Günlük Wellness
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Her gün birkaç saniyede kendini nasıl hissettiğini bildir.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Toplam</p>
          <p className="text-3xl font-black">
            {total ?? "…"}
            <span className="text-lg font-normal text-muted-foreground">/25</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {SCALE_ITEMS.map((item) => (
            <ScaleSelector
              key={item.field}
              title={item.title}
              low={item.low}
              high={item.high}
              value={values[item.field]}
              onChange={(n) => setValues((prev) => ({ ...prev, [item.field]: n }))}
            />
          ))}

          <div className="space-y-1.5 mb-4">
            <Label htmlFor="sleep_hours">Uyku Süresi (saat, opsiyonel)</Label>
            <Input
              id="sleep_hours"
              inputMode="decimal"
              placeholder="ör. 7.5"
              value={sleepHoursText}
              onChange={(e) => setSleepHoursText(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Not (opsiyonel)</Label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Eklemek istediğin bir şey var mı?"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={!allAnswered || isSaving} className="w-full" size="lg">
        {isSaving ? "Kaydediliyor..." : todayCheckin ? "Güncelle" : "Kaydet"}
      </Button>

      <div>
        <h2 className="text-base font-semibold mb-3">Son 7 Gün</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Henüz kayıt yok.</p>
        ) : (
          <div className="space-y-2">
            {rows
              .slice()
              .sort((a, b) => (a.checkin_date < b.checkin_date ? 1 : -1))
              .map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm"
                >
                  <span className="text-muted-foreground">{formatHistoryDate(h.checkin_date)}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{h.wellness_total ?? "—"}/25</span>
                    {h.sleep_hours != null && (
                      <span className="text-xs text-muted-foreground">{h.sleep_hours} sa uyku</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
