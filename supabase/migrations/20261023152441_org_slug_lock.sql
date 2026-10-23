-- =============================================
-- Organizasyon slug kilidi (2026-10-23)
-- =============================================
-- Giriş kimliği {username}@{org_slug}.athleteiq.app olduğundan, kullanıcısı
-- (profiles satırı) olan bir org'un slug'ı değişirse o org'daki herkesin
-- girişi bozulur (auth.users.email otomatik güncellenmez). Bu yüzden slug
-- yalnızca HİÇ kullanıcısı olmayan org'da değiştirilebilir — süper admin dahil.

-- profiles RLS'i trigger içinden okumada kuralı sessizce geçirmesin diye
-- kontrol SECURITY DEFINER helper'da. §4.1: yetki kontrolü coalesce ile
-- fail-closed; yetkisiz çağıran (veya service role) her zaman false alır.
create or replace function public.org_has_users(org uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not coalesce(public.is_super_admin() or public.my_role(org) = 'admin', false) then
    return false;
  end if;
  return exists (select 1 from public.profiles p where p.org_id = org);
end;
$$;

revoke execute on function public.org_has_users(uuid) from public, anon;
grant execute on function public.org_has_users(uuid) to authenticated;

create or replace function public.protect_org_admin_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    if new.slug is distinct from old.slug then
      raise exception 'Slug yalnızca süper admin tarafından değiştirilebilir';
    end if;
    if new.plan is distinct from old.plan then
      raise exception 'Plan yalnızca süper admin tarafından değiştirilebilir';
    end if;
  end if;
  if new.slug is distinct from old.slug and public.org_has_users(old.id) then
    raise exception 'Bu organizasyonun kullanıcıları var; slug değiştirilemez (giriş kimlikleri slug''a bağlı)';
  end if;
  return new;
end;
$$;
