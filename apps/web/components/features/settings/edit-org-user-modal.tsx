"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { updateOrgUserSchema, type UpdateOrgUserInput } from "@athleteiq/validators/org-user";

interface Props {
  user: { id: string; full_name: string; username: string };
  onSuccess: () => void;
}

// supabase/functions/update-org-user'a proxy üzerinden ad/kullanıcı adı düzenler.
// Service-role gerekiyor çünkü kullanıcı adı değişirse giriş e-postası da
// (sentetik email) auth.users'ta senkron güncellenmeli — düz profiles UPDATE'i bu
// senkronizasyonu atlar ve kullanıcı yeni adıyla giriş yapamaz hale gelir (bkz.
// update-org-user/index.ts). Rol/takım değişikliği bu formun kapsamı DIŞINDA —
// o iş CoachTeamSelect (PATCH /api/memberships/[id]/team) ve create-org-user'ın.
export function EditOrgUserModal({ user, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateOrgUserInput>({
    resolver: zodResolver(updateOrgUserSchema),
    defaultValues: { full_name: user.full_name, username: user.username },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      reset({ full_name: user.full_name, username: user.username });
      setSubmitError(null);
    }
  }

  async function onSubmit(data: UpdateOrgUserInput) {
    setSubmitError(null);
    try {
      const res = await fetch("/api/org-users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, ...data }),
      });
      const result = await res.json();

      if (!res.ok) {
        setSubmitError(
          typeof result.error === "string" ? result.error : "Kullanıcı güncellenemedi."
        );
        return;
      }

      setOpen(false);
      onSuccess();
    } catch {
      setSubmitError("Kullanıcı güncellenemedi.");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          aria-label="Kullanıcıyı düzenle"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">Kullanıcıyı Düzenle</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-org-user-full-name">Ad Soyad *</Label>
              <Input id="edit-org-user-full-name" {...register("full_name")} />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-org-user-username">Kullanıcı adı *</Label>
              <Input id="edit-org-user-username" autoComplete="off" {...register("username")} />
              <p className="text-xs text-muted-foreground">
                Kullanıcı adı değişirse giriş e-postası da değişir — yeni kimliği kullanıcıya
                iletmeyi unutmayın.
              </p>
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
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
                {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
