# AthleteIQ — Athlete Monitoring SaaS Platform
## CLAUDE.md — Agent Command Center

> Bu dosya projenin tek kaynak of truth'udur. Tüm agent'lar her görev öncesi bu dosyayı okur.
> Hiçbir agent bu dosyadaki kararları sormadan değiştirmez. Çakışma varsa bu dosya kazanır.

---

## 0. PROJE TANIMI

**Ürün adı:** AthleteIQ  
**Tip:** Multi-tenant B2B SaaS — Sporcu İzleme ve Antrenman Yönetim Platformu  
**Hedef kullanıcı:**
- **Super Admin** → Platform sahibi (sen). Tüm organizasyonlara erişir.
- **Org Admin** → Bir federasyon/kulüp yöneticisi. Kendi organizasyonunu yönetir.
- **Coach** → Belirli bir takımın antrenörü. Sadece kendi takımını görür.
- **Athlete** → Sporcu. Sadece kendi programını ve verilerini görür.

**Temel özellikler (MVP):**
1. Multi-tenant organizasyon yapısı (federasyon → takım → sporcu)
2. Antrenman programı oluşturma ve sporcuya/takıma atama
3. ACWR (Acute:Chronic Workload Ratio) takibi
4. Yarışma takvimi ve sonuçları
5. Test sonuçları (CMJ, sprint, kuvvet testleri)
6. Gerçek zamanlı program senkronizasyonu (sporcu anlık görür)
7. Sporcu davet sistemi (e-posta ile)

**Gelecek özellikler (agent'lar şu an altyapı hazırlar):**
- ~~WHOOP v2 entegrasyonu (recovery, sleep, strain, HRV)~~ — **AKTİF (2026-09-11)**, bkz. §11 Çalışan Özellikler
- Polar AccessLink v4 entegrasyonu (nightly recharge, training load, exercises)
- Stripe abonelik sistemi
- AI-destekli yük analizi

---

## 1. TEKNOLOJİ STACK'İ

### Monorepo
```
Turborepo + pnpm workspaces
Node.js >= 20
TypeScript 5.x (strict mode — zorunlu)
```

### Web (Koç & Admin Paneli)
```
Next.js 15 (App Router — pages router YASAK)
React 19
TailwindCSS 4.x
shadcn/ui (Radix UI tabanlı)
Server Components + `router.refresh()` (server state — TanStack Query bağımlılığı package.json'da var ama HİÇBİR yerde kullanılmıyor; bkz. §6 Agent 3 "UI kuralları")
Zustand (client state — sadece UI state için)
React Hook Form + Zod (form validation)
Recharts (grafikler)
```

### Mobile (Sporcu Uygulaması)
```
Expo SDK 53
React Native
Expo Router (file-based routing)
NativeWind (Tailwind for RN)
Expo Notifications (push)
Expo SecureStore (token storage)
```

### Backend
```
Supabase (primary backend):
  - PostgreSQL 15 (veritabanı)
  - Supabase Auth (JWT + magic link + OAuth)
  - Supabase Realtime (WebSocket — program senkronizasyonu)
  - Supabase Edge Functions (Deno — webhook handler'lar)
  - Row Level Security (veri izolasyonu)
  - Supabase Storage (profil fotoğrafları)

Resend (transactional email — davet, bildirim)
```

### Wearable Entegrasyonları (Altyapı Şimdi, Aktif Sonra)
```
WHOOP Developer Platform v2 API
  - Base: https://api.prod.whoop.com/developer/v2/
  - Auth: OAuth 2.0 + rotating refresh tokens
  - Webhooks: sleep.updated, workout.updated, recovery.created

Polar AccessLink Dynamic API v4
  - Base: https://www.polaraccesslink.com/v4/
  - Auth: OAuth 2.0 (long-lived tokens)
  - Model: Transaction-based (exercise) + Direct (sleep, nightly recharge)
  - Admin: https://admin.polaraccesslink.com
```

### Deploy
```
Vercel (Next.js web app)
Expo EAS (iOS + Android build)
Supabase (managed PostgreSQL + Edge Functions)
```

### Kalite
```
ESLint + Prettier (zorunlu — CI kırar)
Vitest (unit testler)
Playwright (E2E testler)
```

> **Doğrulama komutlarını HER ZAMAN `pnpm --filter <paket> run <script>` ile çalıştırın.**
> `npx next build` / `npx eslint` pnpm'in workspace symlink'lerinin dışında farklı bir
> binary/modül çözümlemesi kullanır ve **sahte hatalar** üretir: 2026-09-16'da `npx next build`
> `/404` prerender'ında `TypeError: Cannot read properties of null (reading 'useRef')`,
> `npx eslint` ise `Failed to patch ESLint` verdi — aynı kod `pnpm --filter @athleteiq/web run
> build` ile 49/49 sayfa temiz, `run lint` ile 0 hata veriyor. Bu sahte hata gerçek bir build
> arızası sanılıp boşuna teşhis yapıldı; komutu doğru çalıştırmak tek çözümdür.

---

## 2. MONOREPO KLASÖR YAPISI

<!-- AUTO-GENERATED:TREE:START -->
```
AthleteIQ/
├── .claude/
│   ├── scheduled_tasks.lock
│   └── settings.local.json
├── apps/
│   ├── mobile/
│   │   ├── android/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── .env
│   │   ├── .gitignore
│   │   ├── .npmrc
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── bugreport-sdk_gphone64_x86_64-BE4B.251210.005-2026-08-25-14-18-20.zip
│   │   ├── bundle_test.json
│   │   ├── emulator.log
│   │   ├── emulator2.log
│   │   ├── eslint.config.js
│   │   ├── expo-env.d.ts
│   │   ├── global.css
│   │   ├── index.js
│   │   ├── metro.config.js
│   │   ├── metro.log
│   │   ├── metro2.log
│   │   ├── metro3.log
│   │   ├── nativewind-env.d.ts
│   │   ├── package.json
│   │   ├── run-android.log
│   │   ├── run-android2.log
│   │   ├── run-android3.log
│   │   ├── run-android4.log
│   │   ├── studio.log
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   └── web/
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── .env.local
│       ├── .env.local.testcheck
│       ├── eslint.config.mjs
│       ├── middleware.ts
│       ├── next-env.d.ts
│       ├── next.config.ts
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── tsconfig.json
│       └── tsconfig.tsbuildinfo
├── packages/
│   ├── db/
│   │   ├── queries/
│   │   ├── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── types.ts
│   ├── integrations/
│   │   ├── fitbit/
│   │   ├── polar/
│   │   ├── whoop/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ui/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── validators/
│       ├── acwr.ts
│       ├── annual-plan.test.ts
│       ├── annual-plan.ts
│       ├── athlete-import.test.ts
│       ├── athlete-import.ts
│       ├── athlete.test.ts
│       ├── athlete.ts
│       ├── attendance.ts
│       ├── auth.test.ts
│       ├── auth.ts
│       ├── csv.test.ts
│       ├── csv.ts
│       ├── exercise.test.ts
│       ├── exercise.ts
│       ├── index.ts
│       ├── one-rm-import.test.ts
│       ├── one-rm-import.ts
│       ├── org-user.ts
│       ├── organization.ts
│       ├── package.json
│       ├── program-import.test.ts
│       ├── program-import.ts
│       ├── program.ts
│       ├── session-feedback.test.ts
│       ├── session-feedback.ts
│       ├── team.ts
│       ├── tsconfig.json
│       └── wellness.ts
├── patches/
│   └── react-native-css-interop@0.2.6.patch
├── scripts/
│   ├── security/
│   │   └── check-metadata-escalation.mjs
│   ├── docs-sync.mjs
│   ├── import-exercise-library.mjs
│   └── table-descriptions.json
├── supabase/
│   ├── .temp/
│   │   ├── cli-latest
│   │   ├── gotrue-version
│   │   ├── linked-project.json
│   │   ├── pooler-url
│   │   ├── postgres-version
│   │   ├── project-ref
│   │   ├── rest-version
│   │   └── storage-version
│   ├── functions/
│   │   ├── athlete-ai-insight/
│   │   ├── create-athlete-account/
│   │   ├── create-org-user/
│   │   ├── delete-org-user/
│   │   ├── grant-athlete-access/
│   │   ├── invite-member/
│   │   ├── reset-athlete-password/
│   │   ├── reset-user-password/
│   │   ├── update-org-user/
│   │   └── whoop-webhook/
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   ├── 002_rls.sql
│   │   ├── 003_functions.sql
│   │   ├── 004_wearables.sql
│   │   ├── 005_exercises.sql
│   │   ├── 006_exercise_seed.sql
│   │   ├── 008_rls_signup.sql
│   │   ├── 009_security_fixes.sql
│   │   ├── 010_trial.sql
│   │   ├── 011_realtime.sql
│   │   ├── 012_wellness.sql
│   │   ├── 013_readiness_scores.sql
│   │   ├── 014_exercise_sets.sql
│   │   ├── 015_exercise_sets_fixes.sql
│   │   ├── 016_session_rpe.sql
│   │   ├── 017_program_blocks.sql
│   │   ├── 018_create_program_with_weeks.sql
│   │   ├── 019_shared_session_tree_insert.sql
│   │   ├── 020_update_program_week.sql
│   │   ├── 021_propagate_week.sql
│   │   ├── 022_add_athlete_username.sql
│   │   ├── 023_drop_trial_system.sql
│   │   ├── 024_revert_signup_self_serve_rls.sql
│   │   ├── 025_team_scoped_training_rls.sql
│   │   ├── 026_team_scoped_program_rpc.sql
│   │   ├── 027_drop_calculate_acwr.sql
│   │   ├── 028_platform_exercises_admin_rls.sql
│   │   ├── 029_program_archive.sql
│   │   ├── 030_program_discipline.sql
│   │   ├── 031_1rm_team_scoped_rls.sql
│   │   ├── 032_profiles.sql
│   │   ├── 033_drop_memberships_insert_self.sql
│   │   ├── 034_teams_rls_fix.sql
│   │   ├── 035_teams_metadata.sql
│   │   ├── 036_athletes_team_id_nullable.sql
│   │   ├── 037_organizations_update_policy.sql
│   │   ├── 038_exercise_taxonomy_extend.sql
│   │   ├── 039_exercise_library_import.sql
│   │   ├── 041_exercise_taxonomy_extend2.sql
│   │   ├── 042_attendance.sql
│   │   ├── 043_training_groups.sql
│   │   ├── 20260818073627_parti_18s_secure_definer_functions.sql
│   │   ├── 20260827122641_platform_exercises_delete.sql
│   │   ├── 20260904124844_acwr_logs_update_policy.sql
│   │   ├── 20260909070021_athlete_delete_and_competition_entries.sql
│   │   ├── 20260912072715_wod_sessions.sql
│   │   ├── 20260913123732_whoop_workouts.sql
│   │   ├── 20260913131022_polar_exercises.sql
│   │   ├── 20260913201909_fitbit_activities.sql
│   │   ├── 20260914075144_exercise_1rm_ratios.sql
│   │   ├── 20260916084250_super_admin_app_metadata.sql
│   │   ├── 20260916134047_athlete_ai_insights.sql
│   │   ├── 20260917072700_session_feedback.sql
│   │   ├── 20260917074747_session_feedback_function_hardening.sql
│   │   ├── 20260921081206_annual_plans.sql
│   │   ├── 20260922084236_position_vs_training_group.sql
│   │   └── 20260922084343_position_vs_training_group_move_mevki.sql
│   ├── snippets/
│   ├── config.toml
│   └── seed.sql
├── .env
├── .env.example
├── .gitignore
├── .npmrc
├── .prettierignore
├── .prettierrc
├── BUGS.md
├── CLAUDE.md
├── MOBILE_STATUS.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── PROGRESS.md
├── READINESS_PLAN.md
├── tsconfig.base.json
├── turbo.json
└── vercel.json
```
<!-- AUTO-GENERATED:TREE:END -->

> Not: `packages/ui` yalnızca `apps/web` tarafından kullanılır (Radix UI tabanlı bileşenler, React Native ile uyumsuz — `apps/mobile`'da hiçbir referans yok). Mobile kendi bileşenlerini (`apps/mobile/components/`) kullanır.

---

## 3. VERİTABANI ŞEMASİ

> Tam DDL için `supabase/migrations/`, kolon tipleri için `packages/db/types.ts` bakın. Aşağıdaki liste her tablonun amacını özetler; açıklamalar `scripts/table-descriptions.json`'dan gelir ve `pnpm docs:sync` ile güncellenir.

<!-- AUTO-GENERATED:SCHEMA:START -->
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
- **competition_entries** — Bir yarışmaya hangi sporcunun kayıtlı/gideceği (roster) — competition_results (SONUÇ, yarışma sonrası) ile karıştırılmasın, bu yarışma ÖNCESİ katılım kaydı (20260909070021_athlete_delete_and_competition_entries.sql).
- **competition_results** — Bir sporcunun bir yarışmadaki sonucu (event/score/rank) (001_schema.sql).
- **competitions** — Organizasyona ait yarışma/müsabaka (takım veya bireysel) (001_schema.sql).
- **exercise_1rm_ratios** — Egzersizler arası bilinen 1RM oran ilişkisi (örn. Front Squat = Back Squat * 0.85); platform geneli, super admin panelinden yönetilir, sporcunun türetilen egzersizde doğrudan kaydı yoksa %1RM çözümlemesinde sessiz fallback olarak kullanılır (20260914075144_exercise_1rm_ratios.sql).
- **exercise_sets** — Bir egzersize ait set bazlı yük/RPE/tekrar kaydı; exercises tablosundaki tekil kg/RPE/% alanlarının yerini alan set-bazlı model (014_exercise_sets.sql, Parti 2.1).
- **exercises** — Bir seansa ait tekil egzersiz kaydı (sets/reps/load) — set bazlı detay için bkz. exercise_sets (001_schema.sql).
- **fitbit_activities** — Fitbit'e özel, tekil antrenman (activity log) kaydı — whoop_workouts/polar_exercises'ın Fitbit karşılığı; manuel "Senkronize Et" butonuyla GET /1/user/-/activities/list.json ile çekilir, mesafe kullanıcının hesap birimine (km/mil) bağlı olduğundan distance_meter bilinçli olarak null bırakılır (20260913201909_fitbit_activities.sql).
- **memberships** — Kullanıcı-organizasyon-takım-rol ilişkisi (admin/coach/athlete); bir kullanıcının bir org'daki tek yetkisi (001_schema.sql).
- **org_exercise_categories** — Bir organizasyona özel, platform kütüphanesini genişleten egzersiz kategorileri (005_exercises.sql).
- **org_exercises** — Bir organizasyona özel, platform kütüphanesinde bulunmayan egzersiz tanımları (005_exercises.sql).
- **organizations** — Her müşteri (federasyon/kulüp) için bir tenant kaydı; plan (free/pro/enterprise) ve slug (URL prefix) burada tutulur (001_schema.sql).
- **platform_exercises** — Platform genelinde salt-okunur, global egzersiz kütüphanesi (135 egzersiz, 16 hareket paterni — 006_exercise_seed.sql ile dolduruldu) (005_exercises.sql).
- **polar_exercises** — Polar'a özel, tekil antrenman (exercise) kaydı — whoop_workouts'un Polar karşılığı, ancak alan adları Polar AccessLink v4 exercise şemasına göre (calories, training_load, distance_meter); manuel "Senkronize Et" butonuyla transaction lifecycle (aç→listele→commit) ile çekilir (20260913131022_polar_exercises.sql).
- **polar_sync_state** — Polar'ın transaction-tabanlı senkronizasyon modelinde, kaynak tipi başına son commit edilen transaction ID'si (004_wearables.sql).
- **profiles** — auth.users ile 1:1, org kapsamlı kullanıcı adı + görünen ad; sentetik email desenindeki ({username}@{org_slug}.athleteiq.app) org_id/username kaynağı, yalnızca service-role Edge Function'lar yazar (032_profiles.sql, Parti 16).
- **program_blocks** — Birden fazla haftalık training_programs satırını ortak bir döneme (örn. "8 Haftalık Hazırlık Dönemi") gruplayan üst seviye konteyner (017_program_blocks.sql, Parti 3.B).
- **readiness_scores** — wellness_checkins'ten türetilen, bireysel taban çizgisine dayalı readiness skoru cache'i; sadece service_role/Edge Function yazar, hesaplama motoru henüz aktif değil (şema hazır) (013_readiness_scores.sql).
- **session_feedback** — Sporcunun bir antrenman seansı için koça verdiği geri bildirim (sporcu × seans): RPE (1-10), gerçek süre, tamamlanma durumu (completed/partial/skipped), ağrı bayrağı + bölge, serbest not ve koçun okundu/yanıt alanları. training_sessions.session_rpe/athlete_session_notes kolonlarının yerini alır — onlar takım programlarında tüm takımca paylaşılan bir satırda durduğu için sporcu bazlı veri tutamıyordu. Kaydedilince acwr_logs'un o günkü satırını ağırlıklı sRPE ile otomatik üretir (20260917072700_session_feedback.sql, Parti 22-FB).
- **teams** — Bir organizasyona bağlı takım. discipline = BRANŞ (Amerikan Futbolu, ARTİSTİK CİMNASTİK vb.) ve sporcunun branşının TEK KAYNAĞIDIR — athletes tablosunda branş kolonu yoktur, UI takımdan türetir (001_schema.sql, 20260922084236_position_vs_training_group.sql).
- **test_results** — Sporcu fiziksel test sonuçları (CMJ, sprint, kuvvet testleri vb. — bkz. ayrıca athlete_1rm_records) (001_schema.sql).
- **training_programs** — Takıma VEYA bireysel sporcuya atanan haftalık antrenman programı (team_id XOR athlete_id); is_published=false iken sporcu göremez (001_schema.sql). training_group doluysa yalnızca grubu VEYA mevkisi eşleşen takım sporcuları görür (matches_training_group, 20260922084236).
- **training_sessions** — Bir programa ait, haftanın belirli bir gününe düşen antrenman seansı (strength/conditioning/technical/recovery/competition) (001_schema.sql).
- **wearable_connections** — Sporcunun WHOOP/Polar hesabına bağlı OAuth access/refresh token'ları (şifreli saklanır) (004_wearables.sql).
- **wearable_daily_metrics** — WHOOP ve Polar'dan normalize edilmiş, ortak şemaya dönüştürülmüş günlük recovery/sleep/strain verisi (004_wearables.sql).
- **wellness_checkins** — Sporcunun günlük 5 maddelik özbildirim wellness anketi (McLean ve ark. 2010 ölçeği, 1=en kötü/5=en iyi, reverse-coding yok); readiness katmanının ham girdisi — üründe "Hooper Index" olarak ADLANDIRILMAZ (012_wellness.sql).
- **whoop_cycles** — WHOOP'a özel, cycle bazlı ham strain/recovery verisi (004_wearables.sql).
- **whoop_workouts** — WHOOP'a özel, tekil antrenman (workout) kaydı — whoop_cycles'ın günlük tek strain agregatının aksine bir günde birden fazla satır olabilir; webhook her workout.updated event'inde yalnızca o event'in kaydını çeker (20260913123732_whoop_workouts.sql).
<!-- AUTO-GENERATED:SCHEMA:END -->

---

## 4. ROW LEVEL SECURITY (ÇEKİRDEK TABLOLAR)

> Aşağıdaki politikalar yalnızca `002_rls.sql`'i (ilk 8 çekirdek tablo) kapsar. `platform_exercises`, `org_exercise_categories`, `org_exercises`, `athlete_1rm_records` (005), `wellness_checkins` (012), `readiness_scores` (013), `exercise_sets` (014), `program_blocks` (017), `athlete_push_tokens` (004), `attendance_records` (042) ve `competition_entries` (20260909070021) için RLS politikaları kendi migration dosyalarında tanımlıdır, burada tekrar edilmez.

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

### 4.1 Güvenlik Konvansiyonları

Herhangi bir plpgsql fonksiyonunda manuel yetkilendirme kontrolü yazılırken (`IF NOT (...) THEN RAISE EXCEPTION` deseni), koşul ifadesi MUTLAKA `coalesce(..., false)` ile sarılmalı. Ham `is_super_admin() OR my_role(org)=X OR ...` zinciri, org üyeliği olmayan kullanıcılar için `my_role()` NULL döndüğünde üç değerli mantık yüzünden sessizce bypass edilir (NOT NULL = NULL, hiçbir zaman true olmaz). Bu, Parti 3.C'de gerçek bir yetkisiz-erişim açığı olarak bulundu ve düzeltildi (bkz. PROGRESS.md § Parti 3.C).

Her yeni `SECURITY DEFINER` fonksiyonu, gövdesinin ilk satırlarında `coalesce(..., false)` ile
sarmalanmış bir yetki kontrolü İÇERMELİDİR. Yalnızca dahili yardımcı olarak kullanılacak
`SECURITY DEFINER` fonksiyonlarından `PUBLIC`, `anon` ve `authenticated` rollerinin EXECUTE
yetkisi kaldırılmalıdır. `my_role`, `my_team_id` ve `is_super_admin` fonksiyonları RLS
politikaları içinden çağrıldığı için `authenticated` yetkileri ASLA kaldırılamaz. (Parti 18-S'te
`copy_program_tree` ve `get_athlete_programs`'ın bu kuralı atladığı, ikisinin de gerçek
cross-tenant açık olduğu bulundu ve kapatıldı — bkz. PROGRESS.md § Parti 18-S, BUGS.md Kritik.)

`20260818073627_parti_18s_secure_definer_functions.sql` zaman damgalı adlandırma kullanır
(diğerleri `034`–`037` sıralıdır). MCP ile doğrudan uygulandığı için sürüm otomatik atanmıştır
ve `schema_migrations` kaydıyla eşleşmesi zorunlu olduğundan yeniden adlandırılamaz. Bundan
sonraki migration'lar sıralı konvansiyona devam etmelidir.

Aynı senaryo ikinci kez yaşandı: `040_acwr_logs_update_policy.sql` bir önceki oturumda MCP ile
doğrudan uygulanmış (remote'ta `20260904124844` sürüm numarasıyla kayıtlı), local dosya ise
sıralı `040` adıyla commit'lenmiş — `supabase migration list` bu yüzden local'i "uygulanmamış"
gösteriyordu. İçerik `execute_sql` ile birebir doğrulandı, fonksiyonel eksiklik yok. Dosya
`20260904124844_acwr_logs_update_policy.sql` olarak yeniden adlandırılıp hizalandı (2026-09-05).
Aynı senaryo ÜÇÜNCÜ kez yaşandı (2026-09-09): sıralı `044_athlete_delete_and_competition_entries.sql`
adıyla yazılıp MCP ile uygulandı, remote yine kendi zaman damgalı sürümünü (`20260909070021`) atadı
— dosya `20260909070021_athlete_delete_and_competition_entries.sql` olarak yeniden adlandırılıp
hizalandı. Desen artık nettir: MCP `apply_migration` HER ZAMAN kendi zaman damgasını atar, sıralı
`0NN_...` adıyla yazıp sonra MCP ile uygulayan her Parti bu yeniden adlandırmayı BEKLEMELİDİR —
`supabase migration list` ile kontrol edip dosyayı ona göre hizalamak rutin bir son adım olmalı.

`athletes` tablosunda `athletes_select`/`athletes_insert`/`athletes_update` vardı ama hiçbir zaman
`athletes_delete` politikası yazılmamıştı (varsayılan-deny) — sporcu silme UI'dan hiç
bağlanmamıştı, bu 2026-09-09'da fark edildi ve `20260909070021_athlete_delete_and_competition_entries.sql`
ile kapatıldı (`athletes_update` ile birebir aynı yetki: admin org geneli, coach kendi takımı).
UI (`AthleteStatusDialog`, `apps/web/components/features/athletes/athlete-status-dialog.tsx`)
hard-delete'i yalnızca `getAthleteImpact()` sıfır dönerse (hiçbir bağlı program/ACWR/test/
yarışma sonucu/1RM/wellness/yoklama kaydı VE giriş erişimi yoksa) sunar — aksi halde yalnızca
`is_active=false` (zaten `athletes_update` ile izinli, geri alınabilir) sunulur. Aynı migration
`competition_entries` tablosunu da ekledi (§3'te açıklandı) — RLS'i `competition_results`
(`comp_results_select`/`comp_results_write`) ile birebir aynı kalıbı taklit eder.

**Yetkilendirme asla `user_metadata` okumaz. Rol ve platform yetkisi yalnızca `app_metadata`'da
veya DB tablolarında tutulur.** `is_super_admin()` başlangıçta `raw_user_meta_data` (`user_metadata`)
okuyordu — bu alan oturum açmış **her kullanıcı** tarafından istemciden `supabase.auth.updateUser({
data: { platform_role: 'super_admin' } })` ile değiştirilebiliyordu, dolayısıyla herhangi bir sporcu/koç
hesabı kendini süper admin yapıp tüm organizasyonların verisine erişebiliyordu (16.09.2026'da canlı DB'de
doğrulandı, `044_super_admin_app_metadata.sql` ile kapatıldı — Parti 20-S). `raw_app_meta_data`
(`app_metadata`) yalnızca service role/admin API ile yazılabildiği için yetki verisi artık orada.
Sunucu tarafı kontroller `supabase.auth.getUser()`'ın döndürdüğü `user.app_metadata` veya
`supabase.rpc('is_super_admin')` kullanmalı — `getSession()`'a güvenilmez.

### 4.2 Tip Güvenliği Konvansiyonu — types.ts regenerasyonu

Yeni bir tablo/kolon/RPC fonksiyonu eklendiğinde, `packages/db/types.ts` AYNI COMMIT İÇİNDE regenerate edilmeli (`supabase gen types`). Bunu sonraki bir partiye ertelemek, o aradaki tüm partilerde yeni eklenen alanların/fonksiyonların type-check tarafından doğrulanmadan geçmesine yol açar (Parti 3.B-3.E arası bu şekilde gecikti, bkz. PROGRESS.md).

### 4.3 Kimlik Modeli — org kapsamlı kullanıcı adı, sentetik email deseni (Parti 16, Parti 18'de tek desene indirildi)

**Kimlik org kapsamlıdır, global değil.** Sentetik email deseni:

```
{username}@{org_slug}.athleteiq.app

beytullah.tosun@tgf.athleteiq.app
beytullah.tosun@koc-universitesi.athleteiq.app   ← aynı username, farklı org, bağımsız hesap
```

Sonuçları:
- Aynı `username` farklı org'larda bağımsız olarak var olabilir (`profiles` üzerindeki unique
  index `(org_id, lower(username))` — org-scoped, global değil).
- **Bir auth hesabı tam olarak bir org'a aittir.** Aynı kişi iki org'da çalışıyorsa iki ayrı
  hesabı olur — org değiştirme/çoklu-org tek hesap desteği YOK, bilinçli bir tasarım kararı.
- `platform_role: super_admin` bayrağı hesaba bağlıdır, org'a değil — `auth.users.raw_user_meta_data`'da
  tutulur, hiçbir repo scripti bunu set etmez (yalnızca Supabase Dashboard/Admin API'den elle
  atanır). **Süper admin kurtarma yolu yalnızca Supabase Dashboard'tur** — kod tabanında bu
  bayrağı veren/sıfırlayan hiçbir UI/Edge Function yoktur.

**Kimlik kaynağı — `profiles` tablosu** (`032_profiles.sql`): `id` (= `auth.users.id`), `org_id`,
`username`, `full_name`. Yalnızca service-role Edge Function'lar (`create-org-user`) yazar/siler
— INSERT/DELETE RLS politikası yok. Kullanıcı oluşturma artık "davet et" değil, **admin'in
doğrudan kullanıcı adı+şifre ile hesap oluşturması**: `create-org-user` Edge Function'ı
(`is_super_admin()` veya org admin çağırabilir, **koç çağıramaz**) `auth.users` + `profiles` +
`memberships` (+ role=athlete ise `athletes`) satırlarını tek bir rollback zinciriyle oluşturur.
Eski `invite-member` akışı emekliye ayrıldı (410 Gone döner) — davet edilen kullanıcı şifresiz
oluşuyordu, şifre belirleme sayfası hiç yazılmamıştı, uçtan uca hiç çalışmamıştı.

**Tek giriş deseni, e-posta ile giriş kalıcı olarak kapatıldı (Parti 18):** Parti 16'nın
bıraktığı karma durum (eski hesaplar slug'sız global domainde, yeniler org-scoped domainde)
Parti 18'de kapatıldı — kalan 5 hesap (`tosunbeytullah9@gmail.com` dahil) `profiles`
tablosundan hesaplanan hedef email'e (`{username}@{org_slug}.athleteiq.app`) taşındı,
şifreler değişmedi. `resolveLoginIdentifier` (`packages/validators/auth.ts`) artık tek biçim
kabul ediyor — `kullanici@slug` kısayolu. Bare username (`@` yok) ve nokta içeren her domain
(gerçek e-posta veya tam yazılmış sentetik email) reddedilir; e-posta ile giriş ve e-posta ile
şifre sıfırlama (zaten hiç var olmayan bir akış — bkz. aşağıdaki şifre sıfırlama zinciri)
kalıcı olarak kapatıldı. `athletes.username` ve `profiles.username` hâlâ iki ayrı,
senkronize edilmeyen depo — bu birleştirme Parti 18'de YAPILMADI, ileri bir partiye kaldı
(bkz. BUGS.md).

**Şifre sıfırlama zinciri (e-posta tabanlı self-servis yok):** sporcu → koçuna/adminine
sorar, koç → org adminine sorar, admin → süper admine sorar (hepsi `updateUserById` ile elle
sıfırlama, `apps/web/components/features/athletes/reset-password-modal.tsx` /
`.../settings/reset-user-password-modal.tsx`), **süper admin → yalnızca Supabase Dashboard**
(kod tabanında süper admin için hiçbir sıfırlama yolu yok, §4.3 yukarıdaki "Süper admin
kurtarma yolu" notuyla aynı kısıt).

**Kullanıcı düzenleme/silme (2026-09-09):** `profiles.full_name`/`username` düzenlemek İÇİN
`profiles` tablosuna doğrudan UPDATE atmak YETERLİ DEĞİL — `resolveLoginIdentifier`
(`packages/validators/auth.ts`) giriş email'ini `{username}@{org_slug}.athleteiq.app` olarak
doğrudan hesaplar, `profiles.username`'e hiç bakmaz. Bu yüzden username değişimi
`supabase/functions/update-org-user`'dan geçmeli — `auth.users.email`'i de senkron günceller
(profiles UPDATE başarısız olursa email'i eski haline geri alır). Yalnızca `full_name`
değişse bile aynı Edge Function kullanılır (tek kod yolu, iki ayrı davranış yok). Kullanıcı
silme (`supabase/functions/delete-org-user`) daha basit: `auth.users` satırını silmek yeterli
— `memberships`/`profiles` `on delete cascade`, `athletes.user_id` `on delete set null`
olduğu için geri kalan her şey otomatik temizlenir (sporcuysa roster kaydı SİLİNMEZ, yalnızca
giriş erişimi kalkar). İkisi de `create-org-user`/`reset-user-password` ile aynı yetki kısıtını
taşır: yalnızca `super_admin` veya hedef org'un admin'i (koç ÇAĞIRAMAZ), süper admin hesapları
bu yoldan silinemez/rolü değiştirilemez, ve `delete-org-user` org'un son admin'ini silmeyi
reddeder (org'u kilitlemesin diye).

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

## 5. WEARABLE ENTEGRASYONLARİ — TEKNİK DETAY

### 5.1 WHOOP v2 API

```
Base URL: https://api.prod.whoop.com/developer/v2/
Auth: OAuth 2.0 Authorization Code Flow
Token: Rotating refresh tokens (her saat yenile)
Scopes: offline read:cycles read:sleep read:recovery read:workout read:body_measurement read:profile

Temel endpoint'ler:
GET /v2/activity/sleep          → Uyku kayıtları (UUID bazlı)
GET /v2/activity/sleep/{id}     → Tek uyku detayı
GET /v2/activity/workout        → Antrenman kayıtları
GET /v2/activity/workout/{id}   → Tek antrenman detayı
GET /v2/cycle                   → Recovery cycle'ları
GET /v2/cycle/{id}              → Tek cycle (strain + recovery)
GET /v2/user/measurement/body   → Vücut ölçümleri
GET /v2/user/profile/basic      → Kullanıcı profili

Webhook events (v2 — UUID ID'ler):
  workout.updated
  sleep.updated
  recovery.created

KRİTİK: v1 webhook'lar kaldırıldı. Sadece v2 kullan.
Token refresh: Her exchange'de yeni refresh token gelir — eski geçersiz olur.
Rate limit: Varsayılan ~120 req/gün/kullanıcı (polling). Webhook ile bu düşer.

WHOOP Cycle Modeli (anla):
  1. Sleep cycle açılır (sporcu uyur)
  2. Sleep cycle kapanır (sporcu uyanır)
  3. Recovery cycle oluşur (sleep kapandıktan sonra)
  → Recovery sabah metriği. Gün içi sorgulanaMAZ.
```

```typescript
// packages/integrations/whoop/client.ts şablonu
export class WHOOPClient {
  private baseUrl = 'https://api.prod.whoop.com/developer/v2'

  async getRecovery(accessToken: string, params: { start: string; end: string }) {
    // Her request'te token geçerliliği kontrol edilir
    // 401 alınırsa refresh edilir, yeni token DB'ye yazılır
  }

  async refreshToken(refreshToken: string): Promise<WHOOPTokens> {
    // POST https://api.prod.whoop.com/oauth/oauth2/token
    // grant_type: refresh_token
    // DÖNEN YENİ refresh_token DB'ye kaydedilir — eski geçersiz!
  }
}
```

### 5.2 Polar AccessLink v3 (2026-09-13 canlı testte doğrulandı — swagger.yaml esas alındı)

**KRİTİK:** Her şey `https://www.polaraccesslink.com/v3/` altında — TEK bir API,
TEK bir version. "v4" DİYE BİR ŞEY YOK bu proje için (polar.com/polar-api-v4/
adında AYRI bir "Dynamic API v4" ürünü dokümantasyonda var ama bu AccessLink
client'ıyla İLGİSİ YOK, o ürüne kayıt gerektiriyor gibi görünüyor — karıştırılmasın).
Bu bölümün önceki iki sürümü de (v4 tabanlı, sonra "iki ayrı ürün" varsayımıyla)
canlı testte YANLIŞ çıktı; buradaki bilgi `https://www.polar.com/accesslink-api/swagger.yaml`
dosyasının birebir okunmasıyla doğrulandı, artık güvenilir kaynak budur.

```
Base URL: https://www.polaraccesslink.com/v3/
Admin: https://admin.polaraccesslink.com
Auth: OAuth 2.0 (erişim token'ı SONA ERME YOK — uzun ömürlü, refresh token yok)
Scope: TEK bir birleşik scope — "accesslink.read_all" — sleep/nightly-recharge/
       exercise dahil TÜM v3 endpoint'leri bunu kullanır. WHOOP tarzı granular
       scope isimleri ("sleep:read", "nightly_recharge:read" vb.) YANLIŞ —
       "invalid_scope" ile reddedilir (iki farklı granular kombinasyon denendi,
       ikisi de başarısız oldu, ancak "accesslink.read_all" çalıştı).
Kayıt: OAuth sonrası POST /v3/users ile kayıt edilmeli (409 = zaten kayıtlı).

Temel endpoint'ler:
GET    /v3/users/sleep                                            → son 28 gün uyku listesi (wrapper: "nights")
GET    /v3/users/nightly-recharge                                 → son 28 gün nightly recharge listesi (wrapper: "recharges")
  (İKİSİ DE from/to PARAMETRESİ KABUL ETMİYOR — otomatik son 28 gün döner)
POST   /v3/users/{userId}/exercise-transactions                   → transaction aç
GET    /v3/users/{userId}/exercise-transactions/{txId}/exercises  → antrenmanları listele
PUT    /v3/users/{userId}/exercise-transactions/{txId}/commit     → COMMIT
DELETE /v3/users/{userId}                                         → kayıt silme (disconnect)

(Not: swagger.yaml'da transaction modeli "deprecated" değil ama Polar'ın prose
dokümantasyonunda modern bir alternatif olarak tarih filtresi olmayan bir poll
endpoint'inden — GET /v3/exercises, son 30 gün — bahsediliyor; bu proje hâlâ
transaction modelini kullanıyor, ikisi de geçerli.)

KRİTİK — Transaction Modeli:
  1. POST transaction aç → transaction_id al (204 = yeni veri yok)
  2. GET .../exercises ile içindeki antrenmanları çek
  3. Her antremanı işle + DB'ye kaydet
  4. PUT .../commit ile commit et → Polar "teslim edildi" işaretler
  → Commit edilmezse aynı veri tekrar gelir (at-least-once garantisi)
  → Commit sonrası veri bir daha gelmez — önce işle, sonra commit!

Gerçek alan adları (swagger.yaml'dan, WHOOP tarzı varsayımsal isimler DEĞİL):
  nightly-recharge: heart_rate_avg, heart_rate_variability_avg, breathing_rate_avg,
    nightly_recharge_status (1 çok kötü – 6 çok iyi), ans_charge (-10.0..+10.0),
    ans_charge_status (1-5, integer — string DEĞİL)
  sleep: light_sleep/deep_sleep/rem_sleep (saniye), sleep_score (1-100),
    continuity (1.0-5.0), sleep_charge (1-5) — "efficiency" kavramı YOK, en yakını
    "continuity" ama farklı bir ölçek, normalizePolarMetrics bilinçli olarak
    sleep_efficiency'i null bırakıyor.
  normalizePolarMetrics (packages/integrations/polar/normalize.ts): recovery_score
    = (nightly_recharge_status - 1) / 5 * 100 (0-100'e doğrusal dönüşüm).

Rate limit: Per-client dynamic scaling (kullanıcı sayısına göre)
```

**İlk taslağın hataları (2026-09-13'te canlı testte bulundu, düzeltildi):**
Önceki oturumda yazılan `packages/integrations/polar/{oauth,transaction,client,types,normalize}.ts`
iskeleti hiç canlı test edilmemişti ve şu hataları içeriyordu: (1) `buildAuthUrl` WHOOP tarzı bir
`scope` parametresi gönderiyordu → Polar `invalid_scope` ile reddediyordu; (2) `registerUser`/
`deregisterUser`/transaction endpoint'leri yanlışlıkla `/v4/` altındaydı (doğrusu `/v3/`) → Tomcat
seviyesinde çıplak bir 401 (JSON hata gövdesi bile yok) dönüyordu; (3) transaction listele/commit
path'lerinde eksik alt segmentler vardı (`/exercises`, `/commit`); (4) `PolarNightlyRechargeSchema`/
`PolarSleepResultSchema` tamamen varsayımsal düz (flat) alanlar içeriyordu (`heart_rate_avg`,
`ans_charge`, `light_sleep` vb.) — gerçek Dynamic API v4 yanıtı camelCase VE iç içe (`ansStatus`,
`recoveryIndicatorSubLevel`, `sleepScore.sleepScore`, `sleepEvaluation.phaseDurations` vb.), hiçbiri
eşleşmiyordu. Şemalar gerçek alan adlarıyla düzeltildi ama uyku süresi (dakika)/HRV/dinlenik nabız
için gerçek API'nin döndürdüğü string-duration/nested alanların TAM formatı dokümantasyon
taramasından netleşmedi — `normalizePolarMetrics` (`packages/integrations/polar/normalize.ts`)
bu yüzden bilinçli olarak yalnızca yüksek güvenle eşlenen alanları (`recoveryIndicatorSubLevel`
→ recovery_score, `meanNightlyRecoveryRmssd` → hrv_rmssd, `sleepScore.sleepScore`/`efficiencyScore`)
kullanıyor, geri kalanı (`totalSleepMin`/`deepSleepMin`/`remSleepMin`/`restingHr`) null bırakıyor —
`raw_data` ham JSON'ı sakladığı için gerçek bir yanıt görüldükten sonra bu eşleme genişletilebilir.

### 5.3 Fitbit Web API (2026-09-13 — dev.fitbit.com resmi dokümantasyonuyla doğrulandı)

WHOOP/Polar'ın aksine bu üçüncüsü sıfırdan yazıldı ve canlı test öncesi
dev.fitbit.com'un resmi, güncel dokümantasyonu doğrudan taranarak kuruldu —
Polar'daki "varsayımsal şema" hatasını tekrarlamamak için.

```
Authorize: https://www.fitbit.com/oauth2/authorize
  ?client_id&response_type=code&scope=sleep%20heartrate%20activity&redirect_uri&state
Token: POST https://api.fitbit.com/oauth2/token (Basic client_id:client_secret)
  → { access_token, refresh_token, expires_in:28800 (8sa), token_type, user_id }
Refresh: aynı endpoint, grant_type=refresh_token — refresh_token TEK KULLANIMLIK,
  her refresh'te YENİSİ döner (WHOOP ile aynı rotasyon deseni — Polar'ın aksine
  burada ensureFreshToken GEREKLİ, apps/web/app/api/wearables/fitbit/sync/route.ts
  içinde WHOOP webhook'undakiyle aynı mantıkla ama Next.js route'a taşınmış).
Revoke: POST https://api.fitbit.com/oauth2/revoke (Basic auth, body: token=...)

Scope: authorize isteğinde DİNAMİK istenir ("sleep heartrate activity") — Polar'daki
       gibi uygulama panelinde önceden seçilen sabit bir "data type" YOK.

Sleep (aralık):  GET /1.2/user/-/sleep/date/{start}/{end}.json (maks 100 gün)
Heart Rate:      GET /1/user/-/activities/heart/date/{date}/{period}.json (period=7d/30d, tek çağrıda aralık)
HRV (aralık):    GET /1/user/-/hrv/date/{start}/{end}.json (maks 30 gün)
Activity Log:    GET /1/user/-/activities/list.json?beforeDate&sort&limit&offset
```

**Fitbit'in public Web API'sinde karşılığı OLMAYAN alanlar** (tahmin edilmeye
çalışılmadan dürüstçe null bırakılır, `packages/integrations/fitbit/normalize.ts`):
`recovery_score` (Fitbit'in "Daily Readiness Score"u Premium/ayrı bir üründe),
`sleep_score` (sayısal 1-100 skor yok, en yakını `efficiency` → `sleep_efficiency`
kolonuna gider), `strain_score`/`muscle_load`/`active_calories` (direkt karşılığı
yok). `fitbit_activities.distance_meter` de aynı sebeple hep null — Fitbit
"distance" alanı kullanıcının hesap birimine (km/mil) bağlı, birim garantisi yok.

Web-only, manuel "Senkronize Et" butonu (Fitbit'in gerçek webhook desteği —
Subscriptions API— var ama subscriber doğrulama + ayrı bir Edge Function
gerektirdiği için bilinçli olarak ertelendi, kullanıcı onaylı karar).

### 5.4 Normalize Edilmiş Ortak Şema

Her iki provider verisi `wearable_daily_metrics` tablosunda birleşir:

```typescript
// packages/integrations/normalize.ts
interface DailyMetrics {
  athleteId: string
  provider: 'whoop' | 'polar'
  metricDate: string      // YYYY-MM-DD
  recoveryScore: number   // 0-100 (WHOOP doğrudan, Polar ANS charge normalize)
  hrvRmssd: number        // ms
  restingHr: number       // bpm
  sleepScore: number      // 0-100
  totalSleepMin: number
  deepSleepMin: number
  remSleepMin: number
  strainScore: number     // 0-21 scale'e normalize edilir
  muscleLoad?: number     // Sadece Polar
}
```

---

## 6. AGENT TANIMI VE GÖREVLERİ

Aşağıdaki agent'ların her biri bir uzman gibi davranır. Görev başlamadan önce:
1. Bu CLAUDE.md dosyasının ilgili bölümünü okur
2. Mevcut dosya yapısını inceler
3. Çakışma varsa sormadan önce kendi çözümünü üretmez

---

### AGENT 1: DB Agent (Veritabanı Uzmanı)

**Sorumluluk:** Tüm Supabase şeması, migration'lar, RLS politikaları, helper fonksiyonlar

**Uzmanlık seviyesi:** Kıdemli PostgreSQL DBA + Supabase uzmanı

**Görev listesi:**
```
[ ] supabase/migrations/001_schema.sql → Bölüm 3.1 tabloları tam oluştur
[ ] supabase/migrations/002_rls.sql → Bölüm 4 politikaları tam oluştur
[ ] supabase/migrations/003_functions.sql → my_role(), my_team_id(), is_super_admin()
[ ] supabase/migrations/004_wearables.sql → Bölüm 3.2 tabloları tam oluştur
[ ] supabase/seed.sql → 1 org, 2 takım, 5 sporcu, 3 koç test verisi
[ ] packages/db/types.ts → supabase gen types komutu çalıştır
[ ] packages/db/queries/ → Her tablo için type-safe query fonksiyonları
```

**Kurallar:**
- Her migration tek başına rollback edilebilir olmalı
- Enum yerine check constraint kullan (migration kolaylığı)
- Index: org_id, team_id, athlete_id, log_date sütunlarına ekle
- `updated_at` alanları için trigger oluştur

**Test kriteri:** `supabase db diff` temiz çıkmalı, seed.sql hatasız çalışmalı

---

### AGENT 2: Auth Agent (Kimlik Doğrulama Uzmanı)

**Sorumluluk:** Supabase Auth kurulumu, middleware, davet akışı, rol yönetimi

**Uzmanlık seviyesi:** Kıdemli güvenlik + auth mühendisi

**Görev listesi:**
```
[ ] apps/web/middleware.ts → Route koruması + tenant context cookie
[ ] apps/web/lib/supabase/server.ts → Server component client
[ ] apps/web/lib/supabase/client.ts → Client component client
[ ] apps/web/lib/hooks/useUserContext.ts → Role + org + team bilgisi hook
[ ] apps/web/app/(auth)/login/page.tsx → E-posta veya kullanıcı adı + şifre ile giriş (Magic Link Parti 4.D'de tamamen kaldırıldı)
[ ] apps/web/app/(auth)/invite/[token]/page.tsx → ARTIK KULLANILMIYOR (bağlantısız/ölü sayfa — bkz. aşağıdaki not) [Son doğrulama: Parti 7]
[ ] supabase/functions/invite-member/ → Edge Function: davet emaili gönder
[ ] packages/validators/auth.ts → Login, davet Zod şemaları
```

**Middleware mantığı:**
```typescript
// Middleware sırası (değiştirme):
// 1. Session kontrolü → yoksa /login
// 2. membership tablosundan role + org_id + team_id çek
// 3. Cookie'ye yaz (her request'te DB sorgusu yapma)
// 4. /admin routes → sadece super_admin
// 5. /settings → sadece admin role
```

**Davet akışı (gerçek yol — [Son doğrulama: Parti 7]):**
```
Admin Settings'te davet formunu gönderir
→ apps/web/app/api/auth/invite/route.ts (session-doğrulamalı Next.js proxy)
→ supabase/functions/invite-member/index.ts
  → auth.admin.inviteUserByEmail(email, {
      data: { pending_org_id, pending_role, pending_team_id },
      redirectTo: `${SITE_URL}/auth/confirm`
    })
→ Kullanıcı e-postadaki linke tıklar (token_hash + type=invite ile /auth/confirm'e gider)
→ apps/web/app/auth/confirm/route.ts: verifyOtp({ type, token_hash })
  → pending_* metadata'dan memberships upsert (service-role client)
  → pending_* metadata temizlenir
  → redirect: /programs (athlete) veya /athletes (coach/admin)
```
Not: `apps/web/app/(auth)/invite/[token]/page.tsx` bu akışın DIŞINDA — hiçbir yerden linklenmiyor,
farklı bir mekanizma kullanıyor (`getSession()` + URL hash), bilinçli olarak dokunulmadı (Parti 4.D).
`/auth/callback` de benzer şekilde zararsız ölü kod (yalnızca kaldırılmış Magic Link'in PKCE
code-exchange'i içindi).

**Test kriteri:** Coach A'nın cookie'si Coach B'nin takım verisini döndürmemeli

---

### AGENT 3: Web Agent (Koç Paneli Uzmanı)

**Sorumluluk:** Next.js 15 web uygulaması — tüm koç ve admin arayüzleri

**Uzmanlık seviyesi:** Kıdemli Next.js + React uzmanı

**Görev listesi:**
```
[ ] apps/web/app/(dashboard)/layout.tsx → Sidebar + header layout
[ ] apps/web/app/(dashboard)/athletes/page.tsx → Sporcu listesi (filtreli, aranabilir)
[ ] apps/web/app/(dashboard)/athletes/[id]/page.tsx → Sporcu detay
[ ] apps/web/app/(dashboard)/programs/page.tsx → Program listesi
[ ] apps/web/app/(dashboard)/programs/new/page.tsx → Program oluşturma wizard'ı
[ ] apps/web/app/(dashboard)/programs/[id]/page.tsx → Program detay + edit
[ ] apps/web/app/(dashboard)/acwr/page.tsx → ACWR dashboard (Recharts grafikler)
[ ] apps/web/app/(dashboard)/competitions/page.tsx → Takvim görünümü
[ ] apps/web/app/(dashboard)/tests/page.tsx → Test sonuçları tablosu
[ ] apps/web/app/(dashboard)/wearables/page.tsx → Wearable bağlantı durumu
[ ] apps/web/app/admin/page.tsx → Super admin: org listesi
[ ] apps/web/components/features/program-builder/ → Drag-drop haftalık program
[ ] apps/web/components/features/acwr-chart/ → Recharts ACWR trend grafiği
```

**Sonradan eklenen görevler (2026-09-09 — sporcu/kullanıcı düzenleme-silme + yarışma roster'ı):**
```
[x] apps/web/components/features/athletes/edit-athlete-modal.tsx → Sporcu profili düzenleme (updateAthlete, packages/db/queries/athletes.ts)
[x] apps/web/components/features/athletes/athlete-status-dialog.tsx → Pasife al/Aktife al/Kalıcı sil — getAthleteImpact() sıfırsa hard-delete sunar, aksi halde yalnızca is_active=false
[x] apps/web/app/(dashboard)/athletes/athletes-client.tsx → "Pasifleri de göster" filtresi + satır bazlı düzenle/sil aksiyonları
[x] apps/web/app/(dashboard)/athletes/[id]/athlete-detail-client.tsx → Aynı düzenle/durum aksiyonları + "Yarışmalar" kartı (sporcunun kayıtlı olduğu yarışmalar)
[x] apps/web/components/features/settings/edit-org-user-modal.tsx + delete-org-user-dialog.tsx → apps/web/app/(dashboard)/settings/users/users-client.tsx'e kablolu (supabase/functions/update-org-user, delete-org-user üzerinden — bkz. §4.3)
[x] apps/web/app/(dashboard)/competitions/competitions-client.tsx → Yarışma formuna sporcu bazlı katılımcı (roster) seçici — competition_entries tablosu (20260909070021_athlete_delete_and_competition_entries.sql), syncCompetitionEntries()
```

**Sonradan eklenen görevler (2026-09-11 — sporcuya web'de Yarışmalar/Profil/Wearable menüleri):**
```
[x] apps/web/components/shared/sidebar.tsx → athlete rolüne 3 yeni menü öğesi: Yarışmalar (/competitions), Wearable (/wearables), Profil (/profile — yalnızca athlete'e özel link)
[x] apps/web/middleware.ts + apps/web/app/(dashboard)/layout.tsx → ATHLETE GUARD allow-list'i genişletildi: /competitions, /profile, /wearables (+ /api/wearables/whoop/* — web OAuth akışı)
[x] apps/web/app/(dashboard)/competitions/page.tsx + athlete-competitions-client.tsx → role==="athlete" dalı: getAthleteCompetitionEntries() ile SADECE kendi kayıtlı olduğu yarışmalar, salt-okunur (admin/coach'un org-geneli yönetim sayfası değişmedi)
[x] apps/web/app/(dashboard)/profile/page.tsx → Web'de ilk kez: sporcunun kendi profilini (ad, kullanıcı adı, takım, org, doğum tarihi/yaş, cinsiyet, boy/kilo, grup, notlar) salt-okunur gösterir — RLS'te athlete'in kendi athletes satırını UPDATE etme izni yok, bu yüzden düzenleme burada YOK, "koçunuzla iletişime geçin" notu var
[x] apps/web/app/(dashboard)/wearables/page.tsx + athlete-wearable-client.tsx → role==="athlete" dalı: kendi WHOOP bağlantı durumu + web'den bağlan/bağlantı kes (admin/coach'un org-geneli salt-okunur durum tablosu değişmedi)
[x] packages/integrations/whoop/oauth.ts → createOAuthState/verifyOAuthState'e opsiyonel platform: "web"|"mobile" alanı eklendi (geriye dönük uyumlu — platform verilmezse eski mobil davranış)
[x] apps/web/app/api/wearables/whoop/connect/route.ts → YENİ, web-özel: cookie oturumundan athlete id çözer, platform:"web" state'iyle WHOOP authorize'a yönlendirir (mobildeki Bearer-token'lı /authorize'dan ayrı — web tarayıcı navigasyonu cookie taşır, mobil taşımaz)
[x] apps/web/app/api/wearables/whoop/callback/route.ts → state'teki platform'a göre dallanır: "web" ise `/wearables?status=...`'a, aksi halde (mobil, platform yok) eskisi gibi `athleteiq://wearables/callback`'e yönlendirir
[x] apps/web/app/api/wearables/whoop/disconnect/route.ts → YENİ, web-özel: RLS "wearable_own" (for all) sayesinde anon+cookie client ile kendi bağlantısını revokeAccess() + is_active=false yapar (access_token kolonu NOT NULL olduğu için null'lanmaz, yalnızca refresh_token temizlenir)
```
Not: `apps/web/app/(dashboard)/wearables/wearables-client.tsx`'teki admin/coach org-geneli görünümünün kaynağı olan `getWearableConnections()` RLS'i (`wearable_own`, yalnızca athlete-self + super_admin) admin/coach dalını kapsamıyor — bu ayrı, önceden var olan bir bulgu, bu Parti'de DOKUNULMADI (bkz. BUGS.md'ye eklenmesi önerilir).

**Sonradan eklenen görevler (2026-09-12 — CrossFit tarzı WOD seans yapısı, kapsam BİLEREK dar):**
```
[x] 20260912072715_wod_sessions.sql → training_sessions'a workout_format (check constraint: amrap/emom/for_time/tabata/rounds_for_time/chipper) + time_cap_sec/rounds/work_sec/interval_rest_sec, exercises'a movement_detail (serbest metin) — hepsi opsiyonel, mevcut kuvvet akışı DEĞİŞMEDİ
[x] insert_sessions_tree + copy_program_tree → aynı imza/yetkilendirme, yalnızca yeni kolonlar eklendi (RLS'e DOKUNULMADI)
[x] apps/web/components/features/program-builder/wod-session-fields.tsx → YENİ: WORKOUT_FORMATS, wodMovementSchema (set/yük YOK), WodFormatFields (formata göre koşullu zaman alanları), WodMovementList (düz, sıralı hareket listesi — süperset/circuit gruplama kapsam dışı)
[x] apps/web/lib/program-rpc.ts → buildSessionsPayload artık session.workout_format doluysa wod_movements'ı, boşsa mevcut exercises'ı aynı RPC alanına yazıyor (exercise-list.tsx/exerciseSchema'ya HİÇ dokunulmadı)
[x] week-editor-form.tsx + new-program-client.tsx → seans kartına "Format" seçici; format seçiliyse ExerciseList yerine WodFormatFields+WodMovementList
[x] apps/web/lib/exercise-format.ts (formatWodSummary/WORKOUT_FORMAT_LABELS) + program-detail-client.tsx + athlete-program-view.tsx → workout_format doluysa set tablosu/tonaj yerine kompakt WOD kartı (format özeti + düz hareket listesi)
[x] apps/mobile/lib/wodFormat.ts + apps/mobile/components/WodSessionCard.tsx → web'in aynı mantığı, iki gün ekranında (program/[day].tsx, my-athletes/.../program/[day].tsx) da kablolu
```
Kapsam dışı (kullanıcı onaylı): timer/kronometre, skor/sonuç girişi, tonaj/1RM entegrasyonu, WOD içi süperset/circuit gruplama, mobilde program oluşturma (zaten yok). Bir seans ya standart (set bazlı) ya da WOD formatındadır, aynı seansta karışmaz.

**Sonradan eklenen görevler (2026-09-13 — koç/admin tarafında WHOOP verisi + tekil antrenman kayıtları):**
```
[x] apps/web/app/(dashboard)/wearables/wearables-client.tsx → Her sporcu satırına "Detay" linki (/wearables/[athleteId]) — önceki halinde yalnızca bağlantı durumu (Bağlı/Bağlı Değil) vardı, hiçbir wearable verisi render edilmiyordu (RLS açığı DEĞİL, eksik özellikti)
[x] apps/web/app/(dashboard)/wearables/[athleteId]/page.tsx + athlete-wearable-detail-client.tsx → YENİ: 14 günlük recovery/strain/RHR trend grafiği (Recharts, athletes/[id] ACWR grafiğiyle aynı stil) + aynı aralıktaki whoop_workouts kayıtlarının tablosu (spor, süre, strain, ort/maks nabız, kalori)
[x] packages/db/queries/wearables.ts → getWorkouts() eklendi (getWearableMetrics ile aynı desen)
```
Middleware/layout'ta EK değişiklik gerekmedi: ATHLETE GUARD `pathname === "/wearables"` tam eşleşmesi kullanıyor, bu yüzden `/wearables/[athleteId]` sporcu rolü için zaten otomatik bloklanıyor (bkz. `apps/web/middleware.ts`).

**Sonradan eklenen görevler (2026-09-13 — üçüncü wearable provider: Fitbit):**
```
[x] `athlete-wearable-client.tsx`'teki generic `ProviderCard` + `[athleteId]/athlete-wearable-detail-client.tsx`'teki generic `ProviderSection` bileşenlerine ÜÇÜNCÜ bir çağrı eklendi (yeni bileşen YAZILMADI) — WHOOP/Polar'dan sonra kurulan generic tasarımın tam olarak beklendiği gibi üçüncü provider'a kolayca genişlediğini doğruladı
[x] `wearables-client.tsx` (koç/admin liste) özet kartlarına "Fitbit Bağlı" + tabloya üçüncü durum kolonu eklendi
```

**Sonradan eklenen görevler (2026-09-16 — Programlar listesi hedef/blok bazlı gruplandı):**
```
[x] apps/web/lib/program-grouping.ts → YENİ, saf gruplama modülü (React/DOM yok): hafta satırlarını hedef (takım/sporcu) → blok/tek-program ağacına çevirir, "bu hafta"yı tarih aralığından tespit eder, tr-TR sıralar, arama filtresi sağlar
[x] apps/web/app/(dashboard)/programs/grouped-programs.tsx → YENİ: katlanabilir hedef bölümleri + blok kartları; bloğun haftaları kart içinde küçük tıklanabilir rozetlere (1,2,3,4) indirgendi, her rozet /programs/[haftaId]'ye gider
[x] programs-client.tsx → "Gruplu"/"Liste" görünüm seçici (varsayılan Gruplu, tercih localStorage'da) + arama kutusu; ESKİ düz grid "Liste" seçeneğinde AYNEN korundu, silinmedi
[x] packages/db/queries/programs.ts → getProgramBlocks() eklendi (blok başlığı/fazı/total_weeks — hafta ağacı YOK)
[x] programs/page.tsx → blokları çeker (sporcu rolünde çekmez, o dal AthleteProgramView'a düşüyor)
```
**Neden:** `training_programs`'ta HER SATIR BİR HAFTADIR ve çok haftalı bir bloğun tüm haftaları
AYNI başlığı taşır — düz grid'de birebir aynı "Hazırlık" kartı 4 kez görünüyordu. Canlı veride 21
satır yalnızca 6 hedef + 3 bloğa karşılık geliyordu. Gruplu görünümde varsayılan (arşiv gizli)
durum 15 hafta → 5 bölüm / 8 kart. Detay sayfası (`/programs/[id]`) zaten blok kapsamında
çalışıyordu (blok yayınla/sil) — liste artık onunla tutarlı. Sporcu görünümü (`AthleteProgramView`)
ve mobil DEĞİŞMEDİ. [Son doğrulama: 2026-09-16]

**Sonradan eklenen görevler (2026-09-24 — sporcu / antrenman programı / 1RM içe aktarma):**
```
[x] packages/validators/csv.ts → YENİ, bağımlılıksız CSV/TSV ayrıştırıcı (tırnaklı alan, alan içi satır sonu, CRLF, BOM) + ayırıcı otomatik tespiti + Türkçe-duyarlı başlık eşleme (mapColumns/normalizeHeaderKey) + değer ayrıştırıcıları (parseNumber "84,5" / parseDate "12.04.2004") + toCsv (şablon üretimi)
[x] packages/validators/athlete-import.ts → YENİ, sporcu satırı → athletes taslağı + satır bazlı hata/uyarı; takım adını trFold ile çözer, kullanıcı adını ATHLETE_USERNAME_RE ile doğrular, şifre yoksa generateTempPassword üretir
[x] packages/validators/program-import.ts → YENİ, "satır başına bir set" tablosu → create_program_with_weeks'in p_sessions ağacı (hafta → gün/seans → egzersiz → set); yük tipi çözümlemesi (kg / %1RM / vücut ağırlığı / bant), tekrar-veya-süre kuralı (exerciseSchema ile aynı), hafta karşılaştırması (sessionsEqual)
[x] packages/validators/{csv,athlete-import,program-import}.test.ts → 68 birim test (toplam 134)
[x] apps/web/components/features/import/import-source.tsx → YENİ, iki sayfanın ortak kaynak girişi: dosya seç / Excel'den yapıştır / örnek şablon indir; UTF-8 çözülemezse windows-1254'e düşer (Türkçe Excel CSV'si)
[x] apps/web/app/(dashboard)/athletes/import/ → YENİ sayfa: önizleme tablosu (satır bazlı hata/uyarı), hedef takım seçici, kadro satırları tek insert + giriş hesabı satırları create-athlete-account, sonuç ekranında tek seferlik kimlik bilgisi listesi (CSV indirilebilir)
[x] apps/web/app/(dashboard)/programs/import/ → YENİ sayfa: program meta formu (başlık/kapsam/başlangıç/faz/branş/grup) + hafta-seans-egzersiz önizlemesi + create_program_with_weeks (+ farklı haftalar için update_program_week)
[x] packages/validators/one-rm-import.ts → YENİ, 1RM satırı → athlete_1rm_records taslağı; sporcuyu isimden (gerekirse "Takım" sütunuyla ayırt ederek), egzersizi normalizeExerciseName ile KATALOGDAN çözer, eşleşmeyende yakın ad önerir; tarih sütunu boşsa varsayılan test tarihine düşer
[x] apps/web/app/(dashboard)/tests/import-1rm/ → YENİ sayfa: varsayılan test tarihi seçici + satır bazlı önizleme + tek insert (athlete_1rm_records, 1rm_insert RLS)
[x] athletes-client.tsx / programs-client.tsx / tests-client.tsx (1RM bölümü) → başlığa "İçe Aktar" butonu
[x] middleware.ts + (dashboard)/layout.tsx → athlete guard'ın isBlocked listesine "/programs/import" eklendi
```
**Neden yeni bir yazma yolu AÇILMADI:** içe aktarma, elle ekleme akışlarının geçtiği aynı
yollardan geçer — kadro satırları `athletes` tablosuna RLS altında insert edilir (koç kendi
takımı dışına yazamaz), giriş hesabı istenen satırlar `create-athlete-account` Edge
Function'ına gider, 1RM satırları `athlete_1rm_records`'a `1rm_insert` politikası altında
yazılır (031_1rm_team_scoped_rls.sql — koç yalnızca kendi takımı), program ise
`create_program_with_weeks` / `update_program_week` RPC'lerini çağırır (kendi
`coalesce(..., false)` yetki kontrolleri devrede). Ayrıcalıklı toplu-yazma endpoint'i,
service-role kullanımı veya yeni migration YOK.

**Neden hatalı satır varken içe aktarma tamamen engellenir:** yarım yüklenmiş bir kadro/program,
kullanıcının hangi satırın geçtiğini bilmeden dosyayı ikinci kez yüklemesine ve tekrar kayıt
oluşmasına yol açar. Önizleme tüm satırları gösterir, tek bir hata bile varken buton kapalıdır.

**İçe aktarma biçimi kararları (kullanıcı onaylı):**
- Sporcu dosyasında yalnızca **Ad Soyad** zorunludur; **Kullanıcı Adı** sütunu dolu olan satırlar
  için ek olarak giriş hesabı açılır (şifre boşsa üretilir). Sütun hiç yoksa dosyanın tamamı
  kadro-only'dir.
- 1RM dosyasında egzersiz adı **katalogda (platform + org) bulunmak ZORUNDADIR** — serbest
  metin bir ad kabul edilmez. Sebep: `%1RM` çözümlemesi (`buildMaxLookup`,
  `packages/db/queries/exercises.ts`) kaydı `exercise_id` ile DEĞİL,
  `normalizeExerciseName(exercise_name)` ile arar; yanlış yazılmış bir ad tabloya yazılır ama
  program builder'daki hiçbir egzersizle eşleşmez ve yükler SESSİZCE boş kalırdı. Elle form da
  zaten yalnızca katalogdan seçtiriyor. Eşleşmeyen adlar için en yakın 3 aday önerilir. Aynı ad
  hem org hem platform kütüphanesindeyse **org kazanır** (fork'lanmış/özelleştirilmiş sürüm).
- 1RM önizlemesi iki sessiz tuzağı uyarı olarak yüzeye çıkarır: aynı sporcu/egzersiz/tarih için
  kayıt zaten varsa, ve içe aktarılan satırdan **daha güncel** bir kayıt varsa (o satır yazılır
  ama `dedupeLatestMaxes` en güncel tarihi seçtiği için %1RM hesaplarına hiç yansımaz).
- Program dosyasında **her satır bir settir** (`set_no` opsiyonel — yoksa sıra numarası verilir).
  Aynı egzersizin ARDIŞIK satırları tek egzersizin setleri olarak gruplanır.
- Çok haftalı blok: `create_program_with_weeks` tek bir `p_sessions`'ı N haftaya klonladığı için
  1. hafta onunla oluşur, içeriği farklı olan haftalar `update_program_week` ile ayrıca yazılır.
  Hafta tarihleri iki yolda da AYNI formülle (`blok başlangıcı + (i-1)*7`) hesaplanır.
- **KAPSAM DIŞI (bilinçli):** `.xlsx` ikili dosya desteği (bağımlılık gerektirir — kullanıcı
  Excel'den doğrudan YAPIŞTIRIR, pano TSV bırakır; ya da "CSV olarak kaydet"), WOD/CrossFit
  formatındaki seanslar (`workout_format` + `movement_detail` — "set başına satır" modeliyle
  çelişir), mevcut sporcu/programın içe aktarmayla GÜNCELLENMESİ (yalnızca yeni kayıt oluşturulur),
  yıllık plan ızgarasının içe aktarımı.

**UI kuralları:**
- shadcn/ui komponentleri kullan, özel tasarım yapma
- Server Components veri çeker, `*-client.tsx` client component'lerine prop olarak geçer; mutation/realtime sonrası `router.refresh()` ile yeniden doğrulanır (TanStack Query DEĞİL — bağımlılık var ama kullanılmıyor) [Son doğrulama: Parti 7]
- Supabase Realtime: program publish edilince toast notification
- Mobile-first responsive (koçlar tablet kullanabilir)
- Loading state'ler: skeleton komponentleri (shadcn Skeleton)

**Realtime aboneliği (gerçek pattern — [Son doğrulama: Parti 7]):**
`training_programs` üzerinde `is_published=eq.true` filtreli bir `postgres_changes` UPDATE aboneliği,
event geldiğinde `router.refresh()` çağırıp bir toast gösterir (`queryClient.invalidateQueries` DEĞİL —
proje TanStack Query kullanmıyor). Gerçek uygulamalar:
`apps/web/app/(dashboard)/programs/programs-client.tsx:62`,
`apps/web/app/(dashboard)/athletes/athletes-client.tsx:50`.

**Test kriteri:**
- Coach yeni program oluşturur → publish → sporcu 2 saniye içinde görür
- Admin tüm takımları görür, Coach sadece kendi takımını görür
- Admin/coach bir sporcunun bilgilerini düzenler → değişiklik anında listede görünür
- Geçmiş kaydı olmayan bir sporcu kalıcı silinebilir; geçmişi olan sporcuda yalnızca "Pasife Al" sunulur ve pasif sporcu geçmişi korunarak listeden gizlenir
- Bir yarışmada yalnızca seçilen sporcular "katılımcı" olarak görünür — takımın tamamı otomatik eklenmez
- Sporcu web'de `/competitions`'ta yalnızca kendi kayıtlı olduğu yarışmaları görür (başka sporcunun kaydı görünmez, düzenleme/roster UI'ı yok); `/profile`'da kendi bilgilerini görür ama düzenleyemez; `/wearables`'ta WHOOP'a bağlanıp web'den bağlantıyı kesebilir

---

### AGENT 4: Mobile Agent (Sporcu Uygulaması Uzmanı)

**Sorumluluk:** Expo React Native sporcu uygulaması

**Uzmanlık seviyesi:** Kıdemli React Native + Expo uzmanı

**Görev listesi:**
```
[ ] apps/mobile/app.json → Expo config (bundle ID: com.athleteiq.app)
[ ] apps/mobile/app/(auth)/login.tsx → Email/password + magic link
[ ] apps/mobile/app/(tabs)/_layout.tsx → Bottom tab navigator
[ ] apps/mobile/app/(tabs)/program/index.tsx → Haftalık program görünümü
[ ] apps/mobile/app/(tabs)/program/[day].tsx → Günlük egzersiz detayı
[ ] apps/mobile/app/(tabs)/recovery/index.tsx → WHOOP/Polar recovery özeti
[ ] apps/mobile/app/(tabs)/competitions/index.tsx → Yaklaşan yarışmalar
[ ] apps/mobile/app/(tabs)/profile/index.tsx → Profil + wearable bağlantı
[ ] apps/mobile/lib/supabase.ts → Expo uyumlu Supabase client (AsyncStorage)
[ ] apps/mobile/lib/notifications.ts → Push notification kurulumu
[ ] apps/mobile/components/ProgramDay.tsx → Günlük program kartı
[ ] apps/mobile/components/ExerciseCard.tsx → Egzersiz kartı (set/rep/load)
[ ] apps/mobile/components/RecoveryScore.tsx → Dairesel recovery göstergesi
```

**Teknik kısıtlar:**
- SecureStore: JWT token sakla, AsyncStorage YASAK (güvenlik)
- Realtime: training_programs tablosunu subscribe et, yeni program push notification
- Offline: Son program cache'le (AsyncStorage'da JSON olarak)
- NativeWind: Tailwind class'ları kullan, StyleSheet KULLANMA

**Push notification:**
```typescript
// Koç program publish edince sporculara bildirim
// Expo Push Notification Token → Supabase'de sakla (athlete_push_tokens tablosu)
// Edge Function tetikler → Expo Push API'ye gönderir
```

**Test kriteri:**
- Sporcu login → programı görür → Koç değiştirince 5 sn içinde güncellenir
- iOS + Android aynı davranış

---

### AGENT 5: Integration Agent (Wearable Entegrasyon Uzmanı)

**Sorumluluk:** WHOOP v2 ve Polar v4 API entegrasyonları, token yönetimi, veri senkronizasyonu

**Uzmanlık seviyesi:** Kıdemli API entegrasyon + OAuth uzmanı

**Görev listesi:**
```
[x] packages/integrations/whoop/client.ts → v2 REST client (429 retry + X-RateLimit-Reset backoff)
[x] packages/integrations/whoop/oauth.ts → Auth code flow + rotating token refresh + revokeAccess + state imzalama
[x] packages/integrations/whoop/types.ts → v2 Zod şemaları (Cycle, Sleep, Recovery, Workout, Profile, WebhookEvent)
[x] packages/integrations/whoop/normalize.ts → WHOOPRecovery → DailyMetrics
[x] packages/integrations/polar/client.ts → v4 REST client (nightly-recharge + sleep GET, direct model)
[x] packages/integrations/polar/oauth.ts → Auth code flow (süresiz token, refresh yok) + registerUser/deregisterUser + state imzalama (2026-09-13)
[x] packages/integrations/polar/transaction.ts → Transaction lifecycle manager (egzersizler için aç→listele→commit)
[x] packages/integrations/polar/types.ts → v4 Zod şemaları
[x] packages/integrations/polar/normalize.ts → PolarNightlyRecharge → DailyMetrics
[x] supabase/functions/whoop-webhook/ → Webhook receiver + signature validation + gerçek senkron (2026-09-11, v5) + tekil workout senkronu (2026-09-13, v8)
[ ] supabase/functions/polar-sync/ → Cron: her saat Polar transaction çek — BİLİNÇLİ OLARAK YOK, Polar'da webhook yok ve pg_cron/pg_net kurulumu ayrı bir infra işi olarak ertelendi; bunun yerine manuel "Senkronize Et" butonu var, bkz. aşağıdaki "Polar entegrasyonu" notu
[x] apps/web/app/api/wearables/whoop/authorize/route.ts → İmzalı state üretir, WHOOP authorize URL'sine yönlendirir (Bearer auth, mobil çağırır)
[x] apps/web/app/api/wearables/whoop/callback/route.ts → OAuth callback (WHOOP_REDIRECT_URI ile birebir eşleşir)
[x] apps/web/app/api/wearables/polar/connect/route.ts + callback/route.ts + disconnect/route.ts + sync/route.ts → YENİ (2026-09-13), whoop/connect-callback-disconnect'in web-only kopyası + manuel senkron route'u (bkz. aşağıdaki "Polar entegrasyonu" notu). Eski görev listesindeki `apps/web/app/(dashboard)/wearables/polar-connect/route.ts` yolu KULLANILMADI (WHOOP'taki stale `whoop-connect/route.ts` girdisiyle aynı durum, bkz. yukarıdaki not).
[x] apps/mobile/app/(tabs)/profile/connect-whoop.tsx → Sporcu WHOOP bağlantı (expo-web-browser + Linking)
[ ] apps/mobile/app/(tabs)/profile/connect-polar.tsx → Sporcu Polar bağlantı (hâlâ stub — Polar bilinçli olarak yalnızca web'den bağlanıyor, bkz. aşağıdaki not)
[x] packages/integrations/fitbit/{client,oauth,types,normalize,index}.ts → YENİ (2026-09-13), dev.fitbit.com resmi dokümantasyonuyla doğrulanarak sıfırdan yazıldı (bkz. §5.3)
[x] apps/web/app/api/wearables/fitbit/{connect,callback,disconnect,sync}/route.ts → YENİ (2026-09-13), Polar'ın web-only + manuel senkron deseninin üçüncü kopyası, sync route'unda WHOOP tarzı ensureFreshToken (Fitbit token'ları 8sa'da sona eriyor)
[ ] apps/mobile/app/(tabs)/profile/connect-fitbit.tsx → YOK, Fitbit bilinçli olarak yalnızca web'den bağlanıyor (Polar ile aynı kullanıcı tercihi)
```

**WHOOP entegrasyonu AKTİF (2026-09-11).** Orijinal görev listesindeki
`apps/web/app/(dashboard)/wearables/whoop-connect/route.ts` yolu KULLANILMADI —
gerçek gereksinim ortaya çıkınca değişti: bu callback WHOOP'un sunucusu
tarafından çağrılır, mobil oturumun cookie'sini TAŞIMAZ, ve `(dashboard)`
layout'unun role guard'ından geçmemesi gerekir. Bunun yerine `/api/wearables/whoop/*`
altında, `.env`'deki `WHOOP_REDIRECT_URI` ile hizalı iki route kullanıldı:

```
Sporcu (mobil) → POST /api/wearables/whoop/authorize (Bearer <supabase access_token>)
  → sporcu kimliği athletes.user_id'den çözülür, imzalı state üretilir
    (packages/integrations/whoop/oauth.ts createOAuthState — ayrı bir "pending
    oauth state" tablosu YOK, stateless HMAC imzalı payload, WHOOP_CLIENT_SECRET
    ile imzalanır, 10 dk TTL)
  → { url } WHOOP authorize sayfası döner
→ Mobil: WebBrowser.openAuthSessionAsync(url, Linking.createURL("wearables/callback"))
→ WHOOP kullanıcı onayından sonra GET /api/wearables/whoop/callback?code&state'e yönlendirir
  → state doğrulanır → code token'a çevrilir → WHOOP profile'dan provider_user_id alınır
    → wearable_connections upsert edilir (service-role, onConflict athlete_id+provider)
  → 302 redirect: athleteiq://wearables/callback?status=success|denied|error
→ WebBrowser bu redirect'i yakalayıp kapanır, mobil UI sonucu okur
```

Webhook senkronu (`supabase/functions/whoop-webhook`, v8): `recovery.updated` /
`sleep.updated` / `workout.updated` event'lerinde (yalnızca `.updated`, `.deleted`
şimdilik atlanır) ilgili sporcunun bağlantısı `provider_user_id`'den bulunur, token
gerekirse yenilenir. `recovery.updated`/`sleep.updated` en güncel cycle+sleep+recovery'yi
çekip `wearable_daily_metrics` + `whoop_cycles`'a upsert eder (günlük TEK satır — bir
günde en fazla bir cycle/sleep/recovery olur varsayımıyla "en son"u çekmek yeterli).
`workout.updated` FARKLI bir yoldan gider (2026-09-13): bir günde birden fazla workout
olabileceği için "en son"u çekip günü ezmek yerine, event'in TEKİL ID'siyle
`GET /v2/activity/workout/{id}` çekilip `whoop_workouts` tablosuna `whoop_workout_id`
üzerinden upsert edilir — geçmiş/backfill senkronu bilinçli olarak kapsam dışı, yalnızca
ileriye dönük event'ler işlenir. İmza doğrulaması `X-WHOOP-Signature-Timestamp`
header'ını ham body'nin ÖNÜNE ekleyip HMAC-SHA256 alır — ilk taslakta bu adım
eksikti ve her imza doğrulaması sessizce başarısız olurdu, düzeltildi.

Koç/admin tarafı (2026-09-13): `/wearables` sayfası önceden yalnızca bağlantı durumunu
(Bağlı/Bağlı Değil + son senkron) gösteriyordu, hiçbir wearable verisini render etmiyordu
— bu bir RLS açığı DEĞİL, eksik bir özellikti (`wearable_metrics_select` RLS'i coach/admin'i
zaten kapsıyordu). Her satıra "Detay" linki eklendi → `/wearables/[athleteId]`
(`getWorkouts`, `packages/db/queries/wearables.ts`): son 14 günün recovery/strain/RHR trend
grafiği (Recharts, `athletes/[id]` ACWR grafiğiyle aynı stil) + aynı aralıktaki tüm
`whoop_workouts` kayıtlarının tablosu (spor, süre, strain, ort/maks nabız, kalori).

**Devreye almak için manuel adımlar (1–4 kullanıcı tarafından 2026-09-13'e kadar yapıldı —
Nazlı Savranbaşı'nın hesabı canlı bağlı ve senkron oluyor, bkz. yukarıdaki Env Dosyaları
notu; 5 hâlâ duruma göre gerekebilir):**
1. developer.whoop.com'da bir uygulama kaydet → gerçek `WHOOP_CLIENT_ID` /
   `WHOOP_CLIENT_SECRET` değerlerini `apps/web/.env.local`'e yaz (şu an placeholder).
2. WHOOP dashboard'da redirect URI'yi `apps/web/.env.local`'deki `WHOOP_REDIRECT_URI`
   ile BİREBİR aynı kaydet (prod'da gerçek domain, dev'de emülatör/LAN adresi).
3. Supabase Dashboard → Edge Functions → whoop-webhook → Secrets: `WHOOP_CLIENT_ID`,
   `WHOOP_CLIENT_SECRET`, `WHOOP_WEBHOOK_SECRET` ayarla (fonksiyon kodu deploy edildi,
   secret'lar edge function ortamına AYRI ayarlanmalı — repo secret'ları set edemez).
4. WHOOP dashboard'da webhook URL'i `https://nlmwcygmbbxmfpsubvmh.supabase.co/functions/v1/whoop-webhook`
   olarak kaydet, aynı `WHOOP_WEBHOOK_SECRET`'ı gir.
5. Fiziksel cihazda test için `apps/mobile/.env`'deki `EXPO_PUBLIC_APP_URL`'i
   `10.0.2.2` yerine bilgisayarın LAN IP'sine çevir (Android emülatör varsayılanı
   `10.0.2.2:3000`, gerçek cihaz bunu çözemez).

**WHOOP Token Yönetimi (kritik):**
```typescript
// Her API çağrısında:
// 1. Token süresini kontrol et (expires_at - 5 dakika)
// 2. Süresi dolmuşsa refresh et
// 3. YENİ access + refresh token'ı DB'ye yaz (eski geçersiz)
// 4. Asla eski refresh token'ı tekrar kullanma
```

**Polar entegrasyonu (2026-09-13, web-only, manuel senkron).** WHOOP'tan iki kritik
farkı var: (1) access token **süresiz** — refresh token yok, `ensureFreshToken` gibi bir
mekanizma gerekmiyor; (2) **webhook yok** — hem nightly-recharge/uyku hem egzersizler
GET/transaction ile manuel çekiliyor, bu yüzden WHOOP'un aksine otomatik senkron YOK,
kullanıcı `/wearables`'ta (sporcu kendi sayfasında) veya `/wearables/[athleteId]`'da
(koç/admin) **"Senkronize Et"** butonuna basmalı. Tüm endpoint'ler `/v3/` altında TEK
bir API'dir — bkz. §5.2'deki düzeltme notu (canlı testte iki yanlış varsayımdan sonra
gerçek swagger.yaml'la doğrulandı):

```
Sporcu (web) → GET /api/wearables/polar/connect (cookie oturumu)
  → athlete id çözülür, imzalı state üretilir (packages/integrations/polar/oauth.ts
    createOAuthState — whoop/oauth.ts'teki HMAC imzalama koduyla birebir aynı,
    ayrı bir paylaşılan util yok, her provider kendi dosyasında taşıyor)
  → buildAuthUrl'e (flow.polar.com, scope=accesslink.read_all) yönlendirilir
→ Polar onayından sonra GET /api/wearables/polar/callback?code&state
  → state doğrulanır → exchangeCode → registerUser(accessToken, athleteId)
    (POST /v3/users, 409 = zaten kayıtlı, normal)
    → wearable_connections upsert (provider:'polar', provider_user_id: x_user_id,
      refresh_token/token_expires_at: null — ikisi de Polar'da yok)
  → redirect: /wearables?status=success|denied|error (WHOOP'un web dalıyla aynı,
    mobil deep-link dalı YOK — Polar bilinçli olarak yalnızca web'den bağlanıyor)
→ POST /api/wearables/polar/sync { athleteId }
  → yetki: çağıranın kendi cookie oturumuyla o athleteId'yi SELECT edebilmesi yeterli
    (RLS athletes_select zaten self/admin/coach-team dışını engeller) — bu sayede
    hem sporcunun kendi sayfası hem koçun/admin'in detay sayfası AYNI route'u kullanır
  → direct pull: GET /v3/users/nightly-recharge + /v3/users/sleep (parametresiz, son 28
    gün otomatik) → normalizePolarMetrics → wearable_daily_metrics (provider:'polar')
    upsert — BU İKİSİ ile transaction pull BİRBİRİNDEN BAĞIMSIZ try/catch'lerde, biri
    hata verse bile diğeri denenir, route sonucu metricsError/exercisesError alanlarıyla
    kısmi başarıyı UI'a bildirir
  → transaction pull: fetchExerciseTransaction (POST+GET .../exercise-transactions) →
    polar_exercises upsert (onConflict polar_exercise_id) → BAŞARILIYSA commitTransaction
    (önce yaz, sonra commit — ASLA tersi, commit sonrası aynı veri bir daha gelmez)
→ Disconnect: POST /api/wearables/polar/disconnect → deregisterUser best-effort →
  is_active=false (whoop/disconnect ile aynı desen)
```

`polar_sync_state` tablosu (004_wearables.sql) BİLİNÇLİ OLARAK kullanılmıyor — manuel
tetiklemede transaction zaten kendi durumunu (commit) sunucu tarafında tuttuğu, direct
pull de otomatik "son 28 gün" döndüğü için gereksiz; ileride otomatik/periyodik senkrona
geçilirse devreye girer. Mobil bağlantı ekranı (`connect-polar.tsx`) bilinçli olarak stub
bırakıldı — yalnızca web akışı kuruldu.

**Devreye alma canlı testte tamamlandı (2026-09-13):** admin.polaraccesslink.com'da
gerçek bir uygulama kaydedildi, `POLAR_CLIENT_ID`/`POLAR_CLIENT_SECRET`/
`POLAR_REDIRECT_URI` `apps/web/.env.local`'e girildi. Bu süreçte kod tabanındaki
gerçek hatalar bulunup düzeltildi (bkz. §5.2'nin başındaki not): yanlış OAuth scope
string'i, yanlış API version prefix'i (v4 yerine v3), eksik path segmentleri, ve
tamamen varsayımsal/yanlış Zod şemaları.

**Fitbit entegrasyonu (2026-09-13, web-only, manuel senkron, kod hazır — canlı test
bekliyor).** WHOOP/Polar'dan farklı olarak dev.fitbit.com'un resmi dokümantasyonu
canlı taranarak (WebFetch) doğrulanmış gerçek endpoint/alan adlarıyla sıfırdan
yazıldı — bkz. §5.3. Kısaca: WHOOP gibi rotating refresh token (8sa'da sona erer,
`ensureFreshToken` gerekli), Polar gibi webhook yok (manuel "Senkronize Et"),
scope authorize isteğinde dinamik istenir ("sleep heartrate activity", Polar'daki
gibi panelde önceden seçilen sabit bir tip YOK). `recovery_score`/`sleep_score`
gibi Fitbit'in public API'sinde karşılığı olmayan alanlar dürüstçe null bırakılır.

**Devreye almak için manuel adımlar (yapılmadı, kullanıcı yapmalı):**
1. dev.fitbit.com'da hesap açıp **"Server"** tipinde yeni bir uygulama kaydet →
   gerçek `FITBIT_CLIENT_ID`/`FITBIT_CLIENT_SECRET` değerlerini `apps/web/.env.local`'e
   yaz (şu an placeholder).
2. Redirect URL'i `apps/web/.env.local`'deki `FITBIT_REDIRECT_URI` ile BİREBİR aynı
   kaydet (`.env.example`'da zaten `http://localhost:3000/api/wearables/fitbit/callback`).
3. Dev server'ı yeniden başlat (env değişikliği için).

**Normalize etme:**
```typescript
// WHOOP strain 0-21 → DailyMetrics.strainScore doğrudan
// Polar ANS charge (scale farklı) → 0-100 normalize et
// Her iki provider recovery → wearable_daily_metrics'e yaz
```

**Test kriteri:**
- WHOOP: Token expire → otomatik refresh → API çağrısı başarılı
- Polar: Transaction aç → antrenmanları çek → commit → tekrar aynı veri gelmesin

---

### AGENT 21-AI: Süper Admin'e Özel Wearable AI Analiz Asistanı (2026-09-16, Parti 21-AI)

**Sorumluluk:** Bir sporcunun WHOOP verisi için tek tuşla Türkçe koç değerlendirmesi üreten,
yalnızca süper admin'in gördüğü/tetiklediği AI katmanı.

**Mimari (3 katman), `supabase/functions/athlete-ai-insight/`:**
- `features.ts` — saf fonksiyonlar, DB erişimi yok. Son 42 günün `wearable_daily_metrics`
  (provider whoop), son 8 günün `whoop_workouts`, son 14 günün `wellness_checkins`'ten
  deterministik göstergeler üretir: bugünün metrikleri (`ln_rmssd`, `recovery_zone`,
  `sleep_need_min` vb.), 28 günlük kişisel baseline (ortalama/sd), z-skorları (yalnızca
  baseline n≥7 ve sd>0 ise), 7 günlük trend, güne göre gruplanmış yük (Europe/Istanbul takvim
  günü), wellness özeti, veri kalitesi (eksik günler göreli gün etiketiyle), 8 deterministik
  bayrak (`HRV_DUSUK`, `RHR_YUKSEK`, `SOLUNUM_YUKSEK`, `RECOVERY_KIRMIZI`, `UYKU_KISA`,
  `COKLU_SINYAL`, `BASELINE_YETERSIZ`, `WELLNESS_YOK`) ve `confidence_cap`. `ALGORITHM_VERSION =
  "feat-v1"`. Tüm tarihler göreli (`bugun`, `gun_-N`) — payload'a mutlak tarih hiç girmez.
- `payload.ts` — allowlist'li anonimleştirme: yalnızca `yas` (birth_date+insight_date'ten
  hesaplanır), `cinsiyet` (yalnızca `female`→`kadin`, aksi her durumda `erkek` — belirsizlikte
  güvenli taraf), `brans` (`position`'da "ARTİSTİK" geçiyorsa artistik cimnastik), `features`
  LLM'e gider. İsim/kullanıcı adı/UUID/doğum tarihi/email/not/org/takım/`raw_data` ASLA gönderilmez.
- `prompt.ts` (`PROMPT_VERSION = "insight-v1"`, sistem mesajı sabit — bkz. doc, değiştirilemez) +
  `llm.ts` — OpenAI uyumlu `POST {AI_BASE_URL}/chat/completions`, `response_format: json_object`,
  `max_tokens: 4000`, 45sn timeout, 429/5xx'te retry-after'a uyan 1 tekrar, eksik/şemadan sapmış
  çıktıda ek talimatla 1 tekrar, nihai `guven` = modelin döndürdüğü değer ile `confidence_cap`'ten
  **düşük olanı**.

  **Model çıktısı hoşgörülü ayrıştırılır (2026-09-16 düzeltmesi — bkz. BUGS.md "AI asistanı hiç
  çalışmıyordu").** İlk sürüm `validateOutput` ile ya-hep-ya-hiç doğrulama yapıyordu: şemadan en
  küçük sapma (eksik `oneriler`, 6. bulgu, `"YÜKSEK"` yazımı) tüm analizi `invalid_output`'a
  çeviriyordu. Artık `parseModelContent` + `normalizeOutput` zinciri kullanılır: kod bloğu soyulur,
  etrafındaki düz metin atılır, **kesilmiş JSON açık `{ [ "` yapıları kapatılarak onarılır**
  (`repairTruncatedJson`), bozuk diziler/öğeler tek tek elenir, sınır aşımları kırpılır (reddedilmez),
  `guven` diyakritik/büyük-küçük harf farkından bağımsız eşlenir. Yanıt şemanın tamamını içermiyorsa
  bir kez daha denenir; ikinci deneme de eksikse **elde olan kısmi analiz atılmaz**, yalnızca
  `veri_uyarilari`'na "Model yanıtı eksik döndü" notu eklenir. Yalnızca `ozet` VE (bulgular, oneriler)
  tamamen kurtarılamazsa hata döner — `finish_reason === "length"` ise `llm_truncated`, aksi halde
  `invalid_output`.

  **`max_tokens` akıl yürüten modellerde reasoning token'larını da kapsar.** Kök neden buydu:
  Groq `openai/gpt-oss-120b` ile 1200'lük bütçe reasoning'e gidiyor, JSON şemanın ortasında
  kesiliyordu. Gerçek bir başarılı çağrı 1437 completion token harcadı — yani eski sınır yapısal
  olarak yetersizdi. Sağlayıcı/model değiştirilirse bu bütçe yeniden gözden geçirilmeli.
- `index.ts` — yetki: çağıranın Authorization header'ıyla anon-key istemcisi + `rpc('is_super_admin')`
  (403 değilse), `AI_ENABLED!=='true'` → 503, girdi doğrulama (athlete_id UUID, date opsiyonel
  YYYY-MM-DD, verilmezse Europe/Istanbul bugünü), rate limit (sporcu başına 24 saatte ≥5 → 429),
  veri yükleme (service role), `features.insufficient` ise LLM çağrılmadan `status:'insufficient_data'`
  kaydı, aksi halde LLM çağrısı → `status:'ok'`/`'error'` kaydı. `verify_jwt: true` (asla kapatılmaz).

**Veritabanı:** `athlete_ai_insights` tablosu (`20260916134047_athlete_ai_insights.sql`) —
yalnızca service-role yazar (`revoke insert/update/delete from authenticated`, `revoke all from
anon`), RLS SELECT'i `coalesce(is_super_admin(), false)`. `readiness_scores`'a DOKUNULMADI (ayrı
algoritma, READINESS_PLAN.md).

**Web UI:** `apps/web/app/(dashboard)/wearables/[athleteId]/ai-insight-panel.tsx`
(`AiInsightPanel`, client component) — `page.tsx`'te sunucu tarafı `user.app_metadata.platform_role
=== "super_admin"` kontrolü `false` ise panel hiç render edilmez (veri de hiç çekilmez,
`packages/db/queries/ai-insights.ts` yalnızca `isSuperAdmin` true'yken çağrılır). Tarih seçici
(varsayılan Europe/Istanbul bugünü) + "Analiz Oluştur/Yeniden Oluştur" butonu
`supabase.functions.invoke('athlete-ai-insight', ...)` çağırır; hata gövdesi
`(error as {context?:Response}).context` üzerinden okunup Türkçeye çevrilir
(`ai_disabled`/`rate_limited`/`insufficient_data`/genel). Son 10 analiz geçmişi + "Modele
gönderilen veri" açılır-kapanır JSON görünümü + sabit "karar destek amaçlıdır, tıbbi teşhis
değildir" uyarısı.

**Devreye almak için Beyto'nun manuel adımları (secrets repo'dan set edilemez):**
```
supabase secrets set AI_ENABLED=false --project-ref nlmwcygmbbxmfpsubvmh
supabase secrets set AI_BASE_URL=<saglayici-url> AI_MODEL=<model-adi> AI_API_KEY=<anahtar> --project-ref nlmwcygmbbxmfpsubvmh
```
Sağlayıcı örnekleri: Gemini `https://generativelanguage.googleapis.com/v1beta/openai`, Groq
`https://api.groq.com/openai/v1`.

**Bu adımlar 2026-09-16'da tamamlandı:** `AI_ENABLED=true`, `AI_BASE_URL=https://api.groq.com/openai/v1`,
`AI_MODEL=openai/gpt-oss-120b`. **Model adı secret'tır ve sağlayıcılar model emekliye ayırır** —
`llama-3.1-8b-instant` ilk denemede `model_not_found` (404) döndürdü. `AI_MODEL` değiştirilirken
`max_tokens` bütçesi de gözden geçirilmeli (bkz. yukarıdaki `llm.ts` notu).

**Test kriteri:** `features.test.ts`/`payload.test.ts` (Deno) yazıldı — bu ortamda Deno kurulu
olmadığı için ÇALIŞTIRILAMADI. `llm.ts`'in ayrıştırma/normalizasyon katmanı 2026-09-16'da Node'un
tip-soyma modu (`node --experimental-strip-types`) ile `__internal` üzerinden 23 senaryoyla
doğrulandı — canlı logdan alınan gerçek kesik çıktı dahil. Uçtan uca canlı doğrulama da aynı gün
gerçek süper admin JWT'siyle yapıldı (HTTP 200, `status:ok`).

---

### AGENT 22-FB: Sporcu → Koç Seans Geri Bildirimi (2026-09-17, Parti 22-FB)

**Sorumluluk:** Sporcunun her antrenman seansı için koça RPE + gerçek süre + tamamlanma durumu
+ ağrı bayrağı + serbest not göndermesi; koçun bunu tek bir akışta görüp yanıtlaması; ve bu
sRPE'nin ACWR'ı otomatik beslemesi.

**Neden yeni tablo — mevcut kolonlar kullanılamıyordu.** `014_exercise_sets.sql`
`training_sessions.athlete_session_notes`, `016_session_rpe.sql` `training_sessions.session_rpe`
kolonlarını eklemişti ve ikisi de HİÇ doldurulmamıştı. Bunlar yapısal olarak kullanılamaz:
`training_sessions` satırı bir PROGRAMA aittir ve takım programlarında **tüm takım aynı satırı
paylaşır** (canlı veride doğrulandı: tek bir seans satırı 4 sporcuya birden düşüyor) — iki
sporcunun RPE'si birbirini ezerdi. Ayrıca `sessions_write` yalnızca admin+coach'a yazma verir,
sporcu zaten yazamazdı. Kolonlar SİLİNMEDİ, `DEPRECATED` olarak yorumlandı.

**Şema** (`20260917072700_session_feedback.sql` — MCP kendi zaman damgasını atadı, §4.1'deki
yeniden adlandırma rutini uygulandı): `session_feedback`, granülerlik **(sporcu × seans)**,
`unique (athlete_id, session_id)`. Tasarım kalıbı `012_wellness.sql`'den devralınır —
`source` ('athlete' | 'coach_proxy') + `entered_by` damgası RLS'in İÇİNDE zorlanır, UPDATE
politikasının `with check`inde sahiplik+damga AYNEN tekrarlanır, DELETE politikası YOK.

- `status` ('completed' | 'partial' | 'skipped') — boş RPE'nin "yapmadım" mı "girmeyi unuttum"
  mu olduğu koç için belirsiz kalmasın diye. DB check constraint'i (`session_feedback_load_shape`)
  'skipped' ise rpe/duration'ın null OLMASINI, aksi halde ikisinin de DOLU olmasını zorlar;
  `packages/validators/session-feedback.ts` bu kısıtı istemcide birebir taklit eder (14 birim test).
- `rpe` 1-10 (Foster CR-10). **0 bilinçli olarak yok** — "yaptım ama hiç zorlanmadım" anlamlı
  değil, onun yerine `status='skipped'`.
- `duration_min` GERÇEK süre (planlanan `training_sessions.duration_min` değil; formda planlanan
  önceden dolu gelir, sporcu farklıysa düzeltir). `session_load` generated = `rpe * duration_min`.
- `has_pain` + `pain_area` — serbest notun içine gömülen "dizim ağrıdı" kaybolur; ayrı bayrak
  koç akışında filtrelenebilir kırmızı sinyal olur.
- `session_date` **istemciden gelmez**: `set_session_feedback_date()` BEFORE trigger'ı programın
  `start_date` + (`day_of_week` - 1) hesabıyla EZER. ACWR gün ataması istemciye bırakılamaz.
  (SECURITY INVOKER bilinçli — RLS uygulanır, yayınlanmamış seansa geri bildirim yazılamaz.)

**Koç alanlarının korunması (iki yönlü "damga yalan söyleyemez").** `coach_read_at`/`coach_reply`
vb. kolonlar normal UPDATE'e KAPALIDIR: `session_feedback_guard_coach_columns()` BEFORE UPDATE
trigger'ı, transaction-local `app.session_feedback_coach_action` bayrağı 'on' değilse bu kolonları
OLD değerlerine geri alır (rol adına bağımlılık yok). Tek yazma yolu `mark_session_feedback_read()`
ve `reply_to_session_feedback()` SECURITY DEFINER RPC'leridir — ikisi de `can_manage_athlete_feedback()`
üzerinden `coalesce(..., false)` yetki kontrolü yapar (§4.1). Simetrik olarak RLS UPDATE politikası
ikiye ayrılır: sporcu YALNIZCA `source='athlete'` satırlarını (ve yalnızca son 7 gün), koç/admin
YALNIZCA `source='coach_proxy'` satırlarını düzenleyebilir — **koç sporcunun self-report'unu
değiştiremez, sporcu sahte koç yanıtı yazamaz.**

**ACWR otomatik beslemesi.** `acwr_logs` bugüne kadar YALNIZCA koçun `/acwr` formundan elle
dolduruluyordu — yani koç, başında olmadığı antrenmanın RPE'sini tahmin ediyordu. Artık
`session_feedback_acwr_sync` AFTER trigger'ı o günü yeniden hesaplar:
- Günün birden fazla seansı varsa **ağırlıklı RPE = Σ(rpe·süre)/Σsüre**, `duration_min = Σsüre`
  yazılır; çarpımları tam olarak Σ(rpe·süre)'ye eşit olduğu için `session_load` günün TOPLAM
  yükünü taşır (canlı testte doğrulandı: 8×60 + 6×40 → rpe 7.20 / 100 dk / 720 AU).
- `acwr_logs.source` damgası eklendi: `'manual'` (varsayılan, koçun formu — `acwr-client.tsx`
  artık bunu AÇIKÇA gönderir, aksi halde upsert'in UPDATE dalı source'a dokunmaz ve koçun
  düzeltmesi bir sonraki geri bildirimde ezilirdi) vs `'athlete_feedback'`. **Koçun elle girdiği
  gün ASLA ezilmez** (kullanıcı kararı); ACWR tablosunda "Sporcu" rozetiyle ayırt edilir.
- Günün tüm yükü kalkarsa ('skipped'e çevrildi / silindi) otomatik satır da silinir.
- `refresh_acwr_rolling_loads()` etkilenen günü İZLEYEN 28 günün akut/kronik pencerelerini de
  tazeler. Web formu bunu hiç yapmıyordu (koç günleri sırayla giriyordu); sporcu geri bildirimi
  antrenmandan günler sonra gelebildiği için geriye dönük giriş artık NORMAL durum.
  `acute_load`/`chronic_load` zaten türetilmiş alanlar, elle girilmiş veri değil.

**Arayüzler:**
- Mobil (birincil): `apps/mobile/components/SessionFeedbackSheet.tsx` + `app/(tabs)/program/[day].tsx`
  — her seans kartının altında "Antrenmanı Değerlendir" / girilmişse özet rozetleri + koçun yanıtı.
- Web sporcu: `apps/web/components/features/session-feedback/athlete-feedback-card.tsx`,
  `AthleteProgramView` içinde her seansın altında (wellness'ta olduğu gibi mobil akışın web ikizi).
- Web koç akışı: `apps/web/app/(dashboard)/feedback/` — okunmamış/ağrı/yapılmayan filtreleri,
  sporcu araması, güne göre gruplama, satır içi yanıt + okundu, `session_feedback` üzerinde
  realtime abonelik → `router.refresh()`. Sidebar'da "Geri Bildirimler" (admin+coach).
  Athlete guard allow-list'i genişletilmedi → `/feedback` sporcuya kapalı (mevcut davranış).
- Web koç program detayı: `session-feedback-strip.tsx` — seans kartının altında salt-okunur özet
  ("N okunmamış", "N ağrı") + "Akışta aç" linki.

**Ağrı bildirimi uyarıları (2026-09-17, aynı Parti'nin ikinci adımı).** Kullanıcı "ağrı
bildiriminde koça push bildirimi de ekleyelim" dedi. **Önce tespit edilen gerçek durum:** bu
projede push zinciri HİÇ KURULU DEĞİL — `apps/mobile/lib/notifications.ts`'teki
`registerForPushNotifications()` `undefined` döndüren bir stub, `expo-notifications` kurulu değil,
`eas.json`/EAS `projectId` yok (Expo push token'ı almak için development build ŞART, Expo Go'da
çalışmaz), `athlete_push_tokens` boş ve sporcuya özel (koçu kapsamıyor), gönderim tarafında ne
Edge Function ne `pg_net`/`pg_cron` var (ikisi de kurulu değil). Bu yüzden kanal kullanıcıya
soruldu ve **web içi anlık uyarı + kalıcı rozet** seçildi (Expo push ve e-posta bilinçli olarak
ertelendi); alıcı = sporcunun takım koçu (RLS zaten böyle daraltıyor, ek filtre yok);
tetikleyici = yalnızca ağrı bayrağı.

**Ayrı bir bildirim kuyruğu/outbox tablosu AÇILMADI** — "okunmamış ağrı" durumu zaten
`session_feedback`'te duruyor (`has_pain = true and coach_read_at is null`). İkinci bir kopya iki
kaynağı senkron tutma yükü ve tutarsızlık riski getirirdi. Üç katman:
1. `PainAlertBanner` (`components/shared/pain-alert-banner.tsx`) — `DashboardShell`'de `main`'in
   DIŞINDA, her sayfanın üstünde, okunana kadar kalıcı. Toast 4 saniyede kayboluyor
   (`use-toast.ts` `TOAST_REMOVE_DELAY`), bir sakatlık sinyali için bu çok kısa — kalıcı yüzey bu.
2. Sidebar'da "Geri Bildirimler" satırında kırmızı sayaç rozeti.
3. `PainAlertsProvider` (`lib/hooks/pain-alerts-provider.tsx`) — `session_feedback` üzerinde
   realtime abonelik, yeni gelen okunmamış ağrı satırları için toast; sekme ARKA PLANDAYSA ve koç
   banner'daki butondan opt-in verdiyse ayrıca `Notification` API ile masaüstü bildirimi (izin
   istemi kendiliğinden AÇILMAZ). Abonelik yalnızca admin/coach rolünde kurulur. İlk yükleme
   "yeni geldi" sayılmaz (`seenIds` ref'i), yoksa her sayfa açılışında bekleyen tüm bildirimler
   toast olarak patlardı.
Okundu/yanıt sonrası rozet `usePainAlerts().refresh()` ile beklemeden tazelenir.

**Kapsam dışı (bilinçli):** `source='coach_proxy'` şemada ve RLS'te DESTEKLENİR ama hiçbir UI'dan
girilmez — canlı veride 13/13 sporcunun giriş hesabı var, vekil girişe şu an ihtiyaç yok.
**Expo mobil push** (EAS projesi + development build + `expo-notifications` + kullanıcı bazlı
token tablosu + Expo Push API gönderimi gerekir) ve **e-posta bildirimi** (Resend anahtarı env'de
dolu ama kod tabanında hiç kullanılmıyor; ayrıca koç hesaplarının sentetik e-postası
`@{org_slug}.athleteiq.app` gerçek bir kutu DEĞİL — `profiles`'a gerçek adres alanı eklenmeli)
ertelendi. Egzersiz bazlı geri bildirim, geri bildirim uyum (compliance) raporu ve
`exercises.completed_at` ("yaptım" işaretleme) de bu Parti'de YAPILMADI.

**Test kriteri:**
- Sporcu mobilde bir seansı değerlendirir → koç `/feedback`'te 2 sn içinde görür (realtime)
- Aynı günde iki seans değerlendirilirse `acwr_logs`'ta TEK satır, ağırlıklı RPE + toplam süre
- Koç, sporcunun `source='athlete'` satırındaki rpe/note'u DEĞİŞTİREMEZ (RLS)
- Sporcu, doğrudan UPDATE ile `coach_reply`/`coach_read_at` YAZAMAZ (guard trigger)
- Koçun `/acwr`'den elle girdiği gün, sonradan gelen sporcu geri bildirimiyle EZİLMEZ

---

### AGENT 23-YP: Yıllık (Sezonluk) Periyodizasyon Planı (2026-09-21, Parti 23-YP)

**Sorumluluk:** Bir takım veya sporcu için sezonun tamamını hafta hafta planlayan makro-döngü
ızgarası — hangi hafta hangi antrenman sisteminden kaç seans, hangi yoğunlukta.

**Kaynak:** Koç Rams'ın `RAMS 2026-2027 SEZONU KUVVET&KONDİSYON YILLIK PLAN.xlsx` dosyası.
Excel'de her SAYFA bir hedef (Ünilig/Prolig takımı), her SÜTUN bir sezon haftası (1–59, TARİH
satırı `B3+7` zinciriyle ilerler), her SATIR ya bir bağlam satırı (MAÇLAR, HOME/AWAY,
CYCLES/LOADS — haftalık yoğunluk 0.55→1.0) ya da bir antrenman sistemi (11 sabit satır:
Contrast Training, Fonksiyonel Kuvvet, Aerobik/Anaerobik Dayanıklılık, Genel Kuvvet, Deload,
Kuvvette Devamlılık, Pliometrik, Hız/Hızlanma/Çeviklik, Hipertrofi, Max). Sistem satırındaki
hücre değeri = o hafta o sistemden kaç seans.

**Şema** (`20260921081206_annual_plans.sql` — MCP kendi zaman damgasını atadı, §4.1'deki
yeniden adlandırma rutini uygulandı): `annual_plan_methods` (org kütüphanesi),
`annual_plans` (team_id XOR athlete_id), `annual_plan_weeks`, `annual_plan_cells`. §3'te
ayrıntılı açıklandı.

**ÜÇ BİLİNÇLİ KAPSAM KARARI (kullanıcı onaylı):**

1. **Yarışma satırı ŞEMADA YOK — türetilir.** Excel'in MAÇLAR satırı `competitions` +
   `competition_entries`'ten okunur (`[id]/page.tsx`): takım planında `competitions.team_id`
   eşleşenler ARTI o takımdan en az bir sporcunun kayıtlı olduğu yarışmalar; **sporcu planında
   YALNIZCA o sporcunun `competition_entries` kayıtları.** Bireysel branşlarda her sporcunun
   yarışma takvimi farklı olduğu için bu ikinci dal özelliğin çekirdeğidir. Yarışma verisi
   ikinci bir yerde TUTULMAZ — tek kaynak `competitions`. Tarih→hafta eşlemesi
   `weekIndexForDate()` (`packages/validators/annual-plan.ts`, 24 birim testle doğrulandı; bir
   gün kayması yarışmayı yanlış haftada gösterip koça yanlış haftayı taperletirdi). Plan
   aralığının DIŞINDA kalan yarışmalar sessizce kaybolmaz — ızgaranın altında ayrı bir kartta
   listelenir.
2. **Program ÜRETMEZ.** `program_blocks`/`training_programs`'a hiçbir FK, trigger veya RPC
   bağı yok; bu katman üst seviye bir haritadır. Haftadan program bloğu üretme ve iki yönlü
   senkron bilinçli olarak ertelendi (mevcut `create_program_with_weeks` RPC'sine dokunmayı
   gerektirirdi).
3. **Sporcu erişimi YOK.** `attendance_records` (042) ile aynı tercih — bu bir koç planlama
   aracı. RLS'te sporcu dalı yazılmadı, dolayısıyla middleware/layout athlete guard
   allow-list'i GENİŞLETİLMEDİ (guard zaten allow-list olduğu için `/annual-plans` otomatik
   kapalı — canlıda doğrulandı).

**Antrenman sistemi listesi org'a özeldir, sabit değil.** Excel'in 11 satırı yalnızca
`DEFAULT_ANNUAL_PLAN_METHODS` (validators) olarak kodda durur ve bir org ilk planını
oluştururken `seedAnnualPlanMethods()` ile idempotent olarak tohumlanır — sonrasında org kendi
branşına göre düzenler (cimnastik ile basketbolun sistemleri aynı değil). Kod bu isimlere göre
hiçbir yerde dallanmaz. **Silme UI'da SUNULMAZ**, `is_active=false` sunulur: `annual_plan_cells.
method_id` `on delete cascade` olduğu için bir sistemi silmek o sistemin TÜM planlardaki geçmiş
hücrelerini de sessizce götürür.

**RLS:** `025_team_scoped_training_rls.sql`'deki coach dalı birebir. weeks/cells için koşul
altı kez kopyalanmak yerine `can_access_annual_plan()` SECURITY DEFINER helper'ında tekil
tutuldu — §4.1 muafiyeti (my_role/my_team_id gibi RLS içinden çağrıldığı için `authenticated`
EXECUTE kaldırılamaz; gövdenin tamamı zaten `coalesce(..., false)` ile fail-closed bir yetki
kontrolüdür). `anon`/`PUBLIC` EXECUTE kaldırıldı.

**Arayüz:** `/annual-plans` (liste, hedefe göre gruplu) → `/annual-plans/[id]` (ızgara).
Izgarada hücreye tıklama +1, Shift+tıklama/sağ tık −1 (0–6 döngüsü; 7–14 hafta detayından),
yazma **iyimser** — 52×11 ızgarada her tıklamada `router.refresh()` kullanılamaz olurdu, hata
durumunda hücre eski değerine GERİ ALINIR. Hafta başlığına tıklamak hafta detayını açar
(yoğunluk/faz/yer/not + tam seans değerleri + "bu haftayı 5-8'e kopyala" aralık ifadesi).
`MethodsDialog` sistem kütüphanesini yönetir.

**Test kriteri (canlı DB'de 2026-09-21'de doğrulandı, tümü geçti):**
- ACE koçu yalnızca ACE takım planını görür; ACK koçu kendi takım planını VE kendi takımındaki
  sporcunun bireysel planını görür (7 senaryo, geri alınan transaction içinde)
- ACK koçu ACE planını UPDATE edemez (0 satır)
- Sporcu hiçbir plan/hücre/sistem görmez (0/0/0)
- `can_access_annual_plan`: `anon` EXECUTE yok, `authenticated` EXECUTE var
- `packages/validators/annual-plan.test.ts` — 24 test (hafta↔tarih eşlemesi, artık yıl,
  yıl sınırı, XOR kısıtı, yoğunluk sınırları)

**Kapsam dışı (bilinçli, kullanıcı onaylı):** Excel/CSV dışa aktarma, "Max Takibi" sayfası
(Excel'de var, projede `athlete_1rm_records` tablosu hazır ama bu görünüm yazılmadı), Epley
max hesaplayıcı (`kg × tekrar × 0.0333 + kg` — Excel'in "Maks Hesaplama Formülü" sayfası),
mobil görünüm.

---

### AGENT 6: Test Agent (Kalite Güvence Uzmanı)

**Sorumluluk:** RLS testleri, API entegrasyon testleri, E2E senaryolar

**Uzmanlık seviyesi:** Kıdemli QA + güvenlik test uzmanı

**Görev listesi:**
```
[ ] tests/rls/isolation.test.ts → Coach A'nın Coach B verisine erişemediğini doğrula
[ ] tests/rls/athlete-view.test.ts → Sporcu sadece kendi published programını görür
[ ] tests/rls/admin.test.ts → Org admin tüm takımları görür
[ ] tests/integration/whoop.test.ts → Mock WHOOP API → normalize → DB
[ ] tests/integration/polar.test.ts → Mock Polar API → transaction → normalize → DB
[ ] tests/e2e/coach-creates-program.spec.ts → Playwright: koç program oluşturur
[ ] tests/e2e/athlete-views-program.spec.ts → Playwright: sporcu görür + realtime
[ ] tests/e2e/invite-flow.spec.ts → Playwright: admin davet → sporcu kabul
```

**RLS Test Şablonu:**
```typescript
// Her test kendi Supabase service role client'ı ile test user oluşturur
// Test sonunda cleanup yapar
describe('Coach isolation', () => {
  it('Coach A cannot see Coach B athletes', async () => {
    // Arrange: 2 org, 2 coach, 2 athlete oluştur
    // Act: Coach A'nın client'ı ile Coach B'nin sporculara sor
    // Assert: 0 sonuç dön
  })
})
```

**Test kriteri:** CI'da tüm testler yeşil olmadan merge yapılmaz

---

## 7. ENVIRONMENT VARIABLES

```bash
# .env.example — Tüm değerleri doldur, asla commit etme

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ASLA client'a göndermef
SUPABASE_JWT_SECRET=xxx

# WHOOP (developer.whoop.com'dan al)
WHOOP_CLIENT_ID=xxx
WHOOP_CLIENT_SECRET=xxx
WHOOP_REDIRECT_URI=http://localhost:3000/api/wearables/whoop/callback
WHOOP_WEBHOOK_SECRET=xxx  # Webhook signature validation için

# Polar (admin.polaraccesslink.com'dan al)
POLAR_CLIENT_ID=xxx
POLAR_CLIENT_SECRET=xxx
POLAR_REDIRECT_URI=http://localhost:3000/api/wearables/polar/callback

# Email
RESEND_API_KEY=re_xxx

# Uygulama
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 8. GELİŞTİRME KOMUTLARI

```bash
# Kurulum (bir kez)
pnpm install
supabase start
supabase db reset  # migrations + seed çalıştırır

# Geliştirme
pnpm dev                    # Tüm uygulamalar (Turborepo)
pnpm dev --filter=web       # Sadece web
pnpm dev --filter=mobile    # Sadece mobile (Expo)

# Veritabanı
supabase db diff            # Şema değişikliklerini gör
supabase db push            # Migration'ları uygula
pnpm db:gen:types           # TypeScript tipleri üret

# Test
pnpm test                   # Tüm testler
pnpm test:rls               # Sadece RLS testleri
pnpm test:e2e               # Playwright E2E

# Build
pnpm build                  # Production build
eas build --platform all    # Mobile build (EAS)
```

---

## 9. AGENT ÇALIŞMA PROTOKOLü

Her agent görev başlamadan önce şunu yap:

1. **Oku:** Bu CLAUDE.md dosyasının ilgili bölümünü (agent tanımı)
2. **Kontrol et:** Hedef dosyalar zaten var mı? Varsa üzerine yaz, yoksa oluştur
3. **Doğrula:** TypeScript strict mode'da hata var mı? `tsc --noEmit` çalıştır
4. **Test et:** Agent kendi test kriterini çalıştır
5. **Rapor et:** "Görev tamamlandı, [X] dosya oluşturuldu/güncellendi, testler geçti"

**Hiçbir agent:**
- Bu dosyadaki kararları sormadan değiştirmez
- `any` tipi kullanmaz (TypeScript strict)
- RLS bypass etmez (service role key sadece Edge Function'larda)
- Env variable'ları hardcode etmez

---

## 9.1 DOKÜMANTASYON BAKIM PROTOKOLÜ

`[OTOMATİK ÜRETİLDİ]` — yani `<!-- AUTO-GENERATED:...:START/END -->` marker'ları arasındaki
bloklar (§2 klasör ağacı, §3 tablo şeması, §11 migration listesi, dosya sonundaki senkron
tarihi) **elle düzenlenmez** — `pnpm docs:sync` ile üretilir (`scripts/docs-sync.mjs`). Şema,
klasör yapısı veya migration sayısını değiştiren HER Parti kapanışında bu komut çalıştırılır
ve çıktısı commit'e dahil edilir.

Not: senkron tarihi (dosya sonu) gün hassasiyetinde (`YYYY-MM-DD`) — aynı gün içinde art arda
çalıştırılan iki `pnpm docs:sync` idempotent'tir (git diff boş çıkar); yalnızca gece yarısını
aşan bir çift-çalıştırma tarih satırında fark gösterir, bu beklenen bir durumdur.

Akış diyagramları ve mimari anlatı (davet akışı, RLS özeti, teknik pattern açıklamaları vb.)
elle güncellenir. Her böyle bölümün yanında `[Son doğrulama: Parti X.Y]` etiketi bulunur.
Yeni bir Parti kapanışında, mevcut Parti numarası bu etiketten 3+ ileriyse, o bölüm gözden
geçirilmeden Parti kapatılamaz — ya güncellenir ya da hâlâ doğru olduğu teyit edilip etiket
güncellenir.

**Her Parti kapanış promptuna eklenecek standart adım:** "Bu Parti şema/route/klasör yapısı
değiştirdiyse: `pnpm docs:sync` çalıştır. Akış/mimari anlatı değiştirdiyse: ilgili
[Son doğrulama] etiketini güncelle."

---

## 10. MVP TAMAMLANMA KRİTERLERİ

Proje, aşağıdakiler çalışır durumda olunca MVP sayılır:

```
✅ Org Admin kullanıcı oluşturabilir (web)
✅ Coach davet edilebilir (e-posta)
✅ Athlete davet edilebilir (e-posta)
✅ Coach sporcu ekleyebilir
✅ Coach antrenman programı oluşturabilir (takım veya bireysel)
✅ Coach programı publish edebilir
✅ Athlete mobilde programı görebilir (realtime)
✅ Athlete ACWR logu girebilir
✅ Coach ACWR dashboard'unu görebilir
✅ Yarışma eklenebilir
✅ Test sonucu eklenebilir
✅ RLS testleri yeşil (coach izolasyonu)
```

**Wearable entegrasyonu MVP'nin dışındadır.** Altyapı (tablolar, token saklama, normalize şema) hazır olur, aktif sync sonraki sprint'te açılır.

---

*Son güncelleme: Haziran 2026 — Beyto Tosun / AthleteIQ*
*Bu dosya CLAUDE.md'dir. Claude Code bu dosyayı okuyarak çalışır.*

<!-- AUTO-GENERATED:SYNC_TIMESTAMP:START -->
Son otomatik senkron: 2026-09-24
<!-- AUTO-GENERATED:SYNC_TIMESTAMP:END -->

---

## 11. MEVCUT DURUM

> Detaylı dosya listesi ve görev takibi için → **PROGRESS.md** (kök dizin)

### Supabase Cloud
- **Proje URL:** `https://nlmwcygmbbxmfpsubvmh.supabase.co`
- **Project ID:** `nlmwcygmbbxmfpsubvmh`
- **Migration durumu:** `007` hiç var olmadı — iki farklı migration aynı numara prefix'ini paylaşıyordu, biri silindi biri `010_trial.sql` olarak yeniden numaralandırıldı (bkz. BUGS.md "PARTİ 3"). Güncel liste (otomatik senkron — bkz. dosya sonu "Son otomatik senkron"):

<!-- AUTO-GENERATED:MIGRATIONS:START -->
- 001_schema.sql
- 002_rls.sql
- 003_functions.sql
- 004_wearables.sql
- 005_exercises.sql
- 006_exercise_seed.sql
- 008_rls_signup.sql
- 009_security_fixes.sql
- 010_trial.sql
- 011_realtime.sql
- 012_wellness.sql
- 013_readiness_scores.sql
- 014_exercise_sets.sql
- 015_exercise_sets_fixes.sql
- 016_session_rpe.sql
- 017_program_blocks.sql
- 018_create_program_with_weeks.sql
- 019_shared_session_tree_insert.sql
- 020_update_program_week.sql
- 021_propagate_week.sql
- 022_add_athlete_username.sql
- 023_drop_trial_system.sql
- 024_revert_signup_self_serve_rls.sql
- 025_team_scoped_training_rls.sql
- 026_team_scoped_program_rpc.sql
- 027_drop_calculate_acwr.sql
- 028_platform_exercises_admin_rls.sql
- 029_program_archive.sql
- 030_program_discipline.sql
- 031_1rm_team_scoped_rls.sql
- 032_profiles.sql
- 033_drop_memberships_insert_self.sql
- 034_teams_rls_fix.sql
- 035_teams_metadata.sql
- 036_athletes_team_id_nullable.sql
- 037_organizations_update_policy.sql
- 038_exercise_taxonomy_extend.sql
- 039_exercise_library_import.sql
- 041_exercise_taxonomy_extend2.sql
- 042_attendance.sql
- 043_training_groups.sql
- 20260818073627_parti_18s_secure_definer_functions.sql
- 20260827122641_platform_exercises_delete.sql
- 20260904124844_acwr_logs_update_policy.sql
- 20260909070021_athlete_delete_and_competition_entries.sql
- 20260912072715_wod_sessions.sql
- 20260913123732_whoop_workouts.sql
- 20260913131022_polar_exercises.sql
- 20260913201909_fitbit_activities.sql
- 20260914075144_exercise_1rm_ratios.sql
- 20260916084250_super_admin_app_metadata.sql
- 20260916134047_athlete_ai_insights.sql
- 20260917072700_session_feedback.sql
- 20260917074747_session_feedback_function_hardening.sql
- 20260921081206_annual_plans.sql
- 20260922084236_position_vs_training_group.sql
- 20260922084343_position_vs_training_group_move_mevki.sql
<!-- AUTO-GENERATED:MIGRATIONS:END -->
- **Edge Functions:** (2026-07-29 listesi Parti 16'da güncellendi — `create-org-user`/
  `reset-user-password` yeni, `invite-member` emekliye ayrıldı; `grant-athlete-access`/
  `reset-athlete-password`'ın deploy versiyonları bu listeye önceki partilerde eklenmemişti,
  hâlâ ACTIVE ve kullanımda, bkz. §11 Çalışan Özellikler)
  - `invite-member` — **RETİRE (Parti 16)**, her çağrıda 410 Gone döner, silinmedi (minimal-diff)
  - `create-org-user` — yeni (Parti 16), ACTIVE — admin/koç/sporcu doğrudan kullanıcı adı+şifre ile oluşturma
  - `reset-user-password` — yeni (Parti 16), ACTIVE — genel (admin/koç) şifre sıfırlama, `profiles` üzerinden çözer
  - `create-athlete-account` — ACTIVE (Parti 4.B) — sporcuya özel, hâlâ paralel kullanımda
  - `grant-athlete-access` / `reset-athlete-password` — ACTIVE (Parti 10) — sporcuya özel
  - `update-org-user` — yeni (2026-09-09), ACTIVE — ad/kullanıcı adı düzenler, username değişirse `auth.users.email`'i senkron günceller (bkz. §4.3)
  - `delete-org-user` — yeni (2026-09-09), ACTIVE — kullanıcı silme, `auth.users` cascade'iyle memberships/profiles otomatik temizlenir
  - `whoop-webhook` — ACTIVE, v8 (2026-09-13) — gerçek senkron mantığı devrede + tekil workout senkronu, bkz. §6 Agent 5
  - `polar-sync` — **YOK** (bu listede önceden "ACTIVE" yazıyordu, bu YANLIŞTI — dosya hiç
    oluşturulmamış, `list_edge_functions` ile 2026-09-11'de doğrulandı; Polar entegrasyonu
    henüz başlanmadı, bkz. §6 Agent 5 görev listesi)

### Env Dosyaları
- Web: `apps/web/.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `WHOOP_CLIENT_ID`/`WHOOP_CLIENT_SECRET`/`WHOOP_REDIRECT_URI`/`WHOOP_WEBHOOK_SECRET` (2026-09-11'de eklendi; 2026-09-13 itibarıyla GERÇEK developer app kaydıyla dolduruldu — Nazlı Savranbaşı'nın hesabı canlı bağlı, `wearable_connections`'da aktif token + yakın zamanlı `last_synced_at` doğrulandı), `POLAR_CLIENT_ID`/`POLAR_CLIENT_SECRET`/`POLAR_REDIRECT_URI` (2026-09-13'te eklendi, GERÇEK developer app kaydıyla dolduruldu, canlı bağlantı doğrulandı — bkz. §6 Agent 5), `FITBIT_CLIENT_ID`/`FITBIT_CLIENT_SECRET`/`FITBIT_REDIRECT_URI` placeholder (henüz gerçek developer app kaydı yapılmadı)
- Mobile: `apps/mobile/.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_APP_URL` (2026-09-11'de eklendi — WHOOP authorize/callback route'larını barındıran apps/web adresi, emülatörde `10.0.2.2:3000`)

### Test Hesapları
- **Admin (super_admin), TGF:** giriş kimliği `beytullah.tosun@tgf` (tam sentetik email:
  `beytullah.tosun@tgf.athleteiq.app`) | Şifre değişmedi (AthleteIQ2026) — Parti 18'de
  `tosunbeytullah9@gmail.com`'dan bu kimliğe taşındı (bkz. §4.3), Parti 16'da Koç Üniversitesi
  membership'i kaldırılmıştı, artık YALNIZCA TGF'de admin.
- **Admin, Koç Üniversitesi:** beytullah.tosun@koc-universitesi.athleteiq.app — Parti 16'da `create-org-user` ile oluşturuldu, ayrı bir auth hesabı (yukarıdakiyle aynı kişi ama org kapsamlı kimlik gereği ayrı kayıt). `platform_role: super_admin` bu hesapta YOK, yalnızca yukarıdaki TGF hesabında. Gerçek şifre CLAUDE.md'ye yazılmaz.
- **Coach:** belgeli/kalıcı bir coach test hesabı **yok** (Parti 4.E'de doğrulandı — org'daki tek gerçek membership yukarıdaki admin). `parti8f-temp-coach@tgf` / `parti8f-temp-coach-empty@tgf` (TGF, korunacak test hesapları, Parti 16'da `profiles` satırları backfill edildi, Parti 18'de org-scoped email desenine taşındı) kullanılabilir, gerçek şifreleri CLAUDE.md'ye yazılmaz. Gerekirse Parti 4.E'nin kullandığı yöntemle yeni bir geçici hesap oluşturun (service-role ile `auth.admin.createUser` + `memberships` satırı, TGF org/ACE takım, `role: coach`) ve iş bitince silin.
- **`cosaswilan@gmail.com`** (eski, şifresiz/kırık davet akışının ürünü) Parti 16'da silindi — artık mevcut değil.

### Çalışan Özellikler (2026-06-26 itibarıyla, kimlik bölümü Parti 16'da güncellendi, giriş deseni Parti 18'de tekleştirildi)
- ✅ Auth: login (yalnızca kullanıcı adı + şifre, `kullanici@slug` org-scoped kısayolu —
  e-posta ile giriş ve e-posta ile şifre sıfırlama Parti 18'de kalıcı olarak kapatıldı; mobil
  "magic link" [şifresiz e-posta OTP] modu da aynı partide kaldırıldı, web Magic Link'i zaten
  Parti 4.D'de kaldırmıştı; davet akışı Parti 16'da kaldırıldı), admin'in kullanıcıyı doğrudan
  oluşturması (`create-org-user`, Parti 16) + kullanıcı-adı tabanlı sporcu hesabı oluşturma
  (Parti 4.B/4.C, hâlâ paralel), middleware (role-based routing)
- ✅ Kullanıcı yönetimi: `/settings/users` — org admin ve süper admin için kullanıcı listesi + oluşturma + şifre sıfırlama + düzenleme + silme (Parti 16, düzenleme/silme 2026-09-09)
- ✅ Sporcu yönetimi: listeleme, arama, ekleme, detay, düzenleme, pasife alma/kalıcı silme (2026-09-09 — bkz. §4.1, §6 Agent 3)
- ✅ Branş / Mevki / Antrenman Grubu ayrımı (2026-09-22) — eski tek "Pozisyon / Branş"
  kutusu üçe ayrıldı: branş takımdan türetilir (`teams.discipline`, sporcu formunda
  girdi YOK), mevki `athletes.position`'da, program görünürlüğünü daraltan grup
  `athletes.training_group`'ta. Sporcu listesinde artık Takım/Branş, Mevki ve
  Antrenman Grubu kolonları var; arama mevki ve grubu da kapsıyor. Program
  oluşturma/düzenleme formu yazılan grubun kimi kapsadığını kaydetmeden önce
  gösterir ("3 sporcu görecek: ..."). Bkz. §4.4.
- ✅ Toplu içe aktarma (2026-09-24) — `/athletes/import`, `/programs/import` ve
  `/tests/import-1rm`: Excel/CSV'den sporcu kadrosu, haftalık antrenman programı ve 1RM
  kayıtları tek seferde yüklenir. Dosya seçilebilir veya
  Excel'den doğrudan yapıştırılabilir (pano TSV bırakır, ayırıcı otomatik algılanır); her iki
  sayfada indirilebilir örnek şablon var. Sütun adları Türkçe/İngilizce, büyük-küçük harf ve
  Türkçe karakter farkı gözetmeden tanınır. İçe aktarmadan ÖNCE satır bazlı önizleme + hata/uyarı
  listesi gösterilir; tek bir hata varken buton kapalıdır. Sporcu dosyasında "Kullanıcı Adı"
  sütunu dolu olan satırlar için giriş hesabı da açılır ve şifreler sonuç ekranında tek seferlik
  gösterilir (CSV indirilebilir). 1RM dosyasında egzersiz adı katalogda bulunmak zorundadır
  (yanlış yazım %1RM yüklerini sessizce boş bırakırdı — eşleşmeyene yakın ad önerilir) ve
  önizleme "daha güncel kayıt var" durumunu ayrıca uyarır. Yeni bir yazma yolu açılmadı —
  mevcut RLS/Edge Function/RPC yolları kullanılır. Bkz. §6 Agent 3.
- ✅ Program yönetimi: oluşturma, listeleme, detay, publish. Liste 2026-09-16'da hedef
  (takım/sporcu) → blok kırılımlı gruplu görünüme geçti — çok haftalı bloklar tek kartta
  toplanıp haftalar tıklanabilir rozetlere indi, "bu hafta" vurgulanıyor, arama eklendi;
  eski düz grid "Liste" seçeneğinde korundu (bkz. §6 Agent 3)
- ✅ CrossFit tarzı (WOD) seans yapısı (2026-09-12) — bir seans AMRAP/EMOM/For Time/Tabata/RFT/Chipper formatına çevrilebilir (format + zaman alanları + düz hareket listesi); set/yük/tonaj/skorlama kapsam dışı, kullanıcı onaylı
- ✅ ACWR: log girişi + dashboard (aynı gün ikinci girişte/koç düzeltmesinde sessizce
  başarısız olan eksik UPDATE RLS politikası `040_acwr_logs_update_policy.sql` ile
  kapatıldı, bkz. Bekleyen Özellikler'in altındaki "03.09.2026 Eksiklikler" notu)
- ✅ Yıllık (sezonluk) periyodizasyon planı (2026-09-21, Parti 23-YP) — `/annual-plans`:
  takım VEYA sporcu bazlı sezon ızgarası (hafta sütunları × antrenman sistemi satırları,
  hücre = o hafta kaç seans), haftalık yoğunluk %'si, faz/yer/not, hafta kopyalama.
  **Yarışma satırı `competitions`/`competition_entries`'ten otomatik dolar** — sporcu
  planında yalnızca o sporcunun yarışmaları (bireysel branş gereksinimi). Antrenman
  sistemi listesi org'a özel ve düzenlenebilir. Koç/admin'e özel (sporcuya kapalı),
  program üretmez. Bkz. AGENT 23-YP.
- ✅ Sporcu → koç seans geri bildirimi (2026-09-17, Parti 22-FB) — sporcu her antrenman seansı
  için RPE (1-10) + gerçek süre + durum (yaptım/eksik/yapmadım) + ağrı bayrağı + serbest not
  gönderir; koç `/feedback` akışında (okunmamış/ağrı/yapılmayan filtreleri, realtime) görür ve
  yanıtlar, sporcu yanıtı mobilde aynı seansın altında okur. Girilen sRPE `acwr_logs`'u OTOMATİK
  besler (günde çok seans → ağırlıklı RPE), koçun elle girdiği günler ezilmez. **Ağrı bildirimi**
  koça web içinde anlık uyarı (toast + sekme arka plandaysa opt-in masaüstü bildirimi) ve okunana
  kadar kalıcı bir uyarı şeridi + sidebar rozeti olarak düşer. Bkz. AGENT 22-FB.
- ✅ Wellness: `/wellness` — sporcu web arayüzünden günlük check-in girer (Parti 03.09.2026
  Eksiklikler §3'e kadar bu akış yalnızca mobile'da vardı; web athlete guard'ı hem
  `middleware.ts` hem `(dashboard)/layout.tsx`'te `/wellness`'e izin verecek şekilde
  genişletildi)
- ✅ Yarışma: ekleme + listeleme + sporcu bazlı katılımcı (roster) seçimi — `competition_entries` tablosu, her yarışmaya yalnızca seçilen sporcular kayıtlı (2026-09-09). Sporcu web'de `/competitions`'ta kendi kayıtlı olduğu yarışmaları salt-okunur görür (2026-09-11).
- ✅ Test sonuçları: ekleme + listeleme
- ✅ Wearable altyapısı: tablolar + token saklama + normalize şema
- ✅ WHOOP entegrasyonu (2026-09-11, CANLI 2026-09-13) — OAuth bağlanma (mobil + web, ikisi
  de aynı callback'i platform state'ine göre paylaşır), webhook ile gerçek zamanlı senkron
  (recovery/sleep/cycle → `wearable_daily_metrics` + `whoop_cycles`), bağlantı kesme
  (mobil + web) + WHOOP tarafında yetki iptali (`revokeAccess`). Gerçek WHOOP developer app
  kaydı yapıldı, Nazlı Savranbaşı'nın hesabı canlı bağlı ve senkron oluyor. Koç/admin
  görünümü (2026-09-13): `/wearables` → sporcu satırındaki "Detay" linki →
  `/wearables/[athleteId]` — 14 günlük recovery/strain/RHR trend grafiği + tekil antrenman
  (workout) kayıtları tablosu (`whoop_workouts`, event-bazlı senkron, backfill yok — bkz.
  §6 Agent 5).
- ✅ Polar entegrasyonu (2026-09-13) — gerçek developer app kaydedildi, OAuth bağlanma
  (yalnızca web, mobil `connect-polar.tsx` bilinçli olarak stub) canlı testte çalıştı.
  Manuel "Senkronize Et" butonuyla direct pull (nightly-recharge/uyku) + transaction
  pull (egzersizler → `polar_exercises`), bağlantı kesme (`deregisterUser`). Canlı
  testte üç ayrı yanlış varsayım bulunup düzeltildi (yanlış scope, yanlış API version
  prefix'i, yanlış Zod şemaları — bkz. §5.2 ve §6 Agent 5) — son düzeltmeden sonraki
  uçtan uca doğrulama devam ediyor.
- ✅ Fitbit entegrasyonu (2026-09-13, kod hazır) — dev.fitbit.com resmi
  dokümantasyonuyla doğrulanarak sıfırdan yazıldı (bkz. §5.3), WHOOP/Polar'dan
  sonra kurulan generic `ProviderCard`/`ProviderSection` UI bileşenlerine üçüncü
  provider olarak eklendi. Web-only OAuth (8sa'da sona eren, rotating refresh
  token — WHOOP ile aynı desen) + manuel "Senkronize Et" (uyku/kalp atışı/HRV
  + `fitbit_activities`). Gerçek Fitbit developer app kaydı ve secret'ların
  girilmesi bekliyor — bkz. §6 Agent 5 "Devreye almak için manuel adımlar"
  (WHOOP/Polar'dakiyle aynı desen).
- ✅ Sporcu web profili: `/profile` — sporcu kendi bilgilerini (ad, takım, org, fiziksel
  veriler) salt-okunur görür, düzenleme yok (RLS'te athlete self-update izni yok) (2026-09-11)
- ✅ Mobile: login, program, recovery, competitions, profile, wearable connect ekranları
- ✅ Süper admin'e özel WHOOP AI analiz asistanı (2026-09-16, Parti 21-AI; **CANLI 2026-09-16** —
  secrets girildi, `AI_ENABLED=true`, sağlayıcı Groq / `openai/gpt-oss-120b`, uçtan uca gerçek
  sporcu verisiyle doğrulandı: `status:ok`, 5 bulgu / 4 öneri / 3 soru, ~3.2sn, 2011 in / 1437 out
  token) — `/wearables/[athleteId]`'da yalnızca süper
  admin'e görünen `AiInsightPanel`, `athlete-ai-insight` Edge Function'ını (`supabase.functions.invoke`)
  tetikleyip seçili tarih için Türkçe koç değerlendirmesi üretir. 3 katman: `features.ts` (saf,
  deterministik — HRV/RHR/solunum z-skorları, recovery/uyku/yük/wellness göstergeleri, 8 bayrak,
  `confidence_cap`), `payload.ts`+`prompt.ts`+`llm.ts` (allowlist'li anonim payload → OpenAI uyumlu
  `/chat/completions`, 429/5xx'te 1 tekrar, geçersiz JSON çıktısında 1 tekrar), `athlete_ai_insights`
  tablosu (yalnızca service-role yazar, RLS SELECT'i `coalesce(is_super_admin(), false)`). Bkz. AI
  Katmanı Kuralları (hemen aşağıda) ve §6 Agent 5 sonrası "AGENT 21-AI" notu.

**AI Katmanı Kuralları (Parti 21-AI, değiştirilemez):**
1. LLM hiçbir sayı hesaplamaz — tüm göstergeler `features.ts`'te deterministik kodla üretilir, LLM yalnızca yorum yazar.
2. LLM'e giden payload allowlist ile anonimleştirilir (`payload.ts`) — isim/kullanıcı adı/UUID/doğum tarihi/email/not/org/takım/raw_data ASLA gönderilmez, tüm tarihler göreli (`bugun`, `gun_-N`).
3. Sağlık verisi (payload, model çıktısı, API anahtarı) ASLA loglanmaz — yalnızca durum/süre/token sayısı (`llm.ts`).
4. Yalnızca süper admin erişir — hem Edge Function (`rpc('is_super_admin')` + 403) hem web paneli (sunucu tarafı `user.app_metadata.platform_role` kontrolü, değilse render edilmez) hem RLS (`athlete_ai_insights_select_super_admin`).
5. `AI_ENABLED` varsayılanı `false`'tur — env'de `true` olmadıkça Edge Function 503 döner, gerçek sporcu verisiyle kullanım kararı KVKK açısından Beyto'ya aittir.

### Bekleyen Özellikler
- ⏳ ~~Davet e-postası gerçek dış adreslere ulaşmıyor~~ — Parti 16'da davet akışının kendisi kaldırıldı (`invite-member` 410 döner), bu madde artık geçersiz. Custom SMTP kurulumu (Dashboard → Auth → SMTP Settings) yalnızca gelecekte bir email-doğrulama/şifre-sıfırlama-linki özelliği eklenirse gerekir.
- ⏳ Realtime aboneliği (program publish → sporcu anlık görsün)
- ⏳ Seed verisi genişletme (şu an minimal: 1 org, 2 takım, 1 sporcu)
- ⏳ Egzersiz kütüphanesi (005_exercises.sql)
- ⏳ Program builder süperset sistemi
- ⏳ Polar gerçek developer app kaydı + otomatik/periyodik senkron (pg_cron) — kod hazır,
  bkz. Çalışan Özellikler
- ⏳ Fitbit gerçek developer app kaydı + canlı uçtan uca test — kod hazır, bkz. Çalışan Özellikler
- ✅ ~~AI analiz asistanı secrets'ı + canlı uçtan uca test~~ — 2026-09-16'da tamamlandı
  (`AI_ENABLED=true`, Groq `openai/gpt-oss-120b`), bkz. Çalışan Özellikler. KVKK kararı Beyto
  tarafından verilmiş sayılır — gerçek sporcu verisi artık sağlayıcıya gidiyor.
- ⏳ **Expo mobil push altyapısı (hiç kurulu değil)** — `registerForPushNotifications()` stub,
  `expo-notifications` kurulu değil, EAS `projectId`/`eas.json` yok (token için development build
  şart), `athlete_push_tokens` boş ve sporcuya özel, gönderim tarafı (Edge Function veya
  `pg_net`/`pg_cron`) yok. Ağrı bildirimi şu an web içi uyarı + rozet olarak çalışıyor; mobil
  push isteniyorsa önce `eas init` + dev build gerekir
- ⏳ Ağrı bildiriminde e-posta (Resend) — anahtar env'de dolu ama kodda hiç kullanılmıyor; ayrıca
  koç hesaplarının sentetik e-postası gerçek bir kutu değil, `profiles`'a gerçek adres alanı gerekir
- ⏳ Yıllık plan: Excel/CSV dışa aktarma, "Max Takibi" görünümü (`athlete_1rm_records` hazır),
  Epley max hesaplayıcı, mobil görünüm, haftadan program bloğu üretme — hepsi Parti 23-YP
  kapsamı dışında bırakıldı (kullanıcı onaylı), bkz. AGENT 23-YP
- ⏳ Seans geri bildiriminde koç vekil girişi (`source='coach_proxy'`) — şema+RLS hazır, UI yok
  (13/13 sporcunun hesabı olduğu için şimdilik gerekmiyor); geri bildirim uyum (compliance)
  raporu — Parti 22-FB kapsamı dışında bırakıldı
- ⏳ RLS izolasyon testleri
- ⏳ E2E Playwright testleri

### Her Yeni Session Başında
```
1. CLAUDE.md § 11 oku → Supabase URL, env konumları, test kullanıcısı
2. PROGRESS.md oku → Tamamlanan + bekleyen görevler
3. Sıradaki göreve geç (PROGRESS.md "Öncelik 1" listesi)
```
