-- =============================================
-- 043_training_groups.sql — Training Groups (2026-09-05, PROGRESS.md Öncelik 2)
--
-- Takım içi pozisyon bazlı alt gruplama (örn. Amerikan futbolu: Linemen/Skill).
-- `athletes.position` (001_schema.sql) ile KARIŞTIRILMASIN — position serbest
-- metin branş/pozisyon etiketi (bkz. add-athlete-modal.tsx placeholder "Artistik
-- Jimnastik"), görünürlüğe hiç etkisi yok. `training_programs.discipline`
-- (030_program_discipline.sql) ile de KARIŞTIRILMASIN — o da salt mobil sekme
-- etiketi, RLS'e hiç girmiyor. training_group ise GERÇEKTEN daraltıyor: bir takım
-- programına grup atanırsa, o grupta OLMAYAN takım sporcuları published görünümde
-- artık görmüyor (coach/admin dalları etkilenmiyor — onlar zaten tüm takımı görür).
--
-- training_group is null or team_id is not null CHECK: athlete-scope'lu bir
-- programda grup daraltmasının hiçbir anlamı yok (zaten tek sporcuya atanmış).
-- =============================================

alter table athletes add column training_group text;

alter table training_programs add column training_group text;

alter table training_programs
  add constraint training_programs_training_group_scope_check
  check (training_group is null or team_id is not null);

-- ---------------------------------------------
-- 1) create_program_with_weeks — p_training_group eklendi (discipline'ın
-- 030'daki deseniyle birebir aynı: mevcut gövde CANLIDA pg_get_functiondef ile
-- doğrulandı, 030 dosyasıyla birebir aynı çıktı).
-- ---------------------------------------------
drop function if exists create_program_with_weeks(uuid, uuid, uuid, text, text, text, int, date, jsonb, text);

create or replace function create_program_with_weeks(
  p_org_id           uuid,
  p_team_id          uuid,
  p_athlete_id       uuid,
  p_title            text,
  p_phase            text,
  p_notes            text,
  p_weeks_count      int,
  p_block_start_date date,
  p_sessions         jsonb,
  p_discipline       text default null,
  p_training_group   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_block_id     uuid;
  v_program_id   uuid;
  v_program_ids  uuid[] := '{}';
  v_week_start   date;
  v_week_end     date;
  v_week_number  int;
begin
  if not coalesce(
    public.is_super_admin()
    or public.my_role(p_org_id) = 'admin'
    or public.my_role(p_org_id) = 'coach',
    false
  ) then
    raise exception 'yetkisiz';
  end if;

  if not coalesce(public.is_super_admin() or public.my_role(p_org_id) = 'admin', false) then
    if not coalesce(
      p_team_id = public.my_team_id(p_org_id)
      or exists (
        select 1 from public.athletes a2
        where a2.id = p_athlete_id
        and a2.team_id = public.my_team_id(p_org_id)
      ),
      false
    ) then
      raise exception 'Bu sporcu sizin takımınızda değil';
    end if;
  end if;

  if not (
    (p_team_id is not null and p_athlete_id is null) or
    (p_athlete_id is not null and p_team_id is null)
  ) then
    raise exception 'p_team_id ve p_athlete_id''den tam olarak biri dolu olmalı';
  end if;

  if p_weeks_count < 1 then
    raise exception 'p_weeks_count >= 1 olmalı';
  end if;

  if p_training_group is not null and p_team_id is null then
    raise exception 'p_training_group yalnızca p_team_id doluyken kullanılabilir';
  end if;

  if p_weeks_count > 1 then
    insert into public.program_blocks (
      org_id, team_id, athlete_id, created_by, title, total_weeks, phase, notes
    )
    values (
      p_org_id, p_team_id, p_athlete_id, auth.uid(), p_title, p_weeks_count, p_phase, p_notes
    )
    returning id into v_block_id;
  else
    v_block_id := null;
  end if;

  for i in 1..p_weeks_count loop
    v_week_start  := p_block_start_date + ((i - 1) * 7);
    v_week_end    := v_week_start + 6;
    v_week_number := to_char(v_week_start, 'IW')::int;

    insert into public.training_programs (
      org_id, team_id, athlete_id, created_by, title, week_number,
      start_date, end_date, phase, notes, discipline, training_group, is_published,
      block_id, week_index_in_block
    )
    values (
      p_org_id, p_team_id, p_athlete_id, auth.uid(), p_title, v_week_number,
      v_week_start, v_week_end, p_phase, p_notes, p_discipline, p_training_group, false,
      case when p_weeks_count > 1 then v_block_id else null end,
      case when p_weeks_count > 1 then i else null end
    )
    returning id into v_program_id;

    v_program_ids := array_append(v_program_ids, v_program_id);

    perform public.insert_sessions_tree(v_program_id, p_sessions);
  end loop;

  return jsonb_build_object('block_id', v_block_id, 'program_ids', to_jsonb(v_program_ids));
end;
$$;

-- ---------------------------------------------
-- 2) update_program_week — p_training_group eklendi
-- ---------------------------------------------
drop function if exists update_program_week(uuid, text, text, text, date, date, jsonb, text);

create or replace function update_program_week(
  p_program_id       uuid,
  p_title            text,
  p_phase            text,
  p_notes            text,
  p_start_date       date,
  p_end_date         date,
  p_sessions         jsonb,
  p_discipline       text default null,
  p_training_group   text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id      uuid;
  v_team_id     uuid;
  v_athlete_id  uuid;
  v_week_number int;
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

  if p_training_group is not null and v_team_id is null then
    raise exception 'p_training_group yalnızca takım programlarında kullanılabilir';
  end if;

  v_week_number := to_char(p_start_date, 'IW')::int;

  update public.training_programs
  set
    title          = p_title,
    phase          = p_phase,
    notes          = p_notes,
    discipline     = p_discipline,
    training_group = p_training_group,
    start_date     = p_start_date,
    end_date       = p_end_date,
    week_number    = v_week_number,
    updated_at     = now()
  where id = p_program_id;

  delete from public.training_sessions where program_id = p_program_id;

  perform public.insert_sessions_tree(p_program_id, p_sessions);
end;
$$;

-- ---------------------------------------------
-- 3) RLS daraltma — programs_select / sessions_select / exercises_select /
-- exercise_sets_select (025_team_scoped_training_rls.sql'deki GÜNCEL gövde,
-- canlıda pg_policies ile doğrulandı, birebir aynı). Coach/admin dalları
-- DOKUNULMADI — yalnızca sporcu-published-görüş dalına grup eşleşmesi eklendi.
-- ---------------------------------------------
alter policy "programs_select" on training_programs using (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin'
    or (
      my_role(org_id) = 'coach'
      and (
        team_id = my_team_id(org_id)
        or exists (
          select 1 from athletes a2
          where a2.id = training_programs.athlete_id
          and a2.team_id = my_team_id(org_id)
        )
      )
    )
    or (
      exists (
        select 1 from athletes a
        where a.user_id = auth.uid()
        and (
          a.id = athlete_id
          or (
            a.team_id = training_programs.team_id
            and (training_programs.training_group is null or a.training_group = training_programs.training_group)
          )
        )
      )
      and is_published = true
    ),
    false
  )
);

alter policy "sessions_select" on training_sessions using (
  coalesce(
    exists (
      select 1 from training_programs p
      where p.id = program_id
      and (
        is_super_admin()
        or my_role(p.org_id) = 'admin'
        or (
          my_role(p.org_id) = 'coach'
          and (
            p.team_id = my_team_id(p.org_id)
            or exists (
              select 1 from athletes a2
              where a2.id = p.athlete_id
              and a2.team_id = my_team_id(p.org_id)
            )
          )
        )
        or (
          exists (
            select 1 from athletes a
            where a.user_id = auth.uid()
            and (
              a.id = p.athlete_id
              or (
                a.team_id = p.team_id
                and (p.training_group is null or a.training_group = p.training_group)
              )
            )
          )
          and p.is_published = true
        )
      )
    ),
    false
  )
);

alter policy "exercises_select" on exercises using (
  coalesce(
    exists (
      select 1 from training_sessions s
      join training_programs p on p.id = s.program_id
      where s.id = exercises.session_id
      and (
        is_super_admin()
        or my_role(p.org_id) = 'admin'
        or (
          my_role(p.org_id) = 'coach'
          and (
            p.team_id = my_team_id(p.org_id)
            or exists (
              select 1 from athletes a2
              where a2.id = p.athlete_id
              and a2.team_id = my_team_id(p.org_id)
            )
          )
        )
        or (
          exists (
            select 1 from athletes a
            where a.user_id = auth.uid()
            and (
              a.id = p.athlete_id
              or (
                a.team_id = p.team_id
                and (p.training_group is null or a.training_group = p.training_group)
              )
            )
          )
          and p.is_published = true
        )
      )
    ),
    false
  )
);

alter policy "exercise_sets_select" on exercise_sets using (
  coalesce(
    exists (
      select 1 from exercises e
      join training_sessions s on s.id = e.session_id
      join training_programs p on p.id = s.program_id
      where e.id = exercise_sets.exercise_id
      and (
        is_super_admin()
        or my_role(p.org_id) = 'admin'
        or (
          my_role(p.org_id) = 'coach'
          and (
            p.team_id = my_team_id(p.org_id)
            or exists (
              select 1 from athletes a2
              where a2.id = p.athlete_id
              and a2.team_id = my_team_id(p.org_id)
            )
          )
        )
        or (
          exists (
            select 1 from athletes a
            where a.user_id = auth.uid()
            and (
              a.id = p.athlete_id
              or (
                a.team_id = p.team_id
                and (p.training_group is null or a.training_group = p.training_group)
              )
            )
          )
          and p.is_published = true
        )
      )
    ),
    false
  )
);
