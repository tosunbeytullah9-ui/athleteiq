-- =============================================
-- parti_18s_secure_definer_functions
-- Parti 18-S — copy_program_tree ve get_athlete_programs'taki
-- eksik yetkilendirmeyi kapatır, 9 fonksiyondan gereksiz anon/PUBLIC
-- EXECUTE yetkisini kaldırır.
-- =============================================

-- ---------------------------------------------
-- 1.A — get_athlete_programs: yetkilendirme eklendi.
-- Desen athletes_select (002_rls.sql) ile BİREBİR AYNI — coach dalı
-- team-scoped (my_role(org)='coach' AND team_id=my_team_id(org)),
-- yeni bir yetki deseni icat edilmedi. Dönüş tipi, sıralama,
-- is_published/is_archived filtreleri DEĞİŞMEDİ.
-- ---------------------------------------------
create or replace function public.get_athlete_programs(p_athlete_id uuid)
returns setof public.training_programs
language sql
stable
security definer
set search_path to ''
as $$
  select p.*
  from public.training_programs p
  join public.athletes a on a.id = p_athlete_id
  where (p.athlete_id = p_athlete_id or p.team_id = a.team_id)
    and p.is_published = true
    and p.is_archived = false
    and coalesce(
      a.user_id = auth.uid()
      or public.is_super_admin()
      or public.my_role(a.org_id) = 'admin'
      or (public.my_role(a.org_id) = 'coach' and a.team_id = public.my_team_id(a.org_id)),
      false
    )
  order by p.start_date desc nulls last;
$$;

-- ---------------------------------------------
-- 1.B — copy_program_tree: gövdeye DOKUNULMADI (CREATE OR REPLACE yok).
-- propagate_week_to_future onu dahili olarak (owner yetkisiyle) çağırır;
-- SECURITY DEFINER çağrı zincirinde EXECUTE kontrolü çağıranın değil
-- tanımlayıcının rolüyle değerlendirilir, bu yüzden authenticated'dan
-- EXECUTE kaldırmak dahili çağrıyı bozmaz, yalnızca doğrudan
-- /rest/v1/rpc/copy_program_tree uç noktasını kapatır (bkz. 1.C).
-- ---------------------------------------------

-- ---------------------------------------------
-- 1.C — EXECUTE yetkilerinin kaldırılması
-- (a) PUBLIC + anon — 9 fonksiyonun tamamı
-- ---------------------------------------------
revoke execute on function public.copy_program_tree(uuid, uuid) from public, anon;
revoke execute on function public.create_program_with_weeks(uuid, uuid, uuid, text, text, text, integer, date, jsonb, text) from public, anon;
revoke execute on function public.get_athlete_programs(uuid) from public, anon;
revoke execute on function public.insert_sessions_tree(uuid, jsonb) from public, anon;
revoke execute on function public.is_super_admin() from public, anon;
revoke execute on function public.my_role(uuid) from public, anon;
revoke execute on function public.my_team_id(uuid) from public, anon;
revoke execute on function public.propagate_week_to_future(uuid) from public, anon;
revoke execute on function public.update_program_week(uuid, text, text, text, date, date, jsonb, text) from public, anon;

-- (b) authenticated — YALNIZCA copy_program_tree.
-- my_role/my_team_id/is_super_admin, create_program_with_weeks,
-- insert_sessions_tree, update_program_week, propagate_week_to_future,
-- get_athlete_programs → authenticated KORUNUYOR (dokunulmadı).
-- ---------------------------------------------
revoke execute on function public.copy_program_tree(uuid, uuid) from authenticated;
