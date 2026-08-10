"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";

interface Props {
  title: string;
  description: string;
  /** Sporcu verisi bulunan haftaların gösterim etiketleri (örn. "Hafta 3") — varsa listelenir. */
  affectedWeeks?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  isBusy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// DeleteConfirmDialog (apps/web/components/features/exercises/delete-confirm-dialog.tsx) ve
// edit-program-client.tsx'teki propagate onay penceresiyle AYNI el yapımı overlay deseni —
// bu repoda Radix AlertDialog kullanılmıyor, bilinçli olarak aynı stile uyuluyor.
export function AthleteDataWarningDialog({
  title,
  description,
  affectedWeeks,
  confirmLabel = "Devam Et",
  cancelLabel = "İptal",
  isBusy = false,
  error,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => !isBusy && onCancel()} />
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg mx-4">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>

        {affectedWeeks && affectedWeeks.length > 0 && (
          <p className="text-sm mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Etkilenecek haftalar:{" "}
            <span className="font-medium">{affectedWeeks.join(", ")}</span>
          </p>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isBusy}>
            {isBusy ? "İşleniyor..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
