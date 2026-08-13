import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MIN_PASSWORD_LENGTH = 6;

interface ResetUserPasswordPayload {
  user_id: string;
  new_password: string;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Çağıranın yetki doğrulaması
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Yetkilendirme başlığı eksik" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      return json({ error: "Geçersiz oturum" }, 401);
    }

    const payload = (await req.json()) as ResetUserPasswordPayload;
    const { user_id, new_password } = payload;

    if (!user_id || !new_password) {
      return json({ error: "user_id ve new_password zorunludur" }, 400);
    }

    // Hedefi profiles'tan çöz — yetki kontrolü org_id BURADAN geliyor, payload'dan değil.
    // Yalnızca profiles satırı olan (create-org-user ile oluşturulmuş) kullanıcıları
    // çözer — eski akıştan (create-athlete-account/grant-athlete-access) gelen ve
    // backfill edilmemiş sporcular için mevcut reset-athlete-password kullanılmaya devam eder.
    const { data: targetProfile, error: profileFetchError } = await supabaseAdmin
      .from("profiles")
      .select("org_id")
      .eq("id", user_id)
      .maybeSingle();

    if (profileFetchError || !targetProfile) {
      return json({ error: "Kullanıcı bulunamadı" }, 404);
    }

    // Yetki: SADECE super_admin veya hedef org'un admin'i (koç DEĞİL —
    // reset-athlete-password'dan farkı budur).
    const isPlatformAdmin = caller.user_metadata?.["platform_role"] === "super_admin";
    let authorized = isPlatformAdmin;
    if (!authorized) {
      const { data: callerMembership } = await supabaseAdmin
        .from("memberships")
        .select("role")
        .eq("user_id", caller.id)
        .eq("org_id", targetProfile.org_id)
        .maybeSingle();
      authorized = callerMembership?.role === "admin";
    }

    if (!authorized) {
      return json({ error: "Bu işlem için admin yetkisi gerekli" }, 403);
    }

    if (new_password.length < MIN_PASSWORD_LENGTH) {
      return json({ error: `Parola en az ${MIN_PASSWORD_LENGTH} karakter olmalı` }, 400);
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (updateError) {
      return json({ error: updateError.message ?? "Şifre güncellenemedi" }, 500);
    }

    return json({ success: true }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("reset-user-password error:", message);
    return json({ error: message }, 500);
  }
});
