-- 044_super_admin_app_metadata.sql
-- KRİTİK GÜVENLİK: super admin yetkisi user_metadata'dan (istemciden
-- supabase.auth.updateUser({ data: {...} }) ile değiştirilebilir) app_metadata'ya
-- (yalnızca service role/admin API ile değiştirilebilir) taşınıyor.
-- Öncesinde herhangi bir giriş yapmış kullanıcı kendini süper admin yapabiliyordu.

-- 1) Mevcut süper admin(ler)i app_metadata'ya kopyala
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                        || jsonb_build_object('platform_role', 'super_admin')
where raw_user_meta_data->>'platform_role' = 'super_admin';

-- 2) Yetki kontrolünü app_metadata'ya taşı
--    İmza, dil, volatility, security definer ve search_path AYNEN korunur.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(exists (
    select 1 from auth.users
    where id = auth.uid()
      and raw_app_meta_data->>'platform_role' = 'super_admin'
  ), false);
$$;

-- 3) user_metadata'daki eski anahtarı temizle (istemciden geri yazılamasın diye)
update auth.users
set raw_user_meta_data = raw_user_meta_data - 'platform_role'
where raw_user_meta_data ? 'platform_role';
