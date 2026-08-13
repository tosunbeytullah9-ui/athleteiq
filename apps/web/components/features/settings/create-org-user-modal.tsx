"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { suggestUsername, generateTempPassword } from "@athleteiq/validators/athlete";

type OrgRole = "admin" | "coach" | "athlete";

interface Props {
  orgId: string;
  orgSlug: string;
  teams: { id: string; name: string }[];
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

const EMPTY_FORM = {
  fullName: "",
  username: "",
  password: "",
  role: "coach" as OrgRole,
  teamId: "",
  birthDate: "",
  gender: "" as "" | "male" | "female" | "other",
  heightCm: "",
  weightKg: "",
  position: "",
  notes: "",
};

export function CreateOrgUserModal({ orgId, orgSlug, teams, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setView("form");
      setForm({ ...EMPTY_FORM, password: generateTempPassword() });
      setFieldErrors({});
      setSubmitError(null);
    }
  }

  function handleFullNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      fullName: value,
      // Kullanıcı username'i elle değiştirmediyse öneriyi canlı güncelle.
      username: prev.username === suggestUsername(prev.fullName) ? suggestUsername(value) : prev.username,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setSubmitError(null);
    try {
      const res = await fetch("/api/org-users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          role: form.role,
          username: form.username,
          password: form.password,
          full_name: form.fullName,
          team_id: form.role === "admin" ? undefined : form.teamId || undefined,
          athlete_fields:
            form.role === "athlete"
              ? {
                  birth_date: form.birthDate || undefined,
                  gender: form.gender || undefined,
                  height_cm: form.heightCm ? Number(form.heightCm) : undefined,
                  weight_kg: form.weightKg ? Number(form.weightKg) : undefined,
                  position: form.position || undefined,
                  notes: form.notes || undefined,
                }
              : undefined,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setFieldErrors({ username: "Bu kullanıcı adı bu organizasyonda alınmış" });
        } else if (res.status === 400 && typeof result.error === "object") {
          const flat: Record<string, string> = {};
          for (const [key, messages] of Object.entries(result.error as Record<string, string[]>)) {
            if (messages?.[0]) flat[key] = messages[0];
          }
          setFieldErrors(flat);
        } else if (res.status === 403) {
          setSubmitError("Bu işlem için yetkiniz yok");
        } else {
          setSubmitError(typeof result.error === "string" ? result.error : "Kullanıcı oluşturulamadı");
        }
        return;
      }

      setView("success");
    } catch {
      setSubmitError("Kullanıcı oluşturulamadı");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    if (view === "success") onSuccess();
  }

  const email = `${form.username || "kullaniciadi"}@${orgSlug}.athleteiq.app`;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button type="button">Yeni Kullanıcı Oluştur</Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">
              {view === "form" ? "Yeni Kullanıcı Oluştur" : "Kullanıcı Oluşturuldu"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {view === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-user-full-name">Ad Soyad *</Label>
                <Input
                  id="new-user-full-name"
                  value={form.fullName}
                  onChange={(e) => handleFullNameChange(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                />
                {fieldErrors.full_name && (
                  <p className="text-xs text-destructive">{fieldErrors.full_name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-user-role">Rol *</Label>
                <select
                  id="new-user-role"
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, role: e.target.value as OrgRole, teamId: "" }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="admin">Admin</option>
                  <option value="coach">Koç</option>
                  <option value="athlete">Sporcu</option>
                </select>
              </div>

              {form.role !== "admin" && (
                <div className="space-y-1.5">
                  <Label htmlFor="new-user-team">Takım *</Label>
                  <select
                    id="new-user-team"
                    value={form.teamId}
                    onChange={(e) => setForm((prev) => ({ ...prev, teamId: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Takım seçin</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.team_id && (
                    <p className="text-xs text-destructive">{fieldErrors.team_id}</p>
                  )}
                </div>
              )}

              {form.role === "athlete" && (
                <div className="space-y-4 rounded-md bg-muted/30 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-user-birth-date">Doğum Tarihi</Label>
                      <Input
                        id="new-user-birth-date"
                        type="date"
                        value={form.birthDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-user-gender">Cinsiyet</Label>
                      <select
                        id="new-user-gender"
                        value={form.gender}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, gender: e.target.value as typeof prev.gender }))
                        }
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
                      <Label htmlFor="new-user-height">Boy (cm)</Label>
                      <Input
                        id="new-user-height"
                        type="number"
                        step="0.1"
                        value={form.heightCm}
                        onChange={(e) => setForm((prev) => ({ ...prev, heightCm: e.target.value }))}
                        placeholder="170"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-user-weight">Kilo (kg)</Label>
                      <Input
                        id="new-user-weight"
                        type="number"
                        step="0.1"
                        value={form.weightKg}
                        onChange={(e) => setForm((prev) => ({ ...prev, weightKg: e.target.value }))}
                        placeholder="65"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-user-position">Pozisyon / Branş</Label>
                    <Input
                      id="new-user-position"
                      value={form.position}
                      onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                      placeholder="Artistik Jimnastik"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-user-notes">Notlar</Label>
                    <textarea
                      id="new-user-notes"
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      placeholder="İsteğe bağlı notlar..."
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="new-user-username">Kullanıcı adı *</Label>
                <Input
                  id="new-user-username"
                  autoComplete="off"
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Giriş kimliği: {email}</p>
                {fieldErrors.username && (
                  <p className="text-xs text-destructive">{fieldErrors.username}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-user-password">Şifre *</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-user-password"
                    autoComplete="off"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  <CopyButton value={form.password} />
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-destructive">{fieldErrors.password}</p>
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
                  {isSubmitting ? "Oluşturuluyor..." : "Kullanıcı Oluştur"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>{form.fullName}</strong> artık bu bilgilerle giriş yapabilir.
              </p>

              <div className="space-y-1.5">
                <Label>Giriş kimliği (email)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={email} />
                  <CopyButton value={email} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Kullanıcı adı</Label>
                <div className="flex gap-2">
                  <Input readOnly value={form.username} />
                  <CopyButton value={form.username} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Şifre</Label>
                <div className="flex gap-2">
                  <Input readOnly value={form.password} />
                  <CopyButton value={form.password} />
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
