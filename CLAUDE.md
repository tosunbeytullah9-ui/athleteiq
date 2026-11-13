# AthleteIQ — Athlete Monitoring SaaS Platform
## CLAUDE.md — Agent Command Center

> Bu dosya projenin tek kaynak of truth'udur. Tüm agent'lar her görev öncesi bu dosyayı okur.
> Hiçbir agent bu dosyadaki kararları sormadan değiştirmez. Çakışma varsa bu dosya kazanır.

---

## BAŞVURU DOKÜMANLARI — bu dosyadan taşınan bölümler (Parti 18J)

> CLAUDE.md her oturumda bağlama yüklenir; bu yüzden yalnızca her oturumda gereken kuralları
> taşır (§0, §1, §4.1–§4.3, §9, §9.1, "Her Yeni Session Başında"). Başvuru içeriği aşağıdaki
> dosyalara **birebir** taşındı — § numaraları ve başlıklar aynı kaldı. Kodda, migration'larda
> veya PROGRESS/BUGS'ta geçen "CLAUDE.md §X" atıfları bu tabloyla çözülür. Dosyalar otomatik
> yüklenmez: ilgili işe başlamadan önce **açıkça okuyun**.

| § | Konu | Dosya | Ne zaman oku |
|---|---|---|---|
| §2 | Monorepo klasör yapısı (otomatik ağaç) | [docs/claude/structure.md](docs/claude/structure.md) | Yeni paket/klasör eklemeden veya bir dosyanın yerini ararken |
| §3 | Veritabanı şeması — tablo amaçları (otomatik) | [docs/claude/database.md](docs/claude/database.md) | Migration yazmadan, tablo/kolon eklemeden, bir tablonun ne tuttuğunu öğrenirken |
| §4, §4.0 | Çekirdek tablo RLS'i (tarihsel 002_rls.sql) + program ağacı definer id kümeleri (Parti 18P) | [docs/claude/database.md](docs/claude/database.md) | RLS politikası yazmadan/değiştirmeden; `training_programs`/`training_sessions`/`exercises`/`exercise_sets`'e dokunmadan |
| §4.4 | Branş / Mevki / Antrenman Grubu (`matches_training_group`) | [docs/claude/database.md](docs/claude/database.md) | `athletes`/`teams`, antrenman grubu veya program görünürlüğü işinden önce |
| §5 (5.1–5.4) | WHOOP / Polar / Fitbit API ayrıntıları, normalize şema | [docs/claude/wearables.md](docs/claude/wearables.md) | `packages/integrations`, `/api/wearables/*`, `whoop-webhook` işinden önce |
| §6 | Agent tanımları + özellik kararları: Agent 1 DB, 2 Auth, 3 Web, 4 Mobile, 5 Integration, 21-AI, 22-FB, 23-YP, 6 Test | [docs/claude/agents.md](docs/claude/agents.md) | Bir özelliği değiştirmeden önce o özelliğin tasarım kararlarını ve "kapsam dışı" listesini okumak için (içe aktarma, WOD, dayanıklılık, drill, blok kopyalama, landing, demo talebi, slug kilidi, AI asistanı, seans geri bildirimi, yıllık plan, mobil kısıtlar) |
| §7, §8 | Env değişkenleri, geliştirme komutları, EAS notu | [docs/claude/env-and-commands.md](docs/claude/env-and-commands.md) | Env eklerken, kurulum/build/test komutu veya EAS build öncesi |
| §10, §11 | MVP kriterleri; mevcut durum: Supabase Cloud, migration listesi (otomatik), Edge Functions, env dosyaları, test hesapları, çalışan/bekleyen özellikler (AI Katmanı Kuralları artık burada: §4.1-AI) | [docs/claude/status.md](docs/claude/status.md) | Oturum başında (bkz. "Her Yeni Session Başında"); test hesabı, Edge Function veya özellik durumu ararken |

## GÜNCEL DURUM ÖZETİ (2026-11-13 — ayrıntı: [docs/claude/status.md](docs/claude/status.md))

- **Ürün:** Loadwell — canlı alan adı https://loadwell.app (marka sabitleri `packages/validators/brand.ts`).
  Web Vercel'de; dahili sentetik e-posta alan adı `.athleteiq.app` bilinçli olarak korunuyor (§4.3).
- **Supabase:** proje ref `nlmwcygmbbxmfpsubvmh` (`https://nlmwcygmbbxmfpsubvmh.supabase.co`).
- **Mobil:** Expo SDK 54, bundle ID / paket `app.loadwell`, şema `loadwell`; EAS projesi bağlı
  (`extra.eas.projectId`, `ascAppId 6828987401`), iOS TestFlight build 1 (`buildNumber "1"`).
  `WEARABLES_ENABLED = false` (`apps/mobile/lib/features.ts`) — mobilde WHOOP bağlama "Yakında";
  Polar ve Fitbit yalnızca web. Expo push altyapısı kurulu değil. EAS adımları:
  `docs/app-store/eas-build-runbook.md`.
- **Aktif kilitli kararlar** (değiştirmeden önce sorun):
  - Giriş yalnızca `kullanici@slug` + şifre; e-posta ile giriş/sıfırlama kapalı; bir hesap = bir org (§4.3).
  - Yetki yalnızca `app_metadata` / DB tablolarından — `user_metadata` asla (§4.1).
  - RLS: `(select ...)` sarmalı, definer küme fonksiyonları, `FOR ALL` yok, snapshot ile eşdeğerlik kanıtı (§4.1).
  - Saatsiz tarih asla `new Date(str)`; `todayLocal` / `todayInIstanbul` (§1 tarih kuralı).
  - AI katmanı kuralları değiştirilemez; yalnızca süper admin (§4.1-AI).
  - Kullanıcısı olan org'un slug'ı DB trigger'ıyla kilitli; koçun elle girdiği ACWR günü ezilmez;
    drill diyagramı ve yıllık plan sporcuya kapalı; landing yalnızca hayali "Demo Kulübü" verisi (agents.md §6).

---

## 0. PROJE TANIMI

**Ürün adı:** **Loadwell** (eski adı AthleteIQ; 2026-10-28) — birincil alan adı https://loadwell.app, marka sabitleri `packages/validators/brand.ts`  
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
Expo SDK 54
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

> **Tarih kuralı (Parti 18T, kalıcı):** Saatsiz tarih (YYYY-MM-DD) asla `new Date(str)` ile
> okunmaz — UTC gece yarısı olur ve UTC'nin batısında bir gün kayar. 'Bugün': mobilde
> `todayLocal()` (cihazın yerel takvim günü — yurt dışındaki sporcu kendi gününü görür), web ve
> sunucuda `todayInIstanbul()` (sabit UTC+3). Sunucunun kuralını taklit eden pencere hesapları
> (geri bildirim/wellness düzenleme) mobilde de `todayInIstanbul()` kullanır. `toISOString()`
> asla 'bugün' için kullanılmaz. Gösterim `formatYmdTr`, karşılaştırma string, gün farkı
> `daysBetweenYmd`, gün ekleme `addDaysYmd` (hepsi `packages/validators/date.ts`). SQL'de
> `current_date` yerine `(now() at time zone 'Europe/Istanbul')::date`.

---

## §4.1–§4.3 — HER OTURUMDA GEÇERLİ GÜVENLİK, TİP VE KİMLİK KURALLARI

> "## 4. ROW LEVEL SECURITY" bölümünün girişi, §4.0 ve §4.4 → [docs/claude/database.md](docs/claude/database.md).
> Aşağıdaki üç alt bölüm metni değişmeden burada kaldı; §4.1-AI (AI Katmanı Kuralları) 18J-ek'te
> status.md'den birebir taşındı.

### 4.1 Güvenlik Konvansiyonları

**RLS politika kuralları (Parti 18P, kalıcı):** RLS politikasında fonksiyon çağrıları `(select ...)`
ile sarılır; başka bir RLS'li tabloya `EXISTS` ile inmek yerine SECURITY DEFINER küme fonksiyonu
kullanılır; `FOR ALL` politika yazılmaz — INSERT/UPDATE/DELETE ayrı yazılır. RLS'e dokunan her parti
`scripts/security/rls-visibility-snapshot.mjs` ile önce/sonra eşdeğerliğini kanıtlar
(`--out önce.json` → migration → `--out sonra.json` → `--compare önce.json sonra.json`; tek fark
→ ters migration). Script yeni tabloları `TABLES` listesine ekleyerek kapsar, hiçbir koşulda COMMIT
etmez ve `SUPABASE_DB_URL`'yi (kök `.env`) yalnızca bağlanmak için kullanır.

Herhangi bir plpgsql fonksiyonunda manuel yetkilendirme kontrolü yazılırken (`IF NOT (...) THEN RAISE EXCEPTION` deseni), koşul ifadesi MUTLAKA `coalesce(..., false)` ile sarılmalı. Ham `is_super_admin() OR my_role(org)=X OR ...` zinciri, org üyeliği olmayan kullanıcılar için `my_role()` NULL döndüğünde üç değerli mantık yüzünden sessizce bypass edilir (NOT NULL = NULL, hiçbir zaman true olmaz). Bu, Parti 3.C'de gerçek bir yetkisiz-erişim açığı olarak bulundu ve düzeltildi (bkz. PROGRESS.md § Parti 3.C).

Her yeni `SECURITY DEFINER` fonksiyonu, gövdesinin ilk satırlarında `coalesce(..., false)` ile
sarmalanmış bir yetki kontrolü İÇERMELİDİR. Yalnızca dahili yardımcı olarak kullanılacak
`SECURITY DEFINER` fonksiyonlarından `PUBLIC`, `anon` ve `authenticated` rollerinin EXECUTE
yetkisi kaldırılmalıdır. `my_role`, `my_team_id` ve `is_super_admin` fonksiyonları RLS
politikaları içinden çağrıldığı için `authenticated` yetkileri ASLA kaldırılamaz. Aynı istisna
(Parti 18P): `readable_program_ids`, `readable_session_ids`, `readable_exercise_ids`,
`writable_program_ids`, `writable_session_ids`, `writable_exercise_ids`, `can_write_program` ve
`can_access_annual_plan` — RLS içinden çağrılırlar, gövdeleri zaten fail-closed bir yetki
kontrolüdür (`coalesce(..., false)`), döndürdükleri id'ler çağıranın zaten okuyabildiği/yazabildiği
satırlardır; anon/PUBLIC EXECUTE yok. Anon bu dört tablodan okurken `42501` alır (bugün de
`is_super_admin()` yüzünden böyleydi — snapshot bunu "ERR:42501" olarak kaydeder). Aynı istisna
(Parti 18C-S, `20261028113032_athlete_scoped_reads_and_competition_visibility.sql`): `readable_athlete_ids`
(`athletes_select`'in birebir karşılığı — `whoop_cycles` / `athlete_1rm_records` /
`polar_sync_state` SELECT'i), `my_athlete_ids`, `staff_competition_ids` (süper admin → tümü,
aksi halde admin/koç olunan org'lar) ve `own_competition_ids` (kendi kaydı VEYA sonucu olan
yarışmalar) — dört yarışma tablosunun SELECT'i; `competitions` ↔ `competition_entries`
politikaları birbirine referans verdiği için bu yardımcılar özyinelemeyi de önler. (Parti 18-S'te
`copy_program_tree` ve `get_athlete_programs`'ın bu kuralı atladığı, ikisinin de gerçek
cross-tenant açık olduğu bulundu ve kapatıldı — bkz. PROGRESS.md § Parti 18-S, BUGS.md Kritik.)

**Bir fonksiyonun imzasını değiştirmek (parametre eklemek/çıkarmak) Postgres'te YENİ bir
fonksiyon oluşturur ve eski fonksiyonun grant/revoke ayarları taşınmaz.** 20261026 itibarıyla
public şemasındaki yeni fonksiyonlar anon/PUBLIC'e varsayılan EXECUTE almıyor (default
privileges, `function_default_privileges_hardening` migration'ı — Parti 18B-ek); authenticated'a
hâlâ alıyor — dahili helper'lardan authenticated'ı da elle kaldırın. Kök neden:
`create_program_with_weeks` / `update_program_week`'ten Parti 18-S'te kaldırılan anon EXECUTE,
imzalarına `p_discipline` / `p_training_group` eklenince geri gelmişti. PUBLIC'in EXECUTE hakkı
yalnızca GLOBAL olarak kaldırılabildiği için (şema bazlı varsayılanlar global olana yalnızca
eklenir) `extensions` ve `supabase_migrations` şemalarında PUBLIC'e varsayılan EXECUTE şema
bazında geri verildi; postgres'in ileride oluşturacağı YENİ bir şemada fonksiyonlar varsayılan
olarak PUBLIC'e açık OLMAZ. `supabase_admin` rolünün varsayılanlarına dokunulmadı.
SECURITY DEFINER SQL fonksiyonlarında `set search_path = ''` + gövdede `public.` nitelemesi
zorunludur (`can_access_annual_plan` 18B-ek'te düzeltildi); SECURITY INVOKER, saf SQL ve RLS
içinde satır başına çağrılan `tr_fold` / `matches_training_group` bilinçli olarak muaf —
`SET search_path` inline edilmelerini engeller.

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

### 4.1-AI AI Katmanı Kuralları (Parti 21-AI, değiştirilemez)

1. LLM hiçbir sayı hesaplamaz — tüm göstergeler `features.ts`'te deterministik kodla üretilir, LLM yalnızca yorum yazar.
2. LLM'e giden payload allowlist ile anonimleştirilir (`payload.ts`) — isim/kullanıcı adı/UUID/doğum tarihi/email/not/org/takım/raw_data ASLA gönderilmez, tüm tarihler göreli (`bugun`, `gun_-N`).
3. Sağlık verisi (payload, model çıktısı, API anahtarı) ASLA loglanmaz — yalnızca durum/süre/token sayısı (`llm.ts`).
4. Yalnızca süper admin erişir — hem Edge Function (`rpc('is_super_admin')` + 403) hem web paneli (sunucu tarafı `user.app_metadata.platform_role` kontrolü, değilse render edilmez) hem RLS (`athlete_ai_insights_select_super_admin`).
5. `AI_ENABLED` varsayılanı `false`'tur — env'de `true` olmadıkça Edge Function 503 döner, gerçek sporcu verisiyle kullanım kararı KVKK açısından Beyto'ya aittir.

### 4.2 Tip Güvenliği Konvansiyonu — types.ts regenerasyonu

Yeni bir tablo/kolon/RPC fonksiyonu eklendiğinde, `packages/db/types.ts` AYNI COMMIT İÇİNDE regenerate edilmeli (`supabase gen types`). Bunu sonraki bir partiye ertelemek, o aradaki tüm partilerde yeni eklenen alanların/fonksiyonların type-check tarafından doğrulanmadan geçmesine yol açar (Parti 3.B-3.E arası bu şekilde gecikti, bkz. PROGRESS.md).

### 4.3 Kimlik Modeli — org kapsamlı kullanıcı adı, sentetik email deseni (Parti 16, Parti 18'de tek desene indirildi)

**Kimlik org kapsamlıdır, global değil.** Sentetik email deseni:

```
{username}@{org_slug}.athleteiq.app

beytullah.tosun@tgf.athleteiq.app
beytullah.tosun@koc-universitesi.athleteiq.app   ← aynı username, farklı org, bağımsız hesap
```

> **Sentetik e-posta alan adı `.athleteiq.app` bilinçli olarak korundu** (Parti 18E, marka
> Loadwell oldu): dahili kimliktir, kullanıcıya gösterilmez; arayüz yalnızca `kullanici@slug`
> gösterir ve kopyalatır (`buildLoginIdentifier` / `toLoginIdentifier`,
> `packages/validators/auth.ts` — `resolveLoginIdentifier` tam sentetik e-postayı REDDEDER).

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
reddeder (org'u kilitlemesin diye). **Parti 18B'ye kadar bu silme aktif kullanıcıların çoğunda
ÇALIŞMIYORDU:** `auth.users`'a referans veren 15 audit kolonu (`created_by`, `entered_by`,
`recorded_by`, `invited_by`, `coach_replied_by`...) `ON DELETE NO ACTION`'dı — program yazmış
bir koçun veya wellness girmiş bir sporcunun `deleteUser`'ı FK ihlaliyle reddediliyordu (canlıda
21 üyeliğin 14'ü). `20261026185415_auth_user_fk_set_null.sql` hepsini `SET NULL` yaptı: satırlar
org'da kalır, yalnızca yazar alanı boşalır. **Yeni bir `auth.users` FK'si eklerken `on delete
set null` (audit) veya `cascade` (kişiye ait veri) seçin — `no action` kullanıcı silmeyi kırar.**

**Hesap silme talebi (Parti 18B, 2026-10-26 — App Store 5.1.1(v) + KVKK m.11/13).** Sporcu,
koç veya admin mobil profildeki "Hesabımı Sil" ile `request_account_deletion()` RPC'sini
çağırır → `account_deletion_requests`'e `pending` talep (kişi başına tek açık talep, `due_at` =
+30 gün; süper admin talep OLUŞTURAMAZ). Talep yalnızca kişinin kendisine, o org'un admin'ine
ve süper admine görünür (koç başkasınınkini görmez). Admin `/settings/users` → "Silme
Talepleri"nde `get_account_deletion_impact()` ile silinecek kayıt sayılarını (ve kurumda
korunacak, yazarı boşalacak içeriği) silmeden ÖNCE görür, kullanıcı adını yazarak onaylar →
`supabase/functions/process-account-deletion` ya da gerekçeyle reddeder
(`reject_account_deletion_request()`, not zorunlu, kişi notu mobilde görür). Kişi beklerken
`cancel_account_deletion_request()` ile geri alabilir. Tabloda INSERT/UPDATE/DELETE politikası
yok; tüm yazmalar bu 3 RPC + Edge Function'dan.
**Yeni talep bildirimi (Parti 18B-ek):** talep başarıyla oluşturulunca mobil
`notify-account-deletion` Edge Function'ını (`verify_jwt: true`, girdi yok) fire-and-forget
çağırır — sonucu beklenmez, hatası gösterilmez, talep akışını etkilemez. Fonksiyon yalnızca
ÇAĞIRANIN kendi `pending` + `notified_at is null` talebini arar (başkasınınkini tetikleyemez),
Resend REST API ile platform sahibine (`ACCOUNT_DELETION_NOTIFY_EMAIL` — koç/sporcu e-postaları
sentetik olduğu için org admin'ine DEĞİL) e-posta atar ve başarılıysa `notified_at`'i doldurur
(ikinci çağrı `nothing_to_notify`). E-postada yalnızca kurum adı, rol, talep tarihi, son tarih
ve `{APP_SITE_URL}/settings/users` bağlantısı var — **ad, kullanıcı adı, talep notu YOK**;
loglarda yalnızca talep id'si + sonuç kodu. Secret yoksa `not_configured` döner.
**`delete-org-user` ile farkı:** `delete-org-user` yalnızca **giriş erişimini kaldırır**
(`athletes.user_id` SET NULL — roster ve tüm sağlık/antrenman verisi kalır).
`process-account-deletion` **kişiyi ve verisini siler**: kişinin `athletes` satırı varsa
(rolden bağımsız — bir admin'in de sporcu satırı olabiliyor) önce aktif wearable yetkilerini
sağlayıcıda iptal eder (best-effort; Fitbit secret'ı Edge ortamında yoksa atlanır), sonra satırı
siler → 21 tablo CASCADE; ardından `auth.users`'ı siler ve talebi `completed` yapıp ad/kullanıcı
adı/notu NULL'lar. Aynı yetki kısıtları: yalnızca talebin org admin'i veya süper admin, süper
admin hedef silinemez, org'un son admin'i silinemez ("Önce başka bir yönetici atayın"), kişi
kendi talebini işleyemez. `auth.users` silme başarısız olursa talep `pending` kalır, yeniden
deneme idempotenttir. `recalc_acwr_day()` artık silinmekte olan sporcu için `acwr_logs`'a
satır eklemez (CASCADE sırasına bağlı kırılgan bir FK hatası önlendi).

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
bloklar **elle düzenlenmez** — `pnpm docs:sync` ile üretilir (`scripts/docs-sync.mjs`). Şema,
klasör yapısı veya migration sayısını değiştiren HER Parti kapanışında bu komut çalıştırılır
ve çıktısı commit'e dahil edilir. Parti 18J'den beri bloklar dört ayrı dosyadadır (eşleme
script'teki `BLOCK_FILES` sabitinde, tek yerde):

| Blok | İçerik | Dosya |
|---|---|---|
| `TREE` | §2 klasör ağacı | `docs/claude/structure.md` |
| `SCHEMA` | §3 tablo şeması | `docs/claude/database.md` |
| `MIGRATIONS` | §11 migration listesi | `docs/claude/status.md` |
| `SYNC_TIMESTAMP` | senkron tarihi | `CLAUDE.md` (dosya sonu) |

Bir blok taşınırsa yalnızca `BLOCK_FILES` güncellenir; marker hedef dosyada bulunamazsa script
hata verip durur (sessizce atlamaz). Taşınan bölümlerin haritası: yukarıdaki "BAŞVURU
DOKÜMANLARI" tablosu — yeni bir `docs/claude/` dosyası eklenirse oraya da satır eklenir.

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

### Her Yeni Session Başında
```
1. CLAUDE.md § 11 oku → Supabase URL, env konumları, test kullanıcısı
2. PROGRESS.md oku → Tamamlanan + bekleyen görevler
3. Sıradaki göreve geç (PROGRESS.md "Öncelik 1" listesi)
```

---

*Son güncelleme: Haziran 2026 — Beyto Tosun / AthleteIQ*
*Bu dosya CLAUDE.md'dir. Claude Code bu dosyayı okuyarak çalışır.*

<!-- AUTO-GENERATED:SYNC_TIMESTAMP:START -->
Son otomatik senkron: 2026-11-13
<!-- AUTO-GENERATED:SYNC_TIMESTAMP:END -->

---

