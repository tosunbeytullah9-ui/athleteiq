"use client";

import { Button } from "@athleteiq/ui/components/button";

interface Props {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ title, description, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 mx-3 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border bg-card p-4 shadow-lg sm:mx-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>İptal</Button>
          <Button variant="destructive" onClick={onConfirm}>Sil</Button>
        </div>
      </div>
    </div>
  );
}
