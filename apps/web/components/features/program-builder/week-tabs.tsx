"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@athleteiq/ui/components/badge";

export interface WeekTabInfo {
  id: string;
  week_index_in_block: number | null;
  start_date: string | null;
  end_date: string | null;
  is_published: boolean | null;
}

interface Props {
  weeks: WeekTabInfo[];
  activeId: string;
  dirtyIds: Set<string>;
  disabled?: boolean;
  onRequestSwitch: (id: string) => void;
}

// Controlled Tabs — value her zaman ebeveynin (edit-program-client.tsx) onayladığı
// activeId'yi yansıtır. onValueChange, aktif sekmeyi DEĞİŞTİRMEZ; sadece ebeveyne
// "kullanıcı şunu istiyor" der (onRequestSwitch). Ebeveyn kaydetme/onay akışını
// bitirmeden activeId değişmez — bu da sekme geçişini "kilitlemenin" mekanizması.
export function WeekTabs({ weeks, activeId, dirtyIds, disabled, onRequestSwitch }: Props) {
  if (weeks.length <= 1) return null;

  return (
    <Tabs value={activeId} onValueChange={onRequestSwitch}>
      <TabsList className="h-auto flex-wrap">
        {weeks.map((week) => (
          <TabsTrigger
            key={week.id}
            value={week.id}
            disabled={disabled}
            className="flex-col items-start gap-1 px-3 py-2"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              Hafta {week.week_index_in_block ?? "—"}
              {dirtyIds.has(week.id) && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-amber-500"
                  title="Kaydedilmemiş değişiklik"
                />
              )}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              {week.start_date ? new Date(week.start_date).toLocaleDateString("tr-TR") : "—"}
              {week.end_date && ` — ${new Date(week.end_date).toLocaleDateString("tr-TR")}`}
              <Badge variant={week.is_published ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                {week.is_published ? "Yayında" : "Taslak"}
              </Badge>
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
