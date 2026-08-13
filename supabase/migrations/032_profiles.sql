-- =============================================
-- 032_profiles.sql — Parti 16: org-scoped kimlik temeli
--
-- `profiles`: auth.users(id) ile 1:1, org-scoped username + full_name.
-- Motivasyon: koç/admin adının UI'da gösterilememesi (BUGS.md, Parti 13'te
-- açık bulgu olarak kaydedilmişti) + yeni sentetik email deseninin
-- ({username}@{org_slug}.athleteiq.app) org_id/username kaynağı.
--
-- id = auth.users(id) doğrudan PK — kompozit anahtar YOK, çünkü kimlik modeli
-- artık "bir auth hesabı = bir org": org değiştirmek yeni bir auth hesabı
-- gerektirir (bkz. Görev 6 Adım 3 — ikinci admin hesabı, ayrı bir auth kaydı).
--
-- INSERT/DELETE RLS politikası YOK (bilinçli): profil satırları yalnızca
-- service-role Edge Function'lar (create-org-user) tarafından yazılıyor;
-- authenticated/anon rolü RLS'in varsayılan-deny'i yüzünden asla doğrudan
-- insert/delete edemez.
--
-- athletes.username'in GLOBAL unique index'i (idx_athletes_username_lower,
-- 022_add_athlete_username.sql) ile buradaki ORG-SCOPED unique index
-- bilinçli olarak ayrı namespace'ler — dokunulmuyor, çakışmıyorlar.
-- =============================================

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  username    text not null,
  full_name   text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_profiles_org_id on profiles(org_id);
create unique index idx_profiles_org_username_lower on profiles(org_id, lower(username));

alter table profiles enable row level security;

create trigger profiles_updated_at
before update on profiles
for each row execute function update_updated_at();

-- SELECT: super_admin, kendi satırı, veya hedef org'da HERHANGİ bir
-- membership'i olan herkes (coach/athlete dahil) — isim gösterimi bu yüzden
-- org-geneli, admin'e özel değil.
create policy "profiles_select" on profiles for select using (
  coalesce(
    is_super_admin()
    or id = auth.uid()
    or my_role(org_id) is not null,
    false
  )
);

-- UPDATE: yalnızca super_admin veya hedef org'un admin'i.
create policy "profiles_update" on profiles for update using (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin',
    false
  )
);
