"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, TrafficCone, X } from "lucide-react";
import type { DrillDiagramRecord } from "@athleteiq/db/queries/drills";
import { DrillDiagramSvg, DrillLegend } from "./drill-diagram-svg";

/** Diyagram + lejant + kurulum notu — salt-okunur (program detayı, önizleme). */
export function DrillCard({ record, className }: { record: DrillDiagramRecord; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="overflow-hidden rounded-md border bg-background">
        <DrillDiagramSvg diagram={record.diagram} unit={record.unit} className="block h-auto w-full max-h-[420px]" />
      </div>
      <DrillLegend diagram={record.diagram} unit={record.unit} />
      {record.setup_notes && (
        <p className="whitespace-pre-line rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Kurulum: </span>
          {record.setup_notes}
        </p>
      )}
    </div>
  );
}

/** "Diyagram" düğmesi + altında açılıp kapanan kart (program detayı, koç görünümü). */
export function DrillInlineToggle({ record }: { record: DrillDiagramRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"
        aria-expanded={open}
      >
        <TrafficCone className="h-3.5 w-3.5" />
        Drill diyagramı
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <DrillCard record={record} className="mt-2" />}
    </div>
  );
}

/** Program oluşturucuda egzersiz satırının yanındaki küçük düğme → önizleme penceresi. */
export function DrillPreviewButton({ record }: { record: DrillDiagramRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Drill diyagramını göster"
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 text-xs font-medium text-orange-700 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"
      >
        <TrafficCone className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Diyagram</span>
      </button>
      {open && <DrillPreviewDialog record={record} onClose={() => setOpen(false)} />}
    </>
  );
}

export function DrillPreviewDialog({ record, onClose }: { record: DrillDiagramRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{record.exercise_name}</h2>
            <p className="text-xs text-muted-foreground">Yalnızca koç ve adminler görür.</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          <DrillCard record={record} />
        </div>
        <div className="flex justify-end border-t px-5 py-3">
          <Link href="/exercises?drills=1" target="_blank" rel="noopener" className="text-xs font-medium text-primary hover:underline">
            Egzersiz kütüphanesinde düzenle (yeni sekme)
          </Link>
        </div>
      </div>
    </div>
  );
}
