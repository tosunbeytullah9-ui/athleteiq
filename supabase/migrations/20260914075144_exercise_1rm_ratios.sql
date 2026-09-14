-- Egzersizler arası 1RM oran ilişkileri (örn. Front Squat = Back Squat * 0.85).
-- Platform geneli, super admin panelinden yönetilir — platform_exercises ile
-- birebir aynı RLS deseni (028_platform_exercises_admin_rls.sql).
create table exercise_1rm_ratios (
  id uuid primary key default gen_random_uuid(),
  exercise_name text not null,
  base_exercise_name text not null,
  ratio numeric not null check (ratio > 0),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bir türetilen egzersizin yalnızca tek bir temel ilişkisi olabilir (belirsizlik olmasın).
create unique index exercise_1rm_ratios_exercise_name_idx
  on exercise_1rm_ratios (lower(trim(exercise_name)));

alter table exercise_1rm_ratios enable row level security;

create policy "exercise_1rm_ratios_select" on exercise_1rm_ratios for select using (true);
create policy "exercise_1rm_ratios_insert" on exercise_1rm_ratios for insert with check (is_super_admin());
create policy "exercise_1rm_ratios_update" on exercise_1rm_ratios for update using (is_super_admin());
create policy "exercise_1rm_ratios_delete" on exercise_1rm_ratios for delete using (is_super_admin());

create trigger exercise_1rm_ratios_updated_at before update on exercise_1rm_ratios
  for each row execute function update_updated_at();

insert into exercise_1rm_ratios (exercise_name, base_exercise_name, ratio, notes) values
  ('Front Squat', 'Back Squat', 0.85, 'Yaygın literatür tahmini, ~%80-90 aralığı'),
  ('Push Press', 'Overhead Press', 1.15, 'Bacak itmesiyle ~%10-20 daha fazla yük'),
  ('Sumo Deadlift', 'Deadlift', 1.05, 'Kaldıraç avantajıyla hafif daha yüksek'),
  ('Romanian Deadlift', 'Deadlift', 0.80, 'Kısmi ROM, konsantrik patlama yok'),
  ('Incline Bench Press', 'Bench Press', 0.85, 'Omuz açısı nedeniyle ~%10-15 daha düşük');
