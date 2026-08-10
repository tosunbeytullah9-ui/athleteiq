import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MIN_PASSWORD_LENGTH = 6;

interface ResetPasswordPayload {
  athlete_id: string;
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

    const payload = (await req.json()) as ResetPasswordPayload;
    const { athlete_id, new_password } = payload;

    if (!athlete_id || !new_password) {
      return json({ error: "athlete_id ve new_password zorunludur" }, 400);
    }

    // Sporcuyu çek — yetki kontrolü org_id/team_id BURADAN geliyor, payload'dan değil.
    const { data: athlete, error: athleteFetchError } = await supabaseAdmin
      .from("athletes")
      .select("*")
      .eq("id", athlete_id)
      .maybeSingle();

    if (athleteFetchError || !athlete) {
      return json({ error: "Sporcu bulunamadı" }, 404);
    }

    if (!athlete.user_id) {
      return json(
        { error: "Bu sporcunun giriş erişimi yok, önce erişim verin" },
        400
      );
    }

    // Çağıranın bu org'da (ve gerekirse bu takımda) yetkisi var mı?
    // grant-athlete-access / create-athlete-account ile birebir aynı kural.
    const isPlatformAdmin =
      caller.user_metadata?.["platform_role"] === "super_admin";

    let authorized = isPlatformAdmin;
    if (!authorized) {
      const { data: callerMembership } = await supabaseAdmin
        .from("memberships")
        .select("role, team_id")
        .eq("user_id", caller.id)
        .eq("org_id", athlete.org_id)
        .maybeSingle();

      authorized =
        callerMembership?.role === "admin" ||
        (callerMembership?.role === "coach" &&
          callerMembership?.team_id === athlete.team_id);
    }

    if (!authorized) {
      return json({ error: "Bu işlem için admin veya koç yetkisi gerekli" }, 403);
    }

    // Parola uzunluğu
    if (new_password.length < MIN_PASSWORD_LENGTH) {
      return json(
        { error: `Parola en az ${MIN_PASSWORD_LENGTH} karakter olmalı` },
        400
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      athlete.user_id,
      { password: new_password }
    );

    if (updateError) {
      return json(
        { error: updateError.message ?? "Şifre güncellenemedi" },
        500
      );
    }

    return json({ success: true }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("reset-athlete-password error:", message);
    return json({ error: message }, 500);
  }
});
