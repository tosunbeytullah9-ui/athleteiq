import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Hesap silme talebini TAMAMLAR (Parti 18B — App Store 5.1.1(v) + KVKK m.11/13).
// delete-org-user'dan FARKI: o yalnızca giriş erişimini kaldırır (athletes.user_id SET
// NULL, roster ve sağlık verisi kalır); bu fonksiyon kişinin athletes satırını da siler →
// bağlı 21 tablo ON DELETE CASCADE ile temizlenir. Talep account_deletion_requests'te
// request_account_deletion RPC'siyle oluşturulur, etki get_account_deletion_impact ile
// silmeden ÖNCE web'de gösterilir.
//
// Loglara YALNIZCA id'ler yazılır — sağlık verisi, ad, kullanıcı adı loglanmaz.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProcessPayload {
  request_id: string;
}

interface WearableConnectionRow {
  id: string;
  provider: string;
  access_token: string | null;
  provider_user_id: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REVOKE_TIMEOUT_MS = 8000;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Sağlayıcı tarafında yetkiyi iptal eder — best-effort, hata silmeyi DURDURMAZ (token
// satırları zaten CASCADE ile siliniyor). packages/integrations/* Deno'da doğrudan
// import edilemiyor (uzantısız import + çıplak "zod"), whoop-webhook gibi bu fonksiyon da
// ilgili tek fetch çağrısını kendi taşıyor:
//   WHOOP  → packages/integrations/whoop/oauth.ts revokeAccess
//   Polar  → packages/integrations/polar/oauth.ts deregisterUser
//   Fitbit → packages/integrations/fitbit/oauth.ts revokeAccess (client secret gerekir)
async function revokeProvider(conn: WearableConnectionRow): Promise<string> {
  if (!conn.access_token) return "skipped:no_token";
  const signal = AbortSignal.timeout(REVOKE_TIMEOUT_MS);

  if (conn.provider === "whoop") {
    const res = await fetch("https://api.prod.whoop.com/developer/v2/user/access", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${conn.access_token}` },
      signal,
    });
    return res.ok || res.status === 404 ? "revoked" : `failed:${res.status}`;
  }

  if (conn.provider === "polar") {
    if (!conn.provider_user_id) return "skipped:no_user_id";
    const res = await fetch(
      `https://www.polaraccesslink.com/v3/users/${encodeURIComponent(conn.provider_user_id)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${conn.access_token}` }, signal }
    );
    return res.ok || res.status === 404 ? "revoked" : `failed:${res.status}`;
  }

  if (conn.provider === "fitbit") {
    const clientId = Deno.env.get("FITBIT_CLIENT_ID");
    const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");
    if (!clientId || !clientSecret) return "skipped:no_fitbit_secret";
    const res = await fetch("https://api.fitbit.com/oauth2/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({ token: conn.access_token }).toString(),
      signal,
    });
    return res.ok || res.status === 404 ? "revoked" : `failed:${res.status}`;
  }

  return "skipped:unknown_provider";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let requestId: string | undefined;

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

    const payload = (await req.json().catch(() => ({}))) as Partial<ProcessPayload>;
    requestId = payload.request_id;
    if (!requestId || !UUID_RE.test(requestId)) {
      return json({ error: "request_id zorunludur" }, 400);
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from("account_deletion_requests")
      .select("id, org_id, user_id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError || !request) {
      return json({ error: "Talep bulunamadı" }, 404);
    }

    // 1. Yetki: SADECE super_admin veya talebin org'unun admin'i — koç ve sporcu ÇAĞIRAMAZ
    // (delete-org-user ile aynı kısıt, app_metadata — user_metadata asla, §4.1).
    const isPlatformAdmin = caller.app_metadata?.["platform_role"] === "super_admin";
    let authorized = isPlatformAdmin;
    if (!authorized) {
      const { data: callerMembership } = await supabaseAdmin
        .from("memberships")
        .select("role")
        .eq("user_id", caller.id)
        .eq("org_id", request.org_id)
        .maybeSingle();
      authorized = callerMembership?.role === "admin";
    }
    if (!authorized) {
      return json({ error: "Bu işlem için admin yetkisi gerekli" }, 403);
    }

    // 2. Yalnızca bekleyen talep işlenir.
    if (request.status !== "pending") {
      return json({ error: "Bu talep artık beklemede değil" }, 409);
    }

    // user_id SET NULL olmuşsa hesap başka bir yoldan (ör. delete-org-user) zaten
    // silinmiş demektir — kime ait olduğu artık çözülemez, talep yalnızca reddedilebilir.
    const targetId: string | null = request.user_id;
    if (!targetId) {
      return json(
        { error: "Bu hesap başka bir yoldan zaten silinmiş — talebi gerekçeyle reddedin" },
        409
      );
    }

    if (targetId === caller.id) {
      return json(
        { error: "Kendi silme talebinizi başka bir yönetici işlemelidir" },
        400
      );
    }

    // 3. Süper admin hedef reddedilir (kurtarma/silme yalnızca Dashboard, §4.3).
    const { data: targetAuthUser } = await supabaseAdmin.auth.admin.getUserById(targetId);
    if (targetAuthUser?.user?.app_metadata?.["platform_role"] === "super_admin") {
      return json(
        { error: "Süper admin hesapları yalnızca Supabase Dashboard'tan silinebilir" },
        400
      );
    }

    // Org'un son admin'i reddedilir (delete-org-user ile aynı kural).
    const { data: targetMembership } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", targetId)
      .eq("org_id", request.org_id)
      .maybeSingle();

    if (targetMembership?.role === "admin") {
      const { count: adminCount } = await supabaseAdmin
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("org_id", request.org_id)
        .eq("role", "admin");
      if ((adminCount ?? 0) <= 1) {
        return json({ error: "Önce başka bir yönetici atayın" }, 400);
      }
    }

    // 4. Kişinin athletes satırı varsa (rolden bağımsız — bir admin'in de sporcu satırı
    // olabiliyor, Parti 18B Faz 1) önce sağlayıcı yetkilerini iptal et, sonra satırı sil.
    // Satır yoksa (yeniden deneme veya sporcu olmayan hesap) bu adım sessizce geçer.
    const { data: athlete, error: athleteFetchError } = await supabaseAdmin
      .from("athletes")
      .select("id")
      .eq("user_id", targetId)
      .maybeSingle();

    if (athleteFetchError) {
      console.error("process-account-deletion: athlete lookup failed", { requestId });
      return json({ error: "Sporcu kaydı okunamadı" }, 500);
    }

    if (athlete) {
      const { data: connections } = await supabaseAdmin
        .from("wearable_connections")
        .select("id, provider, access_token, provider_user_id")
        .eq("athlete_id", athlete.id)
        .eq("is_active", true);

      for (const conn of (connections ?? []) as WearableConnectionRow[]) {
        try {
          const result = await revokeProvider(conn);
          console.log("process-account-deletion: revoke", {
            requestId,
            connectionId: conn.id,
            provider: conn.provider,
            result,
          });
        } catch (_err) {
          console.warn("process-account-deletion: revoke error", {
            requestId,
            connectionId: conn.id,
            provider: conn.provider,
          });
        }
      }

      const { error: athleteDeleteError } = await supabaseAdmin
        .from("athletes")
        .delete()
        .eq("id", athlete.id);

      if (athleteDeleteError) {
        console.error("process-account-deletion: athlete delete failed", {
          requestId,
          athleteId: athlete.id,
          code: athleteDeleteError.code,
        });
        return json({ error: "Sporcu verisi silinemedi — talep beklemede kaldı" }, 500);
      }
    }

    // 5. Giriş hesabı — memberships/profiles CASCADE, audit kolonları SET NULL
    // (20261026185415_auth_user_fk_set_null.sql).
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(targetId);
    if (deleteUserError) {
      // 7. athletes zaten silinmiş olabilir; talep pending kalır, yeniden deneme 4. adımı
      // satır bulamayıp atlar (idempotent).
      console.error("process-account-deletion: auth delete failed", {
        requestId,
        userId: targetId,
        athleteDeleted: Boolean(athlete),
      });
      return json({ error: "Hesap silinemedi — talep beklemede kaldı, tekrar deneyin" }, 500);
    }

    // 6. Talebi kapat; silinen kişinin kişisel alanları talep kaydında kalmasın.
    // (user_id auth silinirken FK ile zaten NULL'a düştü.)
    const { error: updateError } = await supabaseAdmin
      .from("account_deletion_requests")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        processed_by: caller.id,
        display_name: null,
        username: null,
        reason: null,
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("process-account-deletion: request close failed", { requestId });
      return json(
        {
          success: true,
          warning: "Hesap silindi ancak talep kaydı güncellenemedi",
        },
        200
      );
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error("process-account-deletion error", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return json({ error: "Beklenmeyen bir hata oluştu" }, 500);
  }
});
