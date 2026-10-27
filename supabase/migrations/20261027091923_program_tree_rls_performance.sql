-- =============================================================================
-- Parti 18P — program ağacı RLS performansı
-- =============================================================================
-- Sorun (Parti 18D canlı testi): sporcunun gün ekranı (training_sessions →
-- exercises → exercise_sets) 1–3 sn, en uzun 12 sn, ara sıra statement timeout.
-- Kök neden üç katmanlı:
--   1. İç içe RLS: exercise_sets_select → exercises + training_sessions +
--      training_programs EXISTS'i; alt sorgudaki her tablo KENDİ RLS'ini de
--      uyguluyordu (4 kat derinlik, sporcu gün sorgusunda 184 SubPlan).
--   2. is_super_admin()/my_role()/my_team_id()/auth.uid() satır başına çağrılıyordu.
--   3. FOR ALL *_write politikaları SELECT'te de *_select ile OR'lanıyordu.
--
-- Yeni desen: erişim mantığı TEK yerde, SECURITY DEFINER küme fonksiyonlarında.
-- Politikalar `col in (select f())` ile kümeyi bir kez (hashed subplan) hesaplar.
-- SECURITY DEFINER fonksiyonlar inline edilmez → her biri sorgu başına tam bir kez
-- çalışır; içerideki tablolara RLS uygulanmaz → zincir kırılır.
--
-- GÖRÜNÜRLÜK SEMANTİĞİ DEĞİŞMEZ. Fonksiyon gövdeleri eski politikaların birebir
-- karşılığıdır:
--   * my_role(org)/my_team_id(org) = memberships'te (user_id, org_id) tek satır
--     (UNIQUE memberships_user_id_org_id_key) → "my" CTE'si aynı değeri verir.
--   * Eski politikalarda athletes alt sorgusuna athletes RLS'i de uygulanıyordu;
--     definer fonksiyonda RLS yok, bu yüzden koç→bireysel sporcu dalına
--     athletes_select'in o daldaki karşılığı ((admin|coach) üyeliği VEYA kendi
--     satırı) AÇIKÇA eklendi. Sporcu dalında (a.user_id = auth.uid()) athletes RLS
--     zaten her zaman geçer.
--   * programs_* koç dalı sporcunun org'unu kullanır: my_team_id(a2.org_id) —
--     birebir korundu. Eski sessions/exercises/exercise_sets politikaları aynı dalda
--     my_team_id(p.org_id) kullanıyordu ve iç içe programs RLS'iyle kesişiyordu; iki
--     ifade program.org_id = athlete.org_id iken aynıdır (canlıda uyuşmazlık 0).
-- Eşdeğerlik scripts/security/rls-visibility-snapshot.mjs ile önce/sonra kanıtlanır.
--
-- §4.1: tüm fonksiyonlar set search_path = '' + public. nitelemesi. RLS içinden
-- çağrıldıkları için authenticated EXECUTE KALIR (my_role/my_team_id istisnası
-- gerekçesi); anon/PUBLIC EXECUTE yok. Döndürdükleri id'ler çağıranın zaten
-- okuyabildiği/yazabildiği satırlardır — RPC olarak çağrılmaları yeni bilgi açmaz.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Okuma kümeleri
-- -----------------------------------------------------------------------------

-- Eski programs_select'in birebir karşılığı: süper admin her şey; admin org geneli;
-- koç kendi takım programları + kendi takımındaki sporcuların bireysel programları
-- (yayınlanmamışlar dahil); sporcu kendi bireysel programları + takım programları
-- (matches_training_group), YALNIZCA yayınlanmışlar.
create or replace function public.readable_program_ids()
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
  ),
  mine as materialized (
    select a.id, a.team_id, a.training_group, a."position"
    from public.athletes a
    where a.user_id = (select uid from me)
  )
  select p.id
  from public.training_programs p
  where coalesce(
    (select sa from me)
    or exists (select 1 from my where my.org_id = p.org_id and my.role = 'admin')
    or exists (
      select 1 from my
      where my.org_id = p.org_id
        and my.role = 'coach'
        and (
          p.team_id = my.team_id
          or exists (
            select 1
            from public.athletes a2
            join my m2 on m2.org_id = a2.org_id
            where a2.id = p.athlete_id
              and a2.team_id = m2.team_id
              and (m2.role in ('admin', 'coach') or a2.user_id = (select uid from me))
          )
        )
    )
    or (
      p.is_published = true
      and exists (
        select 1 from mine a
        where a.id = p.athlete_id
           or (a.team_id = p.team_id
               and public.matches_training_group(a.training_group, a."position", p.training_group))
      )
    ),
    false
  );
$$;

create or replace function public.readable_session_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.training_sessions s
  where s.program_id in (select public.readable_program_ids());
$$;

create or replace function public.readable_exercise_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.exercises e
  join public.training_sessions s on s.id = e.session_id
  where s.program_id in (select public.readable_program_ids());
$$;

-- -----------------------------------------------------------------------------
-- 2. Yazma kümeleri — eski *_write (FOR ALL) politikalarının personel dalları
-- -----------------------------------------------------------------------------

-- Satır koşulu: INSERT WITH CHECK ve UPDATE WITH CHECK için (eklenen/güncellenen
-- satır henüz id kümesinde değil ya da kapsamı değişiyor). programs_write'ın
-- birebir karşılığı; koç dalı sporcunun org'u ile: my_team_id(a2.org_id).
create or replace function public.can_write_program(p_org_id uuid, p_team_id uuid, p_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.is_super_admin()
    or public.my_role(p_org_id) = 'admin'
    or (
      public.my_role(p_org_id) = 'coach'
      and (
        p_team_id = public.my_team_id(p_org_id)
        or exists (
          select 1 from public.athletes a2
          where a2.id = p_athlete_id
            and a2.team_id = public.my_team_id(a2.org_id)
            -- eski politikada a2'ye uygulanan athletes RLS'inin bu daldaki karşılığı
            and (public.my_role(a2.org_id) in ('admin', 'coach') or a2.user_id = auth.uid())
        )
      )
    ),
    false
  );
$$;

create or replace function public.writable_program_ids()
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
  select p.id
  from public.training_programs p
  where coalesce(
    (select sa from me)
    or exists (select 1 from my where my.org_id = p.org_id and my.role = 'admin')
    or exists (
      select 1 from my
      where my.org_id = p.org_id
        and my.role = 'coach'
        and (
          p.team_id = my.team_id
          or exists (
            select 1
            from public.athletes a2
            join my m2 on m2.org_id = a2.org_id
            where a2.id = p.athlete_id
              and a2.team_id = m2.team_id
              and (m2.role in ('admin', 'coach') or a2.user_id = (select uid from me))
          )
        )
    ),
    false
  );
$$;

create or replace function public.writable_session_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.training_sessions s
  where s.program_id in (select public.writable_program_ids());
$$;

create or replace function public.writable_exercise_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.exercises e
  join public.training_sessions s on s.id = e.session_id
  where s.program_id in (select public.writable_program_ids());
$$;

revoke execute on function public.readable_program_ids() from public, anon;
revoke execute on function public.readable_session_ids() from public, anon;
revoke execute on function public.readable_exercise_ids() from public, anon;
revoke execute on function public.can_write_program(uuid, uuid, uuid) from public, anon;
revoke execute on function public.writable_program_ids() from public, anon;
revoke execute on function public.writable_session_ids() from public, anon;
revoke execute on function public.writable_exercise_ids() from public, anon;
grant execute on function public.readable_program_ids() to authenticated;
grant execute on function public.readable_session_ids() to authenticated;
grant execute on function public.readable_exercise_ids() to authenticated;
grant execute on function public.can_write_program(uuid, uuid, uuid) to authenticated;
grant execute on function public.writable_program_ids() to authenticated;
grant execute on function public.writable_session_ids() to authenticated;
grant execute on function public.writable_exercise_ids() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Politikalar — SELECT tek politika; FOR ALL write → INSERT/UPDATE/DELETE
-- -----------------------------------------------------------------------------
-- Eski write politikalarında with_check yoktu → qual hem USING hem WITH CHECK'ti.
-- Yeni UPDATE politikalarında WITH CHECK açıkça yazıldı (ebeveyni başka bir
-- programa/seansa taşıyan UPDATE de kontrol edilir — eskisiyle aynı).

-- training_programs
drop policy if exists "programs_select" on public.training_programs;
drop policy if exists "programs_write" on public.training_programs;

create policy "programs_select" on public.training_programs
  for select using (coalesce(id in (select public.readable_program_ids()), false));
create policy "programs_insert" on public.training_programs
  for insert with check (public.can_write_program(org_id, team_id, athlete_id));
create policy "programs_update" on public.training_programs
  for update
  using (id in (select public.writable_program_ids()))
  with check (public.can_write_program(org_id, team_id, athlete_id));
create policy "programs_delete" on public.training_programs
  for delete using (id in (select public.writable_program_ids()));

-- training_sessions
drop policy if exists "sessions_select" on public.training_sessions;
drop policy if exists "sessions_write" on public.training_sessions;

create policy "sessions_select" on public.training_sessions
  for select using (program_id in (select public.readable_program_ids()));
create policy "sessions_insert" on public.training_sessions
  for insert with check (program_id in (select public.writable_program_ids()));
create policy "sessions_update" on public.training_sessions
  for update
  using (program_id in (select public.writable_program_ids()))
  with check (program_id in (select public.writable_program_ids()));
create policy "sessions_delete" on public.training_sessions
  for delete using (program_id in (select public.writable_program_ids()));

-- exercises
drop policy if exists "exercises_select" on public.exercises;
drop policy if exists "exercises_write" on public.exercises;

create policy "exercises_select" on public.exercises
  for select using (session_id in (select public.readable_session_ids()));
create policy "exercises_insert" on public.exercises
  for insert with check (session_id in (select public.writable_session_ids()));
create policy "exercises_update" on public.exercises
  for update
  using (session_id in (select public.writable_session_ids()))
  with check (session_id in (select public.writable_session_ids()));
create policy "exercises_delete" on public.exercises
  for delete using (session_id in (select public.writable_session_ids()));

-- exercise_sets
drop policy if exists "exercise_sets_select" on public.exercise_sets;
drop policy if exists "exercise_sets_write" on public.exercise_sets;

create policy "exercise_sets_select" on public.exercise_sets
  for select using (exercise_id in (select public.readable_exercise_ids()));
create policy "exercise_sets_insert" on public.exercise_sets
  for insert with check (exercise_id in (select public.writable_exercise_ids()));
create policy "exercise_sets_update" on public.exercise_sets
  for update
  using (exercise_id in (select public.writable_exercise_ids()))
  with check (exercise_id in (select public.writable_exercise_ids()));
create policy "exercise_sets_delete" on public.exercise_sets
  for delete using (exercise_id in (select public.writable_exercise_ids()));

-- -----------------------------------------------------------------------------
-- 4. get_athlete_programs — matches_training_group eksiği (Parti 18P, kullanıcı kararı)
-- -----------------------------------------------------------------------------
-- Eski gövde takımın TÜM yayınlanmış programlarını döndürüyordu; RLS ise antrenman
-- grubu eşleşmeyen takım programını sporcuya göstermez. Sonuç: sporcu, kendi grubuna
-- ait olmayan bir programın başlığını sekme olarak görüp seanslarını boş görüyordu;
-- koçun mobil "aktif hafta"sı bu RPC'ye bağlandığında da sporcunun göremediği bir
-- grup programı koçta aktif görünürdü. Yalnızca gövde değişti — imza aynı, grant'ler
-- korunur.
create or replace function public.get_athlete_programs(p_athlete_id uuid)
returns setof public.training_programs
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.training_programs p
  join public.athletes a on a.id = p_athlete_id
  where (
      p.athlete_id = p_athlete_id
      or (p.team_id = a.team_id
          and public.matches_training_group(a.training_group, a."position", p.training_group))
    )
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
