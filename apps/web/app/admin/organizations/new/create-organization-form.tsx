"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import { createOrgSchema, type CreateOrgInput } from "@athleteiq/validators/organization";
import { createOrganization } from "@athleteiq/db/queries/organizations";
import { suggestUsername, generateTempPassword } from "@athleteiq/validators/athlete";

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

function slugify(str: string) {
  return str
    .toLocaleLowerCase("tr")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function CreateOrganizationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrg, setCreatedOrg] = useState<{ id: string; name: string; slug: string } | null>(
    null
  );

  // İlk admini oluştur (org oluşturulduktan sonraki mini-adım) — invite-member
  // 410 döndürdüğü için (Parti 16) create-org-user'a geçirildi.
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminStep, setAdminStep] = useState<"pending" | "created" | "skipped">("pending");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema),
  });

  async function onSubmit(data: CreateOrgInput) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const supabase = createClient();
      const org = await createOrganization(supabase, {
        name: data.name.trim(),
        slug: slugify(data.name),
      });
      setCreatedOrg({ id: org.id, name: org.name, slug: org.slug });
      setFullName("");
      setUsername("");
      setPassword(generateTempPassword());
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        setSubmitError(
          "Bu isimde (veya çok benzer) bir organizasyon zaten var, farklı bir ad deneyin."
        );
      } else {
        setSubmitError(
          err instanceof Error ? err.message : "Organizasyon oluşturulamadı."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!createdOrg) return;
    setCreateError(null);

    if (!fullName || !username || !password) {
      setCreateError("Ad soyad, kullanıcı adı ve şifre zorunludur.");
      return;
    }

    setIsCreatingAdmin(true);
    try {
      const res = await fetch("/api/org-users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: createdOrg.id,
          role: "admin",
          username,
          password,
          full_name: fullName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Admin oluşturulamadı.");
      }
      setAdminStep("created");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Admin oluşturulamadı.");
    } finally {
      setIsCreatingAdmin(false);
    }
  }

  function handleSkip() {
    setAdminStep("skipped");
  }

  if (createdOrg) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 space-y-4">
        <p className="text-sm font-medium">
          ✅ &quot;{createdOrg.name}&quot; oluşturuldu.
        </p>

        {adminStep === "pending" && (
          <form onSubmit={onCreateAdmin} className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">İlk Adminini Oluştur</p>
            <div className="space-y-1.5">
              <Label htmlFor="admin-full-name">Ad Soyad *</Label>
              <Input
                id="admin-full-name"
                value={fullName}
                onChange={(e) => {
                  const value = e.target.value;
                  setFullName(value);
                  setUsername((prev) =>
                    prev === suggestUsername(fullName) ? suggestUsername(value) : prev
                  );
                }}
                placeholder="Ahmet Yılmaz"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-username">Kullanıcı adı *</Label>
              <Input
                id="admin-username"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Giriş kimliği: {username || "kullaniciadi"}@{createdOrg.slug}.athleteiq.app
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Şifre *</Label>
              <div className="flex gap-2">
                <Input
                  id="admin-password"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <CopyButton value={password} />
              </div>
            </div>
            {createError && (
              <p className="text-xs text-destructive">{createError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isCreatingAdmin} size="sm">
                {isCreatingAdmin ? "Oluşturuluyor..." : "Admin Oluştur"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleSkip}>
                Şimdilik atla, sonra oluştururum
              </Button>
            </div>
          </form>
        )}

        {adminStep === "created" && (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              İlk admin oluşturuldu.
            </p>
            <div className="space-y-1.5">
              <Label>Giriş kimliği (email)</Label>
              <div className="flex gap-2">
                <Input readOnly value={`${username}@${createdOrg.slug}.athleteiq.app`} />
                <CopyButton value={`${username}@${createdOrg.slug}.athleteiq.app`} />
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
              Bu şifre bir daha gösterilmeyecek — admine şimdi iletin.
            </p>
          </div>
        )}

        {adminStep === "skipped" && (
          <p className="text-sm text-muted-foreground border-t pt-4">
            İlk admin oluşturma atlandı. Organizasyon admin&apos;siz oluşturuldu.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Organizasyon Adı *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Türkiye Cimnastik Federasyonu"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {submitError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Oluşturuluyor..." : "Organizasyon Oluştur"}
      </Button>
    </form>
  );
}
