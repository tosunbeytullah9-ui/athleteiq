-- =============================================
-- demo_requests — landing sayfasındaki "Demo isteyin" formundan gelen talepler
-- =============================================
-- Yazma YALNIZCA apps/web/app/api/demo-request/route.ts'ten (service role) yapılır:
-- INSERT politikası yok, anon/authenticated'ın yazma yetkisi kaldırıldı. Okuma ve
-- durum güncelleme yalnızca süper admin (athlete_ai_insights ile aynı desen).
-- Ham IP saklanmaz; hız sınırı için tuzlu sha256 (ip_hash) tutulur.

create table public.demo_requests (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  full_name     text not null check (char_length(full_name) between 2 and 120),
  organization  text not null check (char_length(organization) between 2 and 160),
  role          text not null check (role in ('coach', 'org_admin', 'athlete', 'other')),
  discipline    text check (char_length(discipline) <= 80),
  athlete_count text check (athlete_count in ('1-10', '11-30', '31-100', '100+')),
  email         text not null check (char_length(email) <= 254),
  phone         text check (char_length(phone) <= 40),
  message       text check (char_length(message) <= 1000),
  kvkk_consent  boolean not null check (kvkk_consent),
  status        text not null default 'new' check (status in ('new', 'contacted', 'onboarded', 'rejected')),
  admin_note    text check (char_length(admin_note) <= 2000),
  ip_hash       text,
  notified_at   timestamptz
);

create index idx_demo_requests_created_at on public.demo_requests (created_at desc);
create index idx_demo_requests_ip_hash on public.demo_requests (ip_hash, created_at);

alter table public.demo_requests enable row level security;

create policy demo_requests_select_super_admin
  on public.demo_requests for select
  using (coalesce(is_super_admin(), false));

create policy demo_requests_update_super_admin
  on public.demo_requests for update
  using (coalesce(is_super_admin(), false))
  with check (coalesce(is_super_admin(), false));

revoke all on public.demo_requests from anon;
revoke insert, delete on public.demo_requests from authenticated;
