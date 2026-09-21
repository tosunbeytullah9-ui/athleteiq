"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  copyAnnualPlanWeek,
  getAnnualPlanCells,
  getAnnualPlanWeeks,
  setAnnualPlanCell,
  upsertAnnualPlanWeek,
} from "@athleteiq/db/queries/annual-plans";
import {
  annualPlanWeekSchema,
  MAX_SESSIONS_PER_CELL,
  weekDateRange,
} from "@athleteiq/validators/annual-plan";
import type { Tables } from "@athleteiq/db/types";
import type { PlanCompetition } from "./annual-plan-grid";

type Method = Tables<"annual_plan_methods">;
type WeekRow = Tables<"annual_plan_weeks">;
type CellRow = Tables<"annual_plan_cells">;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  seasonStart: string;
  totalWeeks: number;
  weekIndex: number;
  week: WeekRow | null;
  methods: Method[];
  cells: CellRow[];
  competitions: PlanCompetition[];
  onWeeksChange: (weeks: WeekRow[]) => void;
  onCellsChange: (cells: CellRow[]) => void;
  onNavigateWeek: (weekIndex: number) => void;
  onRequireRefresh: () => void;
}

function formatRange(seasonStart: string, weekIndex: number): string {
  const { start, end } = weekDateRange(seasonStart, weekIndex);
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  return `${fmt(start)} — ${fmt(end)}`;
}

/**
 * "3", "5-8", "3,7,10-12" gibi bir hafta aralığı ifadesini numara listesine
 * çevirir. Plan aralığının dışındakiler ve kaynak hafta elenir.
 */
function parseWeekRanges(input: string, totalWeeks: number, exclude: number): number[] {
  const out = new Set<number>();
  for (const part of input.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const dash = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (dash) {
      const from = Number(dash[1]);
      const to = Number(dash[2]);
      for (let i = Math.min(from, to); i <= Math.max(from, to); i++) out.add(i);
      continue;
    }
    const single = Number(trimmed);
    if (Number.isInteger(single)) out.add(single);
  }
  return [...out].filter((w) => w >= 1 && w <= totalWeeks && w !== exclude).sort((a, b) => a - b);
}

export function WeekDetailDialog({
  open,
  onOpenChange,
  planId,
  seasonStart,
  totalWeeks,
  weekIndex,
  week,
  methods,
  cells,
  competitions,
  onWeeksChange,
  onCellsChange,
  onNavigateWeek,
  onRequireRefresh,
}: Props) {
  const [intensity, setIntensity] = useState("");
  const [phase, setPhase] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [sessions, setSessions] = useState<Record<string, string>>({});
  const [copyTargets, setCopyTargets] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const cellsForWeek = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cells) {
      if (c.week_index === weekIndex) map.set(c.method_id, c.sessions);
    }
    return map;
  }, [cells, weekIndex]);

  // Hafta değiştikçe formu o haftanın kayıtlı değerleriyle yeniden doldur.
  useEffect(() => {
    setIntensity(week?.intensity_pct == null ? "" : String(Number(week.intensity_pct)));
    setPhase(week?.phase ?? "");
    setLocation(week?.location ?? "");
    setNotes(week?.notes ?? "");
    setSessions(
      Object.fromEntries(methods.map((m) => [m.id, String(cellsForWeek.get(m.id) ?? 0)]))
    );
    setCopyTargets("");
  }, [weekIndex, week, methods, cellsForWeek]);

  async function handleSave() {
    const intensityValue = intensity.trim() === "" ? null : Number(intensity.replace(",", "."));
    if (intensityValue !== null && Number.isNaN(intensityValue)) {
      toast({
        title: "Geçersiz yoğunluk",
        description: "Yoğunluk sayı olmalı (örn. 85).",
        variant: "destructive",
      });
      return;
    }

    const parsed = annualPlanWeekSchema.safeParse({
      week_index: weekIndex,
      intensity_pct: intensityValue,
      phase: phase.trim() || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    });
    if (!parsed.success) {
      toast({
        title: "Geçersiz değer",
        description: parsed.error.issues[0]?.message ?? "Form geçersiz.",
        variant: "destructive",
      });
      return;
    }

    // Seans sayıları: boş/NaN 0 sayılır, sınırlar DB check'iyle aynı.
    const nextSessions = new Map<string, number>();
    for (const m of methods) {
      const raw = (sessions[m.id] ?? "").trim();
      const value = raw === "" ? 0 : Number(raw);
      if (!Number.isInteger(value) || value < 0 || value > MAX_SESSIONS_PER_CELL) {
        toast({
          title: "Geçersiz seans sayısı",
          description: `${m.name}: 0 ile ${MAX_SESSIONS_PER_CELL} arasında tam sayı olmalı.`,
          variant: "destructive",
        });
        return;
      }
      nextSessions.set(m.id, value);
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      await upsertAnnualPlanWeek(supabase, planId, parsed.data);

      // Yalnızca DEĞİŞEN hücreler yazılır — değişmeyen satıra dokunmak
      // gereksiz updated_at güncellemesi ve gereksiz istek demek.
      const changed = methods.filter(
        (m) => (nextSessions.get(m.id) ?? 0) !== (cellsForWeek.get(m.id) ?? 0)
      );
      for (const m of changed) {
        await setAnnualPlanCell(supabase, planId, m.id, weekIndex, nextSessions.get(m.id) ?? 0);
      }

      const [freshWeeks, freshCells] = await Promise.all([
        getAnnualPlanWeeks(supabase, planId),
        getAnnualPlanCells(supabase, planId),
      ]);
      onWeeksChange((freshWeeks ?? []) as WeekRow[]);
      onCellsChange((freshCells ?? []) as CellRow[]);

      toast({ title: "Kaydedildi", description: `Hafta ${weekIndex} güncellendi.` });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Hafta kaydedilemedi.",
        variant: "destructive",
      });
      onRequireRefresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopy() {
    const targets = parseWeekRanges(copyTargets, totalWeeks, weekIndex);
    if (targets.length === 0) {
      toast({
        title: "Hedef hafta yok",
        description: "Örnek: 5-8 veya 3,7,10-12",
        variant: "destructive",
      });
      return;
    }

    if (
      !window.confirm(
        `Hafta ${weekIndex} içeriği ${targets.length} haftaya kopyalanacak (${targets.join(", ")}). Hedef haftaların mevcut sistem dağılımı SİLİNECEK. Devam edilsin mi?`
      )
    ) {
      return;
    }

    setIsCopying(true);
    try {
      const supabase = createClient();
      await copyAnnualPlanWeek(supabase, planId, weekIndex, targets);
      const freshCells = await getAnnualPlanCells(supabase, planId);
      onCellsChange((freshCells ?? []) as CellRow[]);
      toast({
        title: "Kopyalandı",
        description: `Hafta ${weekIndex} → ${targets.join(", ")}`,
      });
      setCopyTargets("");
    } catch (err) {
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Kopyalanamadı.",
        variant: "destructive",
      });
      onRequireRefresh();
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Hafta {weekIndex}</DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={weekIndex <= 1}
                onClick={() => onNavigateWeek(weekIndex - 1)}
                aria-label="Önceki hafta"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={weekIndex >= totalWeeks}
                onClick={() => onNavigateWeek(weekIndex + 1)}
                aria-label="Sonraki hafta"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogDescription>{formatRange(seasonStart, weekIndex)}</DialogDescription>
        </DialogHeader>

        {competitions.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
              <Trophy className="h-3.5 w-3.5" />
              Bu haftadaki yarışmalar
            </p>
            <ul className="space-y-1">
              {competitions.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">{c.competition_date}</span>
                  {c.level && <Badge variant="secondary">{c.level}</Badge>}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Yarışmalar Yarışmalar sayfasından yönetilir, buradan düzenlenemez.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wk-intensity">Yoğunluk (%)</Label>
              <Input
                id="wk-intensity"
                inputMode="decimal"
                placeholder="85"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wk-phase">Faz</Label>
              <Input
                id="wk-phase"
                placeholder="Hazırlık / Müsabaka / Geçiş"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wk-location">Yer / Durum</Label>
            <Input
              id="wk-location"
              placeholder="İç saha, deplasman, kamp…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wk-notes">Not</Label>
            <Textarea
              id="wk-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Bu hafta uygulanacak sistemler (seans sayısı)</Label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {methods.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: m.color ?? "#94a3b8" }}
                    aria-hidden
                  />
                  <Label htmlFor={`wk-m-${m.id}`} className="flex-1 truncate text-xs font-normal">
                    {m.name}
                  </Label>
                  <Input
                    id={`wk-m-${m.id}`}
                    type="number"
                    min={0}
                    max={MAX_SESSIONS_PER_CELL}
                    className="h-8 w-16 text-center"
                    value={sessions[m.id] ?? "0"}
                    onChange={(e) =>
                      setSessions((prev) => ({ ...prev, [m.id]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 rounded-md border bg-muted/40 p-3">
            <Label htmlFor="wk-copy" className="flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              Bu haftayı başka haftalara kopyala
            </Label>
            <div className="flex gap-2">
              <Input
                id="wk-copy"
                placeholder="Örn: 5-8 veya 3,7,10-12"
                value={copyTargets}
                onChange={(e) => setCopyTargets(e.target.value)}
              />
              <Button variant="outline" onClick={handleCopy} disabled={isCopying}>
                {isCopying ? "…" : "Kopyala"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Yalnızca sistem dağılımı kopyalanır; hedef haftaların yoğunluk/faz/not alanları
              değişmez. Kaydedilmemiş değişiklikler kopyalanmaz — önce Kaydet.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Kapat
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
