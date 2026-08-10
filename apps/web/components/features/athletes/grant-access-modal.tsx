"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { suggestUsername, generateTempPassword } from "@athleteiq/validators/athlete";

interface Props {
  athlete: { id: string; full_name: string };
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

export function GrantAccessModal({ athlete, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setView("form");
      setUsername(suggestUsername(athlete.full_name));
      setPassword(generateTempPassword());
      setUsernameError(null);
      setSubmitError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setUsernameError(null);
    setSubmitError(null);
    try {
      const res = await fetch("/api/athletes/grant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlete_id: athlete.id, username, password }),
      });
      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setUsernameError("Bu kullanıcı adı alınmış");
        } else if (res.status === 403) {
          setSubmitError("Bu işlem için yetkiniz yok");
        } else {
          setSubmitError(result.error ?? "Giriş erişimi verilemedi");
        }
        return;
      }

      setView("success");
    } catch {
      setSubmitError("Giriş erişimi verilemedi");
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
          Erişim ver
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">
              {view === "form" ? "Giriş Erişimi Ver" : "Erişim Oluşturuldu"}
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
                <strong>{athlete.full_name}</strong> için kullanıcı adı ve şifre önerildi —
                dilerseniz değiştirebilirsiniz.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="grant-username">Kullanıcı adı</Label>
                <Input
                  id="grant-username"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                {usernameError && (
                  <p className="text-xs text-destructive">{usernameError}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grant-password">Şifre</Label>
                <div className="flex gap-2">
                  <Input
                    id="grant-password"
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
                  {isSubmitting ? "Oluşturuluyor..." : "Erişim Ver"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>{athlete.full_name}</strong> artık mobil uygulamada bu bilgilerle giriş
                yapabilir.
              </p>

              <div className="space-y-1.5">
                <Label>Kullanıcı adı</Label>
                <div className="flex gap-2">
                  <Input readOnly value={username} />
                  <CopyButton value={username} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Şifre</Label>
                <div className="flex gap-2">
                  <Input readOnly value={password} />
                  <CopyButton value={password} />
                </div>
              </div>

              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Bu şifre bir daha gösterilmeyecek — sporcuya şimdi iletin.
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
