-- =============================================
-- 20260913123732_whoop_workouts.sql
-- =============================================
-- Koç/admin tarafında gün içinde WHOOP'ta başlatılan her tekil antrenmanın
-- (workout) ayrı ayrı görülebilmesi için — whoop_cycles günlük tek strain
-- agregatını tutar, bu tablo gün içindeki BİRDEN FAZLA workout'u tutar.
-- Senkron event-bazlı ve tekil: whoop-webhook her workout.updated event'inde
-- yalnızca o event'in ID'sini GET /v2/activity/workout/{id} ile çeker
-- (geçmiş/backfill senkronu bilinçli olarak kapsam dışı).

create table whoop_workouts (
  id                  uuid primary key default gen_random_uuid(),
  athlete_id          uuid references athletes(id) on delete cascade not null,
  whoop_workout_id    text unique not null,
  sport_name          text,
  start_time          timestamptz not null,
  end_time            timestamptz,
  strain_score        numeric,
  avg_hr              integer,
  max_hr              integer,
  kilojoules          numeric,
  distance_meter      numeric,
  altitude_gain_meter numeric,
  percent_recorded    numeric,
  raw_data            jsonb,
  created_at          timestamptz default now() not null
);

create index idx_whoop_workouts_athlete_id on whoop_workouts(athlete_id);
create index idx_whoop_workouts_start_time on whoop_workouts(start_time);

alter table whoop_workouts enable row level security;

-- wearable_metrics_select (004_wearables.sql) ile birebir aynı kalıp
create policy "whoop_workouts_select" on whoop_workouts for select using (
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

-- wearable_metrics_insert ile aynı kalıp (yalnızca service-role/webhook yazar)
create policy "whoop_workouts_insert" on whoop_workouts for insert with check (
  is_super_admin()
);
