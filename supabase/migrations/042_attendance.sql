-- =============================================
-- 042_attendance.sql — Attendance (Yoklama) sistemi (2026-09-05, PROGRESS.md Öncelik 2)
--
-- Takım/tarih bazlı yoklama: coach kendi takımını, admin org genelini görür/yazar.
-- Sporcu görünürlüğü BİLEREK kapsam dışı bırakıldı (istekte geçmiyor) — athletes_select
-- (002_rls.sql) ile aynı takım-bazlı desen, yalnızca sporcu-self dalı olmadan.
-- coalesce(..., false) 025_team_scoped_training_rls.sql'deki konvansiyonla tutarlılık
-- için eklendi (RLS USING'te NULL zaten fail-closed, ama proje genelinde açıklık için).
-- =============================================

create table attendance_records (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organizations(id) on delete cascade not null,
  team_id      uuid references teams(id) on delete cascade not null,
  athlete_id   uuid references athletes(id) on delete cascade not null,
  session_date date not null,
  status       text check (status in ('present', 'late', 'excused', 'absent')) not null,
  notes        text,
  recorded_by  uuid references auth.users(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (athlete_id, session_date)
);

create index idx_attendance_org_id on attendance_records(org_id);
create index idx_attendance_team_id on attendance_records(team_id);
create index idx_attendance_athlete_id on attendance_records(athlete_id);
create index idx_attendance_session_date on attendance_records(session_date);

create trigger attendance_records_updated_at
  before update on attendance_records
  for each row execute function update_updated_at();

alter table attendance_records enable row level security;

create policy "attendance_select" on attendance_records for select using (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin'
    or (my_role(org_id) = 'coach' and team_id = my_team_id(org_id)),
    false
  )
);

create policy "attendance_write" on attendance_records for all using (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin'
    or (my_role(org_id) = 'coach' and team_id = my_team_id(org_id)),
    false
  )
) with check (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin'
    or (my_role(org_id) = 'coach' and team_id = my_team_id(org_id)),
    false
  )
);
