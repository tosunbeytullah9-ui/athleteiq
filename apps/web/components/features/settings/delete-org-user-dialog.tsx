"use client";

import { Button } from "@athleteiq/ui/components/button";

interface Props {
  fullName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

// supabase/functions/delete-org-user'ı çağırır — auth.users silinince memberships/
// profiles otomatik temizlenir (on delete cascade), athletes.user_id null'a düşer
// (on delete set null, sporcu roster kaydı SİLİNMEZ, yalnızca giriş erişimi kalkar).
export function DeleteOrgUserDialog({ fullName, onConfirm, onCancel, isDeleting }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg mx-4">
        <h2 className="text-lg font-semibold mb-2">&quot;{fullName}&quot; kullanıcısını sil</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Bu kullanıcının giriş erişimi kalıcı olarak silinir ve geri alınamaz. Kullanıcı bir
          sporcuysa sporcu kaydı listede kalır, yalnızca giriş erişimi kaldırılır.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            İptal
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Siliniyor..." : "Sil"}
          </Button>
        </div>
      </div>
    </div>
  );
}
