-- =============================================
-- 029_program_archive.sql — Program arşivleme (Parti 12, Görev 2)
--
-- training_programs'a is_archived kolonu eklenir. Yayınlanmamış programlar
-- kalıcı silinir (cascade zaten hazır — training_sessions/exercises/
-- exercise_sets), yayındaki programlar bunun yerine arşivlenir. get_athlete_programs
-- (009_security_fixes.sql'deki güncel tanım) arşivlenmiş programları artık
-- döndürmemeli — aksi halde sporcu mobilde görmeye devam eder.
-- =============================================

alter table training_programs
  add column is_archived boolean not null default false;

create index idx_training_programs_active
  on training_programs (org_id, is_archived) where is_archived = false;

create or replace function get_athlete_programs(p_athlete_id uuid)
returns setof public.training_programs
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.training_programs p
  join public.athletes a on a.id = p_athlete_id
  where (p.athlete_id = p_athlete_id or p.team_id = a.team_id)
    and p.is_published = true
    and p.is_archived = false
  order by p.start_date desc nulls last;
$$;
