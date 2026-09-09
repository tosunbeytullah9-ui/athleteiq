import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteOrgUserPayload {
  user_id: string;
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

    const payload = (await req.json()) as DeleteOrgUserPayload;
    const { user_id } = payload;

    if (!user_id) {
      return json({ error: "user_id zorunludur" }, 400);
    }

    if (user_id === caller.id) {
      return json({ error: "Kendi hesabınızı silemezsiniz" }, 400);
    }

    // Hedefi profiles'tan çöz — yetki kontrolü org_id BURADAN geliyor, payload'dan
    // değil (reset-user-password ile aynı desen). Yalnızca create-org-user ile
    // oluşturulmuş (profiles satırı olan) kullanıcılar bu yoldan silinebilir.
    const { data: targetProfile, error: profileFetchError } = await supabaseAdmin
      .from("profiles")
      .select("org_id, full_name")
      .eq("id", user_id)
      .maybeSingle();

    if (profileFetchError || !targetProfile) {
      return json({ error: "Kullanıcı bulunamadı" }, 404);
    }

    // Yetki: SADECE super_admin veya hedef org'un admin'i (koç DEĞİL —
    // reset-user-password/create-org-user ile aynı kısıt).
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

    // Hedef süper admin ise bu yoldan silinemez — kurtarma/silme yalnızca
    // Supabase Dashboard'tan (CLAUDE.md §4.3 ile aynı kısıt).
    const { data: targetAuthUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (targetAuthUser?.user?.user_metadata?.["platform_role"] === "super_admin") {
      return json(
        { error: "Süper admin hesapları yalnızca Supabase Dashboard'tan silinebilir" },
        400
      );
    }

    // Hedef bu org'un tek admin'iyse silme engellenir — org'u kilitlemeyi önler.
    const { data: targetMembership } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", user_id)
      .eq("org_id", targetProfile.org_id)
      .maybeSingle();

    if (targetMembership?.role === "admin") {
      const { count: adminCount } = await supabaseAdmin
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("org_id", targetProfile.org_id)
        .eq("role", "admin");

      if ((adminCount ?? 0) <= 1) {
        return json(
          { error: "Bu organizasyondaki tek admin siliniyor — önce başka bir admin atayın" },
          400
        );
      }
    }

    // auth.users silinince memberships (on delete cascade), profiles (on delete
    // cascade) ve athletes.user_id (on delete set null) otomatik temizlenir —
    // ayrı bir manuel silme adımına gerek yok (001_schema.sql / 032_profiles.sql).
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      return json({ error: deleteError.message ?? "Kullanıcı silinemedi" }, 500);
    }

    return json({ success: true, full_name: targetProfile.full_name }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("delete-org-user error:", message);
    return json({ error: message }, 500);
  }
});
