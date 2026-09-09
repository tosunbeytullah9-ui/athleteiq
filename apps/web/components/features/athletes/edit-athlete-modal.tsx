"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import { updateAthleteSchema, type UpdateAthleteInput } from "@athleteiq/validators/athlete";
import { updateAthlete } from "@athleteiq/db/queries/athletes";
import type { Tables } from "@athleteiq/db/types";

type Athlete = Tables<"athletes">;

interface Props {
  athlete: Athlete;
  teams: { id: string; name: string }[];
  onSuccess: () => void;
}

function toFormValues(athlete: Athlete): UpdateAthleteInput {
  return {
    full_name: athlete.full_name,
    team_id: athlete.team_id ?? "",
    birth_date: athlete.birth_date ?? "",
    gender: (athlete.gender ?? "") as UpdateAthleteInput["gender"],
    height_cm: athlete.height_cm ?? undefined,
    weight_kg: athlete.weight_kg ?? undefined,
    position: athlete.position ?? "",
    training_group: athlete.training_group ?? "",
    notes: athlete.notes ?? "",
  };
}

// Sporcu profilini düzenler — giriş erişimi/kullanıcı adı bu formda YOK, o
// GrantAccessModal/ResetPasswordModal'ın işi (add-athlete-modal.tsx'teki
// create_login akışıyla karıştırılmasın, bu yalnızca roster alanlarını günceller).
export function EditAthleteModal({ athlete, teams, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateAthleteInput>({
    resolver: zodResolver(updateAthleteSchema),
    defaultValues: toFormValues(athlete),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      reset(toFormValues(athlete));
      setSubmitError(null);
    }
  }

  async function onSubmit(data: UpdateAthleteInput) {
    setSubmitError(null);
    try {
      const supabase = createClient();
      await updateAthlete(supabase, athlete.id, {
        full_name: data.full_name,
        team_id: data.team_id || null,
        birth_date: data.birth_date || null,
        gender: data.gender || null,
        height_cm: data.height_cm ?? null,
        weight_kg: data.weight_kg ?? null,
        position: data.position || null,
        training_group: data.training_group || null,
        notes: data.notes || null,
      });
      setOpen(false);
      onSuccess();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Sporcu güncellenemedi.");
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
          aria-label="Sporcuyu düzenle"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">Sporcuyu Düzenle</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-athlete-full-name">Ad Soyad *</Label>
              <Input id="edit-athlete-full-name" {...register("full_name")} />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-athlete-team">Takım *</Label>
              <select
                id="edit-athlete-team"
                {...register("team_id")}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Takım seçin</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.team_id && (
                <p className="text-xs text-destructive">{errors.team_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-athlete-birth-date">Doğum Tarihi</Label>
                <Input id="edit-athlete-birth-date" type="date" {...register("birth_date")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-athlete-gender">Cinsiyet</Label>
                <select
                  id="edit-athlete-gender"
                  {...register("gender")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Seçin</option>
                  <option value="male">Erkek</option>
                  <option value="female">Kadın</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-athlete-height">Boy (cm)</Label>
                <Input
                  id="edit-athlete-height"
                  type="number"
                  step="0.1"
                  {...register("height_cm", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-athlete-weight">Kilo (kg)</Label>
                <Input
                  id="edit-athlete-weight"
                  type="number"
                  step="0.1"
                  {...register("weight_kg", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-athlete-position">Pozisyon / Branş</Label>
              <Input id="edit-athlete-position" {...register("position")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-athlete-training-group">Antrenman Grubu (opsiyonel)</Label>
              <Input id="edit-athlete-training-group" {...register("training_group")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-athlete-notes">Notlar</Label>
              <textarea
                id="edit-athlete-notes"
                {...register("notes")}
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
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
