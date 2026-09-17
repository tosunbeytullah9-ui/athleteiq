-- =============================================
-- 044_session_feedback.sql — Sporcu → Koç seans geri bildirimi (Parti 22-FB)
--
-- NEDEN YENİ TABLO (mevcut kolonlar neden kullanılamıyor):
-- 014_exercise_sets.sql `training_sessions.athlete_session_notes`, 016_session_rpe.sql
-- `training_sessions.session_rpe` kolonlarını eklemişti. İkisi de hiçbir UI'dan
-- doldurulmadı ve DOLDURULAMAZ: `training_sessions` satırı bir PROGRAMA aittir, takım
-- programlarında TÜM TAKIM aynı satırı paylaşır — iki sporcunun RPE'si birbirini ezer.
-- Ayrıca `sessions_write` (002_rls.sql / 025_team_scoped_training_rls.sql) yalnızca
-- admin+coach'a yazma izni verir, sporcu zaten yazamaz. Bu yüzden geri bildirim
-- (sporcu × seans) granülerliğinde AYRI bir tabloya alınır. Eski kolonlar SİLİNMEDİ
-- (minimal-diff), yalnızca DEPRECATED olarak işaretlendi.
--
-- Tasarım kalıbı 012_wellness.sql'den birebir devralınır:
--   · source ('athlete' | 'coach_proxy') + entered_by damgası, RLS'in İÇİNDE zorlanır
--   · UPDATE politikasının `with check`inde sahiplik + damga AYNEN tekrarlanır
--     (012'deki "damga yalan söyleyemez" açığının aynısı burada da oluşurdu)
--   · DELETE politikası YOK — geri bildirim geçmişi silinmez
--
-- Tamamen ADDITIVE: acwr_logs'a yalnızca `source` kolonu eklenir (default 'manual',
-- mevcut satırlar ve mevcut web formu davranışı DEĞİŞMEZ).
-- =============================================

-- ---------------------------------------------
-- 1. Tablo
-- ---------------------------------------------
create table session_feedback (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid references athletes(id) on delete cascade not null,
  session_id    uuid references training_sessions(id) on delete cascade not null,

  -- Sporcunun girdiği DEĞİL — trigger (set_session_feedback_date) programın
  -- start_date'i + day_of_week'inden hesaplar. ACWR gün ataması istemciye
  -- bırakılamayacak kadar kritik.
  session_date  date not null,

  -- Boş RPE'nin "yapmadım" mı "girmeyi unuttum" mu olduğu ASLA belirsiz kalmamalı.
  status        text not null default 'completed'
                check (status in ('completed', 'partial', 'skipped')),

  -- Borg CR-10. acwr_logs.session_rpe 0-10 numeric; burada 1-10 smallint —
  -- "antrenmanı yaptım ama sıfır zorlandım" anlamlı bir girdi değil, 0 yerine
  -- status='skipped' kullanılır.
  rpe           smallint check (rpe between 1 and 10),

  -- GERÇEK süre (planlanan training_sessions.duration_min değil). Formda
  -- planlanan önceden dolu gelir, sporcu farklıysa düzeltir.
  duration_min  int check (duration_min between 0 and 600),

  -- sRPE. acwr_logs.session_load ile birebir aynı formül.
  session_load  numeric generated always as (rpe * duration_min) stored,

  -- Serbest notun içine gömülen "dizim ağrıdı" kaybolur. Ayrı bayrak = koç
  -- listesinde filtrelenebilir kırmızı sinyal.
  has_pain      boolean not null default false,
  pain_area     text,

  note          text,

  source        text not null default 'athlete'
                check (source in ('athlete', 'coach_proxy')),
  entered_by    uuid references auth.users(id),

  -- Koç tarafı. Bu kolonlar normal UPDATE ile YAZILAMAZ (bkz. §3 guard trigger) —
  -- yalnızca mark_session_feedback_read / reply_to_session_feedback RPC'lerinden.
  coach_read_at    timestamptz,
  coach_read_by    uuid references auth.users(id),
  coach_reply      text,
  coach_replied_at timestamptz,
  coach_replied_by uuid references auth.users(id),

  submitted_at  timestamptz default now(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),

  unique (athlete_id, session_id),

  -- 'skipped' ise yük yok; aksi halde ACWR'ı besleyebilmek için ikisi de zorunlu.
  constraint session_feedback_load_shape check (
    (status = 'skipped' and rpe is null and duration_min is null)
    or (status <> 'skipped' and rpe is not null and duration_min is not null)
  ),
  constraint session_feedback_pain_shape check (has_pain or pain_area is null)
);

create index idx_session_feedback_athlete_date on session_feedback (athlete_id, session_date desc);
create index idx_session_feedback_session      on session_feedback (session_id);
-- Koç gelen kutusu: okunmamışlar önce.
create index idx_session_feedback_unread on session_feedback (session_date desc)
  where coach_read_at is null;

create trigger session_feedback_updated_at
  before update on session_feedback
  for each row execute function update_updated_at();

comment on table session_feedback is
  'Sporcunun bir antrenman seansı için koça verdiği geri bildirim (sporcu × seans): '
  'RPE, gerçek süre, tamamlanma durumu, ağrı bayrağı, serbest not. training_sessions.'
  'session_rpe/athlete_session_notes kolonlarının yerini alır (bunlar takım programlarında '
  'paylaşımlı satır olduğu için kullanılamazdı). Parti 22-FB.';

comment on column training_sessions.session_rpe is
  'DEPRECATED (Parti 22-FB) — superseded by session_feedback.rpe. Takım programlarında bu '
  'satır tüm takım tarafından paylaşıldığı için sporcu bazlı RPE tutamaz. Hiç doldurulmadı.';
comment on column training_sessions.athlete_session_notes is
  'DEPRECATED (Parti 22-FB) — superseded by session_feedback.note. Aynı paylaşımlı-satır '
  'sorunu (bkz. session_rpe). Hiç doldurulmadı.';

-- ---------------------------------------------
-- 2. session_date — istemciden DEĞİL, programdan hesaplanır
--
-- SECURITY INVOKER (varsayılan) bilinçli: RLS uygulanır, yani sporcu yalnızca
-- görebildiği (is_published) bir seansın tarihini çözebilir. Program start_date'i
-- boşsa bugüne düşer (veri kaybetmektense günü yaklaşık atamak yeğdir).
-- ---------------------------------------------
create or replace function set_session_feedback_date()
returns trigger language plpgsql as $$
declare
  v_date date;
begin
  select p.start_date + (coalesce(s.day_of_week, 1) - 1)
    into v_date
  from training_sessions s
  join training_programs p on p.id = s.program_id
  where s.id = new.session_id;

  new.session_date := coalesce(v_date, current_date);
  return new;
end;
$$;

create trigger session_feedback_set_date
  before insert or update of session_id on session_feedback
  for each row execute function set_session_feedback_date();

-- ---------------------------------------------
-- 3. coach_* kolon koruması
--
-- 012_wellness.sql'in dersi ("damga yalan söyleyemez") buraya iki yönlü uygulanır:
--   · Koç, sporcunun self-report'unu (rpe/note/status) DEĞİŞTİREMEZ → RLS UPDATE
--     politikası source='athlete' satırlarını koça hiç açmaz (bkz. §4).
--   · Sporcu, kendi satırına sahte bir "koç yanıtı"/"okundu" yazamaz → bu trigger.
--
-- Koç alanları YALNIZCA §5'teki iki SECURITY DEFINER RPC'den yazılır; onlar
-- transaction-local bir bayrak set eder. Rol adına (authenticated/anon) bağımlılık
-- YOK — bayrak açıkça niyeti ifade eder.
-- ---------------------------------------------
create or replace function session_feedback_guard_coach_columns()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.session_feedback_coach_action', true), '') <> 'on' then
    new.coach_read_at    := old.coach_read_at;
    new.coach_read_by    := old.coach_read_by;
    new.coach_reply      := old.coach_reply;
    new.coach_replied_at := old.coach_replied_at;
    new.coach_replied_by := old.coach_replied_by;
  end if;
  return new;
end;
$$;

create trigger session_feedback_guard_coach
  before update on session_feedback
  for each row execute function session_feedback_guard_coach_columns();

-- INSERT'te de koç alanları boş başlamalı (sporcu ilk kaydında dolduramasın).
create or replace function session_feedback_clear_coach_columns()
returns trigger language plpgsql as $$
begin
  new.coach_read_at    := null;
  new.coach_read_by    := null;
  new.coach_reply      := null;
  new.coach_replied_at := null;
  new.coach_replied_by := null;
  return new;
end;
$$;

create trigger session_feedback_clear_coach
  before insert on session_feedback
  for each row execute function session_feedback_clear_coach_columns();

-- ---------------------------------------------
-- 4. RLS
-- ---------------------------------------------
alter table session_feedback enable row level security;

-- SELECT — 002_rls.sql acwr_select / 012_wellness.sql wellness_select kalıbı.
-- Sporcu: kendisi · Koç: kendi takımı · Admin: tüm org · Super admin: hepsi
create policy "session_feedback_select" on session_feedback for select using (
  is_super_admin()
  or exists (
    select 1 from athletes a
    where a.id = session_feedback.athlete_id
    and (
      a.user_id = auth.uid()
      or my_role(a.org_id) = 'admin'
      or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id))
    )
  )
);

-- INSERT — iki koşul birlikte:
--   (a) damga dürüst: sporcu 'coach_proxy' yazamaz, koç 'athlete' yazamaz
--   (b) seans gerçekten bu sporcunun programına ait (rastgele bir session_id'ye
--       geri bildirim iliştirilip başka takımın program görünümü kirletilemesin).
--       Bu alt sorgu RLS altında çalışır → sporcu için yalnızca is_published
--       programlar görünür, yani yayınlanmamış seansa geri bildirim yazılamaz.
create policy "session_feedback_insert" on session_feedback for insert with check (
  (
    session_feedback.entered_by is null
    or session_feedback.entered_by = auth.uid()
  )
  and exists (
    select 1 from athletes a
    where a.id = session_feedback.athlete_id
    and (
      (a.user_id = auth.uid() and session_feedback.source = 'athlete')
      or (
        session_feedback.source = 'coach_proxy'
        and (
          my_role(a.org_id) = 'admin'
          or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id))
        )
      )
    )
  )
  and exists (
    select 1
    from training_sessions s
    join training_programs p on p.id = s.program_id
    join athletes a2 on a2.id = session_feedback.athlete_id
    where s.id = session_feedback.session_id
      and p.org_id = a2.org_id
      and (p.athlete_id = a2.id or p.team_id = a2.team_id)
  )
);

-- UPDATE (sporcu) — kendi self-report'unu düzeltir. `with check` sahipliği ve
-- damgayı AYNEN tekrarlar (012_wellness.sql'deki source-yükseltme açığı).
-- Tarih penceresi wellness'tan (bugün+dün) daha geniş: sporcu antrenmandan
-- günler sonra da girebilsin diye 7 gün — ama bayat veri de sınırsız geriye
-- dönük "düzeltilemez".
create policy "session_feedback_update_athlete" on session_feedback for update
using (
  session_feedback.source = 'athlete'
  and session_feedback.session_date >= current_date - 7
  and exists (
    select 1 from athletes a
    where a.id = session_feedback.athlete_id and a.user_id = auth.uid()
  )
)
with check (
  session_feedback.source = 'athlete'
  and (
    session_feedback.entered_by is null
    or session_feedback.entered_by = auth.uid()
  )
  and session_feedback.session_date >= current_date - 7
  and exists (
    select 1 from athletes a
    where a.id = session_feedback.athlete_id and a.user_id = auth.uid()
  )
);

-- UPDATE (koç/admin) — YALNIZCA kendi girdiği vekil kayıtlar. Sporcunun
-- self-report'u koç tarafından DEĞİŞTİRİLEMEZ; koçun o satıra tek dokunuşu
-- §5'teki iki RPC üzerinden (okundu / yanıt) olur.
create policy "session_feedback_update_coach" on session_feedback for update
using (
  session_feedback.source = 'coach_proxy'
  and exists (
    select 1 from athletes a
    where a.id = session_feedback.athlete_id
    and (
      my_role(a.org_id) = 'admin'
      or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id))
    )
  )
)
with check (
  session_feedback.source = 'coach_proxy'
  and (
    session_feedback.entered_by is null
    or session_feedback.entered_by = auth.uid()
  )
  and exists (
    select 1 from athletes a
    where a.id = session_feedback.athlete_id
    and (
      my_role(a.org_id) = 'admin'
      or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id))
    )
  )
);

-- DELETE politikası YOK — bilinçli (012_wellness.sql ile aynı: geri bildirim
-- geçmişi silinmez, audit izi).

-- Realtime — koçun gelen kutusu canlı dolsun (011_realtime.sql kalıbı, idempotent).
-- RLS realtime'da da geçerli: her abone yalnızca session_feedback_select'in
-- izin verdiği satırların değişimini alır.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'session_feedback'
  ) then
    alter publication supabase_realtime add table public.session_feedback;
  end if;
end $$;

-- ---------------------------------------------
-- 5. Koç aksiyonları (okundu / yanıt)
--
-- §3'teki guard trigger yüzünden coach_* kolonları normal UPDATE ile yazılamaz;
-- tek yol bu iki fonksiyondur. §4.1 konvansiyonu: gövdenin ilk satırlarında
-- coalesce(..., false) ile sarmalanmış yetki kontrolü. Bunlar dahili yardımcı
-- DEĞİL (koç istemcisi doğrudan çağırır), bu yüzden `authenticated` EXECUTE
-- yetkisi KORUNUR — yalnızca anon/public kaldırılır.
-- ---------------------------------------------
create or replace function can_manage_athlete_feedback(p_athlete_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((
    select is_super_admin()
        or my_role(a.org_id) = 'admin'
        or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id))
    from athletes a
    where a.id = p_athlete_id
  ), false);
$$;

-- Dahili yardımcı: yalnızca aşağıdaki iki RPC'den çağrılır (§4.1).
revoke all on function can_manage_athlete_feedback(uuid) from public, anon, authenticated;

create or replace function mark_session_feedback_read(p_feedback_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_athlete uuid;
begin
  select athlete_id into v_athlete from session_feedback where id = p_feedback_id;
  if v_athlete is null then
    raise exception 'Geri bildirim bulunamadı' using errcode = 'P0002';
  end if;

  if not coalesce(can_manage_athlete_feedback(v_athlete), false) then
    raise exception 'Bu geri bildirime erişim yetkiniz yok' using errcode = '42501';
  end if;

  perform set_config('app.session_feedback_coach_action', 'on', true);

  update session_feedback
     set coach_read_at = coalesce(coach_read_at, now()),
         coach_read_by = coalesce(coach_read_by, auth.uid())
   where id = p_feedback_id;
end;
$$;

revoke all on function mark_session_feedback_read(uuid) from public, anon;

create or replace function reply_to_session_feedback(p_feedback_id uuid, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_athlete uuid;
  v_reply   text;
begin
  select athlete_id into v_athlete from session_feedback where id = p_feedback_id;
  if v_athlete is null then
    raise exception 'Geri bildirim bulunamadı' using errcode = 'P0002';
  end if;

  if not coalesce(can_manage_athlete_feedback(v_athlete), false) then
    raise exception 'Bu geri bildirime yanıt yazma yetkiniz yok' using errcode = '42501';
  end if;

  v_reply := nullif(btrim(coalesce(p_reply, '')), '');
  if length(coalesce(v_reply, '')) > 2000 then
    raise exception 'Yanıt en fazla 2000 karakter olabilir' using errcode = '22001';
  end if;

  perform set_config('app.session_feedback_coach_action', 'on', true);

  -- Yanıt yazmak aynı zamanda okundu demektir.
  update session_feedback
     set coach_reply      = v_reply,
         coach_replied_at = case when v_reply is null then null else now() end,
         coach_replied_by = case when v_reply is null then null else auth.uid() end,
         coach_read_at    = coalesce(coach_read_at, now()),
         coach_read_by    = coalesce(coach_read_by, auth.uid())
   where id = p_feedback_id;
end;
$$;

revoke all on function reply_to_session_feedback(uuid, text) from public, anon;

-- PUBLIC'ten revoke, `authenticated`ın da yetkisini düşürür (authenticated'ın
-- ayrı bir grant'i yoktu) — koç istemcisi bu iki RPC'yi çağırabilsin diye
-- açıkça geri veriliyor.
grant execute on function mark_session_feedback_read(uuid) to authenticated;
grant execute on function reply_to_session_feedback(uuid, text) to authenticated;

-- ---------------------------------------------
-- 6. ACWR otomatik beslemesi
--
-- acwr_logs bugüne kadar YALNIZCA koçun web formundan (/acwr → "Yük Logu Ekle")
-- elle dolduruluyordu — yani koç, başında olmadığı antrenmanın RPE'sini tahmin
-- ediyordu. Sporcunun kendi sRPE'si artık bu tabloyu besler.
--
-- `source` damgası: mevcut satırlar ve mevcut web formu 'manual' olur (default),
-- otomatik üretilenler 'athlete_feedback'. Koçun elle girdiği bir gün ASLA
-- ezilmez (kullanıcı kararı) — o gün için sporcu geri bildirimi gelse bile
-- acwr_logs satırı olduğu gibi kalır.
-- ---------------------------------------------
alter table acwr_logs
  add column if not exists source text not null default 'manual'
  check (source in ('manual', 'athlete_feedback'));

comment on column acwr_logs.source is
  'manual = koçun /acwr formundan elle girdiği satır (varsayılan). athlete_feedback = '
  'session_feedback''ten otomatik türetilmiş satır. Otomatik hesaplama manual satırları ezmez.';

-- Bir günün acwr_logs satırını o güne ait session_feedback satırlarından türetir.
-- Dahili yardımcı (§4.1): PUBLIC/anon/authenticated EXECUTE yetkisi yok, yalnızca
-- trigger'dan (owner olarak) çalışır.
create or replace function recalc_acwr_day(p_athlete_id uuid, p_date date)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_dur      int;
  v_load     numeric;
  v_rpe      numeric;
  v_source   text;
  v_acute    numeric;
  v_chronic  numeric;
begin
  select sum(duration_min), sum(rpe::numeric * duration_min)
    into v_dur, v_load
  from session_feedback
  where athlete_id = p_athlete_id
    and session_date = p_date
    and status <> 'skipped'
    and rpe is not null
    and duration_min is not null
    and duration_min > 0;

  select source into v_source
  from acwr_logs
  where athlete_id = p_athlete_id and log_date = p_date;

  -- Koçun elle girdiği gün korunur.
  if v_source = 'manual' then
    return;
  end if;

  -- O güne dair yük kalmadıysa (hepsi silindi / 'skipped'e çevrildi) otomatik
  -- satır da kalkar — yoksa hayalet yük ACWR'ı şişirir.
  if v_dur is null or v_dur = 0 then
    delete from acwr_logs
    where athlete_id = p_athlete_id
      and log_date = p_date
      and source = 'athlete_feedback';
    return;
  end if;

  -- Ağırlıklı RPE: Σ(rpe·süre)/Σsüre. Toplam süreyle çarpımı Σ(rpe·süre)'ye eşittir,
  -- yani session_load generated kolonu günün TOPLAM yükünü taşır (yuvarlamadan
  -- gelen sapma ihmal edilebilir; 2 hane koçun tabloda okuyabilmesi için).
  v_rpe := round(v_load / v_dur, 2);

  insert into acwr_logs (athlete_id, log_date, session_rpe, duration_min, source)
  values (p_athlete_id, p_date, v_rpe, v_dur, 'athlete_feedback')
  on conflict (athlete_id, log_date) do update
    set session_rpe  = excluded.session_rpe,
        duration_min = excluded.duration_min,
        source       = 'athlete_feedback';
end;
$$;

revoke all on function recalc_acwr_day(uuid, date) from public, anon, authenticated;

-- Bir günün yükü değiştiğinde onu İZLEYEN günlerin akut/kronik pencereleri de
-- bayatlar. Web formu (acwr-client.tsx) bunu hiç yapmıyordu — çünkü koç günleri
-- sırayla giriyordu. Sporcu geri bildirimi geç gelebileceği için (antrenmandan
-- 3 gün sonra) artık geriye dönük giriş NORMAL durum; bu yüzden etkilenen
-- pencere (28 gün) yeniden hesaplanır. acute/chronic zaten TÜRETİLMİŞ alanlar,
-- elle girilmiş veri değil — 'manual' satırların da pencereleri tazelenir.
create or replace function refresh_acwr_rolling_loads(
  p_athlete_id uuid, p_from date, p_to date
)
returns void language sql security definer set search_path = public as $$
  update acwr_logs t
     set acute_load = (
           select coalesce(sum(s.session_load), 0) / 7
           from acwr_logs s
           where s.athlete_id = t.athlete_id
             and s.log_date between t.log_date - 7 and t.log_date
         ),
         chronic_load = (
           select coalesce(sum(s.session_load), 0) / 28
           from acwr_logs s
           where s.athlete_id = t.athlete_id
             and s.log_date between t.log_date - 28 and t.log_date
         )
   where t.athlete_id = p_athlete_id
     and t.log_date between p_from and p_to;
$$;

revoke all on function refresh_acwr_rolling_loads(uuid, date, date) from public, anon, authenticated;

create or replace function session_feedback_sync_acwr()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_athlete uuid;
  v_date    date;
begin
  if tg_op = 'DELETE' then
    v_athlete := old.athlete_id;
    v_date    := old.session_date;
  else
    v_athlete := new.athlete_id;
    v_date    := new.session_date;
  end if;

  perform recalc_acwr_day(v_athlete, v_date);
  perform refresh_acwr_rolling_loads(v_athlete, v_date, v_date + 28);

  -- Satır başka bir güne/sporcuya taşındıysa eski gün de tazelenmeli.
  if tg_op = 'UPDATE'
     and (old.athlete_id is distinct from new.athlete_id
          or old.session_date is distinct from new.session_date) then
    perform recalc_acwr_day(old.athlete_id, old.session_date);
    perform refresh_acwr_rolling_loads(old.athlete_id, old.session_date, old.session_date + 28);
  end if;

  return null;
end;
$$;

create trigger session_feedback_acwr_sync
  after insert or update or delete on session_feedback
  for each row execute function session_feedback_sync_acwr();
