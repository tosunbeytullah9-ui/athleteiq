-- Parti 18T — "bugün" SQL'de İstanbul takvimiyle.
-- Veritabanı saat dilimi UTC: current_date Türkiye'de 00:00–03:00 arası DÜNÜ verir.
-- Türkiye 2016'dan beri sabit UTC+3; 'Europe/Istanbul' bu ofseti döndürür.
-- RLS politikalarına (wellness_update, session_feedback_update_athlete) bilinçli olarak
-- DOKUNULMADI: İstanbul tarihi UTC'den hiç geride olmadığı için onların current_date'i
-- pencereyi en fazla bir gün genişletir, hiçbir zaman haksız ret üretmez.

-- 1) Geri bildirim seans tarihi — yalnızca programın start_date'i yoksa düşülen yedek.
--    İmza aynı (CREATE OR REPLACE → grant'ler korunur).
create or replace function public.set_session_feedback_date()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v_date date;
begin
  select p.start_date + (coalesce(s.day_of_week, 1) - 1)
    into v_date
  from training_sessions s
  join training_programs p on p.id = s.program_id
  where s.id = new.session_id;

  new.session_date := coalesce(v_date, (now() at time zone 'Europe/Istanbul')::date);
  return new;
end;
$function$;

-- 2) Wellness check-in tarihi varsayılanı. İstemciler checkin_date'i her zaman açıkça
--    gönderir (mobil: telefonun takvim günü, web: İstanbul); bu yalnızca güvenlik ağı.
alter table public.wellness_checkins
  alter column checkin_date set default ((now() at time zone 'Europe/Istanbul')::date);
