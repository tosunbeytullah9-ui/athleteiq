-- =============================================
-- account_deletion_requests — uygulama içi hesap silme talebi (App Store 5.1.1(v) + KVKK m.11/13)
-- =============================================
-- Parti 18B. Sporcu/koç/admin mobil profilden talep oluşturur, talep kişinin ORG ADMIN'ine
-- düşer (süper admin tüm org'ları görür), admin web'de etkiyi görüp onaylar
-- (process-account-deletion Edge Function — hesap + bağlı TÜM veri kalıcı silinir) ya da
-- gerekçeyle reddeder. Veri sorumlusu kurumdur; talep en geç 30 gün içinde işlenmelidir.
--
-- delete-org-user'dan FARKI: o yalnızca giriş erişimini kaldırır (athletes.user_id SET NULL,
-- roster ve sağlık verisi kalır). Bu akış athletes satırını da siler → 21 tablo CASCADE.
--
-- Yazma YALNIZCA aşağıdaki SECURITY DEFINER RPC'ler ve process-account-deletion (service
-- role) üzerinden: INSERT/UPDATE/DELETE politikası yok, anon'un tüm yetkisi ve
-- authenticated'ın yazma yetkisi kaldırıldı (athlete_ai_insights / demo_requests deseni).

create table public.account_deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  role          text not null check (role in ('admin', 'coach', 'athlete')),
  -- Talep anı anlık görüntüsü — tamamlanınca NULL'lanır (silinen kişinin verisi kalmasın).
  display_name  text,
  username      text,
  reason        text check (char_length(reason) <= 500),
  status        text not null default 'pending'
                check (status in ('pending', 'completed', 'cancelled', 'rejected')),
  requested_at  timestamptz not null default now(),
  due_at        timestamptz not null,
  processed_at  timestamptz,
  processed_by  uuid references auth.users (id) on delete set null,
  admin_note    text check (char_length(admin_note) <= 1000),
  constraint account_deletion_requests_reject_note
    check (status <> 'rejected' or nullif(btrim(admin_note), '') is not null)
);

comment on table public.account_deletion_requests is
  'Uygulama içinden başlatılan hesap silme talepleri (App Store 5.1.1(v) + KVKK m.11/13): kişi talep eder, org admini en geç 30 gün içinde etkiyi görüp onaylar (process-account-deletion — hesap + bağlı tüm veri kalıcı silinir) veya gerekçeyle reddeder. Yazma yalnızca RPC''ler ve Edge Function üzerinden.';

-- Kişi başına tek açık talep.
create unique index account_deletion_requests_one_pending
  on public.account_deletion_requests (user_id) where status = 'pending';
create index idx_account_deletion_requests_org_status
  on public.account_deletion_requests (org_id, status);

alter table public.account_deletion_requests enable row level security;

-- Kendi talebi VEYA o org'un admin'i VEYA süper admin. Koç başkasının talebini GÖRMEZ.
create policy account_deletion_requests_select on public.account_deletion_requests
  for select to authenticated
  using (coalesce(
    user_id = auth.uid()
    or public.is_super_admin()
    or public.my_role(org_id) = 'admin',
    false));

revoke all on public.account_deletion_requests from anon;
revoke insert, update, delete on public.account_deletion_requests from authenticated;

-- ---------------------------------------------------------------------------
-- request_account_deletion — çağıranın açık talebini döndürür, yoksa oluşturur (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.request_account_deletion(p_reason text default null)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_reason text := nullif(btrim(p_reason), '');
  v_org    uuid;
  v_role   text;
  v_name   text;
  v_user   text;
  v_req    public.account_deletion_requests;
begin
  if not coalesce(
    v_uid is not null
    and exists (select 1 from public.memberships m where m.user_id = v_uid),
    false) then
    raise exception 'yetkisiz' using errcode = '42501';
  end if;

  -- Süper admin kurtarma/silme yolu yalnızca Supabase Dashboard (CLAUDE.md §4.3).
  if coalesce(public.is_super_admin(), false) then
    raise exception 'Süper admin hesapları uygulama içinden silme talebi oluşturamaz'
      using errcode = '42501';
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'Not en fazla 500 karakter olabilir' using errcode = '22023';
  end if;

  select * into v_req
  from public.account_deletion_requests r
  where r.user_id = v_uid and r.status = 'pending';
  if found then
    return v_req;
  end if;

  -- Bir auth hesabı tam olarak bir org'a aittir (§4.3) — limit 1 güvenli.
  select m.org_id, m.role into v_org, v_role
  from public.memberships m
  where m.user_id = v_uid
  limit 1;

  select coalesce(p.full_name, a.full_name), coalesce(p.username, a.username)
    into v_name, v_user
  from (select 1) s
  left join public.profiles p on p.id = v_uid
  left join public.athletes a on a.user_id = v_uid;

  begin
    insert into public.account_deletion_requests
      (org_id, user_id, role, display_name, username, reason, due_at)
    values
      (v_org, v_uid, v_role, v_name, v_user, v_reason, now() + interval '30 days')
    returning * into v_req;
  exception when unique_violation then
    -- Eşzamanlı ikinci çağrı: açık talep az önce oluştu, onu döndür.
    select * into v_req
    from public.account_deletion_requests r
    where r.user_id = v_uid and r.status = 'pending';
  end;

  return v_req;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_account_deletion_request — çağıranın açık talebini geri alır
-- ---------------------------------------------------------------------------
create or replace function public.cancel_account_deletion_request()
returns public.account_deletion_requests
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.account_deletion_requests;
begin
  if not coalesce(v_uid is not null, false) then
    raise exception 'yetkisiz' using errcode = '42501';
  end if;

  update public.account_deletion_requests r
     set status = 'cancelled',
         processed_at = now(),
         processed_by = v_uid
   where r.user_id = v_uid and r.status = 'pending'
  returning * into v_req;

  if not found then
    raise exception 'Açık bir silme talebiniz yok' using errcode = 'P0002';
  end if;

  return v_req;
end;
$$;

-- ---------------------------------------------------------------------------
-- reject_account_deletion_request — yalnızca talebin org admin'i veya süper admin; not zorunlu
-- ---------------------------------------------------------------------------
create or replace function public.reject_account_deletion_request(p_request_id uuid, p_note text)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_note text := nullif(btrim(p_note), '');
  v_req  public.account_deletion_requests;
begin
  if not coalesce(exists (
    select 1 from public.account_deletion_requests r
    where r.id = p_request_id
      and (public.is_super_admin() or public.my_role(r.org_id) = 'admin')
  ), false) then
    raise exception 'yetkisiz' using errcode = '42501';
  end if;

  if v_note is null then
    raise exception 'Red gerekçesi zorunludur' using errcode = '22023';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'Gerekçe en fazla 1000 karakter olabilir' using errcode = '22023';
  end if;

  update public.account_deletion_requests r
     set status = 'rejected',
         admin_note = v_note,
         processed_at = now(),
         processed_by = auth.uid()
   where r.id = p_request_id and r.status = 'pending'
  returning * into v_req;

  if not found then
    raise exception 'Bu talep artık beklemede değil' using errcode = 'P0002';
  end if;

  return v_req;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_account_deletion_impact — silmeden ÖNCE CASCADE etkisini raporlar
-- ---------------------------------------------------------------------------
-- kind: 'delete' = kalıcı silinecek, 'keep' = korunacak (yazar alanı boşalacak),
--       'block'  = process-account-deletion bu talebi işlemeyecek (sebep label'da).
create or replace function public.get_account_deletion_impact(p_request_id uuid)
returns table (kind text, table_name text, label text, row_count bigint)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_req     public.account_deletion_requests;
  v_uid     uuid;
  v_athlete uuid;
  v_role    text;
begin
  if not coalesce(exists (
    select 1 from public.account_deletion_requests r
    where r.id = p_request_id
      and (public.is_super_admin() or public.my_role(r.org_id) = 'admin')
  ), false) then
    raise exception 'yetkisiz' using errcode = '42501';
  end if;

  select * into v_req from public.account_deletion_requests r where r.id = p_request_id;
  v_uid := v_req.user_id;
  select a.id into v_athlete from public.athletes a where a.user_id = v_uid;
  select m.role into v_role from public.memberships m
   where m.user_id = v_uid and m.org_id = v_req.org_id;

  return query
  select * from (
    -- Engeller (process-account-deletion ile aynı kurallar)
    select 'block'::text, 'auth.users'::text,
           'Hesap zaten silinmiş — bu talep yalnızca reddedilebilir'::text, 1::bigint
     where v_uid is null
    union all
    select 'block', 'auth.users',
           'Süper admin hesapları yalnızca Supabase Dashboard''tan silinebilir', 1
     where exists (select 1 from auth.users u where u.id = v_uid
                   and u.raw_app_meta_data->>'platform_role' = 'super_admin')
    union all
    select 'block', 'memberships',
           'Kurumun tek yöneticisi — önce başka bir yönetici atayın', 1
     where v_role = 'admin'
       and (select count(*) from public.memberships m
             where m.org_id = v_req.org_id and m.role = 'admin') <= 1
    union all
    -- Hesap
    select 'delete', 'auth.users', 'Giriş hesabı, profil ve kurum üyeliği', 1
     where v_uid is not null
    union all
    -- athletes satırı ve CASCADE ettiği 21 tablo
    select 'delete', 'athletes', 'Sporcu profili', count(*) from public.athletes where id = v_athlete
    union all select 'delete', 'training_programs', 'Bireysel antrenman programı haftası', count(*) from public.training_programs where athlete_id = v_athlete
    union all select 'delete', 'program_blocks', 'Bireysel program bloğu', count(*) from public.program_blocks where athlete_id = v_athlete
    union all select 'delete', 'annual_plans', 'Bireysel yıllık plan', count(*) from public.annual_plans where athlete_id = v_athlete
    union all select 'delete', 'acwr_logs', 'ACWR / antrenman yükü kaydı', count(*) from public.acwr_logs where athlete_id = v_athlete
    union all select 'delete', 'session_feedback', 'Seans geri bildirimi', count(*) from public.session_feedback where athlete_id = v_athlete
    union all select 'delete', 'wellness_checkins', 'Wellness girişi', count(*) from public.wellness_checkins where athlete_id = v_athlete
    union all select 'delete', 'readiness_scores', 'Readiness skoru', count(*) from public.readiness_scores where athlete_id = v_athlete
    union all select 'delete', 'test_results', 'Test sonucu', count(*) from public.test_results where athlete_id = v_athlete
    union all select 'delete', 'athlete_1rm_records', '1RM kaydı', count(*) from public.athlete_1rm_records where athlete_id = v_athlete
    union all select 'delete', 'competition_entries', 'Yarışma katılım kaydı', count(*) from public.competition_entries where athlete_id = v_athlete
    union all select 'delete', 'competition_results', 'Yarışma sonucu', count(*) from public.competition_results where athlete_id = v_athlete
    union all select 'delete', 'attendance_records', 'Yoklama kaydı', count(*) from public.attendance_records where athlete_id = v_athlete
    union all select 'delete', 'wearable_connections', 'Wearable bağlantısı', count(*) from public.wearable_connections where athlete_id = v_athlete
    union all select 'delete', 'wearable_daily_metrics', 'Günlük wearable metriği', count(*) from public.wearable_daily_metrics where athlete_id = v_athlete
    union all select 'delete', 'whoop_cycles', 'WHOOP cycle kaydı', count(*) from public.whoop_cycles where athlete_id = v_athlete
    union all select 'delete', 'whoop_workouts', 'WHOOP antrenman kaydı', count(*) from public.whoop_workouts where athlete_id = v_athlete
    union all select 'delete', 'polar_exercises', 'Polar antrenman kaydı', count(*) from public.polar_exercises where athlete_id = v_athlete
    union all select 'delete', 'polar_sync_state', 'Polar senkron durumu', count(*) from public.polar_sync_state where athlete_id = v_athlete
    union all select 'delete', 'fitbit_activities', 'Fitbit aktivite kaydı', count(*) from public.fitbit_activities where athlete_id = v_athlete
    union all select 'delete', 'athlete_push_tokens', 'Bildirim token''ı', count(*) from public.athlete_push_tokens where athlete_id = v_athlete
    union all select 'delete', 'athlete_ai_insights', 'AI değerlendirmesi', count(*) from public.athlete_ai_insights where athlete_id = v_athlete
    union all
    -- Korunanlar: kişinin org'da oluşturduğu içerik — yazar alanı NULL olur
    -- (auth_user_fk_set_null). Kişinin kendi sporcu verisi zaten yukarıda siliniyor.
    select 'keep', 'training_programs', 'Oluşturduğu antrenman programı haftası', count(*) from public.training_programs
     where created_by = v_uid and athlete_id is distinct from v_athlete
    union all select 'keep', 'program_blocks', 'Oluşturduğu program bloğu', count(*) from public.program_blocks
     where created_by = v_uid and athlete_id is distinct from v_athlete
    union all select 'keep', 'annual_plans', 'Oluşturduğu yıllık plan', count(*) from public.annual_plans
     where created_by = v_uid and athlete_id is distinct from v_athlete
    union all select 'keep', 'annual_plan_methods', 'Eklediği yıllık plan antrenman sistemi', count(*) from public.annual_plan_methods where created_by = v_uid
    union all select 'keep', 'org_exercises', 'Eklediği egzersiz', count(*) from public.org_exercises where created_by = v_uid
    union all select 'keep', 'org_exercise_categories', 'Eklediği egzersiz kategorisi', count(*) from public.org_exercise_categories where created_by = v_uid
    union all select 'keep', 'drill_diagrams', 'Çizdiği drill diyagramı', count(*) from public.drill_diagrams where created_by = v_uid
    union all select 'keep', 'attendance_records', 'Aldığı yoklama kaydı', count(*) from public.attendance_records
     where recorded_by = v_uid and athlete_id is distinct from v_athlete
    union all select 'keep', 'session_feedback', 'Yanıtladığı geri bildirim', count(*) from public.session_feedback
     where coach_replied_by = v_uid and athlete_id is distinct from v_athlete
  ) t (kind, table_name, label, row_count)
  where t.row_count > 0;
end;
$$;

revoke execute on function public.request_account_deletion(text) from public, anon;
revoke execute on function public.cancel_account_deletion_request() from public, anon;
revoke execute on function public.reject_account_deletion_request(uuid, text) from public, anon;
revoke execute on function public.get_account_deletion_impact(uuid) from public, anon;
grant execute on function public.request_account_deletion(text) to authenticated;
grant execute on function public.cancel_account_deletion_request() to authenticated;
grant execute on function public.reject_account_deletion_request(uuid, text) to authenticated;
grant execute on function public.get_account_deletion_impact(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- recalc_acwr_day — silinmekte olan sporcu için acwr_logs'a satır ekleme
-- ---------------------------------------------------------------------------
-- athletes satırı silinirken CASCADE önce bireysel programları (→ seans → geri bildirim)
-- siler; session_feedback_acwr_sync o gün hâlâ takım programından yük görürse silinmekte
-- olan sporcuya INSERT dener. Bugün bu, acwr_logs CASCADE'inin (daha eski FK) geçici
-- satırı FK kontrolünden önce silmesiyle tesadüfen geçiyor (Faz 2 öncesi ROLLBACK
-- testinde doğrulandı) — FK sırası değişirse silme tamamen geri dönerdi. Sporcu yoksa çık.
create or replace function public.recalc_acwr_day(p_athlete_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_dur      int;
  v_load     numeric;
  v_rpe      numeric;
  v_source   text;
begin
  if not exists (select 1 from athletes where id = p_athlete_id) then
    return;
  end if;

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
$function$;
