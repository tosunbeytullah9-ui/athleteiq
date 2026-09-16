-- =============================================
-- 20260913201909_fitbit_activities.sql
-- =============================================
-- Üçüncü wearable provider: Fitbit. wearable_connections/wearable_daily_metrics
-- provider check constraint'lerine 'fitbit' eklenir. whoop_workouts/polar_exercises
-- ile aynı amaca hizmet eden fitbit_activities tablosu — Fitbit Activity Log
-- (GET /1/user/-/activities/list.json) kayıtlarını tutar. Senkron manuel
-- "Senkronize Et" butonuyla tetiklenir (Fitbit'in gerçek webhook desteği —
-- Subscriptions API— var ama bilinçli olarak ertelendi, bkz. CLAUDE.md).

alter table wearable_connections drop constraint wearable_connections_provider_check;
alter table wearable_connections add constraint wearable_connections_provider_check
  check (provider in ('whoop', 'polar', 'fitbit'));

alter table wearable_daily_metrics drop constraint wearable_daily_metrics_provider_check;
alter table wearable_daily_metrics add constraint wearable_daily_metrics_provider_check
  check (provider in ('whoop', 'polar', 'fitbit'));

create table fitbit_activities (
  id                uuid primary key default gen_random_uuid(),
  athlete_id        uuid references athletes(id) on delete cascade not null,
  fitbit_log_id     text unique not null,
  activity_name     text,
  start_time        timestamptz not null,
  duration_sec      integer,
  calories          integer,
  avg_hr            integer,
  distance_meter    numeric,
  raw_data          jsonb,
  created_at        timestamptz default now() not null
);

create index idx_fitbit_activities_athlete_id on fitbit_activities(athlete_id);
create index idx_fitbit_activities_start_time on fitbit_activities(start_time);

alter table fitbit_activities enable row level security;

-- whoop_workouts_select / polar_exercises_select ile birebir aynı kalıp
create policy "fitbit_activities_select" on fitbit_activities for select using (
  is_super_admin()
  or exists (
    select 1 from athletes a where a.id = athlete_id
    and (a.user_id = auth.uid() or my_role(a.org_id) = 'admin'
         or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id)))
  )
);

create policy "fitbit_activities_insert" on fitbit_activities for insert with check (
  is_super_admin()
);
