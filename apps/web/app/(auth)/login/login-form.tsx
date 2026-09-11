"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { Activity, ArrowRight, Info } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, resolveLoginIdentifier } from "@athleteiq/validators";
import type { LoginInput } from "@athleteiq/validators";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const next = searchParams.get("next") ?? "/athletes";
  const errorParam = searchParams.get("error");

  const supabase = createClient();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setIsSubmitting(true);
    const resolved = resolveLoginIdentifier(values.identifier);
    if (!resolved.ok) {
      setIsSubmitting(false);
      setServerError(
        resolved.reason === "email_rejected"
          ? "E-posta ile giriş kaldırıldı. Kullanıcı adınızı kullanici@organizasyon biçiminde girin."
          : "Kullanıcı adınızı kullanici@organizasyon biçiminde girin."
      );
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: resolved.email,
      password: values.password,
    });
    setIsSubmitting(false);
    if (error) {
      setServerError("Kullanıcı adı veya şifre hatalı");
      return;
    }
    // Hard navigation (router.push değil): middleware taze çalışsın,
    // aiq_uid eşleşmesiyle doğru rolü cookie'ye yeniden yazsın. Böylece
    // önceki kullanıcının bayat rol cookie'si asla miras kalmaz.
    window.location.href = next;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Marka paneli */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-violet p-12 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute -right-32 -top-40 h-[420px] w-[420px] rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-20 h-[280px] w-[280px] rounded-full bg-white/5"
          aria-hidden
        />
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <span className="text-lg font-bold tracking-tight">AthleteIQ</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Sporcularınızı bilinçli antrenman yüküyle koruyun.
          </h1>
          <p className="mt-3.5 text-sm leading-relaxed text-primary-foreground/85">
            ACWR takibi, wellness check-in ve gerçek zamanlı program senkronizasyonu tek
            panelde — federasyon, kulüp ve koçlar için.
          </p>
        </div>
        <div className="relative z-10 h-4" />
      </div>

      {/* Form paneli */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-7">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Tekrar hoş geldiniz</h2>
            <p className="text-sm text-muted-foreground">
              Kullanıcı adınız ve organizasyon kısayolunuzla giriş yapın.
            </p>
          </div>

          {errorParam === "no_membership" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Bu hesaba bağlı bir üyelik bulunamadı. Lütfen yöneticinizle iletişime geçin.
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-identifier">Kullanıcı Adı</Label>
              <Input
                id="login-identifier"
                type="text"
                autoComplete="username"
                placeholder="ahmet.yilmaz@tgf"
                {...form.register("identifier")}
              />
              <p className="text-xs text-muted-foreground">
                Format: kullaniciadi@organizasyon-kisayolu
              </p>
              {form.formState.errors.identifier && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.identifier.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Şifre</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {serverError && <p className="text-xs text-destructive">{serverError}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Giriş yapılıyor…" : "Giriş Yap"}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="flex gap-2.5 rounded-lg border bg-muted/40 p-3.5">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Hesaplar yalnızca organizasyon yöneticiniz tarafından oluşturulur. Kullanıcı
              adı ve şifrenizi almak için koçunuza veya federasyon yöneticinize ulaşın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
