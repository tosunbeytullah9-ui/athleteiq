-- =============================================
-- 20261002113316_endurance_sessions_and_block_copy.sql (sıralı adla yazıldı, MCP zaman damgasıyla hizalandı)
--
-- İki bağımsız ekleme, tek migration (ikisi de insert_sessions_tree /
-- copy_program_tree'ye dokunuyor, ayrı ayrı create or replace etmek aynı
-- fonksiyonu iki kez yeniden yazmak olurdu):
--
-- 1) DAYANIKLILIK SEANSLARI — WOD (20260912072715_wod_sessions.sql) ile
--    BİREBİR aynı desen: training_sessions'a bir "yapı" kolonu
--    (endurance_modality), exercises'a satır başına bölüm alanları. Bir seans
--    ya standart (set bazlı), ya WOD (workout_format), ya da dayanıklılık
--    (endurance_modality) olur — aynı seansta karışmaz (check constraint).
--    Dayanıklılık bölümleri exercises satırı olarak tutulur (WOD hareketleri
--    gibi): yeni tablo YOK, dolayısıyla yeni RLS YOK — exercises_select'in
--    mevcut program/grup kuralları (matches_training_group dahil) otomatik
--    kapsar. exercise_sets hiç oluşturulmaz.
--
-- 2) BLOK KOPYALAMA — copy_program_block(): bir bloğu (veya bloksuz tek
--    haftalık bir programı) yeni bir başlangıç tarihine, istenirse başka bir
--    takıma/sporcuya, TASLAK olarak kopyalar. Ağaç kopyası mevcut
--    copy_program_tree ile yapılır (propagate_week_to_future'ın kullandığı
--    aynı fonksiyon) — ikinci bir kopyalama mantığı icat edilmedi.
-- =============================================

-- ---------------------------------------------
-- 1. Şema
-- ---------------------------------------------
alter table training_sessions add column endurance_modality text;

alter table training_sessions
  add constraint training_sessions_endurance_modality_check
  check (endurance_modality is null or endurance_modality in
    ('run', 'bike', 'row', 'swim', 'ski', 'walk', 'other'));

-- Bir seans ya WOD ya dayanıklılık olabilir, ikisi birden olamaz.
alter table training_sessions
  add constraint training_sessions_single_structure_check
  check (workout_format is null or endurance_modality is null);

alter table exercises
  add column segment_type         text,
  add column segment_repeats      int,
  add column segment_distance_m   int,
  add column segment_duration_sec int,
  add column intensity_zone       smallint,
  add column intensity_target     text;

alter table exercises
  add constraint exercises_segment_type_check
    check (segment_type is null or segment_type in
      ('warmup', 'steady', 'interval', 'recovery', 'cooldown')),
  add constraint exercises_segment_repeats_check
    check (segment_repeats is null or segment_repeats between 1 and 200),
  add constraint exercises_segment_distance_check
    check (segment_distance_m is null or segment_distance_m > 0),
  add constraint exercises_segment_duration_check
    check (segment_duration_sec is null or segment_duration_sec > 0),
  add constraint exercises_intensity_zone_check
    check (intensity_zone is null or intensity_zone between 1 and 5);

comment on column training_sessions.endurance_modality is
  'Dayanıklılık seansının modalitesi (run/bike/row/swim/ski/walk/other). Doluysa seansın exercises satırları dayanıklılık bölümüdür (segment_* kolonları), set yoktur. workout_format ile birlikte dolu olamaz.';
comment on column exercises.segment_type is
  'Dayanıklılık bölümü tipi: warmup/steady/interval/recovery/cooldown. Yalnızca training_sessions.endurance_modality dolu seanslarda kullanılır.';
comment on column exercises.segment_repeats is
  'Interval bölümünde tekrar sayısı (8 × 400 m). Tekrar arası dinlenme mevcut rest_sec kolonundadır.';
comment on column exercises.segment_distance_m is 'Bölümün TEK tekrarının mesafesi (metre).';
comment on column exercises.segment_duration_sec is 'Bölümün TEK tekrarının süresi (saniye).';
comment on column exercises.intensity_zone is '5 bölgeli yoğunluk modeli (1 = çok hafif … 5 = maksimal).';
comment on column exercises.intensity_target is 'Serbest metin hedef: tempo (4:30/km), nabız (150-160), güç (250 W), RPE vb.';

-- ---------------------------------------------
-- 2. insert_sessions_tree — yeni kolonlar eklendi. Yetkilendirme + döngü
--    mantığı 20260912072715_wod_sessions.sql'den BİREBİR.
-- ---------------------------------------------
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
        intensity_zone, intensity_target
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
        v_exercise->>'intensity_target'
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

-- ---------------------------------------------
-- 3. copy_program_tree — aynı yeni kolonlar kaynaktan hedefe kopyalanır.
--    Kendi yetkilendirmesi YOK (çağıranlar — propagate_week_to_future ve
--    aşağıdaki copy_program_block — kontrol ediyor); bu yüzden EXECUTE
--    yalnızca service_role'de (Parti 18-S). create or replace mevcut
--    grant'leri korur.
-- ---------------------------------------------
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
        intensity_zone, intensity_target
      )
      values (
        v_new_session_id, v_exercise.name, v_exercise.category,
        v_exercise.superset_group, v_exercise.superset_order,
        v_exercise.order_index, v_exercise.rest_sec, v_exercise.notes,
        v_exercise.movement_detail,
        v_exercise.segment_type, v_exercise.segment_repeats,
        v_exercise.segment_distance_m, v_exercise.segment_duration_sec,
        v_exercise.intensity_zone, v_exercise.intensity_target
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

-- ---------------------------------------------
-- 4. copy_program_block — bloğu (veya tek haftalık programı) kopyala.
--
-- p_source_program_id: bloğun HERHANGİ bir haftası (UI detay sayfasından
--   o haftanın id'sini gönderir). block_id doluysa tüm blok, değilse yalnızca
--   o program kopyalanır.
-- p_start_date: kopyanın 1. haftasının başlangıcı. Diğer haftalar kaynaktaki
--   göreli aralıklarını KORUR (kaynak haftanın start_date'i - kaynak 1.
--   haftanın start_date'i); kaynakta tarih yoksa (i-1)*7 kullanılır.
-- p_title: boşsa kaynak başlık(lar) aynen kalır.
-- p_team_id / p_athlete_id: ikisi de boşsa hedef = kaynakla aynı takım/sporcu;
--   biri doluysa o hedefe kopyalanır (XOR). Antrenman grubu yalnızca hedef
--   AYNI takımsa taşınır — gruplar takıma özgüdür.
--
-- Kopya HER ZAMAN taslaktır (is_published=false) ve arşivli değildir —
-- create_program_with_weeks ile aynı tercih: yayınlama koçun bilinçli adımı.
--
-- Yetki (§4.1): rol kontrolü + koç için hem KAYNAK hem HEDEF kendi takımında
-- olmalı, hepsi coalesce(..., false) ile fail-closed. Hedef aynı org'da
-- olmak zorunda (başka tenant'a kopya yazılamaz).
-- ---------------------------------------------
create or replace function copy_program_block(
  p_source_program_id uuid,
  p_start_date        date,
  p_title             text default null,
  p_team_id           uuid default null,
  p_athlete_id        uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src            public.training_programs%rowtype;
  v_block          public.program_blocks%rowtype;
  v_team_id        uuid;
  v_athlete_id     uuid;
  v_title          text;
  v_first_start    date;
  v_week_start     date;
  v_week_count     int;
  v_i              int := 0;
  v_week           record;
  v_new_block_id   uuid;
  v_new_program_id uuid;
  v_program_ids    uuid[] := '{}';
begin
  select * into v_src from public.training_programs where id = p_source_program_id;

  if v_src.id is null then
    raise exception 'program bulunamadı';
  end if;

  if not coalesce(
    public.is_super_admin()
    or public.my_role(v_src.org_id) = 'admin'
    or public.my_role(v_src.org_id) = 'coach',
    false
  ) then
    raise exception 'yetkisiz';
  end if;

  -- Kaynak: koç yalnızca kendi takımının (veya takımındaki sporcunun) programını kopyalar.
  if not coalesce(public.is_super_admin() or public.my_role(v_src.org_id) = 'admin', false) then
    if not coalesce(
      v_src.team_id = public.my_team_id(v_src.org_id)
      or exists (
        select 1 from public.athletes a2
        where a2.id = v_src.athlete_id
        and a2.team_id = public.my_team_id(v_src.org_id)
      ),
      false
    ) then
      raise exception 'Bu sporcu sizin takımınızda değil';
    end if;
  end if;

  -- Hedef çözümü
  if p_team_id is null and p_athlete_id is null then
    v_team_id    := v_src.team_id;
    v_athlete_id := v_src.athlete_id;
  elsif p_team_id is not null and p_athlete_id is not null then
    raise exception 'p_team_id ve p_athlete_id''den tam olarak biri dolu olmalı';
  else
    v_team_id    := p_team_id;
    v_athlete_id := p_athlete_id;
  end if;

  -- Hedef aynı org'da olmalı (cross-tenant yazma engeli).
  if v_team_id is not null and not exists (
    select 1 from public.teams t where t.id = v_team_id and t.org_id = v_src.org_id
  ) then
    raise exception 'hedef bulunamadı';
  end if;
  if v_athlete_id is not null and not exists (
    select 1 from public.athletes a where a.id = v_athlete_id and a.org_id = v_src.org_id
  ) then
    raise exception 'hedef bulunamadı';
  end if;

  -- Hedef: koç yalnızca kendi takımına (veya takımındaki sporcuya) yazar.
  if not coalesce(public.is_super_admin() or public.my_role(v_src.org_id) = 'admin', false) then
    if not coalesce(
      v_team_id = public.my_team_id(v_src.org_id)
      or exists (
        select 1 from public.athletes a2
        where a2.id = v_athlete_id
        and a2.team_id = public.my_team_id(v_src.org_id)
      ),
      false
    ) then
      raise exception 'Bu sporcu sizin takımınızda değil';
    end if;
  end if;

  if p_start_date is null then
    raise exception 'başlangıç tarihi gerekli';
  end if;

  v_title := nullif(btrim(coalesce(p_title, '')), '');

  if v_src.block_id is not null then
    select * into v_block from public.program_blocks where id = v_src.block_id;

    select count(*), min(start_date)
    into v_week_count, v_first_start
    from public.training_programs
    where block_id = v_src.block_id;

    insert into public.program_blocks (
      org_id, team_id, athlete_id, created_by, title, total_weeks, phase, notes
    )
    values (
      v_src.org_id, v_team_id, v_athlete_id, auth.uid(),
      coalesce(v_title, v_block.title, v_src.title),
      v_week_count, v_block.phase, v_block.notes
    )
    returning id into v_new_block_id;

    for v_week in
      select *
      from public.training_programs
      where block_id = v_src.block_id
      order by week_index_in_block nulls last, start_date nulls last, created_at
    loop
      v_i := v_i + 1;
      v_week_start := case
        when v_week.start_date is not null and v_first_start is not null
          then p_start_date + (v_week.start_date - v_first_start)
        else p_start_date + ((v_i - 1) * 7)
      end;

      insert into public.training_programs (
        org_id, team_id, athlete_id, created_by, title, week_number,
        start_date, end_date, phase, notes, discipline, training_group,
        is_published, is_archived, block_id, week_index_in_block
      )
      values (
        v_src.org_id, v_team_id, v_athlete_id, auth.uid(),
        coalesce(v_title, v_week.title),
        to_char(v_week_start, 'IW')::int,
        v_week_start, v_week_start + 6,
        v_week.phase, v_week.notes, v_week.discipline,
        case when v_team_id = v_src.team_id then v_week.training_group else null end,
        false, false, v_new_block_id, v_i
      )
      returning id into v_new_program_id;

      perform public.copy_program_tree(v_week.id, v_new_program_id);
      v_program_ids := array_append(v_program_ids, v_new_program_id);
    end loop;
  else
    insert into public.training_programs (
      org_id, team_id, athlete_id, created_by, title, week_number,
      start_date, end_date, phase, notes, discipline, training_group,
      is_published, is_archived, block_id, week_index_in_block
    )
    values (
      v_src.org_id, v_team_id, v_athlete_id, auth.uid(),
      coalesce(v_title, v_src.title),
      to_char(p_start_date, 'IW')::int,
      p_start_date, p_start_date + 6,
      v_src.phase, v_src.notes, v_src.discipline,
      case when v_team_id = v_src.team_id then v_src.training_group else null end,
      false, false, null, null
    )
    returning id into v_new_program_id;

    perform public.copy_program_tree(v_src.id, v_new_program_id);
    v_program_ids := array_append(v_program_ids, v_new_program_id);
  end if;

  return jsonb_build_object('block_id', v_new_block_id, 'program_ids', to_jsonb(v_program_ids));
end;
$$;

revoke all on function copy_program_block(uuid, date, text, uuid, uuid) from public, anon;
grant execute on function copy_program_block(uuid, date, text, uuid, uuid) to authenticated;
