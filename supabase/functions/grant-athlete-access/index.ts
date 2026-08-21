import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
const MIN_PASSWORD_LENGTH = 6;

interface GrantAccessPayload {
  athlete_id: string;
  username: string;
  password: string;
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

    const payload = (await req.json()) as GrantAccessPayload;
    const { athlete_id, username, password } = payload;

    if (!athlete_id || !username || !password) {
      return json(
        { error: "athlete_id, username ve password zorunludur" },
        400
      );
    }

    // Sporcuyu çek — yetki kontrolü ve org_id/team_id BURADAN geliyor, payload'dan değil.
    const { data: athlete, error: athleteFetchError } = await supabaseAdmin
      .from("athletes")
      .select("*")
      .eq("id", athlete_id)
      .maybeSingle();

    if (athleteFetchError || !athlete) {
      return json({ error: "Sporcu bulunamadı" }, 404);
    }

    if (athlete.user_id) {
      return json({ error: "Bu sporcunun zaten giriş erişimi var" }, 409);
    }

    // Org slug'ı çek — sentetik email'in kaynağı (create-org-user ile aynı desen,
    // CLAUDE.md §4.3: {username}@{org_slug}.athleteiq.app)
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("slug")
      .eq("id", athlete.org_id)
      .maybeSingle();

    if (orgError || !org) {
      return json({ error: "Organizasyon bulunamadı" }, 404);
    }

    // Çağıranın bu org'da (ve gerekirse bu takımda) yetkisi var mı?
    // create-athlete-account'taki (dolayısıyla athletes_insert RLS'indeki, 002_rls.sql)
    // kuralla birebir aynı: super_admin, org admin, veya sporcunun kendi takımına
    // sahip coach. org_id/team_id sporcunun KENDİ satırından alınıyor.
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

    // Kullanıcı adı formatı
    if (!USERNAME_RE.test(username)) {
      return json(
        {
          error:
            "Kullanıcı adı yalnızca küçük harf, rakam, nokta ve alt çizgi içerebilir (3-30 karakter)",
        },
        400
      );
    }

    // Parola uzunluğu
    if (password.length < MIN_PASSWORD_LENGTH) {
      return json(
        { error: `Parola en az ${MIN_PASSWORD_LENGTH} karakter olmalı` },
        400
      );
    }

    // Benzersizlik ön kontrolü (case-insensitive, global)
    const { data: existing } = await supabaseAdmin
      .from("athletes")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (existing) {
      return json({ error: "Bu kullanıcı adı alınmış" }, 409);
    }

    // profiles ön-kontrolü (org_id, lower(username)) — create-org-user ile aynı desen.
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("org_id", athlete.org_id)
      .ilike("username", username)
      .maybeSingle();

    if (existingProfile) {
      return json({ error: "Bu kullanıcı adı bu organizasyonda alınmış" }, 409);
    }

    const syntheticEmail = `${username.toLowerCase()}@${org.slug}.athleteiq.app`;

    // auth.users kaydı oluştur
    const { data: createdUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
      });

    if (createUserError || !createdUser?.user) {
      const isDuplicate = createUserError?.message
        ?.toLowerCase()
        .includes("already been registered");
      return json(
        { error: isDuplicate ? "Bu kullanıcı adı alınmış" : createUserError!.message },
        isDuplicate ? 409 : 500
      );
    }

    const newUserId = createdUser.user.id;

    // athletes satırını güncelle — mevcut satırı SİLİP YENİDEN OLUŞTURMUYORUZ,
    // bağlı programlar/testler/ACWR logları vb. (athlete_id FK) korunmalı.
    const { data: updatedAthlete, error: updateError } = await supabaseAdmin
      .from("athletes")
      .update({ user_id: newUserId, username })
      .eq("id", athlete_id)
      .select()
      .single();

    if (updateError || !updatedAthlete) {
      // ROLLBACK: yetim auth hesabı bırakma
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      const isUniqueViolation = updateError?.code === "23505";
      return json(
        {
          error: isUniqueViolation
            ? "Bu kullanıcı adı alınmış"
            : updateError?.message ?? "Sporcu güncellenemedi",
        },
        isUniqueViolation ? 409 : 500
      );
    }

    // profiles kaydı oluştur — create-org-user'ın yazdığı satırla aynı şema.
    // Eksikliği, Kullanıcılar sayfasındaki "Şifre sıfırla" butonunun (yalnızca
    // profile'ı olan kullanıcılar için render edilir) bu yoldan erişim verilen
    // sporcular için hiç görünmemesine yol açıyordu.
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({ id: newUserId, org_id: athlete.org_id, username, full_name: athlete.full_name });

    if (profileError) {
      // ROLLBACK: athletes'i eski haline döndür, auth hesabını geri al
      await supabaseAdmin
        .from("athletes")
        .update({ user_id: null, username: null })
        .eq("id", athlete_id);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      const isUniqueViolation = profileError.code === "23505";
      return json(
        {
          error: isUniqueViolation
            ? "Bu kullanıcı adı bu organizasyonda alınmış"
            : profileError.message ?? "Profil kaydı oluşturulamadı",
        },
        isUniqueViolation ? 409 : 500
      );
    }

    // memberships kaydı oluştur — rol ataması burada gerçekleşir.
    // Bu olmadan kullanıcı giriş yapamaz (middleware "no_membership" ile reddeder).
    const { error: membershipError } = await supabaseAdmin
      .from("memberships")
      .insert({
        user_id: newUserId,
        org_id: athlete.org_id,
        team_id: athlete.team_id,
        role: "athlete",
        invited_by: caller.id,
      });

    if (membershipError) {
      // ROLLBACK: profiles, athletes güncellemesini ve auth hesabını geri al —
      // aksi halde giriş yapamayan yetim bir sporcu kaydı kalır.
      await supabaseAdmin.from("profiles").delete().eq("id", newUserId);
      await supabaseAdmin
        .from("athletes")
        .update({ user_id: null, username: null })
        .eq("id", athlete_id);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return json(
        { error: membershipError.message ?? "Rol ataması oluşturulamadı" },
        500
      );
    }

    return json({ success: true, athlete: updatedAthlete, username, email: syntheticEmail }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("grant-athlete-access error:", message);
    return json({ error: message }, 500);
  }
});
