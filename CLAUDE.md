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
- WHOOP v2 entegrasyonu (recovery, sleep, strain, HRV)
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

---

## 2. MONOREPO KLASÖR YAPISI

<!-- AUTO-GENERATED:TREE:START -->
```
AthleteIQ/
├── .claude/
│   └── settings.local.json
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── .env
│   │   ├── .gitignore
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── eslint.config.js
│   │   ├── expo-env.d.ts
│   │   ├── global.css
│   │   ├── metro.config.js
│   │   ├── nativewind-env.d.ts
│   │   ├── package.json
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
│       ├── athlete.test.ts
│       ├── athlete.ts
│       ├── auth.ts
│       ├── exercise.test.ts
│       ├── exercise.ts
│       ├── index.ts
│       ├── organization.ts
│       ├── package.json
│       ├── program.ts
│       ├── team.ts
│       ├── tsconfig.json
│       └── wellness.ts
├── patches/
│   └── react-native-css-interop@0.2.6.patch
├── scripts/
│   ├── docs-sync.mjs
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
│   │   ├── create-athlete-account/
│   │   ├── grant-athlete-access/
│   │   ├── invite-member/
│   │   ├── polar-sync/
│   │   ├── reset-athlete-password/
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
│   │   └── 031_1rm_team_scoped_rls.sql
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
└── turbo.json
```
<!-- AUTO-GENERATED:TREE:END -->

> Not: `packages/ui` yalnızca `apps/web` tarafından kullanılır (Radix UI tabanlı bileşenler, React Native ile uyumsuz — `apps/mobile`'da hiçbir referans yok). Mobile kendi bileşenlerini (`apps/mobile/components/`) kullanır.

---

## 3. VERİTABANI ŞEMASİ

> Tam DDL için `supabase/migrations/`, kolon tipleri için `packages/db/types.ts` bakın. Aşağıdaki liste her tablonun amacını özetler; açıklamalar `scripts/table-descriptions.json`'dan gelir ve `pnpm docs:sync` ile güncellenir.

<!-- AUTO-GENERATED:SCHEMA:START -->
- **acwr_logs** — sRPE yöntemiyle günlük antrenman yükü ve hesaplanan ACWR (Acute:Chronic Workload Ratio) oranı (001_schema.sql).
- **athlete_1rm_records** — Sporcunun kayıtlı 1RM (bir tekrar maksimum) değerleri; %1RM bazlı yük hesaplama ve program builder'daki "Son max" rozeti bu tablodan beslenir (005_exercises.sql, UI kablolaması Parti 2.2.E).
- **athlete_push_tokens** — Sporcunun Expo push notification token'ı; koç bir programı publish ettiğinde mobil bildirim göndermek için kullanılır (004_wearables.sql).
- **athletes** — Sporcu profili — organizasyon ve takıma bağlı, opsiyonel auth kullanıcısı, doğum tarihi/boy/kilo/pozisyon vb. (001_schema.sql).
- **competition_results** — Bir sporcunun bir yarışmadaki sonucu (event/score/rank) (001_schema.sql).
- **competitions** — Organizasyona ait yarışma/müsabaka (takım veya bireysel) (001_schema.sql).
- **exercise_sets** — Bir egzersize ait set bazlı yük/RPE/tekrar kaydı; exercises tablosundaki tekil kg/RPE/% alanlarının yerini alan set-bazlı model (014_exercise_sets.sql, Parti 2.1).
- **exercises** — Bir seansa ait tekil egzersiz kaydı (sets/reps/load) — set bazlı detay için bkz. exercise_sets (001_schema.sql).
- **memberships** — Kullanıcı-organizasyon-takım-rol ilişkisi (admin/coach/athlete); bir kullanıcının bir org'daki tek yetkisi (001_schema.sql).
- **org_exercise_categories** — Bir organizasyona özel, platform kütüphanesini genişleten egzersiz kategorileri (005_exercises.sql).
- **org_exercises** — Bir organizasyona özel, platform kütüphanesinde bulunmayan egzersiz tanımları (005_exercises.sql).
- **organizations** — Her müşteri (federasyon/kulüp) için bir tenant kaydı; plan (free/pro/enterprise) ve slug (URL prefix) burada tutulur (001_schema.sql).
- **platform_exercises** — Platform genelinde salt-okunur, global egzersiz kütüphanesi (135 egzersiz, 16 hareket paterni — 006_exercise_seed.sql ile dolduruldu) (005_exercises.sql).
- **polar_sync_state** — Polar'ın transaction-tabanlı senkronizasyon modelinde, kaynak tipi başına son commit edilen transaction ID'si (004_wearables.sql).
- **program_blocks** — Birden fazla haftalık training_programs satırını ortak bir döneme (örn. "8 Haftalık Hazırlık Dönemi") gruplayan üst seviye konteyner (017_program_blocks.sql, Parti 3.B).
- **readiness_scores** — wellness_checkins'ten türetilen, bireysel taban çizgisine dayalı readiness skoru cache'i; sadece service_role/Edge Function yazar, hesaplama motoru henüz aktif değil (şema hazır) (013_readiness_scores.sql).
- **teams** — Bir organizasyona bağlı takım (discipline: artistic/rhythmic/trampoline/diving vb.) (001_schema.sql).
- **test_results** — Sporcu fiziksel test sonuçları (CMJ, sprint, kuvvet testleri vb. — bkz. ayrıca athlete_1rm_records) (001_schema.sql).
- **training_programs** — Takıma VEYA bireysel sporcuya atanan haftalık antrenman programı (team_id XOR athlete_id); is_published=false iken sporcu göremez (001_schema.sql).
- **training_sessions** — Bir programa ait, haftanın belirli bir gününe düşen antrenman seansı (strength/conditioning/technical/recovery/competition) (001_schema.sql).
- **wearable_connections** — Sporcunun WHOOP/Polar hesabına bağlı OAuth access/refresh token'ları (şifreli saklanır) (004_wearables.sql).
- **wearable_daily_metrics** — WHOOP ve Polar'dan normalize edilmiş, ortak şemaya dönüştürülmüş günlük recovery/sleep/strain verisi (004_wearables.sql).
- **wellness_checkins** — Sporcunun günlük 5 maddelik özbildirim wellness anketi (McLean ve ark. 2010 ölçeği, 1=en kötü/5=en iyi, reverse-coding yok); readiness katmanının ham girdisi — üründe "Hooper Index" olarak ADLANDIRILMAZ (012_wellness.sql).
- **whoop_cycles** — WHOOP'a özel, cycle bazlı ham strain/recovery verisi (004_wearables.sql).
<!-- AUTO-GENERATED:SCHEMA:END -->

---

## 4. ROW LEVEL SECURITY (ÇEKİRDEK TABLOLAR)

> Aşağıdaki politikalar yalnızca `002_rls.sql`'i (ilk 8 çekirdek tablo) kapsar. `platform_exercises`, `org_exercise_categories`, `org_exercises`, `athlete_1rm_records` (005), `wellness_checkins` (012), `readiness_scores` (013), `exercise_sets` (014), `program_blocks` (017) ve `athlete_push_tokens` (004) için RLS politikaları kendi migration dosyalarında tanımlıdır, burada tekrar edilmez.

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

### 4.2 Tip Güvenliği Konvansiyonu — types.ts regenerasyonu

Yeni bir tablo/kolon/RPC fonksiyonu eklendiğinde, `packages/db/types.ts` AYNI COMMIT İÇİNDE regenerate edilmeli (`supabase gen types`). Bunu sonraki bir partiye ertelemek, o aradaki tüm partilerde yeni eklenen alanların/fonksiyonların type-check tarafından doğrulanmadan geçmesine yol açar (Parti 3.B-3.E arası bu şekilde gecikti, bkz. PROGRESS.md).

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

### 5.2 Polar AccessLink v4

```
Base URL: https://www.polaraccesslink.com/v4/
Admin: https://admin.polaraccesslink.com
Auth: OAuth 2.0 (erişim token'ı SONA ERME YOK — uzun ömürlü)
Kayıt: Kullanıcı OAuth sonrası POST /v4/users ile kayıt edilmeli!

Scopes: activity:read sleep:read nightly_recharge:read
         training_sessions:read continuous_samples:read

Temel endpoint'ler:
GET /v4/data/nightly-recharge-results  → ANS charge + HRV + sleep charge
GET /v4/data/sleep-results             → Uyku kalite + safhalar
GET /v4/data/continuous-samples        → Sürekli kalp atışı (30 gün maks)
POST /v4/users/{userId}/exercise-transactions  → Transaction aç (ZORUNLU)
GET /v4/users/{userId}/exercise-transactions/{txId}  → Antrenmanları listele
PUT /v4/users/{userId}/exercise-transactions/{txId}  → COMMIT (veriyi işaretle)

KRİTİK — Transaction Modeli:
  1. POST transaction aç → transaction_id al
  2. GET içindeki antrenmanları çek
  3. Her antremanı işle + DB'ye kaydet
  4. PUT ile commit et → Polar "teslim edildi" işaretler
  → Commit edilmezse aynı veri tekrar gelir (at-least-once garantisi)
  → Commit sonrası veri bir daha gelmez — önce işle, sonra commit!

Rate limit: Per-client dynamic scaling (kullanıcı sayısına göre)
```

### 5.3 Normalize Edilmiş Ortak Şema

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
[ ] packages/integrations/whoop/client.ts → v2 REST client (retry + rate limit)
[ ] packages/integrations/whoop/oauth.ts → Auth code flow + rotating token refresh
[ ] packages/integrations/whoop/types.ts → v2 Zod şemaları (Cycle, Sleep, Recovery, Workout)
[ ] packages/integrations/whoop/normalize.ts → WHOOPRecovery → DailyMetrics
[ ] packages/integrations/polar/client.ts → v4 REST client
[ ] packages/integrations/polar/oauth.ts → Auth code flow (long-lived token)
[ ] packages/integrations/polar/transaction.ts → Transaction lifecycle manager
[ ] packages/integrations/polar/types.ts → v4 Zod şemaları
[ ] packages/integrations/polar/normalize.ts → PolarNightlyRecharge → DailyMetrics
[ ] supabase/functions/whoop-webhook/ → Webhook receiver + signature validation
[ ] supabase/functions/polar-sync/ → Cron: her saat Polar transaction çek
[ ] apps/web/app/(dashboard)/wearables/whoop-connect/route.ts → OAuth callback
[ ] apps/web/app/(dashboard)/wearables/polar-connect/route.ts → OAuth callback
[ ] apps/mobile/app/(tabs)/profile/connect-whoop.tsx → Sporcu WHOOP bağlantı
[ ] apps/mobile/app/(tabs)/profile/connect-polar.tsx → Sporcu Polar bağlantı
```

**WHOOP Token Yönetimi (kritik):**
```typescript
// Her API çağrısında:
// 1. Token süresini kontrol et (expires_at - 5 dakika)
// 2. Süresi dolmuşsa refresh et
// 3. YENİ access + refresh token'ı DB'ye yaz (eski geçersiz)
// 4. Asla eski refresh token'ı tekrar kullanma
```

**Polar Transaction (kritik):**
```typescript
// SIRA ZORUNLU:
// 1. POST transaction → tx_id al
// 2. Antrenmanları çek + işle + DB'ye kaydet
// 3. Hata yoksa PUT commit et
// 4. polar_sync_state tablosuna last_tx_id yaz
// ASLA önce commit, sonra işleme yapma!
```

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
Son otomatik senkron: 2026-08-11
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
<!-- AUTO-GENERATED:MIGRATIONS:END -->
- **Edge Functions (Supabase MCP `list_edge_functions` ile doğrulandı, 2026-07-29):** dördü de cloud'a deploy edilmiş ve **ACTIVE**:
  - `invite-member` — v5, ACTIVE
  - `whoop-webhook` — v4, ACTIVE
  - `polar-sync` — v4, ACTIVE
  - `create-athlete-account` — v1, ACTIVE (Parti 4.B)

### Env Dosyaları
- Web: `apps/web/.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, WHOOP/Polar placeholders
- Mobile: `apps/mobile/.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Test Hesapları
- **Admin (super_admin):** tosunbeytullah9@gmail.com | Şifre: AthleteIQ2026
- **Coach:** belgeli/kalıcı bir coach test hesabı **yok** (Parti 4.E'de doğrulandı — org'daki tek gerçek membership yukarıdaki admin). Gerekirse Parti 4.E'nin kullandığı yöntemle geçici bir hesap oluşturun (service-role ile `auth.admin.createUser` + `memberships` satırı, TGF org/ACE takım, `role: coach`) ve iş bitince silin — kalıcı bir coach hesabı bilerek burada tutulmuyor (gerçek şifre CLAUDE.md'ye yazılmaz).

### Çalışan Özellikler (2026-06-26 itibarıyla)
- ✅ Auth: login (e-posta veya kullanıcı adı + şifre — Magic Link kaldırıldı, Parti 4.D), invite kabul, kullanıcı-adı tabanlı sporcu hesabı oluşturma (Parti 4.B/4.C), middleware (role-based routing)
- ✅ Sporcu yönetimi: listeleme, arama, ekleme, detay
- ✅ Program yönetimi: oluşturma, listeleme, detay, publish
- ✅ ACWR: log girişi + dashboard
- ✅ Yarışma: ekleme + listeleme
- ✅ Test sonuçları: ekleme + listeleme
- ✅ Wearable altyapısı: tablolar + token saklama + normalize şema
- ✅ Mobile: login, program, recovery, competitions, profile, wearable connect ekranları

### Bekleyen Özellikler
- ⏳ Davet e-postası gerçek dış adreslere ulaşmıyor — Edge Functions'ın kendisi deploy edildi/ACTIVE (yukarıya bkz.), ama Supabase'in varsayılan SMTP'si yalnızca proje ekibi üyelerine gönderiyor ve saatte ~2 e-postayla sınırlı; gerçek sporcu/koç davetleri için custom SMTP (Dashboard → Auth → SMTP Settings) kurulmalı (bkz. BUGS.md)
- ⏳ Realtime aboneliği (program publish → sporcu anlık görsün)
- ⏳ Seed verisi genişletme (şu an minimal: 1 org, 2 takım, 1 sporcu)
- ⏳ Egzersiz kütüphanesi (005_exercises.sql)
- ⏳ Program builder süperset sistemi
- ⏳ Wearable aktif sync (WHOOP webhook + Polar transaction)
- ⏳ RLS izolasyon testleri
- ⏳ E2E Playwright testleri

### Her Yeni Session Başında
```
1. CLAUDE.md § 11 oku → Supabase URL, env konumları, test kullanıcısı
2. PROGRESS.md oku → Tamamlanan + bekleyen görevler
3. Sıradaki göreve geç (PROGRESS.md "Öncelik 1" listesi)
```
