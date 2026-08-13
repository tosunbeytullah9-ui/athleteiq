"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { generateTempPassword } from "@athleteiq/validators/athlete";

interface Props {
  user: { id: string; full_name: string; username: string | null };
  onSuccess: () => void;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button type="button" variant="ghost" size="icon" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export function ResetUserPasswordModal({ user, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setView("form");
      setPassword(generateTempPassword());
      setSubmitError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/org-users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, new_password: password }),
      });
      const result = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setSubmitError("Bu işlem için yetkiniz yok");
        } else {
          setSubmitError(result.error ?? "Şifre sıfırlanamadı");
        }
        return;
      }

      setView("success");
    } catch {
      setSubmitError("Şifre sıfırlanamadı");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    if (view === "success") onSuccess();
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="outline" size="sm">
          Şifre sıfırla
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">
              {view === "form" ? "Şifre Sıfırla" : "Şifre Sıfırlandı"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {view === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>{user.full_name}</strong>
                {user.username ? ` (@${user.username})` : ""} için yeni bir şifre önerildi —
                dilerseniz değiştirebilirsiniz. Eski şifre bu işlemden sonra çalışmayacak.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="reset-user-password">Yeni şifre</Label>
                <div className="flex gap-2">
                  <Input
                    id="reset-user-password"
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <CopyButton value={password} />
                </div>
              </div>

              {submitError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline">
                    İptal
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>{user.full_name}</strong> artık bu yeni şifreyle giriş yapabilir.
              </p>

              <div className="space-y-1.5">
                <Label>Yeni şifre</Label>
                <div className="flex gap-2">
                  <Input readOnly value={password} />
                  <CopyButton value={password} />
                </div>
              </div>

              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Bu şifre bir daha gösterilmeyecek — kullanıcıya şimdi iletin.
              </p>

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={handleClose}>
                  Kapat
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
