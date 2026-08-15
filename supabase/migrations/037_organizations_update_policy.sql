-- =============================================
-- 037_organizations_update_policy.sql — Parti 17
--
-- orgs_update yalnızca is_super_admin() idi (002_rls.sql) — org admini
-- kendi organizasyonunun adını bile değiştiremiyordu. Org admin'e genişletiliyor.
--
-- RLS satır-seviyesinde çalışır, kolon-seviyesinde değil — "admin sadece
-- name/logo_url değiştirebilir, slug/plan yalnızca süper admin" kısıtını
-- RLS politikası tek başına garanti edemez (formu atlayıp doğrudan API
-- çağrısıyla slug/plan değiştirilebilir). Bu yüzden bir BEFORE UPDATE
-- trigger ile veri katmanında da kapatılıyor (CLAUDE.md §4.1 konvansiyonu).
-- =============================================

drop policy if exists "orgs_update" on organizations;
create policy "orgs_update" on organizations for update using (
  coalesce(is_super_admin() or my_role(id) = 'admin', false)
);
-- organizations.id kendisi org_id'dir (my_role bir org_id parametresi ister).

create or replace function protect_org_admin_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not public.is_super_admin() then
    if new.slug is distinct from old.slug then
      raise exception 'Slug yalnızca süper admin tarafından değiştirilebilir';
    end if;
    if new.plan is distinct from old.plan then
      raise exception 'Plan yalnızca süper admin tarafından değiştirilebilir';
    end if;
  end if;
  return new;
end;
$$;

create trigger organizations_protect_admin_fields
  before update on organizations
  for each row execute function protect_org_admin_fields();
