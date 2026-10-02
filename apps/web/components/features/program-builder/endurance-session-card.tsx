import type { Tables } from "@athleteiq/db/types";
import {
  SEGMENT_TYPE_LABELS,
  describeSegment,
  formatEnduranceSummary,
  summarizeEnduranceSegments,
} from "@athleteiq/validators/endurance";
import { ZoneBar } from "@/components/features/program-builder/endurance-session-fields";

// Dayanıklılık seansının salt-okunur kartı — koç program detayı
// (program-detail-client.tsx) ve sporcu görünümü (athlete-program-view.tsx)
// ortak kullanır. WOD'un WodSessionCard'ının dayanıklılık karşılığı; set/tonaj
// yok, bölümler sırayla (ısınma → ana bölüm → soğuma) listelenir.

const SEGMENT_DOT: Record<string, string> = {
  warmup: "bg-amber-400",
  steady: "bg-sky-500",
  interval: "bg-rose-500",
  recovery: "bg-emerald-500",
  cooldown: "bg-slate-400",
};

interface Props {
  session: Pick<Tables<"training_sessions">, "endurance_modality"> & {
    exercises: Tables<"exercises">[];
  };
}

export function EnduranceSessionCard({ session }: Props) {
  const segments = session.exercises
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const summary = summarizeEnduranceSegments(segments);

  return (
    <div className="space-y-3">
      <div>
        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {formatEnduranceSummary(session.endurance_modality, segments)}
        </span>
        <div className="max-w-sm">
          <ZoneBar zoneWorkSec={summary.zoneWorkSec} />
        </div>
      </div>

      {segments.length === 0 ? (
        <p className="text-xs text-muted-foreground">Bölüm eklenmemiş.</p>
      ) : (
        <ol className="space-y-2">
          {segments.map((seg) => {
            const desc = describeSegment(seg, session.endurance_modality);
            const typeLabel = SEGMENT_TYPE_LABELS[seg.segment_type ?? ""] ?? "Bölüm";
            const customName = seg.name && seg.name !== typeLabel ? seg.name : null;
            return (
              <li key={seg.id} className="flex items-start gap-2.5 text-sm">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${SEGMENT_DOT[seg.segment_type ?? ""] ?? "bg-muted-foreground"}`}
                />
                <div className="min-w-0">
                  <p>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {typeLabel}
                    </span>
                    {customName && <span className="text-muted-foreground"> · {customName}</span>}
                  </p>
                  <p>
                    <span className="font-medium">{desc.volume}</span>
                    {desc.intensity && <span className="text-muted-foreground"> · {desc.intensity}</span>}
                    {desc.pace && <span className="text-muted-foreground"> · ≈ {desc.pace}</span>}
                  </p>
                  {desc.recovery && <p className="text-xs text-muted-foreground">{desc.recovery}</p>}
                  {seg.notes && <p className="text-xs text-muted-foreground italic">{seg.notes}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
