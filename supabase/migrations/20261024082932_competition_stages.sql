-- 20261024082932_competition_stages.sql — yarışma aşamaları (cimnastik / FIG yapısı)
--
-- Cimnastikte sporcular önce Qualification'da yarışır; finale kalırlarsa AYNI
-- yarışmanın Apparatus / Team / All-Around finallerinde de yarışır. Bugüne kadar
-- koçlar bunu iki ayrı yarışma olarak giriyordu ("TÜRKİYE ŞAMPİYONASI-ELEME" 8 Tem +
-- "TÜRKİYE ŞAMPİYONASI-FİNAL" 10 Tem) — kadro ve sonuçlar iki kayda bölünüyordu.
--
-- 1) competition_stages: yarışmada hangi aşamaların olduğu + her aşamanın günü
--    (stage_date NULL = yarışma tarihiyle aynı gün). Yarışma başına her aşama
--    en fazla bir kez.
-- 2) competition_entries.stages: kayıtlı sporcunun yarıştığı aşamalar. Boş dizi
--    = aşama kavramı kullanılmıyor (cimnastik dışı yarışmalar, eski kayıtlar —
--    davranış DEĞİŞMEZ).
--
-- Değer listesi packages/validators/competition.ts (COMPETITION_STAGES) ile
-- birebir aynıdır; biri değişirse diğeri de değişmelidir.
-- RLS: competition_entries (comp_entries_select / comp_entries_write) ile birebir.
-- =============================================

create table competition_stages (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete cascade not null,
  stage          text not null
                 check (stage in ('qualification', 'apparatus_final', 'team_final', 'all_around_final')),
  stage_date     date,
  created_at     timestamptz default now(),
  unique (competition_id, stage)
);

create index idx_comp_stages_competition_id on competition_stages(competition_id);

alter table competition_stages enable row level security;

create policy "comp_stages_select" on competition_stages for select using (
  is_super_admin()
  or exists (
    select 1 from competitions c
    join memberships m on m.org_id = c.org_id
    where c.id = competition_stages.competition_id and m.user_id = auth.uid()
  )
  or exists (
    select 1 from competition_entries e
    join athletes a on a.id = e.athlete_id
    where e.competition_id = competition_stages.competition_id and a.user_id = auth.uid()
  )
);

create policy "comp_stages_write" on competition_stages for all using (
  is_super_admin()
  or exists (
    select 1 from competitions c
    where c.id = competition_stages.competition_id
    and (my_role(c.org_id) = 'admin' or my_role(c.org_id) = 'coach')
  )
);

alter table competition_entries
  add column stages text[] not null default '{}'
  constraint competition_entries_stages_check
    check (stages <@ array['qualification', 'apparatus_final', 'team_final', 'all_around_final']::text[]);

comment on table competition_stages is
  'Yarışmanın aşamaları (cimnastik: qualification / apparatus_final / team_final / all_around_final) ve her aşamanın günü; stage_date NULL ise yarışma tarihi.';
comment on column competition_entries.stages is
  'Sporcunun yarıştığı aşamalar (competition_stages.stage değerleri). Boş = yarışmada aşama kavramı kullanılmıyor.';
