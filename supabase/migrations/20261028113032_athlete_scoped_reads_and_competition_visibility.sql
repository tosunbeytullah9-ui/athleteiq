-- =============================================================================
-- Parti 18C-S — RLS takım kapsamı + sporcuya özel yarışma görünürlüğü
-- =============================================================================
-- Gizlilik politikası §5: "Bir sporcunun verilerini yalnızca sporcunun kendisi,
-- kendi takımının antrenörü ve kurumunun yöneticisi görebilir." Bu migration o
-- cümleyi şu tablolarda da DB seviyesinde doğru yapar:
--
--   whoop_cycles / athlete_1rm_records / polar_sync_state
--     SELECT: self OR org admin/coach (tüm koçlar)  →  athletes_select ile aynı küme
--     (süper admin + kendisi + org admin + yalnızca kendi takımının koçu).
--
--   competitions / competition_entries / competition_results / competition_stages
--     SELECT: org üyeliği (sporcular dahil)  →  personel (süper admin, org admin/koç)
--     kurum genelini görmeye devam eder; sporcu yalnızca kayıtlı olduğu / sonucu olan
--     yarışmaları, onların aşamalarını, KENDİ kayıtlarını ve KENDİ sonuçlarını görür.
--
-- Yalnızca SELECT politikaları değişir; *_write (FOR ALL) ve INSERT/UPDATE/DELETE
-- politikalarına dokunulmaz, adlar korunur.
--
-- §4.1 kuralı: politikada başka RLS'li tabloya EXISTS ile inilmez, SECURITY DEFINER
-- küme fonksiyonu kullanılır ve çağrı (select ...) ile sarılır. competitions ↔
-- competition_entries birbirine referans verdiği için definer yardımcılar ayrıca
-- politika özyinelemesini önler.
--
-- Eşdeğerlik varsayımları (canlıda 0 ihlal, 2026-10-28): memberships (user_id, org_id)
-- tekil; bir yarışma kaydının/sonucunun sporcusu yarışmayla aynı org'da.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Yardımcı küme fonksiyonları
-- -----------------------------------------------------------------------------

-- Çağıranın görebildiği sporcular — athletes_select'in birebir karşılığı.
create or replace function public.readable_athlete_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with me as materialized (
    select auth.uid() as uid, coalesce(public.is_super_admin(), false) as sa
  ),
  my as materialized (
    select m.org_id, m.role, m.team_id
    from public.memberships m
    where m.user_id = (select uid from me)
  )
  select a.id
  from public.athletes a
  where coalesce(
    (select sa from me)
    or exists (select 1 from my where my.org_id = a.org_id and my.role = 'admin')
    or exists (
      select 1 from my
      where my.org_id = a.org_id and my.role = 'coach' and a.team_id = my.team_id
    )
    or a.user_id = (select uid from me),
    false
  );
$$;

-- Çağıranın kendi sporcu satır(lar)ı.
create or replace function public.my_athlete_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id
  from public.athletes a
  where coalesce(a.user_id = auth.uid(), false);
$$;

-- Personel olarak görülen yarışmalar: süper admin ise tümü, aksi halde çağıranın
-- admin veya koç olduğu org'lardaki yarışmalar.
create or replace function public.staff_competition_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with me as materialized (
    select auth.uid() as uid, coalesce(public.is_super_admin(), false) as sa
  )
  select c.id
  from public.competitions c
  where coalesce(
    (select sa from me)
    or exists (
      select 1 from public.memberships m
      where m.user_id = (select uid from me)
        and m.org_id = c.org_id
        and m.role in ('admin', 'coach')
    ),
    false
  );
$$;

-- Çağıranın kendi sporcu satır(lar)ının kaydı VEYA sonucu olan yarışmalar.
create or replace function public.own_competition_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.competition_id
  from public.competition_entries e
  join public.athletes a on a.id = e.athlete_id
  where coalesce(a.user_id = auth.uid(), false)
  union
  select r.competition_id
  from public.competition_results r
  join public.athletes a on a.id = r.athlete_id
  where coalesce(a.user_id = auth.uid(), false);
$$;

-- RLS içinden çağrılırlar → authenticated EXECUTE KALIR (§4.1 istisnası);
-- PUBLIC ve anon EXECUTE yok.
revoke execute on function public.readable_athlete_ids() from public, anon;
revoke execute on function public.my_athlete_ids() from public, anon;
revoke execute on function public.staff_competition_ids() from public, anon;
revoke execute on function public.own_competition_ids() from public, anon;
grant execute on function public.readable_athlete_ids() to authenticated;
grant execute on function public.my_athlete_ids() to authenticated;
grant execute on function public.staff_competition_ids() to authenticated;
grant execute on function public.own_competition_ids() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Sporcu verisi — takım kapsamı (+ süper admin dalı)
-- -----------------------------------------------------------------------------
drop policy if exists "whoop_cycles_select" on public.whoop_cycles;
create policy "whoop_cycles_select" on public.whoop_cycles for select using (
  athlete_id in (select public.readable_athlete_ids())
);

drop policy if exists "1rm_select" on public.athlete_1rm_records;
create policy "1rm_select" on public.athlete_1rm_records for select using (
  athlete_id in (select public.readable_athlete_ids())
);

drop policy if exists "polar_sync_select" on public.polar_sync_state;
create policy "polar_sync_select" on public.polar_sync_state for select using (
  athlete_id in (select public.readable_athlete_ids())
);

-- -----------------------------------------------------------------------------
-- 3. Yarışmalar — personel kurum geneli, sporcu yalnızca kendisi
-- -----------------------------------------------------------------------------
drop policy if exists "competitions_select" on public.competitions;
create policy "competitions_select" on public.competitions for select using (
  id in (select public.staff_competition_ids())
  or id in (select public.own_competition_ids())
);

drop policy if exists "comp_entries_select" on public.competition_entries;
create policy "comp_entries_select" on public.competition_entries for select using (
  competition_id in (select public.staff_competition_ids())
  or athlete_id in (select public.my_athlete_ids())
);

drop policy if exists "comp_results_select" on public.competition_results;
create policy "comp_results_select" on public.competition_results for select using (
  competition_id in (select public.staff_competition_ids())
  or athlete_id in (select public.my_athlete_ids())
);

drop policy if exists "comp_stages_select" on public.competition_stages;
create policy "comp_stages_select" on public.competition_stages for select using (
  competition_id in (select public.staff_competition_ids())
  or competition_id in (select public.own_competition_ids())
);
