-- =============================================
-- 030_program_discipline.sql — training_programs'a discipline (branş) kolonu (Parti 13, Görev 1)
--
-- teams.discipline (001_schema.sql) ile birebir aynı desen: nullable, serbest metin,
-- CHECK constraint YOK. Mobilde sekme etiketi olarak kullanılacak (Parti 13, Görev 2).
-- program_blocks'a BİLEREK eklenmiyor — program_blocks zaten kendi title/phase/notes'unu
-- yalnızca oluşturma anında yazıp bir daha senkronlamıyor (017_program_blocks.sql), discipline
-- de aynı ayrışmayı izleyip yalnızca training_programs'ta tutuluyor.
--
-- create_program_with_weeks / update_program_week yeni bir p_discipline parametresi
-- alacak şekilde YENİDEN TANIMLANIYOR. Postgres'te parametre SAYISI değişince
-- "create or replace" gerçek bir replace değil, yeni bir overload yaratır — bu yüzden
-- önce eski imza drop ediliyor, sonra yeni imza create ediliyor (aşağıda her ikisi için).
-- =============================================

alter table training_programs
  add column discipline text;

-- ---------------------------------------------
-- 1) create_program_with_weeks — p_discipline eklendi
-- ---------------------------------------------
drop function if exists create_program_with_weeks(uuid, uuid, uuid, text, text, text, int, date, jsonb);

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
  p_discipline       text default null
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
      start_date, end_date, phase, notes, discipline, is_published,
      block_id, week_index_in_block
    )
    values (
      p_org_id, p_team_id, p_athlete_id, auth.uid(), p_title, v_week_number,
      v_week_start, v_week_end, p_phase, p_notes, p_discipline, false,
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
-- 2) update_program_week — p_discipline eklendi
-- ---------------------------------------------
drop function if exists update_program_week(uuid, text, text, text, date, date, jsonb);

create or replace function update_program_week(
  p_program_id uuid,
  p_title      text,
  p_phase      text,
  p_notes      text,
  p_start_date date,
  p_end_date   date,
  p_sessions   jsonb,
  p_discipline text default null
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

  v_week_number := to_char(p_start_date, 'IW')::int;

  update public.training_programs
  set
    title       = p_title,
    phase       = p_phase,
    notes       = p_notes,
    discipline  = p_discipline,
    start_date  = p_start_date,
    end_date    = p_end_date,
    week_number = v_week_number,
    updated_at  = now()
  where id = p_program_id;

  delete from public.training_sessions where program_id = p_program_id;

  perform public.insert_sessions_tree(p_program_id, p_sessions);
end;
$$;
