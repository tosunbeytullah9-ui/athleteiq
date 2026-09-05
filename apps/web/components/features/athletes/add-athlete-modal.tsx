"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import { createAthleteSchema, type CreateAthleteInput } from "@athleteiq/validators/athlete";
import { createAthlete } from "@athleteiq/db/queries/athletes";

interface Props {
  teams: { id: string; name: string }[];
  orgId: string;
  existingAthletes?: { team_id: string | null; training_group: string | null }[];
  onSuccess: () => void;
}

export function AddAthleteModal({ teams, orgId, existingAthletes = [], onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<CreateAthleteInput>({
    resolver: zodResolver(createAthleteSchema),
    defaultValues: { create_login: false },
  });

  const createLogin = watch("create_login");
  const selectedTeamId = watch("team_id");

  // Seçili takımdaki mevcut sporculardan öneri — coach'un aynı grup adını
  // tekrar tekrar aynı şekilde yazmasını kolaylaştırır, ayrı bir lookup
  // tablosu gerektirmez (position alanıyla aynı serbest-metin yaklaşımı).
  const trainingGroupSuggestions = useMemo(() => {
    const set = new Set(
      existingAthletes
        .filter((a) => a.team_id === selectedTeamId && a.training_group)
        .map((a) => a.training_group as string)
    );
    return Array.from(set).sort();
  }, [existingAthletes, selectedTeamId]);

  // Toggle KAPALI: mevcut davranış — doğrudan roster-only insert, DOKUNULMADI.
  // (data'yı olduğu gibi spread etmiyoruz: data artık create_login/username/password
  // da taşıyor, bunlar athletes tablosunda kolon değil — insert'e sızmasınlar.)
  async function submitRosterOnly(data: CreateAthleteInput) {
    const supabase = createClient();
    await createAthlete(supabase, {
      full_name: data.full_name,
      team_id: data.team_id,
      birth_date: data.birth_date,
      gender: data.gender,
      height_cm: data.height_cm ?? null,
      weight_kg: data.weight_kg ?? null,
      position: data.position,
      training_group: data.training_group,
      notes: data.notes,
      org_id: orgId,
    });
  }

  // Toggle AÇIK: create-athlete-account Edge Function'ına, mevcut invite-member
  // proxy deseniyle (apps/web/app/api/auth/invite/route.ts) aynı şekilde
  // kurulmuş /api/athletes/create-account route'u üzerinden istek atılır.
  // Döner: başarıysa true, hata inline gösterilip false döner (modal açık kalır).
  async function submitWithLogin(data: CreateAthleteInput): Promise<boolean> {
    const res = await fetch("/api/athletes/create-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: data.username,
        password: data.password,
        full_name: data.full_name,
        org_id: orgId,
        team_id: data.team_id,
        birth_date: data.birth_date,
        gender: data.gender,
        height_cm: data.height_cm,
        weight_kg: data.weight_kg,
        position: data.position,
        training_group: data.training_group,
        notes: data.notes,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      const message: string = result.error ?? "Sporcu hesabı oluşturulamadı.";
      if (res.status === 409) {
        setError("username", {
          type: "server",
          message: "Bu kullanıcı adı alınmış, başka bir tane deneyin",
        });
      } else if (res.status === 400 && message.includes("Kullanıcı adı")) {
        setError("username", { type: "server", message });
      } else if (res.status === 400 && message.includes("Parola")) {
        setError("password", { type: "server", message });
      } else {
        setSubmitError(message);
      }
      return false;
    }

    return true;
  }

  async function onSubmit(data: CreateAthleteInput) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (data.create_login) {
        const ok = await submitWithLogin(data);
        if (!ok) return;
      } else {
        await submitRosterOnly(data);
      }
      reset();
      setOpen(false);
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sporcu eklenirken bir hata oluştu.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSubmitError(null); }}>
      <Dialog.Trigger asChild>
        <Button>Sporcu Ekle</Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">
              Yeni Sporcu Ekle
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Ad Soyad *</Label>
              <Input id="full_name" {...register("full_name")} placeholder="Ahmet Yılmaz" />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="team_id">Takım *</Label>
              <select
                id="team_id"
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
                <Label htmlFor="birth_date">Doğum Tarihi</Label>
                <Input id="birth_date" type="date" {...register("birth_date")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Cinsiyet</Label>
                <select
                  id="gender"
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
                <Label htmlFor="height_cm">Boy (cm)</Label>
                <Input
                  id="height_cm"
                  type="number"
                  step="0.1"
                  {...register("height_cm", { valueAsNumber: true })}
                  placeholder="170"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight_kg">Kilo (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.1"
                  {...register("weight_kg", { valueAsNumber: true })}
                  placeholder="65"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="position">Pozisyon / Branş</Label>
              <Input id="position" {...register("position")} placeholder="Artistik Jimnastik" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="training_group">Antrenman Grubu (opsiyonel)</Label>
              <Input
                id="training_group"
                list="training-group-suggestions"
                {...register("training_group")}
                placeholder="Örn: Linemen, Skill"
              />
              <datalist id="training-group-suggestions">
                {trainingGroupSuggestions.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notlar</Label>
              <textarea
                id="notes"
                {...register("notes")}
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                placeholder="İsteğe bağlı notlar..."
              />
            </div>

            <div className="flex items-center gap-2 border-t pt-4">
              <input
                id="create_login"
                type="checkbox"
                {...register("create_login")}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="create_login" className="cursor-pointer font-normal">
                Giriş erişimi oluştur (kullanıcı adı ve şifre)
              </Label>
            </div>

            {createLogin && (
              <div className="space-y-4 rounded-md bg-muted/30 p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Kullanıcı adı *</Label>
                  <Input
                    id="username"
                    autoComplete="off"
                    {...register("username")}
                    placeholder="orn. kerem.sener"
                  />
                  {errors.username && (
                    <p className="text-xs text-destructive">{errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Şifre *</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    {...register("password")}
                    placeholder="En az 6 karakter"
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
              </div>
            )}

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
