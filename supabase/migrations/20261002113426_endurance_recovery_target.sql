-- =============================================
-- 20261002113426_endurance_recovery_target.sql
--
-- 20261002113316'nın hemen ardından, canlı veriden çıkan bir eksik: koçlar interval'ı
-- "30 sn %80 tempo + 90 sn %50 tempo" diye yazıyor — toparlanma kısmı PASİF
-- dinlenme değil, kendi yoğunluğu olan AKTİF bir toparlanma. Mevcut rest_sec
-- yalnızca süreyi taşıyor; yoğunluğu için segment_recovery_target eklendi
-- (serbest metin: "%50 tempo jog", "yürüyüş", "pasif").
--
-- insert_sessions_tree / copy_program_tree 20261002113316'daki gövdeleriyle BİREBİR,
-- yalnızca bu kolon eklendi.
-- =============================================

alter table exercises add column segment_recovery_target text;

comment on column exercises.segment_recovery_target is
  'Interval bölümünde tekrar arası toparlanmanın yoğunluğu (serbest metin: %50 tempo jog, yürüyüş, pasif). Süresi rest_sec''tedir.';

create or replace function insert_sessions_tree(
  p_program_id uuid,
  p_sessions   jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id       uuid;
  v_team_id      uuid;
  v_athlete_id   uuid;
  v_session_id   uuid;
  v_exercise_id  uuid;
  v_session      jsonb;
  v_exercise     jsonb;
  v_set          jsonb;
begin
  select org_id, team_id, athlete_id
  into v_org_id, v_team_id, v_athlete_id
  from public.training_programs
  where id = p_program_id;

  if v_org_id is null then
    raise exception 'program bulunamadı';
  end if;

  if not coalesce(
    public.is_super_admin()
    or public.my_role(v_org_id) = 'admin'
    or public.my_role(v_org_id) = 'coach',
    false
  ) then
    raise exception 'yetkisiz';
  end if;

  if not coalesce(public.is_super_admin() or public.my_role(v_org_id) = 'admin', false) then
    if not coalesce(
      v_team_id = public.my_team_id(v_org_id)
      or exists (
        select 1 from public.athletes a2
        where a2.id = v_athlete_id
        and a2.team_id = public.my_team_id(v_org_id)
      ),
      false
    ) then
      raise exception 'Bu sporcu sizin takımınızda değil';
    end if;
  end if;

  for v_session in select * from jsonb_array_elements(p_sessions) loop
    insert into public.training_sessions (
      program_id, day_of_week, session_type, title, description,
      duration_min, order_index,
      workout_format, time_cap_sec, rounds, work_sec, interval_rest_sec,
      endurance_modality
    )
    values (
      p_program_id,
      (v_session->>'day_of_week')::int,
      v_session->>'session_type',
      v_session->>'title',
      v_session->>'description',
      (v_session->>'duration_min')::int,
      coalesce((v_session->>'order_index')::int, 0),
      v_session->>'workout_format',
      (v_session->>'time_cap_sec')::int,
      (v_session->>'rounds')::int,
      (v_session->>'work_sec')::int,
      (v_session->>'interval_rest_sec')::int,
      v_session->>'endurance_modality'
    )
    returning id into v_session_id;

    for v_exercise in select * from jsonb_array_elements(coalesce(v_session->'exercises', '[]'::jsonb)) loop
      insert into public.exercises (
        session_id, name, category, superset_group, superset_order,
        order_index, rest_sec, notes, movement_detail,
        segment_type, segment_repeats, segment_distance_m, segment_duration_sec,
        intensity_zone, intensity_target, segment_recovery_target
      )
      values (
        v_session_id,
        v_exercise->>'name',
        v_exercise->>'category',
        v_exercise->>'superset_group',
        coalesce((v_exercise->>'superset_order')::int, 0),
        coalesce((v_exercise->>'order_index')::int, 0),
        (v_exercise->>'rest_sec')::int,
        v_exercise->>'notes',
        v_exercise->>'movement_detail',
        v_exercise->>'segment_type',
        (v_exercise->>'segment_repeats')::int,
        (v_exercise->>'segment_distance_m')::int,
        (v_exercise->>'segment_duration_sec')::int,
        (v_exercise->>'intensity_zone')::smallint,
        v_exercise->>'intensity_target',
        v_exercise->>'segment_recovery_target'
      )
      returning id into v_exercise_id;

      for v_set in select * from jsonb_array_elements(coalesce(v_exercise->'sets', '[]'::jsonb)) loop
        insert into public.exercise_sets (
          exercise_id, set_number, reps, duration_sec, load_kg,
          percent_1rm, rpe, is_bodyweight, band_resistance, notes
        )
        values (
          v_exercise_id,
          (v_set->>'set_number')::int,
          (v_set->>'reps')::int,
          (v_set->>'duration_sec')::int,
          (v_set->>'load_kg')::numeric,
          (v_set->>'percent_1rm')::numeric,
          (v_set->>'rpe')::numeric,
          coalesce((v_set->>'is_bodyweight')::boolean, false),
          v_set->>'band_resistance',
          v_set->>'notes'
        );
      end loop;
    end loop;
  end loop;
end;
$$;

create or replace function copy_program_tree(
  p_source_program_id uuid,
  p_target_program_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session          record;
  v_exercise         record;
  v_set              record;
  v_new_session_id   uuid;
  v_new_exercise_id  uuid;
begin
  for v_session in
    select * from public.training_sessions
    where program_id = p_source_program_id
    order by order_index
  loop
    insert into public.training_sessions (
      program_id, day_of_week, session_type, title, description,
      duration_min, order_index,
      workout_format, time_cap_sec, rounds, work_sec, interval_rest_sec,
      endurance_modality
    )
    values (
      p_target_program_id, v_session.day_of_week, v_session.session_type,
      v_session.title, v_session.description, v_session.duration_min,
      v_session.order_index,
      v_session.workout_format, v_session.time_cap_sec, v_session.rounds,
      v_session.work_sec, v_session.interval_rest_sec,
      v_session.endurance_modality
    )
    returning id into v_new_session_id;

    for v_exercise in
      select * from public.exercises
      where session_id = v_session.id
      order by order_index
    loop
      insert into public.exercises (
        session_id, name, category, superset_group, superset_order,
        order_index, rest_sec, notes, movement_detail,
        segment_type, segment_repeats, segment_distance_m, segment_duration_sec,
        intensity_zone, intensity_target, segment_recovery_target
      )
      values (
        v_new_session_id, v_exercise.name, v_exercise.category,
        v_exercise.superset_group, v_exercise.superset_order,
        v_exercise.order_index, v_exercise.rest_sec, v_exercise.notes,
        v_exercise.movement_detail,
        v_exercise.segment_type, v_exercise.segment_repeats,
        v_exercise.segment_distance_m, v_exercise.segment_duration_sec,
        v_exercise.intensity_zone, v_exercise.intensity_target,
        v_exercise.segment_recovery_target
      )
      returning id into v_new_exercise_id;

      for v_set in
        select * from public.exercise_sets
        where exercise_id = v_exercise.id
        order by set_number
      loop
        insert into public.exercise_sets (
          exercise_id, set_number, reps, duration_sec, load_kg,
          percent_1rm, rpe, is_bodyweight, band_resistance, notes
        )
        values (
          v_new_exercise_id, v_set.set_number, v_set.reps, v_set.duration_sec,
          v_set.load_kg, v_set.percent_1rm, v_set.rpe, v_set.is_bodyweight,
          v_set.band_resistance, v_set.notes
        );
      end loop;
    end loop;
  end loop;
end;
$$;

