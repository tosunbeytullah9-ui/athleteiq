# MOBILE_STATUS.md — Mobil Uygulama Durum Tespiti (Sporcu + Koç/Admin salt-okunur)

> **GÜNCELLEME 2026-08-11 (Parti 14):** Sporcu `(tabs)/program/*` ağacına yeni bir route eklendi:
> `program/checkin.tsx` — günlük 5 maddelik (uyku kalitesi/kas ağrısı/yorgunluk/stres/ruh hali,
> 1-5, hepsi aynı yönde) wellness self-report formu + son 7 gün geçmişi. `program/index.tsx`'in
> en üstüne sığ bir "Sabah Değerlendirmesi" kartı eklendi (bugün doldurulmadıysa "Doldur",
> doldurulduysa toplam puan + "Düzenle" — `checkin.tsx`'e yönlendiriyor). Form ASLA
> `program/index.tsx`'e inline edilmedi — bu dosya aşağıdaki "Donma bug'ı" bölümünün dokümante
> ettiği css-interop dev-mode donma riskinin kanıtlanmış tetikleyicisi, yeni kart bilinçli olarak
> 3-4 düz node'a sınırlı tutuldu. Yeni bağımlılıklar: `@athleteiq/validators` (önceden hiç
> bağımlılık olarak bildirilmemişti — runtime import gerektirdiği için eklendi), `zod` (savunma
> amaçlı doğrudan bağımlılık), `@react-navigation/native` (`useFocusEffect` için — `expo-router`
> bu hook'u re-export etmiyor). `tsc --noEmit` + `expo lint` temiz. **Fiziksel cihaz testi bu
> ortamda yapılamadı** (cihaz erişimi yok) — kod/tip doğrulaması geçti, form doldurma/aynı-gün
> upsert/gece yarısı tarih davranışı kullanıcı tarafından cihazda doğrulanmalı. Detay:
> PROGRESS.md § Parti 14.
>
> **GÜNCELLEME 2026-08-10 (Parti 13):** Sporcu `(tabs)/program/*` ekranları artık çoklu program
> destekliyor — `program/index.tsx` `get_athlete_programs` RPC'sini çağırıp bugün-tarih-aktif
> (`start_date <= today <= end_date`) TÜM yayınlanmış+arşivlenmemiş programları çekiyor, birden
> fazlaysa yeni `ProgramTabStrip.tsx` ile sekme şeridi gösteriyor (sporcu-kapsamlı önce, etiket
> `discipline` doluysa o, boşsa `title`), tek program varsa şerit hiç render edilmiyor (regresyon
> yok). `[day].tsx` artık `programId`'yi `getActiveProgramId` ile yeniden çözmek yerine
> `index.tsx`'ten route param olarak alıyor — `getActiveProgramId` SİLİNMEDİ, koç-klonu
> `[day].tsx`'in hâlâ canlı bir çağıranı var (aşağıya bkz.). Egzersiz kartları artık
> `superset_group`/`superset_order`'a göre gruplanıp yeni `SupersetGroup.tsx` ile çerçeveleniyor
> (`apps/mobile/lib/supersetGroups.ts`), `null` gruplar ve tek-üyeli gruplar tekil render ediliyor,
> `ExerciseCard.tsx`'in kendisi değişmedi. **Bilinçli olarak dokunulmayan:** koçun sporcu
> programını izlediği salt-okunur klon ekranlar (`my-athletes/[athleteId]/program/index.tsx` +
> `[day].tsx`) — hâlâ eski tek-program mantığıyla çalışıyor, bu partide yeni özellik almadı
> (kullanıcı onayıyla kapsam dışı bırakıldı, `git diff` ile sıfır değişiklik doğrulandı).
> `tsc --noEmit` + `expo lint` temiz. **Fiziksel cihaz testi bu ortamda yapılamadı** (cihaz/
> tarayıcı erişimi yok) — kod/tip/SQL doğrulaması geçti (gerçek İbrahim/Mehmet Ayberk verisiyle
> `get_athlete_programs` sorgulanarak), görsel doğrulama kullanıcı tarafından yapılmalı. Detay:
> PROGRESS.md § Parti 13.
>
> **GÜNCELLEME 2026-08-08 (Parti 7):** Mobil `ExerciseCard.tsx` artık `exercise_sets`'i join edip
> set-bazlı reps/yük/RPE gösteriyor — Parti 2.2.D'den beri açık olan deprecated-kolon bağımlılığı
> (`exercises.load_kg`/`load_percent`/`unit`/`sets`/`reps`/`duration_sec`) tamamen kaldırıldı.
> Aktif program + günün seansları sorgusu (`getActiveProgramId`/`getDaySessions`) ve %1RM→kg
> çözümlemesi (`buildMaxLookup`/`resolveOneRepMaxKg`) `packages/db/queries/`'e çıkarıldı — mobil ve
> web artık aynı sorgu/hesap mantığını paylaşıyor. Fiziksel cihazda hem sporcu hem coach hesabıyla
> doğrulandı, regresyon yok. Detay: PROGRESS.md § Parti 7, BUGS.md (Orta, kapandı).
>
> **GÜNCELLEME 2026-08-05 (Parti 8 Nihai Kapanış):** Parti 8 (8.B→8.I) fiziksel cihazda tam
> olarak doğrulandı — 8.C/8.D/8.H'nin ertelediği dokunma/navigasyon testi (sporcu listesi,
> program, recovery, yarışmalar ekranları; admin tüm org/coach yalnızca kendi takımı parite +
> izolasyon kontrolleri) tamamlandı, regresyon yok. Mobil artık yalnızca bir "sporcu uygulaması"
> değil — coach/admin için gerçek, salt-okunur bir görünüm içeriyor (bkz. § Rol kontrolü, §
> Route yapısı). **Düzenleme/yönetim (program oluşturma, sporcu ekleme, publish etme vb.)
> bilinçli olarak kapsam dışı bırakıldı** — mobilde YOK, ileride ayrı bir iş olarak ele alınacak
> ("Seçenek C": mobilde tam coach yazma paritesi). Detay: PROGRESS.md § Parti 8 Kapanış Özeti.
>
> **GÜNCELLEME 2026-08-04 (Parti 8.I):** Aşağıdaki "Açık buglar" madde 6'da flag edilip hiç
> doğrulanmamış risk gerçekleşti — coach mobilde "Çıkış Yap" login ekranına dönmüyordu (ekranda
> kalıp `"—"` alanlar + sonsuz spinner gösteriyordu). Kök neden: `lib/auth.tsx` session'ı doğru
> temizliyordu ama hiçbir yerde geriye dönük (session→null) bir navigasyon guard'ı yoktu —
> `signOut.ts`/`profile/index.tsx` yalnızca hayalî bir "root layout guard" yorumuna güveniyordu.
> `app/_layout.tsx`'e gerçek bir global guard (`useSegments`+`router.replace`) eklendi, sign-out
> handler'larına explicit navigasyon eklendi, `(tabs)/_layout.tsx` loading/no-session/role-loading
> durumlarını net ayırdı. `tsc`/`expo lint` temiz; fiziksel cihazda kullanıcı tarafından doğrulandı
> (coach + athlete, regresyon yok). Detay: PROGRESS.md § Parti 8.I, BUGS.md (Yüksek).
>
> **GÜNCELLEME 2026-08-03 (Parti 8.H):** Hub'daki "Recovery" ve "Yarışmalar" kartları da artık gerçek
> içerik gösteriyor — stub `my-athletes/[athleteId]/recovery.tsx`/`competitions.tsx` dosyalarının
> üzerine, atlet akışının (`(tabs)/recovery/index.tsx`+`(tabs)/competitions/index.tsx`) salt-okunur
> birebir klonu yazıldı (8.D'nin Program için kurduğu desenle aynı: `useCoachAthlete` + veri
> parametresi `athlete.id`/`athlete.org_id`'ye çevrildi). **Keşif düzeltmesi:** bu iki ekran
> `wellness_checkins`/`readiness_scores`'a hiç dokunmuyor (yalnızca `wearable_connections`/
> `wearable_daily_metrics`/`competitions` kullanıyorlar) ve her ikisi de zaten form içermeyen
> salt-okunur ekranlar. **Güvenlik notu:** bu Parti'nin dokunduğu tablolarda (wearable'lar) coach
> RLS'i zaten baştan takım-bazlıydı (`training_programs` ailesinin aksine, 025'e ihtiyaç duymadı);
> `competitions` org-geneli görünür kalıyor, bu bilinçli bir tasarım. Backend/RLS doğrulandı (gerçek
> JWT'lerle aynı-takım/farklı-takım coach parite + engelleme testi); **fiziksel cihaz testi henüz
> yapılmadı** (Parti 8.F'ye bırakıldı). Detay: PROGRESS.md § Parti 8.H.
>
> **GÜNCELLEME 2026-08-01 (Parti 8.D):** Hub'daki "Program" kartı artık gerçek içerik gösteriyor —
> stub `my-athletes/[athleteId]/program.tsx` silindi, yerine atletin kendi `program/index.tsx` +
> `[day].tsx` akışının salt-okunur bir klonu olan `my-athletes/[athleteId]/program/{_layout,index,
> [day]}.tsx` geldi. Atlet ekranları (`(tabs)/program/*`) ve `ExerciseCard.tsx`'e hiç dokunulmadı —
> koç görünümü sporcunun `useAthleteProfile()`'ı yerine yeni `lib/hooks/useCoachAthlete.ts`'i
> (hub'ın `org_id`/`team_id` yetkilendirme kontrolünü paylaşan hook) kullanıyor. **Güvenlik notu:**
> `training_programs`/`training_sessions`/`exercises` RLS'i coach için yalnızca org bazlı, takım
> bazlı DEĞİL — `useCoachAthlete`'in client-side kontrolü bu veriler için tek takım-izolasyon
> sınırı, canlıda doğrulandı. Backend/RLS doğrulandı (gerçek JWT'lerle athlete/coach parite testi
> + boş durum + çapraz takım engelleme); **fiziksel cihaz testi henüz yapılmadı**. Detay:
> PROGRESS.md § Parti 8.D.
>
> **GÜNCELLEME 2026-08-01 (Parti 8.C):** "Sporcularım" placeholder'ı gerçek sorguya bağlandı — `apps/mobile/app/(tabs)/my-athletes/index.tsx` artık `@athleteiq/db/queries/athletes`'teki `getAthletes`/`getAthleteById` ve `queries/teams`'teki `getTeams`'i (mevcut, yeni fonksiyon eklenmedi) doğrudan import ediyor — mobile'ın bu paketten **ilk runtime (tip-değil) importu**, `expo export` ile Metro'nun bunu sorunsuz bundle ettiği doğrulandı. Admin/coach ayrımı için hiçbir client-side kod YOK — `athletes_select` RLS politikası zaten bunu sağlıyor. Yeni `my-athletes/[athleteId]/` klasörü (hub ekranı + Program/Recovery/Yarışmalar placeholder'ları, gerçek içerik 8.D'de). Backend/RLS davranışı gerçek Supabase Cloud'a karşı curl ile doğrulandı; **fiziksel cihaz testi (dokunma/navigasyon/görsel kontrol) henüz yapılmadı** (kullanıcı tarafından ertelendi). Detay: PROGRESS.md § Parti 8.C.
>
> Oluşturulma: 2026-07-10 · AŞAMA 1 (salt-tespit)
> **GÜNCELLEME 2026-07-15:** Uygulama fiilen çalıştırıldı ve **cihazda doğrulandı**. Aşağıdaki iki iddia ARTIK GEÇERSİZ:
> - ~~"20 TypeScript hatası"~~ → `@athleteiq/db` zaten bildirilmiş, `tsc --noEmit` **0 hata**.
> - ~~"Boot / kritik bug: statikte temiz"~~ → Gerçekte **donmuş yüzey** bug'ı vardı (css-interop `printUpgradeWarning` hang) — çözüldü, § "Donma bug'ı" bölümüne bak.
>
> Kapsam: `apps/mobile/` (Expo — Sporcu uygulaması + Koç/Admin salt-okunur görünümü, Parti 8)

---

## 🔴→✅ Donma bug'ı (2026-07-15) — ÇÖZÜLDÜ

**Belirti:** Program ekranı ilk frame'de donuk kalıyordu (bayat "Henüz program yok"), 4 tab'a basınca **hiçbir tepki yoktu**. Ama JS çalışıyordu: fetch `count=2` dönüyor, React `programs=2` ile render ediyordu → **React doğru, native Fabric surface commit etmiyordu.**

**Kök neden:** `react-native-css-interop@0.2.6` → `printUpgradeWarning` → `stringify(originalProps)`. `originalProps.children` React element ağacı üzerinden **Fiber + React Navigation obje grafiğinin tamamına** ulaşıyor; önceki patch çökmeyi durdurdu ama stringify o grafı **her re-render'da geziyordu** → JS thread kilitleniyor → yüzey donuyor, dokunuş işlenmiyor. Dev-only (`NODE_ENV !== "production"`).

**Neden sadece Program ekranı:** Sadece haftalık görünüm (7 gün × iç içe dinamik className) upgrade-uyarısını tetikleyecek yoğunlukta. Recovery/Yarışmalar/Profil aynı hook'ları/className'i/fetch'i kullanıyor ve sorunsuz → **navigator / react-native-screens / reanimated / gesture-handler suçsuz.**

**Fix:** `patches/react-native-css-interop@0.2.6.patch` — `printUpgradeWarning` artık derin stringify yapmıyor (sığ `Object.keys()`). `pnpm install` ile kalıcılığı doğrulandı.

**Ek fix:** `supabase_realtime` publication'ı boştu → `training_programs` + `training_sessions` eklendi ("Bağlanıyor" → "Canlı").

---

## Mevcut durum

### Expo SDK versiyonu
- **Expo SDK 54** (`expo: ~54.0.5`) — ✅ Telefondaki Expo Go SDK 54 ile **uyumlu**.
- `react-native: 0.81.5`
- `react: 19.1.0`
- `expo-router: ~6.0.24` (file-based routing)
- `react-native-reanimated: ~4.1.1` (lockfile: 4.1.7) + `react-native-worklets 0.8.3` (transitif, reanimated'ın pnpm klasöründe çözülüyor → sorun değil)
- `nativewind: ^4.1.23` (lockfile: 4.2.6) + `tailwindcss ^3.4.0`
- Not: Versiyonlar SDK 54 hattıyla tutarlı; sürüm uyumsuzluğu yok.

### Route yapısı (Expo Router)
```
app/
├── _layout.tsx              → Root: AuthProvider + StatusBar + <Slot/>
├── index.tsx                → Redirect: role-aware (Parti 8.B) — athlete/null → /(tabs)/program, coach/admin → /(tabs)/my-athletes, session yoksa /(auth)/login
├── (auth)/
│   └── login.tsx            → Email/şifre + magic link; başarılı girişte session→"/" redirect'i (Parti 8.B)
└── (tabs)/
    ├── _layout.tsx          → Bottom tab, role'e göre dallanıyor (Parti 8.B): athlete/null/yüklenirken 4 sekme (Program, Recovery, Yarışmalar, Profil); coach/admin 2 sekme (Sporcularım, Profil) — tüm 6 route her zaman render edilir, ilgisiz olanlar href:null ile gizlenir
    ├── program/
    │   ├── _layout.tsx      → Stack (index + [day] + checkin)
    │   ├── index.tsx        → Haftalık program + realtime + YENİ (Parti 14): "Sabah Değerlendirmesi" kartı
    │   ├── [day].tsx        → Günlük egzersiz detayı
    │   └── checkin.tsx      → YENİ (Parti 14): wellness check-in formu (5 madde 1-5 + uyku saati + not) + son 7 gün geçmişi
    ├── recovery/
    │   ├── _layout.tsx
    │   └── index.tsx        → Wearable recovery metrikleri
    ├── competitions/
    │   ├── _layout.tsx
    │   └── index.tsx        → Yaklaşan/geçmiş yarışmalar
    ├── profile/
    │   ├── _layout.tsx      → Stack (index + connect-whoop + connect-polar)
    │   ├── index.tsx        → Profil + wearable satırları + çıkış (athlete)
    │   ├── connect-whoop.tsx → STUB (sadece başlık)
    │   └── connect-polar.tsx → STUB (sadece başlık)
    ├── coach-profile/       → YENİ (Parti 8.B): e-posta/organizasyon adı/rol + çıkış (coach/admin)
    │   ├── _layout.tsx
    │   └── index.tsx
    └── my-athletes/         → Parti 8.B'de placeholder, Parti 8.C'de gerçek sorgu + hub navigasyonu
        ├── _layout.tsx      → Stack (index + [athleteId])
        ├── index.tsx        → Sporcu listesi (getAthletes+getTeams, org/team'e göre RLS filtreli)
        └── [athleteId]/     → YENİ (Parti 8.C): hub ekranı + placeholder alt-route'lar
            ├── _layout.tsx  → Stack (index + program + recovery + competitions)
            ├── index.tsx    → Hub: sporcu adı + 3 kart (Program/Recovery/Yarışmalar), client-side savunma katmanı
            ├── program/          → YENİ (Parti 8.D): atletin haftalık/günlük program akışının salt-okunur klonu
            │   ├── _layout.tsx   → Stack (index başlıksız, [day] native header "Günlük Program")
            │   ├── index.tsx     → Haftalık görünüm (useCoachAthlete + aynı fetchPrograms/realtime deseni)
            │   └── [day].tsx     → Günlük egzersiz detayı (ExerciseCard aynen yeniden kullanılıyor)
            ├── recovery.tsx      → YENİ (Parti 8.H): wearable recovery metrikleri, atlet ekranının klonu
            └── competitions.tsx  → YENİ (Parti 8.H): yaklaşan/geçmiş yarışmalar, atlet ekranının klonu
```

### Çalışan (tam kodlanmış) ekranlar
| Ekran | Durum | Not |
|-------|-------|-----|
| Login | ✅ Tam | Şifre girişi çalışır; magic link kodu var (deep-link dönüşü şüpheli, aşağıya bak) |
| Program (haftalık) | ✅ Tam | Realtime abonelik + pull-to-refresh + 7 günlük görünüm + Sabah Değerlendirmesi kartı (Parti 14) |
| Program [day] (günlük) | ✅ Tam | Seans + egzersiz kartları |
| Program/checkin (wellness) | ✅ Tam (Parti 14) | 5 madde 1-5 seçici + uyku saati/not + canlı toplam + son 7 gün geçmişi; fiziksel cihaz testi henüz yapılmadı |
| Recovery | ✅ Tam | Wearable yoksa boş-durum; veri varsa ring + metrikler |
| Competitions | ✅ Tam | Yaklaşan/geçmiş ayrımı, geri sayım rozeti |
| Profile | ✅ Tam | Bilgiler + wearable satırları + çıkış |

### Çalışmayan / eksik / stub ekranlar
| Ekran | Durum | Not |
|-------|-------|-----|
| connect-whoop.tsx | 🔴 STUB | Sadece `<Text>WHOOP Bağla</Text>` — OAuth akışı yok. Profildeki "Bağla" butonu buraya gider ama boş sayfa açılır. |
| connect-polar.tsx | 🔴 STUB | Aynı — boş sayfa. |
| Push notifications | ⚪ Kasıtlı boş | `lib/notifications.ts` bilinçli olarak `undefined` döner (dev build sonraki sprint). Bug değil. |

> Not: Wearable bağlantı ekranlarının stub olması MVP kapsamı dışıdır (CLAUDE.md §10: "Wearable entegrasyonu MVP'nin dışındadır"). Kritik değil.

---

## TypeScript hataları

**Toplam: 20 hata** (BUGS.md'de bahsedilen "20 pre-existing hata" — **hâlâ açık**).

### Kök neden (TEK): `@athleteiq/db` workspace bağımlılığı bildirilmemiş
- `apps/mobile/package.json` **`@athleteiq/db`'yi dependency olarak listelemiyor** (web listeliyor: `"@athleteiq/db": "workspace:*"`).
- pnpm yalnızca bildirilen bağımlılıklara symlink kurar → `apps/mobile/node_modules/@athleteiq/` **yok**, kökte de yok.
- Sonuç: her ekranın `import type { Database } from "@athleteiq/db/types"` satırı → **TS2307 (Cannot find module)**.
- Bu, tüm ekranlarda `Database` tipini `error/any`'ye düşürür → callback parametreleri tip çıkarımını kaybeder → **cascading TS7006 (implicitly any)**.

### Hata dağılımı
| Dosya | TS2307 (modül) | TS7006 (implicit any) |
|-------|:---:|:---:|
| `lib/supabase.ts` | 1 | — |
| `lib/hooks/useAthleteProfile.ts` | 1 | — |
| `components/ExerciseCard.tsx` | 1 | — |
| `app/(tabs)/competitions/index.tsx` | 1 | — |
| `app/(tabs)/recovery/index.tsx` | 1 | — |
| `app/(tabs)/profile/index.tsx` | 1 | — |
| `app/(tabs)/program/index.tsx` | 1 | 5 |
| `app/(tabs)/program/[day].tsx` | 1 | 4 |
| **Toplam** | **8** | **9** → +3 = **20** |

### KRİTİK NÜANS: Bu hatalar uygulamayı ÇÖKERTMEZ
- Tüm importlar `import type` (yalnızca tip). Babel/TS bunları **build sırasında siler** → çalışma zamanında `@athleteiq/db` hiç `require` edilmez.
- Yani: **tsc kırmızı, ama Metro bundle + uygulama çalışma zamanı bundan etkilenmez.** PROGRESS.md'nin "navigation çözüldü, program görünüyor" durumu bununla tutarlı.
- Düzeltme yine de gerekli: tip güvenliği yok, CI tsc kırılır, IDE'de otokomple çalışmaz.

### Beklenen düzeltme (AŞAMA 2'de)
`apps/mobile/package.json` deps'e `"@athleteiq/db": "workspace:*"` ekle + `pnpm install`. Bu tek değişiklik **20 hatanın tamamını** çözer (8 TS2307 + türeyen 12 TS7006).

---

## Auth uyumu

### Supabase bağlantısı — ✅ Çalışıyor
- `lib/supabase.ts` doğru projeye bağlı: `nlmwcygmbbxmfpsubvmh.supabase.co` (web ile **aynı proje**).
- `.env` doğru: `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon key, güvenli).
- Token depolama: **`expo-secure-store`** (CLAUDE.md §Mobile kuralı gereği — AsyncStorage değil ✅). `autoRefreshToken: true`, `persistSession: true`.
- `AuthProvider` (`lib/auth.tsx`) `onAuthStateChange` dinliyor → oturum değişince `index.tsx` yönlendiriyor.

### Web'deki auth değişiklikleriyle uyum — ✅ Çakışma yok
- Web'in yeni `aiq_uid`/`aiq_role` **cookie'leri ve server-side logout'u yalnızca Next.js middleware'e ait** — mobil bunları kullanmaz.
- Mobil, Supabase JS SDK ile doğrudan konuşur; ortak backend **Supabase Auth (JWT)**. İki taraf aynı kullanıcı tablosunu paylaşır, çakışma yaratmaz.
- Web'deki cookie/rol cache mantığındaki değişiklikler mobile'ı **etkilemez**.

### Rol kontrolü — ✅ Var (Parti 8.B, 2026-07-30)
- `apps/mobile/lib/auth.tsx`'teki `AuthContext` artık `role`/`orgId`/`teamId`/`roleLoading` taşıyor — session çözüldükten sonra `memberships`'ten `.maybeSingle()` ile çekiliyor (membership yoksa hata yok, `role=null`).
- `app/index.tsx` role-aware: `coach`/`admin` → `/(tabs)/my-athletes`, diğerleri (`athlete`/`null`) → `/(tabs)/program` (eski davranış korunuyor).
- `(tabs)/_layout.tsx` role'e göre dallanıyor: athlete/null/yüklenirken eski 4 tab (Program/Recovery/Yarışmalar/Profil) birebir; coach/admin yalnızca 2 tab (Sporcularım — Parti 8.C'de gerçek listeye bağlandı — ve Profil). Her iki dal da tüm 6 route'u render edip kendine ait olmayanları `href:null` ile gizliyor (expo-router'da bu zorunlu, `<Tabs.Screen>` filtrelemez).
- `useAthleteProfile`/`athletes` tablosu sorgusu HÂLÂ eskisi gibi (dokunulmadı) — yalnızca athlete-only ekranlar (Program/Recovery/Yarışmalar/eski Profil) için geçerli, coach/admin artık bu ekranlara hiç girmiyor.
- Cihazda doğrulandı (geçici coach test hesabı + mevcut İbrahim test hesabıyla). Detay: PROGRESS.md § Parti 8.B.

---

## Açık buglar (öncelik sırası)

### 🔴 Kritik (uygulama açılmıyor) — ÇÖZÜLDÜ (2026-07-13)
- **"Couldn't find a navigation context" — ÇÖZÜLDÜ.** İzolasyon teşhisiyle (minimal `<Slot>`+View çalıştı, AuthProvider+useAuth çalıştı, sadece navigasyon ağacı mount olunca patladı) gerçek kök neden bulundu: **`react-native-css-interop@0.2.6`** (NativeWind motoru) `render-component.js` içindeki dev-only `stringify`/`printUpgradeWarning` path'i, prop'ları serialize ederken React Navigation objesinin throwing getter'ına (`NavigationStateContext.getKey`) çarpıp çöküyordu. "navigation context" mesajı yan hata idi; `<Redirect>`/Slot/react-navigation suçlu değildi.
- **Fix:** `patches/react-native-css-interop@0.2.6.patch` (stringify `try/catch`) + `pnpm-workspace.yaml patchedDependencies`. Cihazda doğrulandı (İbrahim girişiyle `/(tabs)/program` tab ağacı hatasız render oluyor).
- Not: sadece dev/Expo Go'da olurdu (`NODE_ENV !== "production"` guard'lı path). Detay: memory `mobile-nav-blocker`.

### 🟠 Yüksek (özellik bozuk)
1. ~~**20 TypeScript hatası**~~ — **GEÇERSİZ** (2026-07-15): `@athleteiq/db` zaten `apps/mobile/package.json`'da bildirilmiş, `tsc --noEmit` **0 hata**.
2. **connect-whoop.tsx / connect-polar.tsx stub** — Profilde "Bağla" → boş sayfa. (MVP dışı, ama görünür kırık UX.)

### 🟡 Orta (veri gelmiyor / akış eksik)
3. **Magic link deep-link dönüşü şüpheli** — `signInWithOtp` çağrılıyor ama `emailRedirectTo` verilmiyor ve `athleteiq://` deep-link handler'ı görünmüyor. Magic link mobilde muhtemelen tamamlanmaz. **Şifre girişi çalışır** — bu yüzden Orta. Doğrulanmalı.
4. **Bildirimler kasıtlı devre dışı** — `notifications.ts` no-op. Program publish push'u gelmez (sadece realtime ekran güncellemesi var). Sprint kararı, bug değil.

### ⚪ Düşük (kozmetik / iyileştirme)
5. `router.push(... as never)` — typed routes (`app.json: typedRoutes:true`) bypass ediliyor. Çalışır ama tip güvenliği kaybı.
6. ~~Profil çıkış akışı `supabase.auth.signOut()` + "root layout yönlendirecek" yorumuna güveniyor — `onAuthStateChange` bunu tetikler, muhtemelen çalışır; doğrulanmalı.~~ — **ÇÖZÜLDÜ (Parti 8.I, 2026-08-04):** doğrulandığında GERÇEKTEN çalışmadığı ortaya çıktı (coach mobilde bildirildi) — hayalî "root layout guard" hiç yoktu. `app/_layout.tsx`'e gerçek bir global guard eklendi + `signOut.ts`/`profile/index.tsx`'e explicit `router.replace` çağrısı eklendi. Fiziksel cihazda kullanıcı tarafından doğrulandı. Detay: PROGRESS.md § Parti 8.I, BUGS.md (Yüksek).

---

## Önerilen düzeltme sırası (AŞAMA 2 için)

1. **İlk iş — `expo start` ile fiilen boot et.** Statik analiz "kritik bug yok" diyor ama bu doğrulanmadı. Gerçek durumu (Metro bundle, navigation, login) gözle görmeden düzeltmeye başlama. (Web'de yaptığımız gibi: önce çalıştır, gör.)
2. **20 TS hatasını kapat** — `apps/mobile/package.json`'a `"@athleteiq/db": "workspace:*"` ekle → `pnpm install` → `tsc --noEmit` 0 hata teyit et. (Ucuz, tek kaynak, tüm cascade çözülür.)
3. **Login uçtan uca test** — test kullanıcısı (`tosunbeytullah9@gmail.com` / `AthleteIQ2026`) ile şifre girişi → program ekranı geliyor mu? (Not: bu kullanıcı athlete satırına sahip mi? Değilse "profil bulunamadı" görürüz — test için athlete `user_id`'li bir hesap gerekebilir.)
4. **Ekran-ekran veri doğrulama** — program (realtime dahil), recovery (wearable yoksa boş-durum), competitions, profile. Her birinde gerçek veri akıyor mu?
5. **Magic link deep-link** — gerekirse `emailRedirectTo: athleteiq://...` + linking handler ekle veya magic link'i şimdilik gizle (şifre yeterli).
6. **connect-whoop/polar** — MVP dışı; ya "yakında" placeholder ile netleştir ya da butonları disable et (boş sayfa açmaktansa).

---

## Özet

| Boyut | Durum |
|-------|-------|
| Expo SDK 54 / telefon uyumu | ✅ Uyumlu |
| Route yapısı | ✅ Sağlam (7 ekran + stub'lar) |
| Supabase/auth bağlantısı | ✅ Doğru proje, SecureStore, web ile çakışmasız |
| TypeScript | ✅ 0 hata (2026-07-15 doğrulandı) |
| Boot / kritik bug | ✅ Cihazda doğrulandı — donma bug'ı çözüldü (css-interop patch), 4 tab + Program çalışıyor |
| Wearable connect ekranları | 🟠 Stub (MVP dışı) |
| Koç/Admin mobil erişimi | ✅ Salt-okunur, cihazda doğrulandı (Parti 8.B–8.I) — düzenleme/yönetim ayrı bir iş (Seçenek C) |

**Sonraki adım:** AŞAMA 2 — önce `expo start` ile gerçek durumu gör, sonra parti parti düzelt (ilk parti: 20 TS hatası tek satırla).
