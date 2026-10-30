"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_NAME } from "@/lib/brand";

const acceptSchema = z
  .object({
    password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

type AcceptInput = z.infer<typeof acceptSchema>;

type PageState = "loading" | "set_password" | "already_active" | "error" | "success";

interface Props {
  params: Promise<{ token: string }>;
}

export default function InviteAcceptPage({ params }: Props) {
  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<AcceptInput>({
    resolver: zodResolver(acceptSchema),
  });

  useEffect(() => {
    // Supabase magic link / invite token, URL hash'te #access_token olarak gelir.
    // @supabase/ssr bunu otomatik session'a çevirir; biz sadece oturumu kontrol ederiz.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Şifre henüz belirlenmemişse (davet akışı) set_password göster
        const needsPassword =
          !session.user.last_sign_in_at ||
          session.user.user_metadata?.["invited"] === true;
        setState(needsPassword ? "set_password" : "already_active");
      } else {
        setState("error");
        setErrorMsg(
          "Davet linki geçersiz veya süresi dolmuş. Lütfen yöneticinizden yeni davet isteyin."
        );
      }
    });
  }, []);

  async function onAccept(values: AcceptInput) {
    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (updateError) {
      setErrorMsg(updateError.message);
      setIsSubmitting(false);
      return;
    }

    // Membership oluşturma middleware + Edge Function tarafından yapılmış olabilir;
    // burada yalnızca yönlendirme yapıyoruz.
    setState("success");
    setTimeout(() => router.push("/athletes"), 2000);
  }

  async function continueWithoutPassword() {
    router.push("/athletes");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{PRODUCT_NAME}</h1>
          <p className="text-sm text-muted-foreground">Daveti Kabul Et</p>
        </div>

        {state === "loading" && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {state === "error" && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-4 text-center text-sm text-destructive">
            <p className="font-medium">Geçersiz Davet</p>
            <p className="mt-1">{errorMsg}</p>
          </div>
        )}

        {state === "success" && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-4 text-center text-sm text-green-800">
            <p className="font-medium">Hoş geldiniz!</p>
            <p className="mt-1 text-green-700">Hesabınız hazır. Yönlendiriliyorsunuz…</p>
          </div>
        )}

        {state === "already_active" && (
          <div className="space-y-4">
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Hesabınız zaten aktif. Doğrudan giriş yapabilirsiniz.
            </div>
            <button
              type="button"
              onClick={continueWithoutPassword}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Dashboard&apos;a Git
            </button>
          </div>
        )}

        {state === "set_password" && (
          <form onSubmit={form.handleSubmit(onAccept)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Hesabınız oluşturuldu. Şifrenizi belirleyerek başlayın.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="invite-password" className="text-sm font-medium leading-none">
                Şifre
              </label>
              <input
                id="invite-password"
                type="password"
                autoComplete="new-password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="invite-confirm" className="text-sm font-medium leading-none">
                Şifre Tekrar
              </label>
              <input
                id="invite-confirm"
                type="password"
                autoComplete="new-password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {errorMsg && (
              <p className="text-xs text-destructive">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Kaydediliyor…" : "Hesabı Aktifleştir"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
