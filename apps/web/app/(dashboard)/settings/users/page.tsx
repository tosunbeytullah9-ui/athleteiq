import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getMembershipsByOrg, getProfilesByOrg } from "@athleteiq/db/queries";
import type { Tables } from "@athleteiq/db/types";
import { UsersClient } from "./users-client";

type ProfileRow = Tables<"profiles">;
type MembershipRow = Tables<"memberships"> & { teams: { name: string } | null };

export default async function SettingsUsersPage() {
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const [memberships, profiles, teamsResult, orgResult] = await Promise.all([
    getMembershipsByOrg(admin, orgId) as Promise<MembershipRow[]>,
    getProfilesByOrg(admin, orgId) as Promise<ProfileRow[]>,
    admin.from("teams").select("id, name").eq("org_id", orgId).order("name"),
    admin.from("organizations").select("slug").eq("id", orgId).single(),
  ]);

  // profiles ve memberships arasında doğrudan FK yok (ikisi de ayrı ayrı
  // auth.users'a referans veriyor) — PostgREST embed edemez, user_id/id
  // üzerinden burada merge ediliyor.
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Gerçek giriş email'i username+slug'dan client-side hesaplanamaz —
  // backfill edilen eski-desen kullanıcılar hâlâ {username}@athleteiq.app'te.
  // auth.users'tan gerçek email'i çekiyoruz (org üye sayısı küçük, N+1 kabul edilebilir).
  const emailByUserId = new Map<string, string>();
  await Promise.all(
    memberships.map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      if (data?.user?.email) emailByUserId.set(m.user_id, data.user.email);
    })
  );

  const users = memberships.map((m) => ({
    membership_id: m.id,
    user_id: m.user_id,
    role: m.role,
    team_id: m.team_id,
    team_name: m.teams?.name ?? null,
    joined_at: m.joined_at,
    profile: profileMap.get(m.user_id) ?? null,
    email: emailByUserId.get(m.user_id) ?? null,
  }));

  return (
    <UsersClient
      orgId={orgId}
      orgSlug={orgResult.data?.slug ?? ""}
      users={users}
      teams={teamsResult.data ?? []}
    />
  );
}
