"use client";

import { CheckCircle2 } from "lucide-react";

/** shadcn toast'ın görünümü — kayıtta üründeki bildirimle aynı yerde belirir. */
export function ReplicaToast({ title, description }: { title: string; description?: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 aiq-toast-in flex w-96 items-start gap-3 rounded-md border bg-background p-4 pr-6 shadow-lg">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-good" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
