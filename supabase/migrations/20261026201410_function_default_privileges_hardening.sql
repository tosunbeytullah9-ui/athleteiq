-- =============================================
-- function_default_privileges_hardening — yeni fonksiyonlar anon/PUBLIC'e otomatik EXECUTE almasın
-- =============================================
-- Parti 18B-ek. Kök neden (canlıda doğrulandı, Faz 1): public şemasında postgres rolünün
-- oluşturduğu her YENİ fonksiyon iki kanaldan anon EXECUTE alıyordu:
--   1) Postgres'in GLOBAL yerleşik varsayılanı → PUBLIC=X
--   2) pg_default_acl'deki postgres/public satırı → anon=X (açıkça)
-- Parti 18-S create_program_with_weeks / update_program_week'ten anon'u kaldırmıştı; sonra
-- imzaları değişti (p_discipline, p_training_group). İmzası değişen fonksiyon Postgres için
-- YENİ bir fonksiyondur → varsayılan grant'ler geri geldi. Tek tek revoke yetmez, kaynak kapatılır.
--
-- Migration rolü: postgres (select current_user). supabase_admin'in varsayılanlarına DOKUNULMAZ
-- (o rolle fonksiyon oluşturmuyoruz). authenticated / service_role varsayılanları KORUNUR.

-- 1. public şemasına özel satırdan anon'u çıkar.
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

-- 2. PUBLIC'in EXECUTE hakkı yalnızca GLOBAL olarak kaldırılabilir (şema bazlı varsayılanlar
--    global olana yalnızca EKLENİR).
alter default privileges for role postgres
  revoke execute on functions from public;

-- 3. Global revoke public DIŞINDAKİ şemalarda davranışı değiştirmesin: postgres'in CREATE
--    yetkisi olan diğer şemalarda PUBLIC'e varsayılan EXECUTE geri verilir. extensions'ta
--    pgcrypto/uuid-ossp/pg_stat_statements fonksiyonları postgres'e ait — ileride CREATE
--    EXTENSION ile gelecek fonksiyonlar da eskisi gibi PUBLIC'e açık olur.
alter default privileges for role postgres in schema extensions
  grant execute on functions to public;
alter default privileges for role postgres in schema supabase_migrations
  grant execute on functions to public;

-- 4. Mevcut iki açık (eski imzalı overload yok — Faz 1'de doğrulandı). authenticated KORUNUR:
--    web bu RPC'leri oturumlu kullanıcıyla çağırıyor.
revoke execute on function public.create_program_with_weeks(
  uuid, uuid, uuid, text, text, text, integer, date, jsonb, text, text
) from anon, public;
revoke execute on function public.update_program_week(
  uuid, text, text, text, date, date, jsonb, text, text
) from anon, public;

-- 5. can_access_annual_plan: SECURITY DEFINER → search_path sabitlenir. Gövde şema nitelikli
--    değildi; search_path='' altında çözülebilsin diye önce public. önekleriyle yeniden yazılır
--    (mantık 20260921081206_annual_plans.sql ile BİREBİR aynı). create or replace ACL'yi korur
--    (authenticated EXECUTE — RLS içinden çağrıldığı için kaldırılamaz, §4.1 muafiyeti).
create or replace function public.can_access_annual_plan(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1 from public.annual_plans p
      where p.id = p_plan_id
      and (
        public.is_super_admin()
        or public.my_role(p.org_id) = 'admin'
        or (
          public.my_role(p.org_id) = 'coach'
          and (
            p.team_id = public.my_team_id(p.org_id)
            or exists (
              select 1 from public.athletes a
              where a.id = p.athlete_id
              and a.team_id = public.my_team_id(p.org_id)
            )
          )
        )
      )
    ),
    false
  );
$$;

-- tr_fold / matches_training_group BİLİNÇLİ OLARAK dokunulmadı: saf SQL, SECURITY INVOKER,
-- RLS içinde satır başına çağrılıyor — SET search_path inline edilmelerini engeller.
