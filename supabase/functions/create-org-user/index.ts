import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// packages/validators/athlete.ts (ATHLETE_USERNAME_RE) ile birebir aynı olmalı.
const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
const MIN_PASSWORD_LENGTH = 6;
const VALID_ROLES = ["admin", "coach", "athlete"] as const;
type OrgRole = (typeof VALID_ROLES)[number];

interface AthleteFields {
  birth_date?: string;
  gender?: "male" | "female" | "other";
  height_cm?: number;
  weight_kg?: number;
  position?: string;
  notes?: string;
}

interface CreateOrgUserPayload {
  org_id: string;
  role: OrgRole;
  username: string;
  password: string;
  full_name: string;
  team_id?: string;
  athlete_fields?: AthleteFields;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type RollbackStep = () => Promise<void>;

// LIFO geri alma — her adım kendi hatasını yutar (loglar ama zinciri
// durdurmaz); aksi halde bir rollback adımının başarısızlığı diğer
// adımların geri alınmasını engelleyip daha tutarsız bir durum bırakır.
async function runRollback(steps: RollbackStep[]) {
  for (let i = steps.length - 1; i >= 0; i--) {
    try {
      await steps[i]();
    } catch (err) {
      console.error(`create-org-user rollback step ${i} failed:`, err);
    }
  }
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

    const payload = (await req.json()) as CreateOrgUserPayload;
    const { org_id, role, username, password, full_name, team_id, athlete_fields } = payload;

    if (!org_id || !role || !username || !password || !full_name) {
      return json(
        { error: "org_id, role, username, password ve full_name zorunludur" },
        400
      );
    }
    if (!VALID_ROLES.includes(role)) {
      return json({ error: "Geçersiz rol" }, 400);
    }
    if ((role === "coach" || role === "athlete") && !team_id) {
      return json(
        {
          error:
            role === "coach"
              ? "Koç için takım seçimi zorunludur"
              : "Sporcu için takım seçimi zorunludur",
        },
        400
      );
    }
    if (role === "admin" && team_id) {
      return json({ error: "Admin için takım seçilemez" }, 400);
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
    if (password.length < MIN_PASSWORD_LENGTH) {
      return json({ error: `Parola en az ${MIN_PASSWORD_LENGTH} karakter olmalı` }, 400);
    }

    // Yetki: SADECE super_admin veya hedef org'un admin'i (koç ÇAĞIRAMAZ)
    const isPlatformAdmin = caller.user_metadata?.["platform_role"] === "super_admin";
    let authorized = isPlatformAdmin;
    if (!authorized) {
      const { data: callerMembership } = await supabaseAdmin
        .from("memberships")
        .select("role")
        .eq("user_id", caller.id)
        .eq("org_id", org_id)
        .maybeSingle();
      authorized = callerMembership?.role === "admin";
    }
    if (!authorized) {
      return json({ error: "Bu işlem için admin yetkisi gerekli" }, 403);
    }

    // Org slug'ı çek — sentetik email'in kaynağı
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("slug")
      .eq("id", org_id)
      .maybeSingle();

    if (orgError || !org) {
      return json({ error: "Organizasyon bulunamadı" }, 404);
    }

    const normalizedUsername = username.toLowerCase();
    const syntheticEmail = `${normalizedUsername}@${org.slug}.athleteiq.app`;

    // profiles ön-kontrolü (org_id, lower(username)) — athletes.username'in
    // GLOBAL namespace'iyle ilgisiz, o çakışma athlete insert adımında ayrıca yakalanır.
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("org_id", org_id)
      .ilike("username", normalizedUsername)
      .maybeSingle();

    if (existingProfile) {
      return json({ error: "Bu kullanıcı adı bu organizasyonda alınmış" }, 409);
    }

    const rollbackSteps: RollbackStep[] = [];

    // auth.users kaydı oluştur
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
    });

    if (createUserError || !createdUser?.user) {
      const isDuplicate = createUserError?.message?.toLowerCase().includes("already been registered");
      return json(
        { error: isDuplicate ? "Bu kullanıcı adı bu organizasyonda alınmış" : createUserError!.message },
        isDuplicate ? 409 : 500
      );
    }

    const newUserId = createdUser.user.id;
    rollbackSteps.push(async () => {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
    });

    // profiles satırı
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({ id: newUserId, org_id, username: normalizedUsername, full_name });

    if (profileError) {
      await runRollback(rollbackSteps);
      const isDup = profileError.code === "23505";
      return json(
        { error: isDup ? "Bu kullanıcı adı bu organizasyonda alınmış" : profileError.message },
        isDup ? 409 : 500
      );
    }
    rollbackSteps.push(async () => {
      await supabaseAdmin.from("profiles").delete().eq("id", newUserId);
    });

    // memberships kaydı — rol ataması burada gerçekleşir
    const { error: membershipError } = await supabaseAdmin.from("memberships").insert({
      user_id: newUserId,
      org_id,
      role,
      team_id: team_id ?? null,
      invited_by: caller.id,
    });

    if (membershipError) {
      await runRollback(rollbackSteps);
      return json({ error: membershipError.message ?? "Rol ataması oluşturulamadı" }, 500);
    }
    rollbackSteps.push(async () => {
      await supabaseAdmin.from("memberships").delete().eq("user_id", newUserId).eq("org_id", org_id);
    });

    // role === 'athlete' → athletes satırı da gerekli (team_id NOT NULL, yukarıda zorunlu kılındı)
    if (role === "athlete") {
      const { error: athleteError } = await supabaseAdmin.from("athletes").insert({
        user_id: newUserId,
        org_id,
        team_id: team_id!,
        full_name,
        username: normalizedUsername,
        birth_date: athlete_fields?.birth_date ?? null,
        gender: athlete_fields?.gender ?? null,
        height_cm: athlete_fields?.height_cm ?? null,
        weight_kg: athlete_fields?.weight_kg ?? null,
        position: athlete_fields?.position ?? null,
        notes: athlete_fields?.notes ?? null,
      });

      if (athleteError) {
        await runRollback(rollbackSteps);
        // athletes.username GLOBAL benzersiz (idx_athletes_username_lower, 022) —
        // profiles ön-kontrolü org-scoped olduğu için burada FARKLI bir org'un
        // aynı username'i athletes'te kullanması ayrı bir çakışma olarak yakalanır.
        const isDup = athleteError.code === "23505";
        return json(
          {
            error: isDup
              ? "Bu kullanıcı adı başka bir organizasyonda kullanılıyor"
              : athleteError.message,
          },
          isDup ? 409 : 500
        );
      }
    }

    return json(
      { success: true, user_id: newUserId, email: syntheticEmail, username: normalizedUsername, role },
      200
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("create-org-user error:", message);
    return json({ error: message }, 500);
  }
});
