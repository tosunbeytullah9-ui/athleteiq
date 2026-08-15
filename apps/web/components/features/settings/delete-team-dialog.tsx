"use client";

import { useState } from "react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import type { TeamCounts } from "@athleteiq/db/queries";

interface Props {
  teamName: string;
  counts: TeamCounts;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteTeamDialog({ teamName, counts, onConfirm, onCancel, isDeleting }: Props) {
  const [confirmText, setConfirmText] = useState("");
  const requiresTypedName = counts.programs > 0;
  const canConfirm = !requiresTypedName || confirmText.trim() === teamName;
  const hasImpact =
    counts.programs > 0 || counts.athletes > 0 || counts.members > 0 || counts.competitions > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg mx-4">
        <h2 className="text-lg font-semibold mb-2">&quot;{teamName}&quot; takımını sil</h2>
        <p className="text-sm text-muted-foreground mb-3">Bu takımı silmek geri alınamaz:</p>

        <ul className="mb-4 list-disc list-inside space-y-1.5 text-sm">
          {counts.programs > 0 && (
            <li>
              <strong>{counts.programs}</strong> antrenman programı ve içindeki tüm seans,
              egzersiz ve set kayıtları <strong>SİLİNECEK</strong>
            </li>
          )}
          {counts.athletes > 0 && (
            <li>
              <strong>{counts.athletes}</strong> sporcu takımsız kalacak (sporcular silinmeyecek)
            </li>
          )}
          {counts.members > 0 && (
            <li>
              <strong>{counts.members}</strong> koç ataması kaldırılacak
            </li>
          )}
          {counts.competitions > 0 && (
            <li>
              <strong>{counts.competitions}</strong> yarışma kaydı takımsız kalacak
            </li>
          )}
          {!hasImpact && <li>Bu takıma bağlı hiçbir kayıt yok.</li>}
        </ul>

        {requiresTypedName && (
          <div className="space-y-1.5 mb-4">
            <Label htmlFor="delete-team-confirm">
              Onaylamak için takımın adını yazın: <strong>{teamName}</strong>
            </Label>
            <Input
              id="delete-team-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            İptal
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!canConfirm || isDeleting}
          >
            {isDeleting ? "Siliniyor..." : "Sil"}
          </Button>
        </div>
      </div>
    </div>
  );
}
