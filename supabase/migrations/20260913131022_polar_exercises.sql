-- =============================================
-- 20260913131022_polar_exercises.sql
-- =============================================
-- Koç/admin ve sporcunun kendi Polar bağlantısından çekilen tekil antrenman
-- (exercise) kayıtları. whoop_workouts ile aynı amaca hizmet eder ama alan
-- adları Polar AccessLink v4 exercise şemasına göre (calories, training_load,
-- distance_meter — WHOOP'un kilojoule/strain yerine).
-- Senkron manuel "Senkronize Et" butonuyla tetiklenir (Polar'da webhook yok) —
-- transaction lifecycle (aç→listele→commit) ile çekilir, bkz.
-- packages/integrations/polar/transaction.ts.

create table polar_exercises (
  id                uuid primary key default gen_random_uuid(),
  athlete_id        uuid references athletes(id) on delete cascade not null,
  polar_exercise_id text unique not null,
  sport             text,
  start_time        timestamptz not null,
  duration_sec      integer,
  calories          integer,
  distance_meter    numeric,
  avg_hr            integer,
  max_hr            integer,
  training_load     numeric,
  raw_data          jsonb,
  created_at        timestamptz default now() not null
);

create index idx_polar_exercises_athlete_id on polar_exercises(athlete_id);
create index idx_polar_exercises_start_time on polar_exercises(start_time);

alter table polar_exercises enable row level security;

-- whoop_workouts_select (20260913123732_whoop_workouts.sql) ile birebir aynı kalıp
create policy "polar_exercises_select" on polar_exercises for select using (
  is_super_admin()
  or exists (
    select 1 from athletes a
    where a.id = athlete_id
    and (
      a.user_id = auth.uid()
      or my_role(a.org_id) = 'admin'
      or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id))
    )
  )
);

create policy "polar_exercises_insert" on polar_exercises for insert with check (
  is_super_admin()
);
