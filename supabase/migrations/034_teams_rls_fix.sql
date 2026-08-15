-- =============================================
-- 034_teams_rls_fix.sql — Parti 17
--
-- teams_insert (008_rls_signup.sql) coach dalı — herhangi bir coach kendi
-- org'unda takım oluşturabiliyordu. Tek canlı insert yolu
-- (apps/web/app/api/teams/route.ts) zaten service-role + kendi admin/coach
-- kontrolüyle çalışıyor, bu politikaya hiç tabi değil. teams_write (for all,
-- admin-only) zaten INSERT'i kapsıyor. 033'teki memberships_insert_self
-- kapatmasıyla birebir aynı desen — kapatılan boşluk: "coach kendi org'unda
-- takım oluşturabilir".
-- =============================================

drop policy if exists "teams_insert" on teams;

drop policy if exists "teams_write" on teams;
create policy "teams_write" on teams for all using (
  coalesce(is_super_admin() or my_role(org_id) = 'admin', false)
);

drop policy if exists "teams_select" on teams;
create policy "teams_select" on teams for select using (
  coalesce(is_super_admin() or my_role(org_id) is not null, false)
);
