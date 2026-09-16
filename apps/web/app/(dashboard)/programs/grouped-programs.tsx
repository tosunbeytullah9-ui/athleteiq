"use client";

// Programlar listesinin hedef (takım/sporcu) → blok kırılımlı görünümü.
// Düz grid'de her HAFTA ayrı bir kart olduğu için çok haftalı bloklar aynı
// başlıkla tekrar tekrar görünüyordu; burada haftalar bloğun içinde küçük
// rozetlere indirgeniyor. Gruplama mantığı lib/program-grouping.ts'te (saf).

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  User,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Archive,
  Layers,
} from "lucide-react";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent } from "@athleteiq/ui/components/card";
import type { ProgramGroupItem, TargetGroup, WeekItem } from "@/lib/program-grouping";

const PHASE_LABELS: Record<string, string> = {
  preparation: "Hazırlık",
  competition: "Müsabaka",
  transition: "Geçiş",
  peak: "Zirve",
};

const PHASE_COLORS: Record<string, string> = {
  preparation: "bg-blue-100 text-blue-700",
  competition: "bg-red-100 text-red-700",
  transition: "bg-gray-100 text-gray-700",
  peak: "bg-purple-100 text-purple-700",
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

function formatSpan(start: string | null, end: string | null): string | null {
  if (start && end) return `${formatDate(start)} — ${formatDate(end)}`;
  if (start) return formatDate(start);
  if (end) return formatDate(end);
  return null;
}

/** Hafta rozeti — blok içi sıra varsa onu, yoksa ISO hafta numarasını gösterir. */
function WeekChip({ week, onOpen }: { week: WeekItem; onOpen: (id: string) => void }) {
  const label =
    week.indexInBlock !== null
      ? String(week.indexInBlock)
      : week.weekNumber !== null
        ? `H${week.weekNumber}`
        : "—";

  const tooltip = [
    week.title,
    formatSpan(week.startDate, week.endDate),
    week.isPublished ? "Yayında" : "Taslak",
    week.isArchived ? "Arşivlendi" : null,
    week.isCurrent ? "Bu hafta" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      title={tooltip}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(week.programId);
      }}
      className={[
        "relative h-8 min-w-8 rounded-md px-2 text-xs font-medium transition-colors",
        week.isCurrent
          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
          : week.isPublished
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            : "border border-dashed text-muted-foreground hover:bg-secondary/40",
        week.isArchived ? "opacity-50" : "",
      ].join(" ")}
    >
      {label}
      {!week.isPublished && !week.isCurrent && (
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
      )}
    </button>
  );
}

function GroupItemCard({
  item,
  onOpen,
}: {
  item: ProgramGroupItem;
  onOpen: (id: string) => void;
}) {
  const span = formatSpan(item.startDate, item.endDate);
  const weekCount = item.weeks.length;
  const allPublished = item.publishedCount === weekCount;
  // Blok tanımı N hafta diyor ama elimizde daha azı varsa koça bunu göster.
  const missingWeeks =
    item.totalWeeks !== null && item.totalWeeks > weekCount ? item.totalWeeks - weekCount : 0;

  return (
    <Card
      className={`transition-shadow hover:shadow-md ${item.isCurrent ? "border-primary/60" : ""}`}
    >
      <CardContent className="py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onOpen(item.weeks[0]?.programId ?? "")}
            className="text-left"
          >
            <span className="font-medium leading-tight hover:underline">{item.title}</span>
          </button>
          <div className="flex items-center gap-1.5">
            {item.isCurrent && <Badge className="text-xs">Bu hafta</Badge>}
            {allPublished ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {item.kind === "block" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
              <Layers className="h-3 w-3" />
              {weekCount} hafta
            </span>
          )}
          {item.phase && (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                PHASE_COLORS[item.phase] ?? "bg-gray-100 text-gray-700"
              }`}
            >
              {PHASE_LABELS[item.phase] ?? item.phase}
            </span>
          )}
          {span && <span>{span}</span>}
          {!allPublished && (
            <span className="text-amber-600">
              {weekCount - item.publishedCount} taslak
            </span>
          )}
          {item.archivedCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Archive className="h-3 w-3" />
              {item.archivedCount}
            </span>
          )}
          {missingWeeks > 0 && (
            <span className="text-amber-600">{missingWeeks} hafta eksik</span>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {item.weeks.map((w) => (
            <WeekChip key={w.programId} week={w} onOpen={onOpen} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  groups: TargetGroup[];
}

export function GroupedPrograms({ groups }: Props) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function openProgram(id: string) {
    if (id) router.push(`/programs/${id}`);
  }

  function toggle(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key] ?? false;
        const Icon = group.kind === "team" ? Users : User;
        const draftCount = group.weekCount - group.publishedCount;

        return (
          <div key={group.key} className="rounded-lg border">
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-semibold">{group.name}</span>
              {group.kind === "team" && (
                <Badge variant="secondary" className="text-xs">
                  Takım
                </Badge>
              )}
              {group.isCurrent && <Badge className="text-xs">Aktif</Badge>}
              <span className="ml-auto text-xs text-muted-foreground">
                {group.items.length} program · {group.weekCount} hafta
                {draftCount > 0 && ` · ${draftCount} taslak`}
              </span>
            </button>

            {!isCollapsed && (
              <div className="grid gap-3 border-t p-3 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => (
                  <GroupItemCard key={item.key} item={item} onOpen={openProgram} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
