-- =============================================
-- 20261005122102_drill_diagrams.sql — Drill (koni) diyagramları (2026-10-05)
--
-- Hız / hızlanma / çeviklik drill'leri için koni yerleşimi + rota çizimi.
-- Diyagram bir ORG EGZERSİZİNE bağlıdır (1:1): program satırları kütüphaneye
-- yalnızca ADIYLA bağlı olduğu için (exercises.name, FK yok — demo linki ve
-- 1RM eşleşmesiyle aynı model) diyagram da programda isimden çözülür. Böylece
-- program kaydetme/kopyalama/haftayı ileri taşıma RPC'lerine HİÇ dokunulmaz.
--
-- GÖRÜNÜRLÜK: yalnızca koç + admin (+ süper admin). Sporcu dalı BİLEREK yok
-- (kullanıcı kararı) — diyagramlar org_exercises'a kolon olarak EKLENMEDİ,
-- çünkü org_exercises_select sporcuya da açık; gizlilik UI'da değil RLS'te.
--
-- diagram jsonb'nin şekli packages/validators/drill.ts (drillDiagramSchema)
-- tarafından doğrulanır; DB yalnızca nesne olduğunu ve boyut sınırını zorlar.
-- =============================================

create table drill_diagrams (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  org_exercise_id  uuid not null unique references org_exercises(id) on delete cascade,
  unit             text not null default 'm' check (unit in ('m', 'yd')),
  diagram          jsonb not null,
  setup_notes      text,
  created_by       uuid references auth.users(id) default auth.uid(),
  updated_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint drill_diagrams_diagram_object check (jsonb_typeof(diagram) = 'object'),
  constraint drill_diagrams_diagram_size check (pg_column_size(diagram) <= 65536),
  constraint drill_diagrams_setup_notes_len check (setup_notes is null or char_length(setup_notes) <= 2000)
);

create index idx_drill_diagrams_org_id on drill_diagrams(org_id);

create trigger drill_diagrams_updated_at
  before update on drill_diagrams
  for each row execute function update_updated_at();

alter table drill_diagrams enable row level security;

-- Okuma: org'un admin'i ve koçları (takım ayrımı yok — egzersiz kütüphanesi
-- de org geneli). Sporcu dalı YOK.
create policy "drill_diagrams_select" on drill_diagrams for select using (
  coalesce(
    is_super_admin()
    or my_role(org_id) in ('admin', 'coach'),
    false
  )
);

-- Ekleme: admin/koç, kendi adına, yalnızca AYNI org'un egzersizine.
create policy "drill_diagrams_insert" on drill_diagrams for insert with check (
  coalesce(
    (is_super_admin() or my_role(org_id) in ('admin', 'coach'))
    and created_by = auth.uid()
    and exists (
      select 1 from org_exercises e
      where e.id = org_exercise_id and e.org_id = drill_diagrams.org_id
    ),
    false
  )
);

-- Güncelleme/silme: org_exercises_update ile aynı kalıp — admin hepsini,
-- koç yalnızca kendi oluşturduğu diyagramı.
create policy "drill_diagrams_update" on drill_diagrams for update
using (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin'
    or (my_role(org_id) = 'coach' and created_by = auth.uid()),
    false
  )
)
with check (
  coalesce(
    (
      is_super_admin()
      or my_role(org_id) = 'admin'
      or (my_role(org_id) = 'coach' and created_by = auth.uid())
    )
    and exists (
      select 1 from org_exercises e
      where e.id = org_exercise_id and e.org_id = drill_diagrams.org_id
    ),
    false
  )
);

create policy "drill_diagrams_delete" on drill_diagrams for delete using (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin'
    or (my_role(org_id) = 'coach' and created_by = auth.uid()),
    false
  )
);

revoke all on public.drill_diagrams from anon;

comment on table drill_diagrams is
  'Hız/çeviklik drill''i için koni yerleşimi + rota diyagramı; bir org egzersizine 1:1 bağlı, programda egzersiz ADINDAN çözülür. Yalnızca koç/admin okur/yazar — sporcu görünürlüğü YOK (20261005122102_drill_diagrams.sql).';
