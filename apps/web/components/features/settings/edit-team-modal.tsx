"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { updateTeamSchema, type UpdateTeamInput } from "@athleteiq/validators/team";
import { updateTeam } from "@athleteiq/db/queries/teams";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@athleteiq/db/types";

const DISCIPLINE_SUGGESTIONS = [
  "ARTİSTİK CİMNASTİK",
  "RİTMİK CİMNASTİK",
  "TRAMPOLİN",
  "AEROBİK CİMNASTİK",
  "Kuvvet & Kondisyon",
  "Amerikan Futbolu",
];

interface Props {
  team: Tables<"teams">;
  onSuccess: () => void;
}

export function EditTeamModal({ team, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateTeamInput>({
    resolver: zodResolver(updateTeamSchema),
    defaultValues: { name: team.name, discipline: team.discipline ?? "" },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      reset({ name: team.name, discipline: team.discipline ?? "" });
      setSubmitError(null);
    }
  }

  async function onSubmit(data: UpdateTeamInput) {
    setSubmitError(null);
    try {
      const supabase = createClient();
      await updateTeam(supabase, team.id, {
        name: data.name?.trim(),
        discipline: data.discipline?.trim() || null,
      });
      setOpen(false);
      onSuccess();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        setSubmitError("Bu isimde bir takım zaten var.");
      } else {
        setSubmitError(err instanceof Error ? err.message : "Takım güncellenemedi.");
      }
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
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">Takımı Düzenle</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-team-name">Takım Adı *</Label>
              <Input id="edit-team-name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-team-discipline">Branş</Label>
              <Input
                id="edit-team-discipline"
                list="edit-team-discipline-suggestions"
                {...register("discipline")}
              />
              <datalist id="edit-team-discipline-suggestions">
                {DISCIPLINE_SUGGESTIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
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
