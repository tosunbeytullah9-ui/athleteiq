# Loadwell — Veritabanı Şeması ve RLS (CLAUDE.md §3, §4, §4.0, §4.4)

> CLAUDE.md'den Parti 18J'de (2026-11-13) **birebir** taşındı — metin ve § numaraları değişmedi.
> Diğer bölümlerin yeri için CLAUDE.md'deki "Başvuru dokümanları" haritasına bakın: [CLAUDE.md](../../CLAUDE.md).
> Kapsam: §3 VERİTABANI ŞEMASI, §4 ROW LEVEL SECURITY (çekirdek tablolar), §4.0, §4.4.
> §4.1 Güvenlik Konvansiyonları, §4.2 Tip güvenliği ve §4.3 Kimlik modeli her oturumda gerektiği için CLAUDE.md'de kaldı.
> `AUTO-GENERATED:SCHEMA` bloğu `pnpm docs:sync` ile üretilir — elle düzenlemeyin.

---

## 3. VERİTABANI ŞEMASİ

> Tam DDL için `supabase/migrations/`, kolon tipleri için `packages/db/types.ts` bakın. Aşağıdaki liste her tablonun amacını özetler; açıklamalar `scripts/table-descriptions.json`'dan gelir ve `pnpm docs:sync` ile güncellenir.

<!-- AUTO-GENERATED:SCHEMA:START -->
- **account_deletion_requests** — Uygulama içinden başlatılan hesap silme talebi (App Store 5.1.1(v) + KVKK m.11/13): kişi (sporcu/koç/admin) mobil profilden talep eder, kişi başına tek açık talep, due_at = +30 gün. Yalnızca kişinin kendisi, o org'un admin'i ve süper admin görür; yazma politikası YOK — request/cancel/reject RPC'leri ve process-account-deletion Edge Function yazar. Tamamlanınca kişinin athletes satırı (21 tablo CASCADE) ve auth.users silinir, talepteki ad/kullanıcı adı/not NULL'lanır (20261026185610_account_deletion_requests.sql, Parti 18B). notified_at = yeni talep e-postasının platform sahibine gönderildiği an (notify-account-deletion, Parti 18B-ek).
- **acwr_logs** — sRPE yöntemiyle günlük antrenman yükü ve hesaplanan ACWR (Acute:Chronic Workload Ratio) oranı (001_schema.sql). source kolonu satırın kaynağını damgalar: 'manual' = koçun /acwr formundan elle girdiği, 'athlete_feedback' = session_feedback'ten otomatik türetilmiş (Parti 22-FB).
- **annual_plan_cells** — Yıllık plan ızgarasının gövdesi: (plan × hafta × antrenman sistemi) → o hafta kaç seans. SEYREK — yalnızca sessions >= 1 olan hücreler satır tutar, sıfıra düşen hücre silinir (52 hafta × 11 sistem = 572 satırlık yoğun ızgara materyalize edilmez) (20260921081206_annual_plans.sql, Parti 23-YP).
- **annual_plan_methods** — Organizasyona özel, düzenlenebilir antrenman sistemi listesi (Contrast Training, Hipertrofi, Max, Deload, Aerobik/Anaerobik Dayanıklılık, Hız/Çeviklik vb.) — yıllık plan ızgarasının SATIR başlıkları. org_exercises deseni: platform varsayılanı ilk plan oluşturulurken tohumlanır, sonrasında org kendi branşına göre düzenler. Silmek yerine is_active=false kullanılır, çünkü silme annual_plan_cells'i cascade ile götürür (20260921081206_annual_plans.sql, Parti 23-YP).
- **annual_plan_weeks** — Yıllık plandaki bir haftanın bağlamı: yoğunluk yüzdesi (Excel'in CYCLES/LOADS satırı, 0.55 yerine 55 olarak saklanır), makro faz etiketi, yer/durum (HOME/AWAY) ve serbest not. SEYREK tablo — yalnızca değer girilen haftalar için satır vardır, tüm alanlar boşaltılırsa satır silinir (20260921081206_annual_plans.sql, Parti 23-YP).
- **annual_plans** — Bir takıma VEYA bireysel sporcuya ait sezonluk periyodizasyon planı (team_id XOR athlete_id) — başlık, 1. haftanın başlangıç tarihi ve toplam hafta sayısı. Excel'deki yıllık plan sayfasının karşılığı; haftaların tarihleri season_start + (hafta-1)*7 ile TÜRETİLİR, ayrıca saklanmaz. Program üretmez, program_blocks/training_programs ile bağı yoktur — üst seviye bir makro-döngü haritasıdır (20260921081206_annual_plans.sql, Parti 23-YP).
- **athlete_1rm_records** — Sporcunun kayıtlı 1RM (bir tekrar maksimum) değerleri; %1RM bazlı yük hesaplama ve program builder'daki "Son max" rozeti bu tablodan beslenir (005_exercises.sql, UI kablolaması Parti 2.2.E).
- **athlete_ai_insights** — Süper admin'in tek tuşla ürettiği, bir sporcunun WHOOP verisi üzerine deterministik özellik hesaplama + LLM yorumundan oluşan Türkçe koç değerlendirmesi kaydı; yalnızca athlete-ai-insight Edge Function'ının service role'ü yazar, RLS SELECT'i yalnızca is_super_admin() true ise açar (20260916134047_athlete_ai_insights.sql, Parti 21-AI).
- **athlete_push_tokens** — Sporcunun Expo push notification token'ı; koç bir programı publish ettiğinde mobil bildirim göndermek için kullanılır (004_wearables.sql).
- **athletes** — Sporcu profili — organizasyon ve takıma bağlı, opsiyonel auth kullanıcısı, doğum tarihi/boy/kilo vb. (001_schema.sql). ÜÇ AYRI KAVRAM karıştırılmasın (20260922084236_position_vs_training_group.sql): BRANŞ sporcuda TUTULMAZ, teams.discipline'dan türetilir (tek kaynak); position = MEVKİ (Tight End, RB — serbest metin, bilgi amaçlı); training_group = ANTRENMAN GRUBU (Hücum Hattı, Skill), program görünürlüğünü RLS düzeyinde daraltan tek alan.
- **attendance_records** — Takım/tarih bazlı antrenman yoklaması (present/late/excused/absent); coach kendi takımını, admin org genelini görür/yazar — sporcu görünürlüğü yok (042_attendance.sql, 2026-09-05).
- **competition_entries** — Bir yarışmaya hangi sporcunun kayıtlı/gideceği (roster) — competition_results (SONUÇ, yarışma sonrası) ile karıştırılmasın, bu yarışma ÖNCESİ katılım kaydı (20260909070021_athlete_delete_and_competition_entries.sql). stages = sporcunun yarıştığı aşamalar (qualification / apparatus_final / team_final / all_around_final); boş dizi = yarışmada aşama kavramı yok (20261024082932_competition_stages.sql). GÖRÜNÜRLÜK (Parti 18C-S): personel (süper admin, org admin/koç) kurum genelini görür; sporcu yalnızca KENDİ kayıtlarını görür.
- **competition_results** — Bir sporcunun bir yarışmadaki sonucu (event/score/rank) (001_schema.sql). GÖRÜNÜRLÜK (Parti 18C-S): personel (süper admin, org admin/koç) kurum genelini görür; sporcu yalnızca KENDİ sonuçlarını görür.
- **competition_stages** — Cimnastik (FIG) yarışmasının aşamaları — Qualification, Apparatus Final, Team Final, All-Around Final — ve her aşamanın günü (stage_date NULL = yarışma tarihi). Aşamalar AYNI yarışmanın parçasıdır, ayrı yarışma kaydı açılmaz; finale kalan sporcu competition_entries.stages ile işaretlenir. Yazma RLS'i competition_entries ile birebir (20261024082932_competition_stages.sql). GÖRÜNÜRLÜK (Parti 18C-S): personel (süper admin, org admin/koç) kurum genelini görür; sporcu yalnızca kaydı veya sonucu olduğu yarışmaların aşamalarını görür.
- **competitions** — Organizasyona ait yarışma/müsabaka (takım veya bireysel) (001_schema.sql). GÖRÜNÜRLÜK (Parti 18C-S): personel (süper admin, org admin/koç) kurum genelini görür; sporcu yalnızca kaydı (competition_entries) veya sonucu (competition_results) olan yarışmaları görür (staff_competition_ids / own_competition_ids).
- **demo_requests** — Landing sayfasındaki "Demo isteyin" formundan gelen talepler (kurum, kişi, rol, branş, sporcu sayısı, iletişim, mesaj, KVKK onayı) ve süper admin'in takip durumu (new/contacted/onboarded/rejected) + notu. Yalnızca /api/demo-request service role ile yazar (INSERT politikası yok), RLS SELECT/UPDATE yalnızca is_super_admin(); ham IP saklanmaz, hız sınırı için tuzlu ip_hash tutulur (20261023144302_demo_requests.sql).
- **drill_diagrams** — Hız/hızlanma/çeviklik drill'i için koni yerleşimi + rota diyagramı (koniler, hareket tipine göre çizilen rota bölümleri — sprint/geri koşu/shuffle/carioca/çapraz adım/hafif koşu —, koni etrafı dönüşler, etiketler); birim drill bazında (m/yd). Bir org egzersizine 1:1 bağlıdır, programda egzersiz ADINDAN çözülür (demo linki ile aynı model). Yalnızca koç/admin okur/yazar — sporcu görünürlüğü YOK; jsonb şekli packages/validators/drill.ts'te doğrulanır (20261005122102_drill_diagrams.sql).
- **exercise_1rm_ratios** — Egzersizler arası bilinen 1RM oran ilişkisi (örn. Front Squat = Back Squat * 0.85); platform geneli, super admin panelinden yönetilir, sporcunun türetilen egzersizde doğrudan kaydı yoksa %1RM çözümlemesinde sessiz fallback olarak kullanılır (20260914075144_exercise_1rm_ratios.sql).
- **exercise_sets** — Bir egzersize ait set bazlı yük/RPE/tekrar kaydı; exercises tablosundaki tekil kg/RPE/% alanlarının yerini alan set-bazlı model (014_exercise_sets.sql, Parti 2.1).
- **exercises** — Bir seansa ait tekil egzersiz kaydı (sets/reps/load) — set bazlı detay için bkz. exercise_sets (001_schema.sql). Dayanıklılık seansında (training_sessions.endurance_modality dolu) her satır bir BÖLÜMDÜR: segment_type (warmup/steady/interval/recovery/cooldown), segment_repeats, TEK tekrarın segment_distance_m/segment_duration_sec'i, intensity_zone (1-5), intensity_target ve interval toparlanması (rest_sec + segment_recovery_target) — exercise_sets oluşturulmaz (20261002113316, 20261002113426).
- **fitbit_activities** — Fitbit'e özel, tekil antrenman (activity log) kaydı — whoop_workouts/polar_exercises'ın Fitbit karşılığı; manuel "Senkronize Et" butonuyla GET /1/user/-/activities/list.json ile çekilir, mesafe kullanıcının hesap birimine (km/mil) bağlı olduğundan distance_meter bilinçli olarak null bırakılır (20260913201909_fitbit_activities.sql).
- **memberships** — Kullanıcı-organizasyon-takım-rol ilişkisi (admin/coach/athlete); bir kullanıcının bir org'daki tek yetkisi (001_schema.sql).
- **org_exercise_categories** — Bir organizasyona özel, platform kütüphanesini genişleten egzersiz kategorileri (005_exercises.sql).
- **org_exercises** — Bir organizasyona özel, platform kütüphanesinde bulunmayan egzersiz tanımları (005_exercises.sql).
- **organizations** — Her müşteri (federasyon/kulüp) için bir tenant kaydı; plan (free/pro/enterprise) ve slug (URL prefix) burada tutulur (001_schema.sql).
- **platform_exercises** — Platform genelinde salt-okunur, global egzersiz kütüphanesi (135 egzersiz, 16 hareket paterni — 006_exercise_seed.sql ile dolduruldu) (005_exercises.sql).
- **polar_exercises** — Polar'a özel, tekil antrenman (exercise) kaydı — whoop_workouts'un Polar karşılığı, ancak alan adları Polar AccessLink v4 exercise şemasına göre (calories, training_load, distance_meter); manuel "Senkronize Et" butonuyla transaction lifecycle (aç→listele→commit) ile çekilir (20260913131022_polar_exercises.sql).
- **polar_sync_state** — Polar'ın transaction-tabanlı senkronizasyon modelinde, kaynak tipi başına son commit edilen transaction ID'si (004_wearables.sql).
- **profiles** — auth.users ile 1:1, org kapsamlı kullanıcı adı + görünen ad; sentetik email desenindeki ({username}@{org_slug}.athleteiq.app) org_id/username kaynağı, yalnızca service-role Edge Function'lar yazar (032_profiles.sql, Parti 16).
- **program_blocks** — Birden fazla haftalık training_programs satırını ortak bir döneme (örn. "8 Haftalık Hazırlık Dönemi") gruplayan üst seviye konteyner (017_program_blocks.sql, Parti 3.B). copy_program_block() bir bloğu tüm hafta ağacıyla yeni tarihe/hedefe TASLAK olarak kopyalar (20261002113316).
- **readiness_scores** — wellness_checkins'ten türetilen, bireysel taban çizgisine dayalı readiness skoru cache'i; sadece service_role/Edge Function yazar, hesaplama motoru henüz aktif değil (şema hazır) (013_readiness_scores.sql).
- **session_feedback** — Sporcunun bir antrenman seansı için koça verdiği geri bildirim (sporcu × seans): RPE (1-10), gerçek süre, tamamlanma durumu (completed/partial/skipped), ağrı bayrağı + bölge, serbest not ve koçun okundu/yanıt alanları. training_sessions.session_rpe/athlete_session_notes kolonlarının yerini alır — onlar takım programlarında tüm takımca paylaşılan bir satırda durduğu için sporcu bazlı veri tutamıyordu. Kaydedilince acwr_logs'un o günkü satırını ağırlıklı sRPE ile otomatik üretir (20260917072700_session_feedback.sql, Parti 22-FB).
- **teams** — Bir organizasyona bağlı takım. discipline = BRANŞ (Amerikan Futbolu, ARTİSTİK CİMNASTİK vb.) ve sporcunun branşının TEK KAYNAĞIDIR — athletes tablosunda branş kolonu yoktur, UI takımdan türetir (001_schema.sql, 20260922084236_position_vs_training_group.sql).
- **test_results** — Sporcu fiziksel test sonuçları (CMJ, sprint, kuvvet testleri vb. — bkz. ayrıca athlete_1rm_records) (001_schema.sql).
- **training_programs** — Takıma VEYA bireysel sporcuya atanan haftalık antrenman programı (team_id XOR athlete_id); is_published=false iken sporcu göremez (001_schema.sql). training_group doluysa yalnızca grubu VEYA mevkisi eşleşen takım sporcuları görür (matches_training_group, 20260922084236).
- **training_sessions** — Bir programa ait, haftanın belirli bir gününe düşen antrenman seansı (strength/conditioning/technical/recovery/competition) (001_schema.sql). Seans yapısı üçten biridir: standart (set bazlı), WOD (workout_format) veya dayanıklılık (endurance_modality: run/bike/row/swim/ski/walk/other) — ikisi birden dolu olamaz (training_sessions_single_structure_check, 20261002113316).
- **wearable_connections** — Sporcunun WHOOP/Polar hesabına bağlı OAuth access/refresh token'ları (şifreli saklanır) (004_wearables.sql).
- **wearable_daily_metrics** — WHOOP ve Polar'dan normalize edilmiş, ortak şemaya dönüştürülmüş günlük recovery/sleep/strain verisi (004_wearables.sql).
- **wellness_checkins** — Sporcunun günlük 5 maddelik özbildirim wellness anketi (McLean ve ark. 2010 ölçeği, 1=en kötü/5=en iyi, reverse-coding yok); readiness katmanının ham girdisi — üründe "Hooper Index" olarak ADLANDIRILMAZ (012_wellness.sql).
- **whoop_cycles** — WHOOP'a özel, cycle bazlı ham strain/recovery verisi (004_wearables.sql).
- **whoop_workouts** — WHOOP'a özel, tekil antrenman (workout) kaydı — whoop_cycles'ın günlük tek strain agregatının aksine bir günde birden fazla satır olabilir; webhook her workout.updated event'inde yalnızca o event'in kaydını çeker (20260913123732_whoop_workouts.sql).
<!-- AUTO-GENERATED:SCHEMA:END -->

---

## 4. ROW LEVEL SECURITY (ÇEKİRDEK TABLOLAR)

> Aşağıdaki politikalar yalnızca `002_rls.sql`'i (ilk 8 çekirdek tablo) kapsar. `platform_exercises`, `org_exercise_categories`, `org_exercises`, `athlete_1rm_records` (005), `wellness_checkins` (012), `readiness_scores` (013), `exercise_sets` (014), `program_blocks` (017), `athlete_push_tokens` (004), `attendance_records` (042) `competition_entries` (20260909070021), `competition_stages` (20261024082932), `drill_diagrams` (20261005122102 — sporcu dalı YOK) ve `account_deletion_requests` (20261026185610 — yazma politikası YOK, yalnızca RPC/Edge Function) için RLS politikaları kendi migration dosyalarında tanımlıdır, burada tekrar edilmez. `whoop_cycles` / `athlete_1rm_records` / `polar_sync_state` ve dört yarışma tablosunun **SELECT** politikaları Parti 18C-S'te (`20261028113032_athlete_scoped_reads_and_competition_visibility.sql`) definer küme fonksiyonlarıyla yeniden yazıldı: ilk üçü `athletes_select` ile aynı küme (`readable_athlete_ids()`), yarışmalarda personel kurum geneli, sporcu yalnızca kendi kaydı/sonucu olan yarışmalar ve kendi satırları (bkz. §4.1 istisna listesi).

```sql
-- =============================================
-- 002_rls.sql
-- =============================================

-- Helper fonksiyonlar
create or replace function my_role(org uuid)
returns text language sql security definer stable as $$
  select role from memberships
  where user_id = auth.uid() and org_id = org limit 1;
$$;

create or replace function my_team_id(org uuid)
returns uuid language sql security definer stable as $$
  select team_id from memberships
  where user_id = auth.uid() and org_id = org limit 1;
$$;

create or replace function is_super_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
    and raw_user_meta_data->>'platform_role' = 'super_admin'
  );
$$;

-- RLS'yi her tablo için aç
alter table organizations enable row level security;
alter table teams enable row level security;
alter table memberships enable row level security;
alter table athletes enable row level security;
alter table training_programs enable row level security;
alter table training_sessions enable row level security;
alter table exercises enable row level security;
alter table acwr_logs enable row level security;
alter table competitions enable row level security;
alter table competition_results enable row level security;
alter table test_results enable row level security;
alter table wearable_connections enable row level security;
alter table wearable_daily_metrics enable row level security;

-- ATHLETES: select
create policy "athletes_select" on athletes for select using (
  is_super_admin()
  or my_role(org_id) = 'admin'
  or (my_role(org_id) = 'coach' and team_id = my_team_id(org_id))
  or user_id = auth.uid()
);

-- ATHLETES: insert/update (sadece admin ve coach)
create policy "athletes_write" on athletes for insert with check (
  is_super_admin()
  or my_role(org_id) = 'admin'
  or (my_role(org_id) = 'coach' and team_id = my_team_id(org_id))
);

-- TRAINING_PROGRAMS: select
-- Sporcu: sadece is_published=true olanları görür
create policy "programs_select" on training_programs for select using (
  is_super_admin()
  or my_role(org_id) = 'admin'
  or my_role(org_id) = 'coach'
  or (
    exists (select 1 from athletes a where a.user_id = auth.uid()
            and (a.id = athlete_id or a.team_id = training_programs.team_id))
    and is_published = true
  )
);

-- TRAINING_PROGRAMS: write (admin ve coach)
create policy "programs_write" on training_programs for all using (
  is_super_admin()
  or my_role(org_id) = 'admin'
  or my_role(org_id) = 'coach'
);

-- ACWR_LOGS: sporcu kendi logu ekler, koç/admin okur
create policy "acwr_select" on acwr_logs for select using (
  is_super_admin()
  or exists (
    select 1 from athletes a
    where a.id = athlete_id
    and (
      a.user_id = auth.uid()
      or my_role(a.org_id) = 'admin'
      or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id))
    )
  )
);

-- WEARABLE_CONNECTIONS: sadece sporcu kendi bağlantısını görür
create policy "wearable_own" on wearable_connections for all using (
  exists (select 1 from athletes a
          where a.id = athlete_id and a.user_id = auth.uid())
  or is_super_admin()
);

-- SESSION ve EXERCISE tabloları program'a kaskad eder
-- (Ayrı politika yazılmaz — program'a erişim varsa session/exercise'e de var)
create policy "sessions_select" on training_sessions for select using (
  exists (
    select 1 from training_programs p
    where p.id = program_id
    and (
      is_super_admin()
      or my_role(p.org_id) = 'admin'
      or my_role(p.org_id) = 'coach'
      or (exists (select 1 from athletes a where a.user_id = auth.uid()
                  and (a.id = p.athlete_id or a.team_id = p.team_id))
          and p.is_published = true)
    )
  )
);

create policy "exercises_select" on exercises for select using (
  exists (
    select 1 from training_sessions s
    join training_programs p on p.id = s.program_id
    where s.id = session_id
    and (
      is_super_admin()
      or my_role(p.org_id) = 'admin'
      or my_role(p.org_id) = 'coach'
      or (exists (select 1 from athletes a where a.user_id = auth.uid()
                  and (a.id = p.athlete_id or a.team_id = p.team_id))
          and p.is_published = true)
    )
  )
);
```

> **Yukarıdaki blok TARİHSELDİR.** `training_programs` / `training_sessions` / `exercises` /
> `exercise_sets` politikaları sonradan değişti (025 koç takım kapsamı, 20260922084236
> `matches_training_group`) ve **Parti 18P'de (2026-10-27,
> `20261027091923_program_tree_rls_performance.sql`) tamamen yeniden yazıldı** — güncel desen
> aşağıdaki §4.0.

### 4.0 Program ağacı politikaları — definer id kümeleri (Parti 18P, 2026-10-27)

Eski politikalar dört tablonun her birinde `EXISTS (... join training_programs ...)` ile ebeveyne
iniyordu; alt sorgudaki her tablo kendi RLS'ini de uyguladığı için zincir 4 kat derinleşiyor,
`is_super_admin()`/`my_role()`/`auth.uid()` satır başına çağrılıyordu ve FOR ALL `*_write`
politikaları SELECT'te de OR'lanıyordu. Sporcunun gün sorgusu 184 SubPlan'lık bir plana
dönüşüyor, PostgREST üzerinden medyan 3,6 sn / p95 8,7 sn sürüp 30 denemede 2 kez statement
timeout veriyordu. Yeni desen:

| Tablo | SELECT | INSERT (with check) | UPDATE (using / with check) | DELETE |
|---|---|---|---|---|
| `training_programs` | `id in (select readable_program_ids())` | `can_write_program(org_id, team_id, athlete_id)` | `id in (select writable_program_ids())` / `can_write_program(...)` | `id in (select writable_program_ids())` |
| `training_sessions` | `program_id in (select readable_program_ids())` | `program_id in (select writable_program_ids())` | aynı / aynı | aynı |
| `exercises` | `session_id in (select readable_session_ids())` | `session_id in (select writable_session_ids())` | aynı / aynı | aynı |
| `exercise_sets` | `exercise_id in (select readable_exercise_ids())` | `exercise_id in (select writable_exercise_ids())` | aynı / aynı | aynı |

- **Erişim mantığı TEK yerde:** `readable_program_ids()` eski `programs_select`'in, `writable_program_ids()`
  / `can_write_program()` eski `programs_write`'ın birebir karşılığı (admin org geneli; koç kendi takım
  programları + kendi takımındaki sporcuların bireysel programları — koç dalı sporcunun org'uyla,
  `my_team_id(a2.org_id)`; sporcu kendi bireysel + `matches_training_group` eşleşen yayınlanmış takım
  programları). `*_session_ids()` / `*_exercise_ids()` program kümesini aşağı taşır.
- SECURITY DEFINER SQL fonksiyonları inline edilmez → her biri sorgu başına bir kez çalışır (hashed
  subplan), içerideki tablolara RLS uygulanmaz → zincir yok. Gün sorgusu: planlama 150 → 0,3 ms,
  PostgREST medyan 3.630 → 152 ms, timeout 2 → 0 (bkz. PROGRESS.md § Parti 18P).
- `training_programs` INSERT ve UPDATE WITH CHECK'i id kümesiyle yazılamaz (eklenen satır henüz
  kümede değil, UPDATE kapsamı değiştirebilir) → satır koşulu `can_write_program()`.
- Eşdeğerlik `scripts/security/rls-visibility-snapshot.mjs` ile kanıtlandı: 24 kimlik (anon dahil) ×
  4 tablo — okuma, toplu UPDATE/DELETE, örnek bazlı UPDATE/DELETE/INSERT ve ebeveyn taşıma — önce/sonra
  birebir aynı.
- Eşdeğerlik iki veri değişmezine dayanır (ikisi de canlıda 0 ihlal): `memberships (user_id, org_id)`
  UNIQUE (kısıt var) ve bireysel programın org'u = sporcunun org'u (kısıt YOK — bozulursa koç dalında
  `p.org_id` / `a2.org_id` farkı görünürlüğü değiştirebilir).
- **Ölçek notu:** `readable_exercise_ids()` görünür egzersizlerin tamamını materyalize eder (süper
  admin için bugün ~900). Görünür egzersiz sayısı ~100 bine yaklaşırsa `exercises` / `exercise_sets`'e
  `program_id` denormalizasyonu değerlendirilecek.
- `get_athlete_programs` aynı partide `matches_training_group` aldı — artık bir sporcu için
  döndürdüğü küme, o sporcunun RLS ile gördüğü arşivlenmemiş programlarla aynıdır (snapshot'ta her
  sporcu için kontrol edilir). Mobil sporcu/koç program ekranları ve web sporcu panosu aktif haftayı
  bu RPC + `isDateActive` + `sortAthletePrograms` (`getActiveAthletePrograms`, `packages/db/queries/programs.ts`)
  ve "bugün" ile seçer — mobilde telefonun takvim günü (`todayLocal`), web'de İstanbul takvimi
  (`todayInIstanbul`), ikisi de `packages/validators/date.ts` (Parti 18T, bkz. §1 tarih kuralı).

> _(§4.1 Güvenlik Konvansiyonları, §4.2 Tip Güvenliği Konvansiyonu ve §4.3 Kimlik Modeli → [CLAUDE.md](../../CLAUDE.md))_

### 4.4 Branş / Mevki / Antrenman Grubu — üç ayrı kavram (2026-09-22)

Bu üçü yıllarca tek bir "Pozisyon / Branş" kutusuna sıkışmıştı ve canlı veride
**13 sporcunun 12'sinde `athletes.position` yalnızca takımın branşını tekrar
ediyordu** ("ARTİSTİK CİMNASTİK", "Amerikan Futbolu"). Gerçek mevki bilgisi
gidecek yeri olmadığı için `training_group`'a yazılmıştı (Koç Rams: TE, RB,
Linebacker) — yani görünürlüğü daraltan alan, bilgi amaçlı bir alan gibi
kullanılıyordu. `20260922084236_position_vs_training_group.sql` bunu ayırdı:

| Kavram | Nerede durur | Görünürlüğe etkisi |
|---|---|---|
| **Branş** | `teams.discipline` — **TEK KAYNAK** | Yok |
| **Mevki** | `athletes.position` (Tight End, RB) | Yalnızca fallback (aşağıda) |
| **Antrenman Grubu** | `athletes.training_group` (Hücum Hattı, Skill) | **Asıl daraltma** |

**Branş sporcuda TUTULMAZ.** `athletes`'a branş kolonu eklenmedi — aynı bilgiyi
iki yerde tutmak uyuşmazlık üretir. Tüm arayüzler (sporcu listesi, sporcu detayı,
web/mobil profil, sporcu ekle/düzenle formları) branşı takımdan türetir. Sporcu
formlarında branş **girdisi yoktur**, yalnızca seçili takımın branşı bilgi olarak
gösterilir.

**Eşleşme kuralı — `matches_training_group(grup, mevki, program_grubu)`:** bir
takım programının grubu boşsa takımın tamamı görür; doluysa sporcunun **grubu
VEYA mevkisi** eşleşmelidir. Bu `coalesce` DEĞİL `OR`'dur ve bilinçlidir: koçun
aynı değeri hem Mevki hem Grup kutusuna yazmasını önler, ama "Hücum Hattı"
grubundaki bir TE'nin yalnızca TE'lere açılan bir programı da görmesini sağlar.
Karşılaştırma `tr_fold()` ile Türkçe duyarlıdır — `lower()` tek başına yetmez,
çünkü en_US.UTF-8 altında `lower('İ')` = `i` + U+0307 olduğundan
'Artistik Cimnastik' ile 'ARTİSTİK CİMNASTİK' eşleşmez (canlı veride 3 satırda
doğrulandı). Her iki fonksiyon da saf ve SECURITY INVOKER'dır (tabloya erişmez),
bu yüzden §4.1'in SECURITY DEFINER yetki-kontrolü kuralı kapsamları dışındadır.

Kural `programs_select` / `sessions_select` / `exercises_select` /
`exercise_sets_select` politikalarının dördünde de aynı fonksiyon çağrısıyla
tekil tutulur. TS ikizi `packages/validators/athlete.ts`'te
(`trFold` / `matchesTrainingGroup`, 10 birim test) — program builder'ın "bu
grupla N sporcu görecek: ..." önizlemesi sporcunun gerçekte göreceğiyle aynı
kuralı kullansın diye. **Biri değişirse diğeri de değişmelidir.**

`athlete-ai-insight`'ın `payload.ts`'i branşı ARTIK `position`'dan değil
`teams.discipline`'dan okur — backfill sonrası `position` mevki tuttuğu için eski
kaynak `brans`'ı sessizce hep "cimnastik" döndürürdü. `SYSTEM_PROMPT` artistik
cimnastiğe sabitli olduğundan `brans` sözlüğü genişletilmedi (Amerikan futbolu
sporcuları için hâlâ "cimnastik" döner — bkz. BUGS.md).

---

