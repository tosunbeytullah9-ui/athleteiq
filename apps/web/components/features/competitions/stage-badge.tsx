import {
  stageLabel,
  stageShort,
  type CompetitionStage,
} from "@athleteiq/validators/competition";
import { cn } from "@/lib/utils";

// Aşama renkleri — Qualification nötr, finaller ayırt edici (finale kalan göze çarpsın).
export const STAGE_TONE: Record<CompetitionStage, string> = {
  qualification: "bg-muted text-foreground border-border",
  apparatus_final: "bg-violet/10 text-violet border-violet/30",
  team_final: "bg-good/10 text-good border-good/30",
  all_around_final: "bg-warning/15 text-warning border-warning/40",
};

export function formatStageDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}

/** Tam etiket: "All-Around Final · 10 Tem" (+ isteğe bağlı ek metin). */
export function StageBadge({
  stage,
  date,
  extra,
  title,
  className,
}: {
  stage: CompetitionStage;
  date?: string | null;
  extra?: string;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs",
        STAGE_TONE[stage],
        className
      )}
    >
      <span className="font-semibold">{stageLabel(stage)}</span>
      {date && <span className="opacity-80">· {formatStageDate(date)}</span>}
      {extra && <span className="opacity-80">· {extra}</span>}
    </span>
  );
}

/** Kısa kod: sporcu çipinin içinde "AA", "TF" gibi. */
export function StageTag({
  stage,
  className,
}: {
  stage: CompetitionStage;
  className?: string;
}) {
  return (
    <span
      title={stageLabel(stage)}
      className={cn(
        "inline-flex items-center rounded border px-1 text-[10px] font-semibold leading-4",
        STAGE_TONE[stage],
        className
      )}
    >
      {stageShort(stage)}
    </span>
  );
}
