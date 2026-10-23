"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, resolveLoginIdentifier } from "@athleteiq/validators";
import type { LoginInput } from "@athleteiq/validators";

/**
 * Giriş formu — landing sayfasının içine gömülü kart. Giriş mantığı (org
 * kapsamlı kimlik çözümü, `next` yönlendirmesi) burada, yerleşim landing'de.
 */
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

  // /login'e (ör. korumalı bir sayfadan) yönlenen ziyaretçi, telefonda tanıtım
  // metninin altında kalan formu aramasın — doğrudan forma kaydır.
  useEffect(() => {
    if (window.location.pathname !== "/login") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    document.getElementById("giris")?.scrollIntoView({ block: "start" });
  }, []);

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
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Giriş yap</h2>
        <p className="text-sm text-muted-foreground">
          Kullanıcı adınız ve organizasyon kısayolunuzla.
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

      <div className="flex gap-2.5 border-t pt-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Hesaplar organizasyon yöneticiniz tarafından açılır. Kullanıcı adı ve şifrenizi
          koçunuzdan veya federasyon yöneticinizden alın.
        </p>
      </div>
    </div>
  );
}
