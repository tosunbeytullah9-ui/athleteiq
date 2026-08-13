"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
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
    const identifier = resolveLoginIdentifier(values.identifier);
    const { error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password: values.password,
    });
    setIsSubmitting(false);
    if (error) {
      console.error("[Login] signInWithPassword error:", error.message, error.status, error);
      setServerError("E-posta/kullanıcı adı veya şifre hatalı");
      return;
    }
    // Hard navigation (router.push değil): middleware taze çalışsın,
    // aiq_uid eşleşmesiyle doğru rolü cookie'ye yeniden yazsın. Böylece
    // önceki kullanıcının bayat rol cookie'si asla miras kalmaz.
    window.location.href = next;
  }

  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      {/* Logo + Başlık */}
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">AthleteIQ</h1>
        <p className="text-sm text-muted-foreground">Hesabınıza giriş yapın</p>
      </div>

      {/* Üyelik hatası */}
      {errorParam === "no_membership" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Bu hesaba bağlı bir üyelik bulunamadı. Lütfen yöneticinizle iletişime geçin.
        </div>
      )}

      {/* Giriş Formu */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="login-identifier"
            className="text-sm font-medium leading-none"
          >
            E-posta veya kullanıcı adı
          </label>
          <input
            id="login-identifier"
            type="text"
            autoComplete="username"
            placeholder="koç@kulubu.com"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            {...form.register("identifier")}
          />
          {form.formState.errors.identifier && (
            <p className="text-xs text-destructive">
              {form.formState.errors.identifier.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="login-password"
            className="text-sm font-medium leading-none"
          >
            Şifre
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {serverError && (
          <p className="text-xs text-destructive">{serverError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>
      </form>
    </div>
  );
}
