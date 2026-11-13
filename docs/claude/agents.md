# Loadwell — Agent Tanımları ve Özellik Kararları (CLAUDE.md §6)

> CLAUDE.md'den Parti 18J'de (2026-11-13) **birebir** taşındı — metin ve § numaraları değişmedi.
> Diğer bölümlerin yeri için CLAUDE.md'deki "Başvuru dokümanları" haritasına bakın: [CLAUDE.md](../../CLAUDE.md).
> Kapsam: §6 AGENT TANIMI VE GÖREVLERİ — Agent 1 DB, 2 Auth, 3 Web, 4 Mobile, 5 Integration, 21-AI, 22-FB, 23-YP, 6 Test.

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
[x] apps/web/app/api/wearables/whoop/callback/route.ts → state'teki platform'a göre dallanır: "web" ise `/wearables?status=...`'a, aksi halde (mobil, platform yok) eskisi gibi `loadwell://wearables/callback`'e (`MOBILE_SCHEME`, Parti 18E'den önce `athleteiq://`) yönlendirir
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
- 1RM hücresi **boş** (veya yalnızca `-`/`–`/`—`) olan satır hata DEĞİLDİR, **atlanır**
  (`skippedLines`) ve önizlemede sayısıyla bildirilir (2026-09-26). Sebep: sakatlık vb.
  yüzünden test edilmemiş bir max bilinmeyen bir değerdir, yazılacak bir şey yoktur — hata
  sayılsaydı "tek hata varken buton kapalı" kuralı yüzünden tek bir eksik ölçüm tüm listeyi
  kilitlerdi. Değer boşsa o satırın sporcu/egzersiz sütunları da doğrulanmaz. Boş OLMAYAN
  ama geçersiz değerler (`abc`, `0`, negatif) hâlâ hatadır.
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

**Sonradan eklenen görevler (2026-10-02 — dayanıklılık programı + blok kopyalama):**
```
[x] 20261002113316_endurance_sessions_and_block_copy.sql → training_sessions.endurance_modality (run/bike/row/swim/ski/walk/other) + training_sessions_single_structure_check (workout_format ile birlikte dolu olamaz); exercises'a segment_type/segment_repeats/segment_distance_m/segment_duration_sec/intensity_zone/intensity_target; insert_sessions_tree + copy_program_tree yeni kolonlarla (aynı imza/yetki); YENİ copy_program_block RPC'si
[x] 20261002113426_endurance_recovery_target.sql → exercises.segment_recovery_target (interval toparlanmasının yoğunluğu — "%50 tempo jog")
[x] 20261002113543_week_number_allow_53.sql → training_programs.week_number check 1–52 → 1–53 (2026'nın ISO 53. haftası, 28.12.2026–03.01.2027, hiçbir yoldan oluşturulamıyordu)
[x] packages/validators/endurance.ts (+33 test) → modalite/bölüm/bölge sabitleri, hazır seans şablonları, bölüm/seans toplamları, bölge dağılımı, tempo (/km, /500 m, /100 m, km/sa), özet metinleri, gevşek form modeli (sayısal distance_m/duration_sec), form ↔ DB satırı dönüşümleri — web + mobil TEK kaynak
[x] packages/validators/program-copy.ts (+8 test) → copy_program_block'un hafta tarihi kuralının TS ikizi (önizleme + çakışma uyarısı)
[x] apps/web/components/features/program-builder/endurance-session-fields.tsx → SessionStructureSelect (eski "Format" select'inin yerine: Standart / Dayanıklılık / CrossFit formatları) + EnduranceSessionFields (modalite, hızlı ekleme butonları, sıralanabilir/çoğaltılabilir bölüm kartları, canlı önizleme satırı, toplam + bölge şeridi, "seans süresini N dk yap")
[x] apps/web/components/features/program-builder/endurance-session-card.tsx → salt-okunur kart (koç detayı + sporcu web görünümü); apps/mobile/components/EnduranceSessionCard.tsx → mobil ikizi (her iki gün ekranı)
[x] apps/web/app/(dashboard)/programs/new/endurance/page.tsx → YENİ sayfa, aynı sihirbaz variant="endurance" (yeni seans ısınma+soğuma hazır gelir); veri yükleyici new/load-new-program-data.tsx'e taşındı; programs-client.tsx'e "Dayanıklılık Programı" butonu
[x] apps/web/components/features/program-builder/copy-block-dialog.tsx → program detayında "Bloğu Kopyala" (bloksuz programda "Kopyala"): başlangıç tarihi (varsayılan: bloğun hemen ardı), hedef (aynı / başka takım / başka sporcu), başlık, hafta tarihleri önizlemesi, hedefte çakışan program uyarısı
[x] middleware.ts + (dashboard)/layout.tsx → athlete guard "/programs/new/" önekini de blokluyor (önceden yalnızca tam eşleşme vardı — /programs/new/endurance sporcuya açık kalırdı)
```
**Dayanıklılık neden WOD'un deseniyle kuruldu:** bölümler `exercises` satırı olarak tutulur
(WOD hareketleri gibi) — yeni tablo YOK, dolayısıyla yeni RLS YOK: `exercises_select`'in
program/yayın/antrenman grubu kuralları otomatik kapsar; `insert_sessions_tree` /
`copy_program_tree` / `update_program_week` / `propagate_week_to_future` / blok kopyalama
aynı ağaç yolundan geçer. Bir seans ya standart, ya WOD, ya dayanıklılıktır (DB check).
Mesafe/süre **TEK tekrar** içindir ("8 × 400 m" → repeats 8, distance 400); toplamlar
saklanmaz, `endurance.ts`'te hesaplanır. Seans süresi boş bırakılırsa bölümlerden
hesaplanan süre yazılır (sporcunun geri bildirim formu planlanan süreyi buradan alır).
Tasarımı canlı veri belirledi: "Ünilig Takımı Dayanıklılık Antrenmanları" bloğunda koç
interval'ı "For Time" formatına "30 sn %80 tempo" + "90 sn %50 tempo" diye İKİ ayrı hareket
olarak yazmıştı (tekrar sayısı yok) — bu yüzden interval'da toparlanmanın kendi yoğunluğu
(`segment_recovery_target`) ve yoğunluk için serbest metin hedef (`%80 tempo`) var. O blok
DEĞİŞTİRİLMEDİ (WOD olarak kalıyor).

**Blok kopyalama (`copy_program_block`):** kaynak bloğun HERHANGİ bir haftasının id'si +
yeni başlangıç tarihi (+ opsiyonel başlık / hedef takım XOR sporcu). Haftalar kaynaktaki
göreli aralıklarını korur; kopya her zaman **taslak** ve arşivsizdir; antrenman grubu
yalnızca AYNI takıma kopyalanırken taşınır. Yetki §4.1 kalıbında: rol + koç için hem kaynak
hem hedef kendi takımı, hedef aynı org'da olmalı, hepsi `coalesce(..., false)`; `anon`/`PUBLIC`
EXECUTE yok. Canlı DB'de 9 senaryoyla (ROLLBACK içinde) doğrulandı: admin kendi org'u ✓,
koç kendi takımı ✓, koç başka takım ✗, koç başka takıma hedef ✗, başka org admini ✗, başka
org'a hedef ✗, iki hedef birden ✗, üyeliksiz ✗, yılbaşını aşan 6 haftalık kopya ✓ (hafta 53
düzeltmesinden sonra). Ayrıca form → `buildSessionsPayload` → `create_program_with_weeks` →
`copy_program_block` turu gerçek payload'la uçtan uca doğrulandı.

**Program formu artık kaydı engellemiyor + sadeleştirilmiş dayanıklılık arayüzü (2026-10-02,
aynı gün, canlı test geri bildirimi).** Koç ACK için program oluştururken "Formda eksik veya
hatalı alanlar var" uyarısında takıldı. Kök neden: boş bırakılan "Tahmini Seans Süresi"
(`valueAsNumber` → `NaN`, zod reddediyordu) ve boş tekrar/kg ya da isimsiz egzersiz satırı kaydı
SESSİZCE kilitliyordu; hata kapalı bir seans kartının içinde kaldığı için görünmüyordu.
Kullanıcı kararı: uyarı tamamen kalksın. Artık:
- İki form da ORTAK, gevşek `sessionFormSchema`'yı kullanır (`apps/web/lib/program-form-schema.ts`);
  `exerciseSchema`/`exerciseSetSchema`/`wodMovementSchema` zorunlulukları kaldırıldı. Seans
  içindeki hiçbir alan kaydı engellemez.
- Temizlik `buildSessionsPayload`'da (`apps/web/lib/program-rpc.ts`): isimsiz egzersiz/WOD
  hareketi ve boş dayanıklılık bölümü atlanır, boş/≤0/NaN sayılar null olur (DB check'leri asla
  ihlal edilmez — canlıda ACK koçu kimliğiyle doğrulandı).
- Zorunlu kalanlar yalnızca 1. adımda (başlık, başlangıç tarihi, takım/sporcu, hafta sayısı):
  "Devam"da `trigger` ile kontrol edilir, hata alanın altında gösterilir; `alert()` YOK.
- Dayanıklılık editörü: form modeli metin yerine sayı (`distance_m`/`duration_sec`), arayüzde
  "sayı + birim düğmesi" (dk|sn, m|km; interval ve toparlanmada varsayılan sn), Z1–Z5 tek tık
  düğmeleri, modalite çipleri, 6 hazır şablon (`ENDURANCE_TEMPLATES` — "İnterval 30/90" koçun
  canlı verideki seansı) + "geri al", "Not ekle" ikonu, seans süresi boşsa bölümlerden otomatik
  ("Otomatik: N" placeholder). Her iki formda seans kartında "Başka güne kopyala"
  (`copy-session-to-day.tsx`).

**Kapsam dışı (bilinçli):** mobilde program oluşturma (zaten yok), dayanıklılık için
içe aktarma (`program-import` "set başına satır" modeli), GPS/wearable verisiyle
planlanan-gerçekleşen karşılaştırması, bölgelerin sporcuya özel nabız/tempo değerlerine
çevrilmesi (sporcu profilinde maks. nabız/eşik tempo alanı yok), seans içi tekrar eden
blok gruplama ("3 × [1 km + 400 m]"), mevcut WOD'a sıkıştırılmış dayanıklılık seanslarının
otomatik dönüştürülmesi.

**Sonradan eklenen görevler (2026-10-05 — drill (koni) diyagramları, YALNIZCA koç/admin):**
```
[x] 20261005122102_drill_diagrams.sql → drill_diagrams (org_exercise_id UNIQUE → org_exercises, unit m|yd, diagram jsonb, setup_notes); RLS select = admin+coach (+süper admin), sporcu dalı YOK; insert/update/delete org_exercises kalıbında (admin hepsi, koç kendi oluşturduğu), insert'te created_by = auth.uid() ve egzersiz aynı org'da olmalı
[x] packages/validators/drill.ts (+28 test) → drillDiagramSchema (saha 4–60 birim, ≤40 koni, ≤4 rota × ≤60 nokta, ≤20 etiket), mesafe (routeDistance/formatDrillDistance), buildDrillRender (platformdan bağımsız SVG path/polygon geometrisi — çakışan gidiş-dönüşleri şeritlere ayırır), 11 hazır şablon (Box, 360'lar, M, X, Pro Agility 5-10-5, 3 Koni/L-Drill, T-Test, Illinois, Zig-Zag, Uçan Sprint) — web + mobil TEK kaynak
[x] packages/db/queries/drills.ts → getDrillDiagrams / buildDrillLookup / findDrill / saveDrillDiagram (upsert) / deleteDrillDiagram
[x] apps/web/components/features/drills/ → drill-diagram-svg (salt çizim + lejant), drill-editor (Koni / Rota / Seç-Taşı / Etiket / Sil modları, 0,5 birim ızgara, koniye mıknatıs, son noktaya tekrar tık = koni etrafı dönüş, geri al, şablonlar, saha boyutu, birim), drill-editor-dialog (yeni drill / org egzersizi / platform egzersizi — platformdaki kayıtta fork'lanır), drill-card (kart, satır içi aç-kapa, önizleme penceresi)
[x] /exercises → "Yeni Drill" butonu, "Drill Diyagramları" filtresi (/exercises?drills=1), kartlarda diyagram önizlemesi + koni ikonu ile diyagram ekleme
[x] Program builder (exercise-list.tsx + wod-session-fields.tsx) → egzersiz adı bir drill'le eşleşince "Diyagram" düğmesi (önizleme); egzersiz seçicide koni ikonu + "Drill'ler" filtresi — lib/hooks/use-drill-lookup.ts (org başına tek istek, modül önbelleği)
[x] /programs/[id] → koç/admin görünümünde standart egzersiz ve WOD hareketlerinin altında "Drill diyagramı" aç-kapa kartı (sporcu için istek hiç atılmaz)
[x] apps/mobile/components/DrillDiagram.tsx (react-native-svg) → koçun my-athletes/[athleteId]/program/[day] ekranında aynı kart
```
**Neden ayrı tablo, org_exercises'a kolon DEĞİL:** görünürlük kullanıcı kararıyla "Koç ve Admin" —
`org_exercises_select` sporcuya da açık olduğu için diyagram orada dursaydı gizlilik yalnızca UI'da
kalırdı. Ayrı tabloda sporcu dalı RLS'te YOK (canlı DB'de 9 senaryoyla doğrulandı: sporcu 0 satır
görür/0 satır günceller, başka org admini 0 görür ve yazamaz, koç başka koçun diyagramını
güncelleyemez/silemez, başka org'un egzersizine bağlayamaz/yeniden yönlendiremez, created_by
sahteleyemez, anon reddedilir).

**Neden programa FK ile değil İSİMLE bağlı:** `exercises` satırları kütüphaneye zaten yalnızca adıyla
bağlı (1RM ve demo linkiyle aynı model). Diyagram programa kopyalansaydı `update_program_week` /
`copy_program_block` / `propagate_week_to_future` ağaçlarını yeniden yazdığı için id'ler değişip
diyagram kaybolurdu; isimden çözümle bu RPC'lerin HİÇBİRİNE dokunulmadı ve kütüphanede yapılan
düzeltme geçmiş programlara da yansır. Aynı ad hem org hem platformdaysa org kazanır (platform
egzersizine diyagram eklemek onu org kütüphanesine fork'lar).

**Kapsam dışı (bilinçli):** sporcu görünümü (kullanıcı kararı), rotayı oynatan animasyon, PDF/çıktı,
programdaki tek bir egzersizde kütüphaneden bağımsız diyagram değişikliği, mobilde diyagram düzenleme.

**Sonradan eklenen görevler (2026-10-23 — dinamik sidebar + mobil yerleşim):**
```
[x] apps/web/components/shared/nav-config.ts → YENİ, menünün TEK kaynağı: rol bazlı bölümler (Genel / Antrenman / İzleme / Yönetim; sporcu: Genel / Hesap), mobil alt çubuğun 4 birincil hedefi, findActiveHref (en uzun önek — /settings/users'ta "Ayarlar" artık aktif görünmüyor)
[x] sidebar.tsx → gruplu bölümler, aktif öğede sol vurgu çubuğu, masaüstünde ikonlara daraltma (tercih localStorage "aiq_sidebar_collapsed" — yalnızca kolaylık), daraltılmışken üzerine gelince ad etiketi, altta kullanıcı kartı + çıkış; mobil çekmece: bulanık arka plan, Esc ile kapanır, açıkken sayfa kaymaz
[x] mobile-tab-bar.tsx → YENİ, telefonda alta sabit sekme çubuğu (koç: Panel/Sporcular/Programlar/Bildirim, sporcu: Ana Sayfa/Program/Wellness/Yarışma + "Menü"), ağrı sayacı rozeti; md ve üstünde gizli
[x] header.tsx → bulunulan bölümün adı, telefonda uzun sentetik e-posta yerine baş harf avatarı (adı/rolü yalnızca lg+), ikon-only çıkış
[x] dashboard-shell.tsx → main dolgusu px-4 → sm:px-6 → lg:p-8, telefonda alt çubuğa yer bırakan alt boşluk (safe-area dahil), h-dvh
[x] Card bileşenleri (components/ui + packages/ui) iç boşluğu --card-pad değişkeninden (telefonda 16px, sm+ 24px — tailwind-merge ile çağıranın pt-6/p-0 override'ları bozulmasın diye değişken)
[x] Dialog/modal'lar telefonda kenarlardan boşluklu, max-h-[calc(100dvh-2rem)] + kaydırılabilir; sayfa başlıkları (h1 + butonlar) telefonda alt alta; form ızgaraları telefonda tek sütun; 7 günlük şeritlerde taşan etiketler; sporcular tablosu yatay kaydırma; egzersiz kütüphanesinin sol filtre paneli telefonda üstte
[x] globals.css → başlıklarda text-wrap: balance, telefonda input/select/textarea 16px (iOS odaklanma yakınlaştırmasını önler)
```

**Sonradan eklenen görevler (2026-10-23 — landing page + gömülü giriş):**
```
[x] apps/web/components/landing/ → landing-page (server, her zaman koyu tema: kapsayıcıda .dark), site-nav, coach-tour (4 adımlı koç turu: video/görsel), device-frames (tarayıcı + telefon çerçevesi), feature-video (yalnızca ekrandayken oynar, reduced-motion'da kontrol çubuğu), section-bg (gri tonlu spor alanı fotoğrafı + saha çizgisi dokusu), landing-effects (paralaks + reveal), assets.ts (medya yolları), demo-request-form (kapanıştaki #demo formu — 2026-10-23 sonradan eklendi, aşağıya bakın)
[x] app/page.tsx → oturumsuz ziyaretçiye redirect("/login") yerine <LandingPage />; app/(auth)/login/page.tsx de AYNI sayfayı render eder (giriş formu #giris) — middleware'in /login?next=... yönlendirmeleri değişmeden çalışır
[x] login-form.tsx → yalnızca yerleşim değişti (iki sütunlu marka paneli kalktı, form kart oldu); giriş mantığı (resolveLoginIdentifier, signInWithPassword, next, no_membership) AYNEN
[x] middleware.ts → matcher'a mp4|webm|avif|woff2 eklendi (aksi halde oturumsuz ziyaretçinin video isteği /login'e yönleniyordu); PUBLIC_ROUTES'a /landing-studio
[x] app/landing-studio/[scene] + components/landing/replicas/ → landing görselleri için panel/mobil ekranların hayali verili replikaları; LANDING_STUDIO=1 değilse 404
[x] scripts/landing/ → record-replicas.mjs (replikalardan görsel + imleçli video), demo-seed.mjs ("Demo Kulübü" org'u, slug demo, hayali veri), capture.mjs (aynı dosyaları gerçek uygulamadan demo koç hesabıyla çeker), fetch-backgrounds.mjs + backgrounds.json (bölüm fotoğrafları → public/landing/bg), lib/director.mjs (görünür imleç, insan hızında fare/klavye, ffmpeg ile webp/mp4/webm)
```
**Gizlilik kuralı:** landing'deki her görsel/video YALNIZCA hayali "Demo Kulübü" verisinden üretilir — gerçek sporcu adı ve sağlık verisi herkese açık sayfaya girmez (KVKK). `capture.mjs` çekimden önce /athletes listesini demo ad listesiyle karşılaştırır, tek bir yabancı ad görürse durur. Telefon görselleri Expo uygulamasına ait olduğu için tarayıcıdan çekilemez, replika olarak kalır; program oluşturma videosu da replikadan gelir.
**Medya dosya adları sabittir** (`components/landing/assets.ts`) — replika ve gerçek çekim aynı dosyaların üzerine yazar, kod değişmez.

**Sonradan eklenen görevler (2026-10-23 — demo talep formu):**
```
[x] 20261023144302_demo_requests.sql → demo_requests tablosu; RLS SELECT/UPDATE yalnızca coalesce(is_super_admin(), false), INSERT/DELETE politikası YOK, anon'un tüm yetkisi + authenticated'ın insert/delete yetkisi kaldırıldı (athlete_ai_insights deseni). Canlı DB'de ROLLBACK içinde doğrulandı: anon SELECT "permission denied", süper admin olmayan authenticated 0 satır görür, insert/delete yetkisi yok
[x] packages/validators/demo-request.ts (+7 test) → demoRequestSchema (DB check'leriyle aynı sınırlar), rol/durum etiketleri, honeypot, DEMO_REQUEST_HOURLY_LIMIT — form ve API ortak
[x] apps/web/app/api/demo-request/route.ts → oturumsuz POST: şema doğrulama, honeypot (sessiz 200), aynı ip_hash'ten saatte 3+ talepte 429, service role ile insert, Resend bildirimi (RESEND_API_KEY + DEMO_REQUEST_NOTIFY_EMAIL varsa; reply_to = talep sahibi), başarılıysa notified_at. Bildirim hatası talebi düşürmez
[x] middleware.ts → PUBLIC_ROUTES'a /api/demo-request
[x] components/landing/demo-request-form.tsx → kapanış bölümü (#demo) iki sütun: "sonraki adımlar" + form; mailto ve geçici iletisim@athleteiq.app adresi kaldırıldı, altbilgide "Demo talebi" (#demo), nav'da "Demo"
[x] app/admin/demo-requests/ → süper admin talep listesi: Açık/durum filtreleri, durum + not düzenleme (RLS UPDATE), e-posta/telefon bağlantıları, bildirim durumu; /admin'de "Demo Talepleri (N yeni)" butonu
```
**Bildirim adresi koda yazılmaz** — yalnızca Vercel env'inde (`DEMO_REQUEST_NOTIFY_EMAIL`); sayfada hiçbir e-posta adresi görünmez (kullanıcı kararı). Resend test göndericisi (`onboarding@resend.dev`) yalnızca Resend hesabının sahibine gönderir; başka alıcı için alan adı doğrulanıp `DEMO_REQUEST_FROM_EMAIL` ayarlanmalı.

**Sonradan eklenen görevler (2026-10-23 — süper admin organizasyon düzenleme + slug kilidi):**
```
[x] 20261023152441_org_slug_lock.sql → protect_org_admin_fields() genişletildi: slug değişiyorsa ve org'un profiles satırı varsa SÜPER ADMİN DAHİL raise eder; kontrol SECURITY DEFINER org_has_users(uuid) helper'ında (coalesce(is_super_admin() or my_role(org)='admin', false) yetki kontrolü, anon/PUBLIC EXECUTE yok). Canlı DB'de ROLLBACK içinde doğrulandı: TGF slug → reddedildi, kullanıcısız org slug+plan → başarılı, ad değişikliği → başarılı, org admin plan → reddedildi
[x] packages/validators/organization.ts → ORG_SLUG_RE (^[a-z0-9-]{2,40}$) + ORG_PLANS, updateOrgSlugPlanSchema slug biçimini doğrular (+3 test)
[x] app/admin/organizations/[id]/ → süper admin org düzenleme sayfası (ad, logo, plan, slug; kullanıcı/takım/aktif sporcu sayıları); /admin tablosunda org adı + "Düzenle" bağlantısı
[x] settings-client.tsx → süper admin için de slug, kullanıcı varsa salt okunur (eski "giriş kimlikleri eski slug'da kalacak" uyarısı kaldırıldı); lib/org-errors.ts unique ihlalini Türkçeye çevirir
[x] scripts/landing/demo-seed.mjs reset() → önce org (cascade), SONRA auth kullanıcıları (created_by/coach_replied_by NO ACTION FK'leri yüzünden ters sıra reddediliyordu) + @demo.athleteiq.app yetim hesap temizliği
[x] /privacy → mailto kaldırıldı, iletişim/silme talepleri /#demo formuna yönlendirildi
```
**Neden slug kilitli:** giriş kimliği `{username}@{org_slug}.athleteiq.app` ve `auth.users.email` slug değişince güncellenmez — kullanıcısı olan bir org'un slug'ını değiştirmek o org'daki herkesin girişini bozardı. Kilit yalnızca UI'da değil DB trigger'ında.

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
[x] apps/mobile/app.json → Expo config (bundle ID / Android paketi: app.loadwell, şema: loadwell — Parti 18E)
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
[x] apps/mobile/app/(tabs)/profile/connect-polar.tsx → KALDIRILDI (Parti 18A, web-only) — stub dosya ve profildeki Polar satırı silindi, profilde "Polar ve Fitbit bağlantıları web panelinden yapılır." notu var
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
  → 302 redirect: loadwell://wearables/callback?status=success|denied|error
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
geçilirse devreye girer. Mobil bağlantı ekranı (`connect-polar.tsx`) stub olarak kalmıştı, Parti 18A'da
(App Store hazırlığı) tamamen kaldırıldı — yalnızca web akışı var.

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
EAS `projectId` yok (o tarihte `eas.json` da yoktu — Parti 18A'da eklendi, `projectId`'yi kullanıcı
`eas init` ile ekleyecek, bkz. `docs/app-store/eas-build-runbook.md`; Expo push token'ı almak için
development build ŞART, Expo Go'da çalışmaz), `athlete_push_tokens` boş ve sporcuya özel (koçu kapsamıyor), gönderim tarafında ne
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

