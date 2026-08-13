import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitePayload {
  email: string;
  role: "admin" | "coach" | "athlete";
  org_id: string;
  team_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // RETİRE (Parti 16): davet akışı create-org-user Edge Function'ı lehine
  // kaldırıldı. Davet edilen kullanıcı şifresiz oluşuyordu, şifre belirleme
  // sayfası hiç yazılmamıştı, akış uçtan uca hiç çalışmamıştı (bkz. BUGS.md).
  // Aşağıdaki gövde artık ULAŞILAMAZ — minimal diff / kolay geri alınabilirlik
  // için bilinçli olarak silinmedi.
  return new Response(
    JSON.stringify({ error: "Davet akışı kullanımdan kaldırıldı. Kullanıcıyı doğrudan oluşturun." }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

  try {
    // Çağıran kullanıcının yetki doğrulaması
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Yetkilendirme başlığı eksik" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // JWT'den çağıran kullanıcıyı doğrula
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerError } =
      await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Geçersiz oturum" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = (await req.json()) as InvitePayload;
    const { email, role, org_id, team_id } = payload;

    // Temel validasyon
    if (!email || !role || !org_id) {
      return new Response(
        JSON.stringify({ error: "email, role ve org_id zorunludur" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Çağıranın bu org'da admin yetkisi var mı?
    const { data: callerMembership } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", caller.id)
      .eq("org_id", org_id)
      .single();

    const isPlatformAdmin =
      caller.user_metadata?.["platform_role"] === "super_admin";

    if (!isPlatformAdmin && callerMembership?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Bu işlem için admin yetkisi gerekli" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Kullanıcıyı davet et (zaten varsa da çalışır)
    // pending_* prefix: /auth/confirm callback'i membership oluştururken okur
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          pending_org_id: org_id,
          pending_role: role,
          pending_team_id: team_id ?? null,
          invited: true,
        },
        redirectTo: `${Deno.env.get("SITE_URL")}/auth/confirm`,
      });

    if (inviteError) {
      // Kullanıcı zaten mevcutsa mevcut kullanıcıyı kullan
      if (!inviteError.message.includes("already been registered")) {
        throw inviteError;
      }
    }

    // Davet edilen kullanıcının ID'sini bul
    let invitedUserId: string | null = inviteData?.user?.id ?? null;

    if (!invitedUserId) {
      const { data: existingUsers } =
        await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find((u) => u.email === email);
      invitedUserId = existingUser?.id ?? null;
    }

    // Membership kaydı oluştur (upsert — tekrar davet gönderilebilir)
    if (invitedUserId) {
      const { error: memberError } = await supabaseAdmin
        .from("memberships")
        .upsert(
          {
            user_id: invitedUserId,
            org_id,
            role,
            team_id: team_id ?? null,
            invited_by: caller.id,
          },
          { onConflict: "user_id,org_id" }
        );

      if (memberError) {
        console.error("Membership oluşturulamadı:", memberError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, email }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("invite-member error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
