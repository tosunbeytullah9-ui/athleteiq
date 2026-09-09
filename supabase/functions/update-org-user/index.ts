import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// packages/validators/athlete.ts (ATHLETE_USERNAME_RE) ile birebir aynı olmalı.
const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

interface UpdateOrgUserPayload {
  user_id: string;
  full_name: string;
  username: string;
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

    const payload = (await req.json()) as UpdateOrgUserPayload;
    const { user_id, full_name, username } = payload;

    if (!user_id || !full_name || !username) {
      return json({ error: "user_id, full_name ve username zorunludur" }, 400);
    }
    if (full_name.trim().length < 2) {
      return json({ error: "Ad en az 2 karakter olmalı" }, 400);
    }
    if (!USERNAME_RE.test(username)) {
      return json(
        {
          error:
            "Kullanıcı adı yalnızca küçük harf, rakam, nokta ve alt çizgi içerebilir (3-30 karakter)",
        },
        400
      );
    }

    // Hedefi profiles'tan çöz — yetki kontrolü org_id BURADAN geliyor (reset-user-password
    // ile aynı desen). Yalnızca create-org-user ile oluşturulmuş kullanıcılar düzenlenebilir.
    const { data: targetProfile, error: profileFetchError } = await supabaseAdmin
      .from("profiles")
      .select("org_id, username")
      .eq("id", user_id)
      .maybeSingle();

    if (profileFetchError || !targetProfile) {
      return json({ error: "Kullanıcı bulunamadı" }, 404);
    }

    // Yetki: SADECE super_admin veya hedef org'un admin'i (koç DEĞİL).
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

    const normalizedUsername = username.toLowerCase();
    const usernameChanged = normalizedUsername !== targetProfile.username.toLowerCase();

    let newEmail: string | undefined;
    let oldEmail: string | undefined;

    if (usernameChanged) {
      // Org-scoped benzersizlik ön-kontrolü (kendisi hariç).
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("org_id", targetProfile.org_id)
        .ilike("username", normalizedUsername)
        .neq("id", user_id)
        .maybeSingle();

      if (existingProfile) {
        return json({ error: "Bu kullanıcı adı bu organizasyonda alınmış" }, 409);
      }

      const { data: org, error: orgError } = await supabaseAdmin
        .from("organizations")
        .select("slug")
        .eq("id", targetProfile.org_id)
        .maybeSingle();

      if (orgError || !org) {
        return json({ error: "Organizasyon bulunamadı" }, 404);
      }

      newEmail = `${normalizedUsername}@${org.slug}.athleteiq.app`;

      // Giriş e-postası, kullanıcı adının kaynağı doğrusu (auth.users.email) —
      // profiles.username'i auth.users.email ile senkron TUTMAZSAK kullanıcı
      // yeni adıyla giriş yapamaz (resolveLoginIdentifier email'i doğrudan
      // username+slug'dan hesaplar, packages/validators/auth.ts).
      const { data: currentAuthUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
      oldEmail = currentAuthUser?.user?.email;

      const { error: emailUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { email: newEmail, email_confirm: true }
      );

      if (emailUpdateError) {
        const isDuplicate = emailUpdateError.message?.toLowerCase().includes("already been registered");
        return json(
          {
            error: isDuplicate
              ? "Bu kullanıcı adı bu organizasyonda alınmış"
              : emailUpdateError.message ?? "Kullanıcı adı güncellenemedi",
          },
          isDuplicate ? 409 : 500
        );
      }
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: full_name.trim(), username: normalizedUsername })
      .eq("id", user_id);

    if (profileUpdateError) {
      // auth.users email zaten değiştiyse geri al — profiles ile senkronsuz kalmasın.
      if (usernameChanged && oldEmail) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { email: oldEmail });
      }
      const isDup = profileUpdateError.code === "23505";
      return json(
        { error: isDup ? "Bu kullanıcı adı bu organizasyonda alınmış" : profileUpdateError.message },
        isDup ? 409 : 500
      );
    }

    return json(
      { success: true, full_name: full_name.trim(), username: normalizedUsername, email: newEmail },
      200
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("update-org-user error:", message);
    return json({ error: message }, 500);
  }
});
