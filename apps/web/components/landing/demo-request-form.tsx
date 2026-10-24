"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import {
  DEMO_ATHLETE_COUNTS,
  DEMO_REQUEST_ROLES,
  DEMO_REQUEST_ROLE_LABELS,
  demoRequestSchema,
  type DemoRequestInput,
} from "@athleteiq/validators";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&>option]:bg-card";

/**
 * Landing kapanışındaki demo talep formu → POST /api/demo-request.
 * Şema (@athleteiq/validators/demo-request) API ile ortaktır.
 */
export function DemoRequestForm() {
  const [state, setState] = useState<"idle" | "sent">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<DemoRequestInput>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: { website: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: DemoRequestInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setServerError(body?.error ?? "Talep gönderilemedi. Lütfen biraz sonra tekrar deneyin.");
        return;
      }
      setState("sent");
    } catch {
      setServerError("Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.");
    }
  }

  if (state === "sent") {
    return (
      <div className="flex flex-col items-start gap-4 py-6" role="status">
        <CheckCircle2 className="h-8 w-8 text-good" />
        <div>
          <p className="font-display text-xl font-semibold">Talebiniz alındı.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            1–2 iş günü içinde verdiğiniz e-posta adresinden size dönüş yapacağız. Görüşmede
            branşınızı ve ekibinizi konuşup organizasyonunuzu birlikte kuracağız.
          </p>
        </div>
      </div>
    );
  }

  const field = (name: keyof DemoRequestInput) => {
    const message = errors[name]?.message;
    return message ? <p className="text-xs text-destructive">{String(message)}</p> : null;
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="demo-name">Ad Soyad</Label>
          <Input id="demo-name" autoComplete="name" {...form.register("full_name")} />
          {field("full_name")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-org">Kurum / kulüp</Label>
          <Input id="demo-org" autoComplete="organization" {...form.register("organization")} />
          {field("organization")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-role">Rolünüz</Label>
          <select id="demo-role" className={selectClass} defaultValue="" {...form.register("role")}>
            <option value="" disabled>
              Seçin
            </option>
            {DEMO_REQUEST_ROLES.map((r) => (
              <option key={r} value={r}>
                {DEMO_REQUEST_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          {field("role")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-discipline">Branş</Label>
          <Input id="demo-discipline" placeholder="Artistik cimnastik, atletizm…" {...form.register("discipline")} />
          {field("discipline")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-count">Sporcu sayısı</Label>
          <select
            id="demo-count"
            className={selectClass}
            defaultValue=""
            {...form.register("athlete_count", { setValueAs: (v: string) => (v ? v : undefined) })}
          >
            <option value="">Belirtmek istemiyorum</option>
            {DEMO_ATHLETE_COUNTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-phone">
            Telefon <span className="font-normal text-muted-foreground">(isteğe bağlı)</span>
          </Label>
          <Input id="demo-phone" type="tel" autoComplete="tel" {...form.register("phone")} />
          {field("phone")}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="demo-email">E-posta</Label>
        <Input id="demo-email" type="email" autoComplete="email" {...form.register("email")} />
        {field("email")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="demo-message">
          Kısaca ihtiyacınız <span className="font-normal text-muted-foreground">(isteğe bağlı)</span>
        </Label>
        <textarea
          id="demo-message"
          rows={3}
          maxLength={1000}
          placeholder="Ör. 2 takım, 25 sporcu; programları şu an Excel'de yazıyoruz."
          className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          {...form.register("message")}
        />
        {field("message")}
      </div>

      {/* Bot tuzağı — ekran okuyucudan ve klavyeden gizli */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="demo-website">Web sitesi</label>
        <input id="demo-website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
      </div>

      <div className="space-y-1.5">
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
            {...form.register("kvkk_consent")}
          />
          <span>
            Paylaştığım bilgilerin yalnızca demo talebime dönüş yapılması amacıyla işlenmesini
            kabul ediyorum. Ayrıntılar{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Gizlilik
            </Link>{" "}
            sayfasında.
          </span>
        </label>
        {field("kvkk_consent")}
      </div>

      {serverError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? "Gönderiliyor…" : "Demo talebi gönder"}
        {!isSubmitting && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  );
}
