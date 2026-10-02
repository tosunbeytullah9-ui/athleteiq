"use client";

import { useState } from "react";
import { CopyPlus } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";

// Seans kartı başlığında "Başka güne kopyala": tıklayınca gün düğmeleri açılır,
// seçilen güne seansın birebir kopyası eklenir (Salı'daki interval'ı Perşembe'ye
// de koymak gibi). new-program-client.tsx ve week-editor-form.tsx ortak kullanır.
export function CopySessionToDay({
  dayLabels,
  currentDay,
  onCopy,
}: {
  dayLabels: readonly string[];
  currentDay: number;
  onCopy: (dayOfWeek: number) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Başka güne kopyala"
        aria-label="Başka güne kopyala"
        onClick={() => setOpen(true)}
      >
        <CopyPlus className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">Kopyala:</span>
      {dayLabels.map((label, i) => {
        const day = i + 1;
        return (
          <button
            key={label}
            type="button"
            onClick={() => {
              onCopy(day);
              setOpen(false);
            }}
            className={`h-7 rounded-md border px-1.5 text-xs transition-colors hover:border-primary hover:bg-primary/5 ${
              day === currentDay ? "border-primary/40 text-primary" : "border-input text-muted-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-1 text-xs text-muted-foreground hover:text-foreground"
      >
        Vazgeç
      </button>
    </div>
  );
}
