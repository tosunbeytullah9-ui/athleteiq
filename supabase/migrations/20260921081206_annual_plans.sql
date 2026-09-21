-- =============================================
-- 044_annual_plans.sql — Yıllık (sezonluk) periyodizasyon planı (Parti 23-YP)
--
-- KAYNAK: "RAMS 2026-2027 SEZONU KUVVET&KONDİSYON YILLIK PLAN.xlsx" dosyasındaki
-- ızgara. Excel'de her SAYFA bir hedef (Ünilig/Prolig takımı), her SÜTUN bir sezon
-- haftası, her SATIR ya bir bağlam satırı (MAÇLAR, HOME/AWAY, CYCLES/LOADS) ya da
-- bir antrenman sistemi (Contrast Training, Hipertrofi, Max, Deload, Aerobik/
-- Anaerobik Dayanıklılık, Hız/Hızlanma/Çeviklik...). Sistem satırındaki hücre
-- değeri = o hafta o sistemden kaç seans yapılacağı.
--
-- Dört tablo:
--   annual_plan_methods — org'a özel, düzenlenebilir antrenman sistemi satırları
--                         (Excel'de sabit 11 satır; branşa göre değişebilsin diye
--                          org kütüphanesi — org_exercises deseni)
--   annual_plans        — bir sezon planı (team_id XOR athlete_id)
--   annual_plan_weeks   — hafta bağlamı (yoğunluk %, faz, iç/dış saha, not)
--   annual_plan_cells   — (hafta × sistem) seans sayısı — ızgaranın gövdesi
--
-- BİLİNÇLİ KAPSAM KARARLARI (kullanıcı onaylı):
--  1) YARIŞMA SATIRI BU ŞEMADA YOK. Excel'in "MAÇLAR" satırı competitions +
--     competition_entries'ten TÜRETİLİR (takım planı → competitions.team_id,
--     sporcu planı → o sporcunun competition_entries kayıtları). Yarışma verisi
--     ikinci bir yerde tutulmaz — bireysel branşta her sporcunun yarışması farklı
--     olduğu için tek kaynak şart.
--  2) Bu katman PROGRAM ÜRETMEZ. program_blocks/training_programs'a hiçbir FK
--     veya trigger bağı yok; yıllık plan üst seviye bir makro-döngü haritasıdır.
--  3) SPORCU ERİŞİMİ YOK — attendance_records (042) ile aynı tercih: bu bir koç
--     planlama aracı. RLS'te sporcu dalı bilinçli olarak yazılmadı, dolayısıyla
--     middleware/layout athlete guard allow-list'i de GENİŞLETİLMEDİ.
--
-- RLS ŞABLONU: 025_team_scoped_training_rls.sql'deki coach dalı birebir —
-- coach ya doğrudan team_id eşleşmesiyle ya da (bireysel planda) o sporcunun
-- team_id'si üzerinden erişir. weeks/cells, training_sessions/exercises'ın
-- training_programs'a kaskad ettiği gibi annual_plans'a kaskad eder — ama koşul
-- kopyalanmak yerine can_access_annual_plan() helper'ında tekil tutulur
-- (gerekçe ve §4.1 muafiyeti dosyanın RLS bölümünde ayrıntılı yazılı).
-- =============================================

-- ---------------------------------------------
-- 1. annual_plan_methods — org'a özel antrenman sistemi kütüphanesi
-- ---------------------------------------------
create table annual_plan_methods (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade not null,
  name        text not null,
  -- UI'da satır rozetinin rengi (hex, örn. '#ef4444'). Yalnızca görsel.
  color       text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Aynı org içinde aynı isimde iki sistem olmasın (büyük/küçük harf duyarsız —
-- profiles'taki (org_id, lower(username)) indeksiyle aynı desen).
create unique index idx_annual_plan_methods_org_name
  on annual_plan_methods(org_id, lower(name));
create index idx_annual_plan_methods_org_id on annual_plan_methods(org_id);

create trigger annual_plan_methods_updated_at
  before update on annual_plan_methods
  for each row execute function update_updated_at();

-- ---------------------------------------------
-- 2. annual_plans — sezon planı (takım XOR sporcu)
-- ---------------------------------------------
create table annual_plans (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organizations(id) on delete cascade not null,
  team_id      uuid references teams(id) on delete cascade,
  athlete_id   uuid references athletes(id) on delete cascade,
  title        text not null,
  -- 1. haftanın başlangıç günü. Excel'deki TARİH satırı bundan +7'şer türetilir,
  -- ayrı bir tarih kolonu tutulmaz (hafta i → season_start + (i-1)*7).
  season_start date not null,
  total_weeks  int not null check (total_weeks >= 1 and total_weeks <= 104),
  notes        text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  -- 001_schema.sql:84-87 (training_programs) ve 017 (program_blocks) ile aynı XOR.
  constraint annual_plans_scope_check check (
    (team_id is not null and athlete_id is null) or
    (athlete_id is not null and team_id is null)
  )
);

create index idx_annual_plans_org_id on annual_plans(org_id);
create index idx_annual_plans_team_id on annual_plans(team_id);
create index idx_annual_plans_athlete_id on annual_plans(athlete_id);

create trigger annual_plans_updated_at
  before update on annual_plans
  for each row execute function update_updated_at();

-- ---------------------------------------------
-- 3. annual_plan_weeks — hafta bağlamı (Excel'in CYCLES/LOADS + HOME/AWAY satırları)
--
-- Her hafta için satır ZORUNLU DEĞİL — yalnızca yoğunluk/faz/not girilen haftalar
-- için satır yazılır (seyrek tablo). Boş hafta = plan var ama o hafta işaretlenmemiş.
-- ---------------------------------------------
create table annual_plan_weeks (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid references annual_plans(id) on delete cascade not null,
  week_index     int not null check (week_index >= 1),
  -- Excel'de 0.55 / 0.84 / 1 olarak tutuluyordu; burada YÜZDE olarak (55, 84, 100)
  -- saklanır — %1RM alanlarının projedeki mevcut gösterimiyle (exercise_sets) tutarlı.
  intensity_pct  numeric(5,2) check (intensity_pct is null or (intensity_pct >= 0 and intensity_pct <= 200)),
  -- Makro faz etiketi (hazırlık / müsabaka / geçiş vb.) — serbest metin,
  -- training_programs.phase ile aynı gevşek desen.
  phase          text,
  -- Excel'in HOME/AWAY satırı. Bireysel branşta "deplasman/ev" yerine kamp/seyahat
  -- notu olarak da kullanılabildiği için check constraint yok, serbest metin.
  location       text,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (plan_id, week_index)
);

create index idx_annual_plan_weeks_plan_id on annual_plan_weeks(plan_id);

create trigger annual_plan_weeks_updated_at
  before update on annual_plan_weeks
  for each row execute function update_updated_at();

-- ---------------------------------------------
-- 4. annual_plan_cells — ızgaranın gövdesi: (hafta × sistem) → seans sayısı
--
-- Seyrek: yalnızca sessions >= 1 olan hücreler için satır tutulur. Sıfıra düşen
-- hücre UI tarafından SİLİNİR (upsert yerine delete) — 59 hafta × 11 sistem = 649
-- satırlık yoğun bir ızgarayı her planda materyalize etmenin anlamı yok.
-- ---------------------------------------------
create table annual_plan_cells (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid references annual_plans(id) on delete cascade not null,
  method_id   uuid references annual_plan_methods(id) on delete cascade not null,
  week_index  int not null check (week_index >= 1),
  sessions    int not null check (sessions >= 1 and sessions <= 14),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (plan_id, method_id, week_index)
);

create index idx_annual_plan_cells_plan_id on annual_plan_cells(plan_id);
create index idx_annual_plan_cells_method_id on annual_plan_cells(method_id);

create trigger annual_plan_cells_updated_at
  before update on annual_plan_cells
  for each row execute function update_updated_at();

-- =============================================
-- RLS
-- =============================================
alter table annual_plan_methods enable row level security;
alter table annual_plans        enable row level security;
alter table annual_plan_weeks   enable row level security;
alter table annual_plan_cells   enable row level security;

-- ---------------------------------------------
-- annual_plan_methods — org kütüphanesi (org_exercises, 005_exercises.sql deseni)
-- Sporcu OKUMAZ: org_exercises'ın aksine bu satırlar sporcuya gösterilen bir
-- egzersiz kütüphanesi değil, koçun planlama ızgarasının satır başlıkları.
-- ---------------------------------------------
create policy "annual_plan_methods_select" on annual_plan_methods for select using (
  coalesce(is_super_admin() or my_role(org_id) in ('admin', 'coach'), false)
);

create policy "annual_plan_methods_insert" on annual_plan_methods for insert with check (
  coalesce(is_super_admin() or my_role(org_id) in ('admin', 'coach'), false)
);

create policy "annual_plan_methods_update" on annual_plan_methods for update using (
  coalesce(is_super_admin() or my_role(org_id) in ('admin', 'coach'), false)
) with check (
  coalesce(is_super_admin() or my_role(org_id) in ('admin', 'coach'), false)
);

-- Silme: admin her şeyi, koç yalnızca kendi eklediğini (org_categories_delete deseni).
-- Bir sistem silinince ona bağlı TÜM planlardaki hücreleri cascade ile götürür —
-- bu yüzden UI silme yerine is_active=false'u sunar.
create policy "annual_plan_methods_delete" on annual_plan_methods for delete using (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin'
    or (my_role(org_id) = 'coach' and created_by = auth.uid()),
    false
  )
);

-- ---------------------------------------------
-- annual_plans — 025_team_scoped_training_rls.sql'deki coach dalı birebir
-- ---------------------------------------------
create policy "annual_plans_select" on annual_plans for select using (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin'
    or (
      my_role(org_id) = 'coach'
      and (
        team_id = my_team_id(org_id)
        or exists (
          select 1 from athletes a
          where a.id = annual_plans.athlete_id
          and a.team_id = my_team_id(org_id)
        )
      )
    ),
    false
  )
);

create policy "annual_plans_write" on annual_plans for all using (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin'
    or (
      my_role(org_id) = 'coach'
      and (
        team_id = my_team_id(org_id)
        or exists (
          select 1 from athletes a
          where a.id = annual_plans.athlete_id
          and a.team_id = my_team_id(org_id)
        )
      )
    ),
    false
  )
) with check (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin'
    or (
      my_role(org_id) = 'coach'
      and (
        team_id = my_team_id(org_id)
        or exists (
          select 1 from athletes a
          where a.id = annual_plans.athlete_id
          and a.team_id = my_team_id(org_id)
        )
      )
    ),
    false
  )
);

-- ---------------------------------------------
-- annual_plan_weeks / annual_plan_cells — plana kaskad eder
--
-- 002_rls.sql'deki sessions_select/exercises_select, üst tablonun erişim
-- koşulunu alt tablonun politikasında AÇIKÇA TEKRAR EDER — örtük bir "üst
-- satır RLS'ten geçiyorsa alt satır da geçer" kaskadına GÜVENMEZ. Aynı
-- ilkeyi koruyoruz, ama koşul burada 15 satır ve üç tabloda (plans/weeks/
-- cells) altı kez tekrarlanacaktı; altı kopya arasında ileride oluşacak bir
-- sapma sessiz bir yetki açığı demektir. Bu yüzden koşul TEK bir yerde,
-- can_access_annual_plan()'da yaşıyor.
--
-- §4.1 MUAFİYETİ: bu fonksiyondan authenticated EXECUTE yetkisi KALDIRILAMAZ
-- — my_role/my_team_id/is_super_admin ile aynı gerekçe, RLS politikalarının
-- içinden çağrılıyor. "Gövdenin ilk satırlarında coalesce ile sarmalanmış
-- yetki kontrolü" kuralı da doğal olarak sağlanıyor: fonksiyonun GÖVDESİNİN
-- TAMAMI zaten o yetki kontrolüdür ve coalesce(..., false) ile fail-closed'dır.
-- SECURITY DEFINER olması ayrıca annual_plans üzerinde RLS-içinde-RLS
-- özyinelemesini de engeller.
-- ---------------------------------------------
create or replace function can_access_annual_plan(p_plan_id uuid)
returns boolean language sql security definer stable as $$
  select coalesce(
    exists (
      select 1 from annual_plans p
      where p.id = p_plan_id
      and (
        is_super_admin()
        or my_role(p.org_id) = 'admin'
        or (
          my_role(p.org_id) = 'coach'
          and (
            p.team_id = my_team_id(p.org_id)
            or exists (
              select 1 from athletes a
              where a.id = p.athlete_id
              and a.team_id = my_team_id(p.org_id)
            )
          )
        )
      )
    ),
    false
  );
$$;

revoke all on function can_access_annual_plan(uuid) from public, anon;
grant execute on function can_access_annual_plan(uuid) to authenticated;

create policy "annual_plan_weeks_select" on annual_plan_weeks for select using (
  can_access_annual_plan(plan_id)
);

create policy "annual_plan_weeks_write" on annual_plan_weeks for all using (
  can_access_annual_plan(plan_id)
) with check (
  can_access_annual_plan(plan_id)
);

create policy "annual_plan_cells_select" on annual_plan_cells for select using (
  can_access_annual_plan(plan_id)
);

create policy "annual_plan_cells_write" on annual_plan_cells for all using (
  can_access_annual_plan(plan_id)
) with check (
  can_access_annual_plan(plan_id)
);
