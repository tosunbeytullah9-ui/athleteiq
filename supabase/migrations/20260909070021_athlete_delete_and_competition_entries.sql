-- =============================================
-- 044_athlete_delete_and_competition_entries.sql
--
-- 1) athletes_delete: 002_rls.sql'de athletes_select/insert/update var ama
--    delete politikası hiç yoktu (varsayılan-deny) — sporcu silme UI'dan
--    hiç bağlanmamıştı (bkz. BUGS.md/PROGRESS.md ilgili bulgu). athletes_update
--    ile birebir aynı yetki kalıbı: admin org geneli, coach yalnızca kendi takımı.
--    UI tarafında hard-delete yalnızca hiçbir bağlı kayıt (program/ACWR/test/
--    yarışma sonucu/1RM/wellness/yoklama) ve giriş erişimi olmayan sporcular
--    için sunulacak; aksi halde is_active=false (zaten izinli UPDATE) kullanılacak.
--
-- 2) competition_entries: "hangi sporcu hangi yarışmaya gidiyor" — competitions
--    tablosundaki team_id yalnızca gevşek bir ilişkilendirmeydi, bireysel
--    katılım/dışlama hiç modellenmemişti. competition_results (SONUÇ, yarışma
--    SONRASI) ile karıştırılmasın — bu tablo KAYIT/ROSTER, yarışma ÖNCESİ.
-- =============================================

create policy "athletes_delete" on athletes for delete using (
  is_super_admin()
  or my_role(org_id) = 'admin'
  or (my_role(org_id) = 'coach' and team_id = my_team_id(org_id))
);

create table competition_entries (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete cascade not null,
  athlete_id     uuid references athletes(id) on delete cascade not null,
  notes          text,
  created_at     timestamptz default now(),
  unique (competition_id, athlete_id)
);

create index idx_comp_entries_competition_id on competition_entries(competition_id);
create index idx_comp_entries_athlete_id on competition_entries(athlete_id);

alter table competition_entries enable row level security;

-- SELECT — comp_results_select (002_rls.sql) ile birebir aynı kalıp: org
-- üyeliği olan herkes (admin/coach/athlete) görebilir. Athlete-self dalı,
-- memberships satırı bir şekilde eksik kalmış eski hesaplar için savunma amaçlı.
create policy "comp_entries_select" on competition_entries for select using (
  is_super_admin()
  or exists (
    select 1 from competitions c
    join memberships m on m.org_id = c.org_id
    where c.id = competition_entries.competition_id and m.user_id = auth.uid()
  )
  or exists (
    select 1 from athletes a
    where a.id = competition_entries.athlete_id and a.user_id = auth.uid()
  )
);

-- WRITE — comp_results_write ile birebir aynı kalıp: org'daki admin/coach
-- (team-scoped değil — competitions_write de team-scoped değil, tutarlı).
create policy "comp_entries_write" on competition_entries for all using (
  is_super_admin()
  or exists (
    select 1 from competitions c
    where c.id = competition_entries.competition_id
    and (my_role(c.org_id) = 'admin' or my_role(c.org_id) = 'coach')
  )
);
