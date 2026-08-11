# AthleteIQ — Proje Durumu

> Son güncelleme: 2026-08-11 (**Parti 15 — 1RM Kayıt Yönetimi** — `athlete_1rm_records`
> koç RLS politikalarına takım kapsamı eklendi (`031_1rm_team_scoped_rls.sql`, Parti 8.E'nin
> ertelediği bulguyu kapattı), sporcu detay sayfasına yeni "1RM Kayıtları" sekmesi (arama
> bazlı katalog seçimi, geçmiş, edit/sil), tek bir paylaşılan `normalizeExerciseName`
> (Türkçe karakter/case toleranslı) ve Parti 12'nin tonaj hesabının artık `%1RM` setlerini
> programın tarihine en yakın geçmiş 1RM kaydıyla çözümlemesi. Canlı RLS testi (gerçek JWT,
> geçici ACE/ACK koç hesaplarıyla) 6/6, tarih-duyarlı çözümleme gerçek veriyle doğrulandı,
> type-check 4/4 paket + 12/12 validators testi + web build (27 sayfa) temiz. Detay: § Parti 15)
> Önceki: 2026-08-11 (**Parti 14 — Sabah Wellness Check-in** — mobilde sporcunun
> günlük 5 maddelik (McLean 2010 uyarlaması) wellness self-report formu + son 7 gün geçmişi,
> web'de koçun takımının bugünkü check-in durumunu gördüğü salt-okunur `/readiness` ekranı +
> sporcu bazlı 14 günlük geçmiş. `wellness_checkins`/`readiness_scores` şeması zaten canlıydı
> (012/013, READINESS_PLAN.md AŞAMA 1) — bu parti üzerine ilk gerçek okuma/yazma yüzeyini
> inşa etti, migration YOK. **Görev talimatıyla çelişen bir bulgu:** talimat `wellness_total`'ın
> "generated DEĞİL, uygulama hesaplayacak" düz bir kolon olduğunu iddia ediyordu; gerçek
> migration (`012_wellness.sql:28-29`) bunu bir Postgres GENERATED kolonu (`generated always
> as (sleep_quality+soreness+stress+fatigue+mood) stored`) olarak tanımlıyor. Bu oturumda
> Supabase MCP mevcut değildi (önceki partilerde kullanılan araç bu oturumda bağlı değildi),
> canlı DB'ye doğrudan sorgu atılamadı; kullanıcıya soruldu, migration dosyası kaynak alındı —
> `wellness_total` insert/upsert payload'una hiç dahil edilmiyor, yalnızca canlı "../25" UI
> önizlemesi için client-side ayrıca hesaplanıyor. **İki gerçek, talimatta olmayan blokaj
> bulundu ve giderildi:** (1) `apps/mobile/package.json` `@athleteiq/validators`'ı hiç
> bağımlılık olarak bildirmiyordu — yeni fonksiyonlar (`computeWellnessTotal`/
> `getLocalDateString`/`wellnessCheckinSchema`) runtime'da çağrıldığı için (eski `@athleteiq/db`
> boşluğunun aksine, o zaman tüm kullanımlar `import type`di) eklenmeden Metro bundle
> çözemezdi — eklendi + `pnpm install`. (2) Hem `packages/db` hem `packages/validators`
> barrel değil açık alt-yol `exports` map'i kullanıyor — yeni dosyalar barrel'e eklenmesinin
> YANINDA `package.json`'a da eklenmek zorunda, ikisi de güncellendi. Mobilde yeni
> `apps/mobile/app/(tabs)/program/checkin.tsx` (ayrı Stack route — MOBILE_STATUS.md'nin
> dokümante ettiği `program/index.tsx` css-interop donma riski yüzünden forma ASLA inline
> edilmedi): 5 madde 1-5 dokunmalı seçici (yalnızca uç değerler için talimatın verdiği Türkçe
> etiketler, 2/3/4 için talimatta etiket yok — standart Likert uçlandırma konvansiyonu
> uygulandı), canlı toplam göstergesi, `safeParse` ile ikinci savunma katmanı (ham Postgres
> CHECK hatası kullanıcıya hiç ulaşmıyor), altında son 7 gün geçmişi (yalnızca bugünün
> satırında "Düzenle" — RLS dünü de kabul eder ama UI bilinçli olarak yalnızca bugüne izin
> veriyor). `program/index.tsx`'e EN SON ve EN KÜÇÜK değişiklik olarak sığ (3-4 düz node, tek
> seviye ternary, döngü yok) bir "Sabah Değerlendirmesi" kartı eklendi, `useFocusEffect`
> (`@react-navigation/native` — yeni bağımlılık, expo-router re-export etmiyor, pnpm store'da
> zaten resolve edilmiş haldeydi) ile checkin'den dönüşte otomatik güncelleniyor. Web'de yeni
> `/readiness` (roster × bugünün check-in'leri `useMemo` ile bellek-içi LEFT JOIN, "Doldurmadı"
> gri/KIRMIZI DEĞİL ayrı gösteriliyor, `wearables-client.tsx`/`athletes-client.tsx` desenleri
> — realtime dahil — birebir tekrar kullanıldı; "bugün" client'ta bir `useEffect` içinde
> tarayıcı yerel saatiyle hesaplanıyor, render gövdesinde DEĞİL, hydration uyuşmazlığı riskine
> karşı) + `/readiness/[athleteId]` (14 günlük düz liste, grafik/renk-kodlama yok — 5-25
> aralığı için eşik tanımlı değil, bu readiness-skor motorunun işi). Middleware'e
> DOKUNULMADI (athlete zaten `/programs*` dışına genel kilitli, doğrudan doğrulandı).
> **Doğrulama:** `packages/validators`+`packages/db` type-check + web/mobile `tsc --noEmit`
> 4/4 paket 0 hata; mobile `eslint` 0 hata (1 önceden var olan ilgisiz uyarı); web build →
> **29 sayfa** (öncesi 27), sıfır hata; `git diff --stat` ile Parti 13'ün süperset/sekme
> dosyalarının SIFIR değiştiği doğrulandı. **Fiziksel cihaz/tarayıcı testi bu ortamda
> yapılamadı** (mobil cihaz/headless tarayıcı erişimi yok) — kod/tip/build doğrulaması geçti,
> uçtan uca senaryolar (gerçek form doldurma, gece yarısı `checkin_date` testi, aynı-gün
> upsert, web'de takım izolasyonu) ve test verisi temizliği (DELETE politikası yok, Supabase
> MCP gerektiriyor — bu oturumda mevcut değildi) kullanıcı tarafından canlıda yapılmalı.
> Kapsam dışı (görev talimatı gereği): `readiness_scores` yazımı/motoru, RLS/migration
> değişikliği, koç-vekil giriş UI'ı, trend/baseline/z-skor, push bildirimi. Detay: § Parti 14)
> Önceki: 2026-08-10 (**Parti 13 — Mobil Program Ekranı: Süperset Gösterimi ve Çoklu
> Program Sekmeleri** — üç iş: `training_programs.discipline` kolonu + web branş formu,
> mobilde çoklu program sekmeleri, mobilde süperset gruplaması. **Kritik keşif (görev
> talimatının varsaymadığı):** talimat `get_athlete_programs` RPC'sinin zaten kullanıldığını
> varsayıyordu — repo genelinde hiçbir çağıran bulunamadı, mobil hem `program/index.tsx`'in
> kendi inline sorgusu hem de `getActiveProgramId` ile bağımsız, `is_archived` farkında
> olmayan mantık kullanıyordu (Parti 12'nin kendi bıraktığı bir takip notuyla örtüşüyor —
> "getActiveProgramId ... aynı is_archived farkındalığından yoksun ... takip gerektiriyor").
> Görev 2 bu RPC'yi ilk kez gerçekten mobile bağladı, RPC'nin kendisine dokunulmadı. Görev 1:
> migration `030_program_discipline.sql` — `discipline text` (nullable, `teams.discipline`
> ile aynı desen, CHECK yok) + `create_program_with_weeks`/`update_program_week` RPC'lerine
> `p_discipline text default null` eklendi. **Postgres detayı:** parametre sayısı değişince
> `create or replace function` gerçek bir replace olmuyor (Postgres fonksiyon kimliğini
> parametre tip listesiyle belirliyor, yeni bir overload yaratıyor) — migration önce eski
> imzaları `drop function if exists` ile sildi, canlıda her iki fonksiyonun da TEK (yeni)
> imzayla var olduğu `pg_proc` sorgusuyla doğrulandı. Web'in oluşturma ve hafta-düzenleme
> formlarına serbest metin + datalist önerili ("Artistik Cimnastik"/"Kuvvet & Kondisyon"/
> "Atletik Performans"/"Fizyoterapi") "Branş" alanı eklendi (`new-program-client.tsx`,
> `week-editor-form.tsx`) — `p_discipline`'ın SQL'de `default null` olması sayesinde
> gen-types'ta opsiyonel (`p_discipline?: string`) çıktı, `p_phase`/`p_notes`'un aksine
> `as string` cast'ine gerek kalmadı. Görev 2: `apps/mobile/app/(tabs)/program/index.tsx`
> artık `get_athlete_programs` RPC'sini çağırıp bugün-tarih-aktif (`start_date <= today <=
> end_date`) programları sekme şeridinde gösteriyor (sporcu-kapsamlı önce, yeni
> `ProgramTabStrip.tsx`; `packages/db/queries/programs.ts`'e `isDateActive`/
> `sortAthletePrograms`/`getProgramSessionsSummary` eklendi), `[day].tsx` artık `programId`'yi
> `getActiveProgramId` ile yeniden çözmek yerine `index.tsx`'ten route param olarak alıyor
> (`getActiveProgramId` silinmedi — koç-klonu ekranın hâlâ canlı bir çağıranı var). Görev 3:
> yeni `apps/mobile/lib/supersetGroups.ts` (`groupExercisesForRender`) + `SupersetGroup.tsx` —
> `superset_group`/`superset_order`'a göre egzersizleri gruplayıp çerçeveliyor, `null` gruplar
> ve tek-üyeli gruplar tekil render ediliyor, `ExerciseCard.tsx`'e hiç dokunulmadı. **Kapsam
> kararı (kullanıcı onayıyla):** koç-klonu `my-athletes/[athleteId]/program/*` ekranları
> bilinçli olarak dokunulmadan bırakıldı — görev talimatının doğrulama adımları da yalnızca
> sporcu tarafını kapsıyor, `git diff` ile bu dosyalarda sıfır değişiklik doğrulandı.
> **Doğrulama:** `pnpm --filter web exec tsc --noEmit` + `pnpm --filter @athleteiq/db exec tsc
> --noEmit` + `pnpm --filter web build` (26 sayfa) + mobilde `npx tsc --noEmit` + `expo lint`
> temiz. `get_advisors` yeni ERROR/WARN üretmedi (SECURITY DEFINER WARN'ları migration
> öncesinde de vardı, kapsam dışı). RPC davranışı Supabase Cloud'da (`nlmwcygmbbxmfpsubvmh`)
> izole, gerçek veriye dokunmayan bir test programıyla doğrulandı: `create_program_with_weeks`
> discipline'ı doğru insert ediyor, `update_program_week` discipline'ı değiştirebiliyor VE
> ilgisiz bir alan (notes) değişince discipline'ı koruyor (form her zaman mevcut değeri
> yeniden gönderdiği için ayrı bir coalesce mantığına gerek yok) — test programı sonra
> silindi, `leftover=0`. İbrahim/Mehmet Ayberk senaryoları gerçek veriyle `get_athlete_programs`
> doğrudan çağrılarak doğrulandı: İbrahim için 2 tarih-aktif program dönüyor (Haziran'daki
> "Hipertrofi" tarih filtresiyle elendi) — sporcu-kapsamlı "Müsabaka" takım-kapsamlı
> "aaaaaaaaaaa"'dan önce sıralanıyor; Mehmet Ayberk için tarih filtresinden sonra tek program
> kalıyor (sekme şeridi render edilmeyecek). Test kurulumunun bir parçası olarak "aaaaaaaaaaa"
> ve "Müsabaka" 1. haftaya discipline atandı (görev talimatının Görev 4 adım 1'i, kalıcı
> bırakıldı); "Müsabaka" 1. haftanın yayın durumu değişikliği test sonunda geri alındı.
> Orijinal 12 program/3 yarışma/3 sporcu/5 hesap dokunulmadan kaldı, SQL ile doğrulandı.
> **Fiziksel cihaz/tarayıcı testi bu ortamda yapılamadı** (mobil cihaz veya headless tarayıcı
> mevcut değil) — kod/tip/SQL doğrulaması geçti, görsel UI doğrulaması (sekme geçişi, süperset
> çerçevesi) kullanıcı tarafından fiziksel cihazda yapılmalı. Detay: § Parti 13)
> Önceki: 2026-08-10 (**Parti 12 — Tonaj Hesabı, Program Silme/Arşivleme, Yarışma
> Düzenleme** — üç bağımsız iş. **Kritik keşif (görev talimatının varsaymadığı):** talimat
> tonaj hesabının `exercises.sets/reps/load_kg/load_percent` ölü kolonlarından okuduğunu
> varsayıyordu — discovery'de bu zaten Parti 2.2.F/Parti 7'de düzeltilmiş bulundu
> (`apps/web/lib/tonnage.ts` tamamen `exercise_sets`'ten okuyor). Bu partide Görev 1 "sıfırdan
> yaz" değil, mevcut hesabı tamamlama oldu: vücut ağırlığı setleri artık `athletes.weight_kg`
> ile çözümleniyor (önceden hiç çözümlenmiyordu), yük önceliği spesifikasyona göre düzeltildi
> (`load_kg` > `is_bodyweight` > `percent_1rm` > `band_resistance`), çözümlenemeyen setler artık
> 4 sebep koduna (`no_1rm_record`/`unknown_bodyweight`/`no_athlete_context`/`band_resistance`)
> göre egzersiz adı bazında gruplanıp gösteriliyor, ve tüm setler çözümlenemediğinde "0 kg"
> yerine "Tonaj hesaplanamıyor" yazıyor. Görev 2: `training_programs.is_archived` kolonu
> eklendi (029_program_archive.sql), `get_athlete_programs` artık arşivlenmiş programları
> dönmüyor. Yayınlanmamış programlar kalıcı silinir (cascade zaten hazırdı), yayındaki
> programlar bunun yerine arşivlenir; `block_id` doluysa işlem TÜM bloğa uygulanır (tek hafta
> değil — bloktaki tek bir hafta bile yayındaysa tüm blok arşivlenir, karma işlem yapılmaz).
> `program_blocks`'un hiçbir FK'si training_programs silindiğinde otomatik temizlenmediği
> için (`block_id → program_blocks` ilişkisi `on delete set null`, ters yönde cascade yok),
> blok tamamen silindiğinde yetim `program_blocks` satırı da ayrıca siliniyor
> (`deleteProgramBlock`). Görev 3: `competitions` için düzenle/sil eklendi, mevcut inline
> "yarışma ekle" formu iki modda (create/edit) yeniden kullanıldı, ayrı form yazılmadı.
> **Doğrulama:** `pnpm --filter web exec tsc --noEmit` + `pnpm --filter @athleteiq/db exec tsc
> --noEmit` + `pnpm --filter web build` temiz. Tonaj hesap mantığı (öncelik sırası, sebep
> kodlama, gruplama) geçici bir Vitest dosyasıyla 6 test senaryosunda doğrulandı, sonra
> silindi (kalıcı test paketine eklenmesi istenmedi). DB davranışı (cascade delete, blok
> temizliği, arşiv filtresi, yarışma cascade) Supabase Cloud'da (`nlmwcygmbbxmfpsubvmh`)
> gerçek SQL ile test edilip temizlendi — 0 yetim kayıt, orijinal 12 program/3 yarışma/3
> sporcu dokunulmadan kaldı (CLAUDE.md'nin "9 program" notu zaten bayattı, bu parti öncesinde
> de 12'ydi). Detay: § Parti 12)
> Önceki: 2026-08-10 (**Parti 11 — Çok haftalı program düzenleme arayüzü** — coach'un
> bir `program_blocks` bloğundaki tüm haftaları (2+ hafta) tek ekranda, sekmeler halinde gezip
> düzenleyebildiği arayüz eklendi. **Kritik keşif (görev talimatının varsaymadığı):** talimat
> "sıfırdan inşa et" varsayımıyla geldi, ama keşifte tek-haftalık düzenleme ekranının
> (`programs/[id]/edit/edit-program-client.tsx`) `update_program_week`/`propagate_week_to_future`
> RPC'lerine ZATEN uçtan uca bağlı olduğu bulundu (Parti 3.E/3.F) — bu parti sıfırdan inşa değil,
> o ekranı çok-haftalı/sekmeli/autosave'li bir deneyime EVRİLTTİ. `packages/db/queries/
> programs.ts`'e 3 yeni sorgu eklendi: `getProgramsByBlockId` (bloktaki tüm haftaları tam
> ağaçlarıyla çeker), `getProgramIdsWithAthleteData` (verilen program id'lerinden hangilerinde
> `session_rpe`/`athlete_session_notes`/`exercises.completed_at` dolu — PostgREST'in join+OR
> kısıtı yüzünden ham SQL yerine nested select + JS filtre), `setBlockPublished` (blok-geneli
> toplu yayın toggle'ı, `programs_write` RLS'i zaten ALL). Eski `EditProgramClient` (~750 satır)
> `week-editor-form.tsx`'e taşındı ve `forwardRef`+`useImperativeHandle` ile dışarıdan tetiklenebilir
> hale getirildi (`isDirty`/`checkAthleteData`/`save`/`discardChanges`); yeni `edit-program-client.tsx`
> artık sekme/dirty/kaydetme orkestrasyonunu yapan ince bir sarmalayıcı. Yeni bileşenler:
> `components/ui/tabs.tsx` (shadcn Tabs — `@radix-ui/react-tabs` zaten bağımlılıktı, yeni paket
> kurulmadı), `week-tabs.tsx`, `athlete-data-warning-dialog.tsx` (mevcut el-yapımı overlay
> deseniyle, bu repoda Radix AlertDialog yok). Sporcu-verisi koruması hem sekme-geçişi
> autosave'ine HEM de manuel "Değişiklikleri Kaydet" butonuna uygulandı (talimat yalnızca
> autosave'i belirtiyordu, ama `update_program_week`'in yıkıcı delete+reinsert'i her iki
> tetikleyicide de aynı — manuel butonu kapsam dışı bırakmak eşdeğer bir açık bırakırdı, bilinçli
> genişletme). "Tüm bloğu yayınla" butonu görev talimatının aksine edit ekranına değil, program
> detay sayfasına (`program-detail-client.tsx`) kondu — "program başlığının yanına" talimatı
> literal olarak yalnızca o sayfada karşılanabiliyordu (edit ekranı `program.title`'ı başlık
> olarak hiç göstermiyor, düzenlenebilir bir form alanı olarak gösteriyor). "Tüm blok
> query'lerini invalidate et" talimatı `router.refresh()`'e çevrildi — proje TanStack Query
> KULLANMIYOR (bağımlılık var, repo genelinde sıfır gerçek kullanım, doğrulandı) — CLAUDE.md
> §3'ün zaten belgelediği gerçek desen. **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh`,
> gerçek admin JWT'siyle, Playwright + headless Chromium):** bu ortamda `@supabase/ssr`'ın
> browser client'ı `credentials`+CORS uyuşmazlığı yüzünden `signInWithPassword`'da "Failed to
> fetch" veriyor (yeniden üretildi: `credentials:'include'` eklenince manuel bir fetch de aynı
> hatayı veriyor) — bu, bu partinin koduyla İLGİSİZ bir headless-tarayıcı/sandbox kısıtı;
> Node'un fetch'i ve gerçek Postgres/PostgREST erişimi sorunsuz. Login UI'ını atlamak için
> Node'da (sandbox kısıtından etkilenmeyen tarafta) alınan gerçek access/refresh token,
> `@supabase/ssr`'ın cookie formatına (`sb-<ref>-auth-token`, base64url + `base64-` prefix)
> elle kodlanıp `context.addCookies()` ile enjekte edildi — sonrası tamamen gerçek uygulama
> kodu, gerçek RLS, gerçek RPC'lerle çalıştı. Mevcut 3 haftalık "Yarışma Dönemi" bloğu (Hafta
> 33/34/35) üzerinde uçtan uca doğrulandı: (1) sekmeler doğru render oluyor (tarih aralığı +
> yayın rozeti); (2) dirty olmayan sekmeye geçiş anında; (3) Hafta 2'de başlık değiştirilip
> Hafta 3'e geçilince Hafta 2 otomatik kaydedildi, Hafta 1/3 SQL ile doğrulanan şekilde
> etkilenmedi; (4) süperset (`superset_group`/`superset_order`) tam delete+reinsert döngüsünden
> sağlam çıktı (SQL ile doğrulandı); (5) "Tüm bloğu yayınla" 3 haftayı da yayına aldı, buton
> "yayından kaldır"a döndü, tekrar tıklanınca 3'ü de taslağa döndü; (6) `session_rpe`'i SQL ile
> elle dolduruldu, o haftayı düzenleyip başka sekmeye geçmeye çalışınca uyarı diyaloğu çıktı —
> İptal'de değişiklik geri alındı VE sekme geçişi yine de gerçekleşti (veri kaybı yok), Devam
> Et'te değişiklik kaydedildi VE `session_rpe` uyarıda söylendiği gibi silindi; (7) tek haftalık
> (`block_id IS NULL`) bir program açıldı — sekme şeridi hiç render olmadı, manuel kaydet eski
> `/programs/{id}` yönlendirmesini korudu (regresyon yok). **Canlı testte gerçek bir race-condition
> bug'ı bulunup düzeltildi:** ilk implementasyonda, sekme-geçişi autosave'i başarıyla kaydettikten
> sonra bile "dirty" noktası hiç temizlenmiyordu — `WeekEditorForm`'un kendi `isDirty`-effect'i,
> `reset()`'in tetiklediği pending re-render'ı flush etmeden `key` değişimiyle unmount ediliyordu
> (React, key değişince eski ağacı reconcile etmeden atıyor). Düzeltme: orkestratör (`edit-program-
> client.tsx`), dirty temizliğini child'ın effect'ine güvenmek yerine `commitSwitch`/
> `handleSwitchDialogCancel` içinde EXPLICIT yapıyor. Bu bug tip kontrolünden/statik okumadan
> YAKALANAMAZDI — yalnızca gerçek tarayıcıda gerçek bir sekme geçişi yapılınca görüldü. Tüm test
> verisi (geçici başlık/not değişiklikleri, `session_rpe` test değeri, yayın durumu) orijinal
> haline geri döndürüldü. `pnpm --filter web type-check` + `pnpm --filter @athleteiq/db type-check`
> + `pnpm --filter web lint` temiz (yalnızca önceden var olan, bu partiyle ilgisiz uyarılar).
> Detay: § Parti 11)
> Önceki: 2026-08-10 (**Parti 10 — Sporcu Giriş Erişimi Yönetimi** — girişsiz eklenen
> sporculara (roster-only, `create_login` kapalıyken) sonradan giriş erişimi verme ve mevcut
> girişli sporcuların şifresini sıfırlama yolu eklendi. **Kritik keşif (talimatın varsaydığından
> farklı):** "girişle sporcu ekleme" akışı (`add-athlete-modal.tsx`'teki `create_login` checkbox'ı
> → `/api/athletes/create-account` proxy'si → `create-athlete-account` Edge Function'ı, Parti
> 4.B/4.C) zaten UÇTAN UCA kuruluydu, ama bugüne dek canlı Supabase Cloud'a karşı HİÇ
> çağrılmamıştı (org'da `athlete` rolünde tek bir membership yoktu) — bu Parti onu ilk kez
> gerçekten çalıştırıp doğruladı. İki yeni Edge Function eklendi: `grant-athlete-access`
> (`athlete_id`+`username`+`password` alır, `create-athlete-account`'ın yetki/doğrulama/rollback
> desenini birebir tekrarlar ama org_id/team_id'yi payload'dan değil sporcunun KENDİ satırından
> okur) ve `reset-athlete-password` (`auth.admin.updateUserById`). `packages/validators/athlete.ts`'e
> Türkçe-karakter-duyarlı `suggestUsername()` (İ/I/ı/Ç/ç/Ğ/ğ/Ö/ö/Ş/ş/Ü/ü case-sensitive map,
> `"İBRAHİM ÇOLAK"` → `"ibrahim.colak"`) ve `generateTempPassword()` (karıştırılabilir karakter
> hariç) eklendi, 7 unit test ile doğrulandı (yeni: paket kökten `vitest` bağımlılığı almadığı
> için `packages/validators/package.json`'a `test`/`vitest` eklendi). Web tarafında
> `athletes-client.tsx`'e yeni "Giriş" kolonu ("Giriş yok"/`@kullaniciadi`/"Giriş var" rozeti +
> "Erişim ver"/"Şifre sıfırla" butonları, `add-athlete-modal.tsx`'teki gibi TanStack Query DEĞİL
> `router.refresh()` deseniyle) + iki yeni modal (`grant-access-modal.tsx`/
> `reset-password-modal.tsx`, açık-metin şifre + kopyala butonu + "bir daha gösterilmeyecek"
> uyarılı başarı ekranı) eklendi, iki yeni proxy route (`/api/athletes/grant-login`,
> `/api/athletes/reset-password`) mevcut `create-account/route.ts` şablonunu birebir izliyor.
> **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek Auth REST + gerçek admin
> JWT'siyle, curl):** 6/6 kontrol geçti — (1) girişsiz test sporcusu eklendi, `user_id` NULL
> doğrulandı; (2) `grant-athlete-access` çağrıldı, `auth.users`+`athletes.user_id/username`+
> `memberships`(role=athlete) üçü de doğru oluştu; (3) yeni kullanıcı adı+şifreyle Auth REST
> login **200** (mobilin `signInWithPassword`'ünün birebir eşdeğeri — fiziksel cihaz/Expo bu
> ortamda mevcut değildi, bu yüzden gerçek uygulama yerine bu eşdeğer kullanıldı); (4)
> `reset-athlete-password` çağrıldı, yeni şifre **200**, eski şifre **400
> invalid_credentials**; (5) aynı username ikinci bir sporcuya denendi → **409**, yan etkisiz
> (orphan auth user/athletes değişikliği yok); (6) `parti8f-temp-coach@athleteiq.app` için RLS
> simülasyonu (`set local request.jwt.claims`) — coach hâlâ yalnızca kendi takımının (ACE, yeni
> test sporcusu dahil) 4 sporcusunu görüyor, regresyon yok. **Bir üretim veri bütünlüğü hatası
> canlıda yakalanıp anında düzeltildi:** İbrahim'i yeniden oluştururken `full_name`'i içeren ilk
> `curl` çağrısı, Windows konsolunun kod sayfası yüzünden Türkçe karakterleri (`İ`/`Ç`)
> `U+FFFD` replacement karakterine bozdu (DB'de doğrulandı: `hex_bytes` `efbfbd...`) — fark
> edilip o satır silinip, payload bu kez Node'da Unicode escape'lerinden (`İ`/`Ç`)
> üretilip UTF-8 dosyaya yazılarak `curl --data-binary @dosya` ile tekrar gönderildi, byte
> seviyesinde doğrulandı (`hex_bytes` `c4b0.../c387...` — doğru UTF-8). **Görev 6 — İbrahim'in
> yeniden oluşturulması (kullanıcı onayıyla):** silmeden önce `athlete_id` FK'lı 12 tablo tek
> tek sorgulandı, 34 satırın (2 program → 4 seans → 6 egzersiz → 14 set, 3 test sonucu, 3 1RM
> kaydı, 1 ACWR logu, 1 program bloğu — hepsi `on delete cascade`) silineceği raporlandı,
> kullanıcı "Evet, sil ve yeniden oluştur"u seçti; `athletes` satırı + eski
> `tosunbeytullah9+ibrahim@gmail.com` auth kullanıcısı silindi (cascade `leftover=0` doğrulandı),
> `create-athlete-account` ÜZERİNDEN (bu fonksiyonun ilk gerçek/başarılı çağrısı) `ibrahim.colak`
> kullanıcı adıyla yeniden oluşturuldu, Auth REST login **200** ile doğrulandı. Tüm geçici test
> verisi (1 test sporcusu + granted auth user + membership) temizlendi, `leftover=0` doğrulandı.
> `pnpm --filter web build` (26 sayfa, yeni 2 route dahil) + `pnpm turbo run type-check` (5/5
> paket) + `pnpm --filter @athleteiq/validators test` (7/7) temiz. `parti8f-temp-coach*`
> hesaplarına dokunulmadı, `create-athlete-account`'ın mantığı değişmedi, yeni RLS/migration
> yazılmadı, yeni bir `_shared/` Edge Function soyutlaması icat edilmedi (mevcut
> duplikasyon konvansiyonu izlendi). Detay: § Parti 10)
> Önceki: 2026-08-07 (**Parti 9 — Egzersiz kütüphanesi: super-admin platform yönetim
> ekranı** — `platform_exercises` (135 satır) şimdiye kadar tamamen salt-okunurdu
> (`005_exercises.sql`'in tek politikası `platform_read_all`, SELECT `using(true)`) — düzeltme
> yalnızca elle SQL ile mümkündü. Yeni migration `028_platform_exercises_admin_rls.sql`,
> `is_super_admin()` ile gate'li INSERT/UPDATE politikaları ekledi (DELETE YOK — hard delete
> yerine var olan `is_active` toggle deseni DB katmanında da zorlanıyor). Yeni route
> `apps/web/app/admin/exercises/` (Parti 5.B'nin middleware-only `/admin/*` gating convention'ını
> aynen kullanıyor, sayfa seviyesinde ek auth kodu YOK) — arama/filtreli bir tablo (135 satır,
> `@/components/ui/table`, `admin/page.tsx`'teki organizasyon tablosuyla aynı desen) + Demo
> var/yok rozeti + tıklanabilir `is_active` rozeti + Düzenle butonu. **Keşif sonucu (görevin DUR
> koşulu tetiklenmedi):** `platform_exercises` kolonları `org_exercises`'ın kesin bir alt kümesi
> (yalnızca `org_id`/`created_by`/`updated_by`/`forked_from_platform`/`custom_category_id`/
> `coach_notes`/`updated_at` fazladan) — mevcut org-egzersizi formu (`exercise-form-fields.tsx`)
> yeni bir `scope?: "org"|"platform"` prop'uyla genelleştirildi (default `"org"`, iki eski modal
> DEĞİŞMEDEN çalışmaya devam ediyor), yeni `create-platform-exercise-modal.tsx`/
> `edit-platform-exercise-modal.tsx` bu genelleştirilmiş formu kullanıyor — talimatın "aynı form
> bileşenini kullan, yeni form icat etme" kuralına uyularak org modallarının RHF/Zod DIŞI
> (`useState`+elle validasyon) deseni bilinçli olarak korundu, `/admin/organizations/new`'in daha
> idiomatik RHF+Zod deseni burada tercih edilmedi. `packages/db/queries/exercises.ts`'e
> `createPlatformExercise`/`updatePlatformExercise`/`getPlatformExercisesAdmin` (is_active
> filtresiz — admin pasif satırları da görüp geri açabilmeli) eklendi. **Migration geçmişi
> engeli:** `supabase db push` önce `LegacyDbPushMissingLocalError` ile durdu — cloud'daki
> migration takip tablosu 023-027 için 5 farklı timestamp-prefixli kayıt tutuyordu (local
> numaralı dosyalarla eşleşmiyordu), BUGS.md'nin "PARTİ 3" bölümünde belgelenen AYNI sınıf
> sürüklenme; şema seviyesinde 023-027'nin zaten canlı olduğu doğrulandıktan sonra (`calculate_acwr`
> yok, team-scoped RPC'ler/politikalar mevcut) kullanıcı onayıyla `supabase migration repair`
> (5 timestamp kaydı `reverted`, local 023-027 `applied`) çalıştırılıp 028 push edildi. **DOĞRULAMA
> (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh` + gerçek `next dev`, Playwright/`chromium-cli`
> ile — bu oturumda `@playwright/test` zaten kurulu bulundu, önceki partilerin curl+elle-cookie
> yöntemine göre bir ilk):** gerçek super_admin girişiyle `/admin/exercises`'a gidildi, "Back
> Squat"a gerçek bir YouTube linki eklenip kaydedildi, satırın "Var" rozetine döndüğü ekran
> görüntüsüyle doğrulandı (konsol hatası yok); `forkPlatformExercise`'ın `demo_url`'i zaten
> birebir kopyaladığı kod okumasıyla teyit edildi (fork akışına dokunulmadı). Geçici bir coach
> hesabıyla (Admin API, TGF/ACE, Parti 4.E/8.B'nin deseni) `/admin/exercises`'a gidildiğinde
> middleware `/dashboard`'a (sonra role guard'ıyla `/athletes`'e) yönlendirdi; AYNI coach'un
> anon-key client'tan doğrudan `platform_exercises` UPDATE denemesi RLS tarafından sessizce 0
> satır, INSERT denemesi açık `42501` hatasıyla reddedildi (Back Squat'ın `instructions`'ı
> saldırı denemesi sonrası `null` kaldığı doğrulandı). Aynı coach'un kendi `/exercises`
> (org_exercises) sayfası ve "Yeni Egzersiz" modalı (Org Kategorisi + Koç Notları alanları hâlâ
> orada) regresyonsuz çalıştı — `scope` prop'unun varsayılanı doğrulandı. `pnpm turbo run
> type-check` (5/5 paket) + `pnpm --filter web build` (yeni `/admin/exercises` route'u dahil, 0
> hata) temiz. Geçici coach hesabı+membership'i silindi, `leftover_memberships=0`/
> `leftover_auth_user=false` doğrulandı. `pnpm docs:sync` çalıştırıldı (CLAUDE.md migration
> listesine 028 eklendi, 27 migration). Detay: § Parti 9)
> Önceki: 2026-08-05 (**Parti 6 — ACWR Konsolidasyonu** — DB'de duran, hiçbir yerden
> çağrılmayan `calculate_acwr()` SQL fonksiyonu (`003_functions.sql`/`009_security_fixes.sql`)
> canlı ACWR hesaplamasından (`acwr-client.tsx`) metodolojik olarak farklıydı — fonksiyon
> DEĞİŞKEN bölen (yalnızca loglanan günlerin `avg()`'i), canlı formül SABİT bölen (7/28 takvim
> günü) kullanıyordu; somut örnekte (3 kayıtlı, 1080 yük, 28 günlük pencere) bu fark
> `acwr_ratio ≈ 1.0` ile `≈ 4.0` arasında 4 kat sapmaya yol açıyordu. Kullanıcı kararıyla
> client-side sabit-bölen formül kalıcı standart ilan edildi, ölü fonksiyon migration
> `027_drop_calculate_acwr.sql` ile (Supabase MCP `apply_migration`, `nlmwcygmbbxmfpsubvmh`)
> drop edildi, `packages/db/types.ts` `--linked` ile regenerate edildi. `acwr-client.tsx`'e
> DOKUNULMADI — hiçbir hesaplama mantığı değişmedi, saf ölü-kod temizliği + dokümantasyon
> konsolidasyonu (READINESS_PLAN.md §1.2/§8.1, BUGS.md yeni kapalı madde). Doğrulama:
> `pnpm --filter web build` (23 sayfa) + `pnpm turbo run type-check` (5/5 paket) temiz,
> `get_advisors` yeni ERROR/WARN üretmedi, canlı `/acwr` sayfası admin JWT'siyle (Auth REST +
> elle inşa edilmiş `sb-*-auth-token` cookie'si) regresyonsuz render edildi, `pnpm docs:sync`
> çalıştırıldı (26 migration). Detay: § Parti 6 — ACWR Konsolidasyonu)
> Önceki: 2026-08-05 (**Parti 8 Nihai Kapanış — 8.B'den 8.I'ye** — Parti 8'in yedi
> alt-adımı (8.B rol tespiti, 8.C sporcu listesi, 8.D program görünümü, 8.E/8.G güvenlik
> düzeltmeleri, 8.H recovery/yarışmalar, 8.I çıkış-yap düzeltmesi) tek bir kapanış özetinde
> toplandı — 5. tab yerine ayrı ekran ağacı, paylaşılan `useCoachAthlete` yetkilendirme guard'ı
> ve salt-okunur garantisi kalıcı mimari kararlar olarak belgelendi. 8.C/8.D/8.H'nin ertelediği
> fiziksel cihaz testi (Parti 8.F) bu partide tamamlandı — dokunma/navigasyon, admin/coach
> parite ve takım izolasyonu cihazda doğrulandı, regresyon yok; üç eski "YAPILMADI" notu buna
> göre güncellendi. MOBILE_STATUS.md artık uygulamayı yalnızca bir "sporcu uygulaması" değil,
> sporcu + koç/admin (salt-okunur) olarak tanımlıyor — düzenleme/yönetim bilinçli olarak kapsam
> dışı bırakıldı, ileride ayrı bir iş ("Seçenek C") olarak planlandı. Kod değişikliği yok, saf
> dokümantasyon partisi. Detay: § Parti 8 Kapanış Özeti)
> Önceki: 2026-08-04 (**Parti 8.I — Mobil: "Çıkış Yap" sonrası login'e dönmüyor düzeltmesi** — Parti 8.B'nin MOBILE_STATUS.md'de flag edip hiç doğrulamadığı bir risk ("Profil çıkış akışı `supabase.auth.signOut()` + 'root layout yönlendirecek' yorumuna güveniyor... muhtemelen çalışır; doğrulanmalı") gerçekleşti: coach mobilde Çıkış Yap'a basınca login ekranına dönmüyor, ekran aynı kalıp e-posta/rol alanları `"—"` gösteriyor, buton sonsuza dek dönüyordu. **0. Keşif:** `lib/auth.tsx`'in (AuthProvider) `session` `null` olduğunda `role`/`orgId`/`teamId`'yi zaten doğru sıfırladığı doğrulandı (`[session?.user.id]`'e bağlı effect session null olunca id `undefined`'a döner, effect tekrar tetiklenir) — bu katman bug içermiyordu. Gerçek eksik: hiçbir yerde GERİYE DÖNÜK bir navigasyon guard'ı yoktu. Tek redirect mantığı `app/index.tsx`'te (`!session` → `<Redirect href="/(auth)/login"/>`) ve bu SADECE `/` route'u mount olduğunda çalışıyordu; `login.tsx`'in ileri-yön guard'ının (`if (session) router.replace("/")`, Parti 8.B'de eklenmişti) geri yönde hiç eşdeğeri yoktu. `lib/signOut.ts` (coach-profile'ın kullandığı `confirmSignOut`) ve `(tabs)/profile/index.tsx`'in (athlete) `handleSignOut`'u `signOut()` sonrası yalnızca `// Root layout auth guard yönlendirecek` yorumuna güveniyordu — böyle bir guard hiç yoktu. Kök neden coach ve athlete tarafında AYNIYDI (paylaşılan desen). Repo geneli grep (`router.replace|router.push|SIGNED_OUT`) ile bu hayalî guard'a güvenen başka dosya olmadığı doğrulandı. **Düzeltme (4 dosya, mobile-only):** (1) `app/_layout.tsx`'e `useAuth()`+`useSegments()`+`useRouter()` kullanan yeni bir `RootLayoutNav` bileşeni eklendi — `useEffect`: `loading` ise çık, `inAuthGroup=segments[0]==="(auth)"`, `!session && !inAuthGroup` ise `router.replace("/(auth)/login")` (login.tsx'teki ileri-yön guard'ın simetriği, `_layout.tsx` her zaman mount olduğu için ekran derinliğinden bağımsız çalışıyor). (2) `lib/signOut.ts`'te yorum satırı `import { router } from "expo-router"` (component-dışı imperative singleton) ile `router.replace("/(auth)/login")` çağrısına çevrildi — `coach-profile/index.tsx` bu helper'ı zaten çağırdığı için otomatik düzeldi. (3) `(tabs)/profile/index.tsx`'teki aynı yorum satırı, zaten scope'ta olan `useRouter()`'ın `router`'ıyla aynı şekilde değiştirildi. (4) `(tabs)/_layout.tsx` üçe ayrıldı: `loading || !session` → `return null` (guard #1 zaten yönlendirecek, eski/null veriyle sekme render edilmiyor), `roleLoading` → dedike spinner (`(tabs)` genelinde kullanılan `bg-gray-50`+`#1d4ed8` deseniyle tutarlı), aksi halde mevcut `isCoachOrAdmin` dallanması (artık `!roleLoading` kontrolüne gerek yok). `lib/auth.tsx`'e dokunulmadı (zaten doğru — ikinci bir "SIGNED_OUT" branch'i eklemek iki ayrı doğruluk kaynağı yaratırdı). Bir Plan agent'ıyla, kurulu `expo-router@6.0.24` kaynak kodu (`imperative-api.js`, `routing.js`, `Redirect.js`) okunarak `router` singleton'ının component dışından güvenle çağrılabildiği ve yeni guard'ın `app/index.tsx`/`login.tsx` ile çakışma/döngü riski taşımadığı (ikisi de aynı hedefe `replace` yapıyor, idempotent) doğrulandı. **DOĞRULAMA:** `tsc --noEmit` + `expo lint` (apps/mobile) 0 hata/0 uyarı. **Fiziksel cihazda kullanıcı tarafından test edildi** (coach çıkış → login'e dönüyor, `"—"`/sonsuz spinner yok; tekrar coach girişi → doğru 2 tab; athlete İbrahim ile regresyon testi de geçti) — kullanıcı onayı: "Her şey çok iyi çalışıyor." MOBILE_STATUS.md'deki "Açık buglar" düşük-öncelik madde 6 kapatıldı, BUGS.md'ye Yüksek kategorisinde yeni bir ✅ FIXED maddesi eklendi. `pnpm docs:sync` ÇALIŞTIRILMADI (şema/route/klasör yapısı değişmedi, yalnızca mevcut dosyalarda mantık değişikliği). Detay: § Parti 8.I)
> Önceki: 2026-08-03 (**Parti 8.H — Seçilen sporcu için salt-okunur Recovery + Yarışmalar görünümü** — 8.C'nin "Recovery"/"Yarışmalar" hub kartlarındaki "Yakında" stub'ları, atlet akışının (`(tabs)/recovery/index.tsx`+`(tabs)/competitions/index.tsx`) salt-okunur bir koç klonuyla dolduruldu — 8.D'nin Program için kurduğu deseni tekrarlıyor. **Numaralandırma notu:** talimat bu işi "Parti 8.E" olarak adlandırmıştı (yalnızca 8.G ile çakışmaya karşı uyarıyordu), ama 8.E zaten 2026-08-01'de farklı bir iş (takım-bazlı RLS güvenlik düzeltmesi) için, 8.F ise 8.C/8.D'nin bıraktığı bekleyen cihaz testi için ayrılmıştı — kullanıcıyla netleştirilip **Parti 8.H** olarak adlandırıldı. **0. Keşif (talimatın varsaydığından farklı çıktı):** atlet `recovery/index.tsx`'i `wellness_checkins`/`readiness_scores`'a HİÇ dokunmuyor — yalnızca `wearable_connections` (aktif bağlantı) + `wearable_daily_metrics` (son 7 gün) sorguluyor; `competitions/index.tsx` da yalnızca `competitions` tablosunu (`competition_results` değil) org_id'ye göre sorguluyor. Her iki ekranda da interaktif eleman (form/input) YOK, zaten %100 salt-okunur. **RLS team-scope kontrolü (talimatın DURMA şartı) — GAP bulunmadı:** `wearable_connections`/`wearable_daily_metrics` (`004_wearables.sql`, hiç değişmemiş) coach dalı zaten baştan takım-bazlı (`a.team_id=my_team_id(a.org_id)`); `competitions`/`competition_results` (`002_rls.sql`, hiç değişmemiş) coach dalı org-geneli — bu BİLİNÇLİ bir tasarım (yarışmalar org-seviyeli bir kayıt, atletin kendi ekranı da zaten org_id'ye göre sorguluyor), güvenlik açığı değil. Yeni migration gerekmedi. **Implementasyon:** her iki dosya da 8.D'nin `program/index.tsx` şablonunu izliyor — `useCoachAthlete(athleteId)` (değişmedi) + atlet ekranının sorgu/render mantığı birebir taşındı, yalnızca veri parametresi (`athlete.id`/`athlete.org_id`) koç-seçili sporcuya çevrildi. `_layout.tsx`'e dokunulmadı (zaten düz dosya olarak tanımlıydı, Program'ın aksine gün bazlı drill-down yok). **DOĞRULAMA:** `tsc --noEmit`/`eslint` (apps/mobile) temiz (1 önceden var olan, ilgisiz `lib/auth.tsx` uyarısı hariç). **Backend-seviyeli canlı doğrulama** (Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek Auth REST + gerçek JWT'lerle, TGF org'una ACE/ACK takımlarında 2 geçici coach hesabı, Node script ile uçtan uca): 8/8 kontrol geçti — aynı-takım(ACE) coach JWT'siyle İbrahim'in wearable verisi + org'un competitions'ı service-role ground-truth'la birebir aynı (İbrahim'in şu an bağlı wearable'ı yok — doğal olarak "Wearable Bağlı Değil" boş-durumunu da doğruluyor); farklı-takım(ACK) coach için wearable sorguları 0 satır (RLS zaten baştan takım-bazlıydı, regresyon testi), competitions sorgusu ise yine ground-truth'la aynı (org-geneli tasarımın kanıtı, bug değil); farklı-takım coach'un İbrahim'i `athletes`'ten `id` ile çekmesi 0 satır (hub'ın "Sporcu bulunamadı" savunma yolu regresyonsuz), aynı-takım coach için çalışıyor. Tüm test verisi silindi, `leftover_memberships=0`/`leftover_auth_user=404` doğrulandı. **Cihaz/dokunma testi bilinçli olarak YAPILMADI** (8.C/8.D'den beri süregelen erteleme, Parti 8.F'de toplu yapılacak). **Kapsam dışı:** `wellness_checkins`/`readiness_scores`/`competition_results` (bu ekranlar hiç kullanmıyor). `pnpm docs:sync` ÇALIŞTIRILMADI (şema/migration/üst-seviye klasör değişmedi). Detay: § Parti 8.H)
> Önceki: 2026-08-01 (**Parti 8.G — GÜVENLİK: program RPC fonksiyonlarına takım-bazlı yetkilendirme (yazma tarafı)** — Parti 8.E'nin RLS düzeltmesi sırasında BUGS.md'ye 🟠 AÇIK olarak düşülen takip bulgusu kapatıldı: web'in gerçek program oluşturma/düzenleme/haftaya-yayma akışı `training_programs`/`training_sessions`/`exercises`/`exercise_sets` tablolarına doğrudan yazmıyor, `create_program_with_weeks`/`insert_sessions_tree`/`update_program_week`/`propagate_week_to_future` adlı 4 `SECURITY DEFINER` RPC fonksiyonunu çağırıyor — bunlar RLS'i TAMAMEN bypass eder ve kendi manuel org-only (team check'siz) yetkilendirmesini kullanıyordu; bir coach bu RPC'leri (UI'ın athlete/team picker'ını atlayıp) başka bir takımın id'leriyle DOĞRUDAN çağırırsa hâlâ o takımın programını oluşturabilir/düzenleyebilir/gelecek haftalara yayabilirdi — migration 025'in kapattığı okuma açığının yazma tarafındaki eşleniği. **0. Keşif:** 4 fonksiyonun tam yetkilendirme bloğu çıkarıldı (018/019/020/021_*.sql) — talimatın "hepsi org-only coalesce kontrolü yapıyor" varsayımı 3'ü için (`create_program_with_weeks`/`update_program_week`/`propagate_week_to_future`) doğruydu, ama **`insert_sessions_tree`'nin şu ana kadar HİÇ yetkilendirme kontrolü olmadığı** ortaya çıktı (org-only bile değil — "çağıran zaten kontrol ediyor" varsayımıyla yazılmıştı); bu sapma DURULMADAN kullanıcıya raporlanıp fonksiyona sıfırdan tam kontrol eklendi (görev bu fonksiyonu açıkça 4'ün biri olarak kapsıyordu). athlete_id'ye ulaşım zinciri çıkarıldı: `create_program_with_weeks`'te `p_team_id`/`p_athlete_id` doğrudan parametre; `insert_sessions_tree`/`update_program_week`/`propagate_week_to_future`'da `p_program_id` → `training_programs.org_id`/`team_id`/`athlete_id` (yeni select, öncekiler yalnızca `org_id`, ikisi yalnızca `org_id`+`block_id`/`week_index_in_block` çekiyordu). Migration 025'in `programs_select`/`programs_write` coach dalının TAM SQL'i (`team_id=my_team_id(org) or exists(select 1 from athletes where id=athlete_id and team_id=my_team_id(org))`) referans şablon alındı. **Yetkilendirme deseni (talimatın literal okuması — tek merge'lenmiş coalesce değil, iki ardışık adım):** Adım 1 (mevcut org-only kontrol) AYNEN korundu — admin ise değişiklik yok; Adım 1'in hemen ardına Adım 2 eklendi — çağıran admin/super_admin DEĞİLSE (guard: `not coalesce(is_super_admin() or my_role(org)='admin', false)`), migration 025'in coach dalıyla birebir aynı takım kontrolü uygulanıp uyuşmazlıkta ayrı, spesifik bir mesajla reddediliyor: `'Bu sporcu sizin takımınızda değil'` (tek genel `'yetkisiz'`den bilinçli sapma — talimatın örnek verdiği mesaj). Her iki adım `coalesce(...,false)` ile sarılı. `apps/web/lib/program-rpc.ts`'e DOKUNULMADI — bu red yolu gerçek UI'dan tetiklenemez (coach'un athlete/team picker'ı zaten RLS ile kendi takımına kısıtlı, doğrulandı), jenerik catch-all mesajına düşer, kabul edilebilir. `copy_program_tree` (021) bilinçli olarak DEĞİŞTİRİLMEDİ (görev kapsamı yalnızca adlandırılan 4 fonksiyonu kapsıyordu) — `propagate_week_to_future` artık yalnızca KAYNAK programı doğruluyor, canlı sorguyla doğrulanmış bir değişmez sayesinde (`training_programs.block_id` gruplarının TAMAMI aynı `team_id`/`athlete_id`'yi paylaşıyor, ayrık grup sayısı 0) her hedef hafta da otomatik olarak aynı kapsamda. **Düzeltme:** yeni migration `supabase/migrations/026_team_scoped_program_rpc.sql` — 4 fonksiyon `create or replace function` ile (imzalar DEĞİŞMEDİ) güncellendi. **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek Auth REST + gerçek JWT'ler — geçici bir coach hesabı ACE'ye + geçici bir athlete-rollü hesap + mevcut admin hesabı + ACE/ACK'de birer test sporcusu, Node.js script ile uçtan uca):** 15/15 kontrol geçti — (a) **admin** → ACK sporcusu için create(weeks_count=3)/update/propagate: **hepsi başarılı** (regresyon yok); (b) **coach, KENDİ takımı (ACE)** için — hem `p_team_id=ACE` hem `p_athlete_id=<ACE sporcusu>` varyantıyla create, update, propagate, VE doğrudan `insert_sessions_tree` çağrısı: **hepsi başarılı** (regresyon yok — en kritik test, yeni eklenen ikinci kontrolün own-team akışını kırmadığını izole doğruladı); (c) **coach, BAŞKA takım (ACK)** için — admin'in (a)'da oluşturduğu ACK programının id'sini/ACK sporcusunun id'sini coach'a manuel vererek aynı 5 çağrı (create×2, update, propagate, doğrudan `insert_sessions_tree`): **hepsi `'Bu sporcu sizin takımınızda değil'` ile reddedildi** (migration öncesi hepsi sessizce BAŞARILI olurdu — asıl fark testi, özellikle `insert_sessions_tree`'nin öncesinde HİÇ kontrolü olmadığı için bu en kritik negatif sonuçtu); (d) **athlete rolüyle** 4 fonksiyonun hepsi: **hâlâ `'yetkisiz'`** (Adım 1'de zaten reddedilir, regresyon yok); (e) **propagate kaynak/hedef tutarlılık değişmezi** — test bloklarıyla birlikte `select block_id, count(distinct team_id), count(distinct athlete_id) ... having count(distinct team_id)>1 or count(distinct athlete_id)>1` tekrar çalıştırıldı, **0 satır**. `get_advisors` (security) migration sonrası yeni ERROR/WARN üretmedi (yalnızca önceden var olan, kapsam dışı `anon_security_definer_function_executable`/`authenticated_security_definer_function_executable` WARN'ları — ayrı, bilinen bir sertleştirme maddesi, bu Parti'nin kapsamı dışı). `pnpm --filter web build` → 23 sayfa (değişiklik yok, kod dokunulmadı) + `pnpm turbo run type-check` → 5/5 paket temiz (mobile'da ayrı `type-check` script'i yok, `tsc --noEmit` doğrudan çalıştırıldı, 0 hata). `pnpm docs:sync` çalıştırıldı (CLAUDE.md migration listesine 026 eklendi, 25 migration). Tüm test verisi (2 geçici auth kullanıcı+membership, 2 test sporcusu, 7 test `training_programs` satırı, 2 test `program_blocks`) silindi, `leftover_programs=0`/`leftover_blocks=0`/`leftover_athletes=0`/`leftover_memberships=0`/`leftover_auth_users=0` beş ayrı sorguyla doğrulandı. BUGS.md'deki 🟠 AÇIK RPC bulgusu ✅ FIXED olarak kapatıldı (Yüksek kategorisi + TOPLAM satırı senkron edildi, 22→23 FIXED). Detay: § Parti 8.G)
> Önceki: 2026-08-01 (**Parti 8.E — GÜVENLİK: coach için takım-bazlı RLS (training_programs/training_sessions/exercises/exercise_sets/program_blocks)** — Parti 8.D'nin keşif/doğrulama aşamasında bulunan ve canlıda kanıtlanan bir açık kapatıldı: bu 5 tablonun coach dalı `athletes`'in aksine yalnızca ORG kontrolü yapıyordu, TAKIM kontrolü yoktu — herhangi bir coach org'undaki HERHANGİ bir takımın program/seans/egzersiz/set/blok verisini doğrudan Supabase sorgusuyla okuyabiliyor ve YAZABİLİYORDU; web'in kendi `/programs` liste sayfası (`getPrograms(orgId)`, hiç team filtresi yok) bunu canlıda zaten sergiliyordu — teorik bir Postman açığı değil, gerçek bir ürün açığıydı. **0. Keşif:** `002_rls.sql`/`014_exercise_sets.sql`/`017_program_blocks.sql` okunup coach dalının tam SQL'i çıkarıldı (`my_role(org_id)='coach'`, team check yok — `exercise_sets`/`program_blocks` de KENDİ bağımsız politikalarıyla aynı kusuru taşıyordu, `exercises_select`'i düzeltmek onları korumuyordu); `athletes_select`'in doğru çalışan şablonu (`my_role(org_id)='coach' and team_id=my_team_id(org_id)`) referans alındı; FK zinciri çıkarıldı (`training_programs`/`program_blocks` doğrudan `org_id`/`team_id`/`athlete_id` XOR, `training_sessions`→`exercises`→`exercise_sets` `training_programs`'a join ile bağlı); `platform_exercises`/`org_exercises` (org-geneli paylaşılan kütüphane, sporcuya özel değil) kapsam dışı bırakıldı. **Kullanıcı kararlarıyla netleşen kapsam (2 soru soruldu):** (1) 5 tablo birden düzeltildi (yalnızca istenen 3 değil — `exercise_sets`/`program_blocks` de dahil edildi, aynı kusur bağımsız politikalarla); (2) web'in gerçek yazma akışının kullandığı 4 SECURITY DEFINER RPC fonksiyonu (`create_program_with_weeks`/`insert_sessions_tree`/`update_program_week`/`propagate_week_to_future`, migration 018-021) RLS'i bypass edip AYNI org-only kusuru kendi manuel kontrolünde taşıdığı bulundu ama bu Parti'de düzeltilmedi — yalnızca BUGS.md'ye ayrı bir 🟠 AÇIK bulgu olarak düşüldü. **Düzeltme:** yeni migration `supabase/migrations/025_team_scoped_training_rls.sql` — mevcut 10 politika (5 tablo × select+write) `ALTER POLICY` ile YERİNDE güncellendi (DROP+CREATE yok, super_admin/admin/sporcu-self dalları aynen kaldı), coach dalına `team_id=my_team_id(org) or exists(select 1 from athletes where id=athlete_id and team_id=my_team_id(org))` (XOR'lu team_id/athlete_id için iki dallı) eklendi, tüm gövdeler `coalesce(...,false)` ile sarıldı (CLAUDE.md §4.1 konvansiyonuyla tutarlılık için — RLS `USING`'in zaten fail-closed olduğu, bunun burada gerçek bir bypass'ı kapatmadığı migration içi yorumla not edildi). **DOĞRULAMA (canlı, Supabase Cloud + gerçek JWT'ler — geçici coach(ACE)/admin hesapları, ACK'de test athlete+program+session+exercise+set+block, İbrahim'in athlete JWT'si):** 12/12 kontrol geçti — cross-team read 5/5 tabloda 0 satır (öncesi tümü dönüyordu), cross-team write (training_programs+program_blocks) reddedildi, own-team coach read/write regresyonsuz, admin org'un tamamını görüyor, athlete kendi programını görüyor. `pnpm --filter web build`+`type-check` (6/6 paket) + mobil `tsc`/`eslint` temiz (kod değişmedi, beklenen), `get_advisors` yeni ERROR/WARN üretmedi, `pnpm docs:sync` çalıştırıldı (migration listesine 025 eklendi). Tüm test verisi silindi, `leftover=0` doğrulandı. BUGS.md'ye detaylı belgelendi (Kritik bölümü ✅ FIXED + yeni 🟠 AÇIK RPC bulgusu). Detay: § Parti 8.E)
> Önceki: 2026-08-01 (**Parti 8.D — Seçilen sporcu için salt-okunur Program görünümü** — 8.C'nin "Program" hub kartındaki "Yakında" stub'u, sporcunun kendi mobil uygulamasında gördüğü haftalık/günlük program akışının salt-okunur bir koç klonuyla dolduruldu. **Kritik keşif (kapsamı basitleştirdi):** atlet-facing `program/index.tsx`/`[day].tsx` zaten %100 salt-okunur (set tamamlama/ağırlık-RPE girişi gibi hiçbir yazma-yapan eleman yok — yalnızca pull-to-refresh, gün satırı tıklaması, geri butonu var), yani "salt-okunur yap" işi aslında "veri kaynağını `auth.uid()`'den route param'ından gelen `athleteId`'ye çevir" işiydi. Talimat gereği atlet ekranlarına (`apps/mobile/app/(tabs)/program/*`) ve paylaşılan `ExerciseCard.tsx`'e (kullanıcı onayıyla, RPE hedefi eklenmeden aynen yeniden kullanıldı) HİÇ dokunulmadı — stub `my-athletes/[athleteId]/program.tsx` silinip yerine, atlet akışının klonu olan yeni klasör-bazlı route `my-athletes/[athleteId]/program/{_layout,index,[day]}.tsx` eklendi. Sorgular (`training_programs`+`training_sessions`+`exercises`, `.or(athlete_id,team_id).eq(is_published,true).order(start_date desc).limit(...)`) için `packages/db/queries` KULLANILMADI — atlet ekranlarının zaten kullandığı ham `supabase.from()` deseni (bu alanın kendi konvansiyonu) birebir korundu, sadece sporcu artık `useAthleteProfile()` değil yeni `apps/mobile/lib/hooks/useCoachAthlete.ts` (hub ekranının `org_id`/`team_id` yetkilendirme kontrolünü tekrar kullanan, iki yeni ekran arasında paylaşılan bir hook) üzerinden geliyor. **Güvenlik bulgusu:** `002_rls.sql`/`014_exercise_sets.sql` incelemesi, `training_programs`/`training_sessions`/`exercises`/`exercise_sets` RLS'inin coach için yalnızca ORG kontrolü yaptığını, `athletes` tablosunun aksine TEAM kontrolü yapmadığını ortaya çıkardı — yani bu veriler için takım izolasyonu RLS'ten değil, `useCoachAthlete`'in client-side `org_id`/`team_id` karşılaştırmasından geliyor; her iki yeni ekran da (hub'a güvenmeden) bu kontrolü kendi başına çalıştırıyor, aksi halde bir koç `/my-athletes/<başka-takımın-sporcusu>/program`'a derin link ile gidip bunu atlatabilirdi. **DOĞRULAMA:** `tsc --noEmit`/`eslint` (apps/mobile) temiz; `expo export --platform android` 3126 modülü hatasız bundle etti (yeni klasör-bazlı `program/` route'unun stub'ın yerini sorunsuz aldığı doğrulandı). **Backend-seviyesinde canlı doğrulama** (Supabase Cloud `nlmwcygmbbxmfpsubvmh`'e karşı gerçek Auth REST + iki gerçek JWT ile — İbrahim Çolak'ın şifresi Admin API ile geçici sıfırlandı, geçici bir coach hesabı ACE takımına oluşturuldu): (a) İbrahim'in 3 yayınlanmış programı + aktif programın bir gününün seans/egzersiz verisi, athlete JWT'si ile coach JWT'si arasında **birebir aynı** sonuçları döndürdü; (b) hiç team-level programı olmayan farklı bir takımda (Ritmik) oluşturulan taze bir test sporcusu için sorgu **0 program** döndürdü ("Bu sporcu için aktif program yok" dalını doğru tetikleyecek); (c) ACK takımında oluşturulan bir test sporcusu + yayınlanmış test programıyla güvenlik regresyonu test edildi: coach(ACE)'ın `athletes` tablosundan bu sporcuyu `id` ile doğrudan çekmesi RLS tarafından **0 satırla engellendi** (yani `useCoachAthlete` gerçek kullanımda hiç `training_programs`'a ulaşamadan "Sporcu bulunamadı" gösterecek), AMA aynı coach JWT'siyle `training_programs`'ı doğrudan (hub/hook'u atlayarak) sorgulamak ACK'nin programlarını **döndürdü** — yukarıdaki güvenlik bulgusunu canlıda doğruladı (RLS'in kendisi takım sınırı koymuyor, tek sınır client-side kontrol). Tüm test verisi (geçici coach hesabı+membership'i, 2 test sporcusu, 1 test programı) silindi, `leftover=0` üç ayrı sorguyla doğrulandı. **Fiziksel cihaz testi (dokunma/navigasyon/görsel kontrol) 8.C'yle aynı şekilde bu partide de YAPILMADI**, 8.F'ye bırakıldı. Detay: § Parti 8.D)
> Önceki: 2026-08-01 (**Parti 8.C — Mobilde koç/admin sporcu listesi + seçim navigasyonu** — 8.B'nin "Sporcularım" placeholder'ı gerçek bir sorguya bağlandı. **Kritik keşif:** `athletes_select` RLS politikası (`002_rls.sql`) zaten admin/coach ayrımını tam olarak sağlıyor (admin org'un tamamını, coach yalnızca kendi takımını görür) — bu yüzden client tarafında hiçbir role/team_id dallanması YAZILMADI; `packages/db/queries/athletes.ts`'teki mevcut `getAthletes(client, orgId)`/`getAthleteById(client, id)` ve `teams.ts`'teki `getTeams(client, orgId)` (üçü de zaten vardı, `packages/db/queries`'e hiçbir yeni fonksiyon eklenmedi) doğrudan mobile'a import edildi — bu, mobile'ın bu paketten runtime (tip-değil) kod import ettiği İLK durum (şimdiye kadar her `@athleteiq/db` importu yalnızca `import type` idi). `apps/mobile/app/(tabs)/my-athletes/index.tsx` artık gerçek listeyi (`full_name` + takım adı, web'in `athletes-client.tsx`'teki `teamMap` desenin birebir aynısı) gösteriyor; yeni `[athleteId]/` klasörü (`_layout.tsx` + `index.tsx` hub ekranı + `program.tsx`/`recovery.tsx`/`competitions.tsx` placeholder'ları, gerçek içerik 8.D'de) sporcuya dokununca açılıyor. Hub ekranı, RLS'e ek olarak client-side bir savunma katmanı da uyguluyor (dönen sporcunun `org_id`/`team_id`'sini `useAuth()`'un `orgId`/`teamId`'siyle karşılaştırıp uyuşmazsa "Sporcu bulunamadı" gösteriyor). **Kullanıcı onaylı karar (org-level coach edge case):** `role='coach'` ama `team_id=null` olan bir membership için ÖZEL kod YAZILMADI — RLS zaten bu durumda coach için sıfır satır döndürüyor (`team_id = NULL` hiçbir zaman `true` olmaz), bu yüzden ekran otomatik olarak generic "Henüz sporcu yok" durumunu gösteriyor; org-level coach'un tüm org'u görmesi istenirse bu ayrı bir RLS migration'ı (DB Agent) gerektirir, bilinçli olarak kapsam dışı bırakıldı. **DOĞRULAMA:** `tsc --noEmit`/`expo lint` (apps/mobile) temiz; `expo export --platform android` ile Metro'nun `@athleteiq/db/queries/athletes`+`.../teams` runtime importlarını hatasız bundle ettiği doğrulandı (3123 modül, sıfır çözümleme hatası — bu paketten ilk runtime import olduğu için özellikle test edildi); gerçek Supabase Cloud'a karşı (geçici bir coach test hesabı, TGF/ACE, + ACK takımında geçici bir test sporcusu oluşturularak) REST/RLS seviyesinde doğrulandı: admin JWT'si her iki sporcuyu da görüyor (whole-org), coach JWT'si SADECE kendi takımındaki (İbrahim, ACE) sporcuyu görüyor, coach'un çapraz-takım sporcuyu `id` ile doğrudan çekme denemesi boş sonuç dönüyor (hub ekranının "Sporcu bulunamadı" savunma yolunu doğru şekilde tetikliyor); tüm test verisi silindi, `leftover_athletes=0`/`leftover_memberships=0`/`leftover_auth_user=404` doğrulandı. **Fiziksel cihaz testi kullanıcı tarafından bilinçli olarak ERTELENDİ** (kullanıcıya soruldu, "cihaz testini şimdi atla" seçildi) — dokunma/navigasyon/görsel boş durum kontrolleri (talimat madde 4) henüz yapılmadı, bir sonraki oturumda kullanıcı uygun olduğunda tamamlanmalı. Detay: § Parti 8.C)
> Önceki: 2026-07-30 (**Parti 8.B — Mobilde rol tespiti + role göre tab seti** — mobil uygulamada (Expo/React Native) ilk kez rol farkındalığı eklendi. `apps/mobile/lib/auth.tsx`'teki `AuthContext` `role`/`orgId`/`teamId`/`roleLoading` alanlarıyla genişletildi (session çözüldükten sonra `memberships`'ten `.maybeSingle()` ile çekiliyor, membership yoksa hata fırlatmadan `null` kalıyor, logout'ta sıfırlanıyor). `app/index.tsx`'in redirect'i role-aware yapıldı (`coach`/`admin` → `/(tabs)/my-athletes`, diğerleri → eski hedef `/(tabs)/program`). `(tabs)/_layout.tsx` artık role'e göre dallanıyor — **kritik keşif:** `expo-router`'da `(tabs)/` altındaki her klasör `<Tabs.Screen>` tanımlanıp tanımlanmadığından bağımsız bir route olduğu için, her iki dal da 6 screen'in TAMAMINI render edip kendine ait olmayanları `options={{href:null}}` ile gizlemek zorunda (aksi halde athlete 6 tab görürdü). Yeni `apps/mobile/lib/signOut.ts` (paylaşılan logout helper, `profile/index.tsx`'e dokunmadan), yeni `coach-profile/` (e-posta/org adı/rol gösteren ekran — coach/admin için veri modelinde isim alanı olmadığından e-posta kimlik göstergesi olarak kullanıldı, bilinçli) ve yeni `my-athletes/` (placeholder) tab'ları eklendi. **Cihaz testi sırasında bulunan, kullanıcı onaylı ek düzeltme:** `(auth)/login.tsx`'te başarılı girişten sonra HİÇBİR navigasyon yoktu (`index.tsx`'in tek seferlik redirect'i login ekranına geçilince unmount oluyordu) — `useAuth()`+`useRouter()` ile `session` truthy olunca `router.replace("/")` çağıran bir `useEffect` eklendi, bu olmadan Parti 8.B'nin hiçbir yolu cihazda test edilemezdi. **DOĞRULAMA (canlı, fiziksel iOS cihaz, Expo dev server + Expo Go, LAN üzerinden):** geçici bir coach test hesabıyla (Admin API, TGF/ACE, Parti 4.E'nin deseni) `/(tabs)/my-athletes`'e doğrudan düştüğü, flaşsız tam 2 tab (Sporcularım/Profil) göründüğü, coach-profile'ın doğru e-posta/"Türkiye Cimnastik Federasyonu"/"Antrenör" gösterdiği kullanıcı ekran görüntüleriyle doğrulandı; mevcut kalıcı test sporcusu İbrahim Çolak ile (şifresi unutulduğu için Admin API'yle yalnızca şifresi geçici sıfırlanarak) **aynı 4 eski tab'ın birebir** çalıştığı kullanıcı tarafından doğrulandı (sıfır regresyon); admin yolu ayrı test edilmedi (coach'la aynı kod dalını paylaşıyor). Geçici coach hesabı+membership'i temizlendi, `leftover_auth_users=0`/`leftover_memberships=0` doğrulandı. `tsc --noEmit`/`expo lint` (apps/mobile) temiz. **Görev adlandırma notu:** talimatın referans verdiği "Parti 8.A" keşif raporu repo'da bulunamadı (dokümantasyon bu işi hâlâ "Parti 7" olarak etiketliyor) — engel değildi, ilgili iki bulgu (memberships self-select RLS'i, kalıcı coach hesabı yokluğu) birincil kaynaklardan bağımsız doğrulandı. Kapsam dışı: "Sporcularım"ın gerçek sorgusu (Parti 8.C). Detay: § Parti 8.B)
> Önceki: 2026-07-29 (**Parti 5.C — Org oluşturma akışına ilk-admin daveti gömüldü, Parti 5 nihai olarak kapandı** — Parti 5.B'nin bıraktığı `/settings` org-hedefleme sınırlamasını (BUGS.md) kapatan izole bir mini-akış: `apps/web/app/admin/organizations/new/create-organization-form.tsx`'in başarı ekranına, org oluşturulduktan HEMEN SONRA çalışan bir "ilk adminini davet et" formu eklendi (yalnızca e-posta, `role:"admin"` sabit, "Şimdilik atla, sonra davet ederim" ile atlanabilir). **0. Keşif sonucu (implementasyondan önce):** `supabase/functions/invite-member/index.ts:60-76` okundu — yetki kontrolü `isPlatformAdmin` (`caller.user_metadata?.["platform_role"] === "super_admin"`) OR `callerMembership?.role === "admin"` şeklinde; `isPlatformAdmin` dalı hedef org'da HİÇ membership olmasa bile geçiyor ve `org_id`'yi çağıranın kendi org'una hiç kısıtlamıyor — yani CASE (A): Edge Function'a dokunmaya gerek yoktu, sadece UI'ı bağlamak yeterliydi. Mevcut generic proxy `apps/web/app/api/auth/invite/route.ts` (`settings-client.tsx`'in de kullandığı) org_id'yi hiç kısıtlamadığı için AYNEN reuse edildi — yeni bir route/Edge Function yazılmadı. `createOrganization()`'ın zaten döndürdüğü `org.id` (`packages/db/queries/organizations.ts:11`), önceden yalnızca `{name}` tutan `createdOrg` state'ine eklendi; başarı ekranındaki statik "mevcut davet ekranını kullanın + `/settings` linki" JSX'i, `inviteStep: "pending"|"sent"|"skipped"` state'ine göre dallanan inline bir form ile değiştirildi (`settings-client.tsx`'teki `onSendInvite`'ın plain `useState`+`fetch` deseniyle birebir aynı, react-hook-form değil). `/settings` sayfası, `invite-member` Edge Function'ı ve `/api/auth/invite` proxy'si HİÇ değişmedi (talimat gereği izole bırakıldı). **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh` + gerçek `next dev -p 3100`, Node/fetch ile gerçek Auth REST login + elle inşa edilmiş `sb-nlmwcygmbbxmfpsubvmh-auth-token` cookie'si — Playwright yok, önceki partilerin yöntemiyle aynı):** (a) gerçek super_admin girişiyle, doğrudan PostgREST'e (`is_super_admin()` RLS, service-role yok) test org'u ("ZZZ Test Org Parti5C A") oluşturuldu; (b) test org'un id'siyle `POST /api/auth/invite`'a `role:"admin"` daveti gönderildi → **200 `{success:true}`**; (c) AYNI generic proxy'ye `role:"athlete"` ile ikinci bir davet (regresyon kontrolü — `/settings`'in kullandığı şeklin aynısı) → **200 `{success:true}`**; (d) Admin API `generate_link` (`type:"magiclink"`) ile alınan `hashed_token`, gerçek `/auth/confirm`'e verildi → **307 → `/athletes`**; (e) `memberships` tablosunda SQL ile doğrulandı: davet edilen admin'in satırı DOĞRU yeni-org `org_id`'siyle (`role:"admin"`), regresyon kullanıcısının satırı da AYNI org'a (`role:"athlete"`) doğru şekilde yazılmış; (f) ikinci bir test org'u ("ZZZ Test Org Parti5C B") oluşturulup "Şimdilik atla" akışı simüle edildi (hiç invite çağrısı yapılmadan) → SQL ile org'un `membership_count=0` ile kalıcı olduğu doğrulandı. Tüm test verisi (2 test org'u, 2 davet edilen auth kullanıcı + membership'leri) service-role/Admin API ile temizlendi, `leftover_orgs=0`/`leftover_users=0`/`leftover_memberships=0` doğrulandı. `pnpm --filter web build` → 23 sayfa (Parti 5.B'yle aynı — yeni route yok, mevcut sayfa düzenlendi), 0 hata. `pnpm turbo run type-check` → 5/5 paket temiz. **BUGS.md:** Parti 5.B'de bulunan `/settings` org-hedefleme sınırlaması notu ✅ FIXED (PARTİ 5.C) olarak kapatıldı (4 konum: madde gövdesi, header özeti, kategori tablosu, toplam satırı — hepsi senkron edildi). **Parti 5 (5.A → 5.C) bu partiyle NİHAİ olarak kapandı** — üst-özet için § Parti 5 Kapanış Özeti. Detay: § Parti 5.C)
> Önceki: 2026-07-29 (**Parti 5.B — Public signup wizard kaldırıldı, super-admin dahili org oluşturma eklendi** — Parti 5, 5.A+5.B ile tamamen kapandı. Silinen: `app/(auth)/signup/{page.tsx,signup-form.tsx}`, `app/api/signup/{create-org,create-team}/route.ts` (4 adımlı self-serve wizard + destekleyici API route'ları). `middleware.ts`'in `PUBLIC_ROUTES`/`AUTH_ROUTES`'undan `/signup` çıkarıldı. **Yeni migration `024_revert_signup_self_serve_rls.sql`:** keşif sırasında bulunan bir güvenlik açığı kapatıldı — `008_rls_signup.sql`'in `memberships_insert_self` politikası hâlâ canlıydı ve herhangi bir authenticated kullanıcının (athlete dahil), üyesi olmadığı HERHANGİ bir org'a doğrudan Supabase client ile kendini `role:"admin"` olarak ekleyebilmesine izin veriyordu (023'ün `orgs_insert`'e yaptığı aynı düzeltme bu politikaya uygulanmamıştı). Politika `is_super_admin() or my_role(org_id) in ('admin','coach')`'a döndürüldü (kullanıcı onayıyla, canlıya uygulandı). **Yeni sayfa `apps/web/app/admin/organizations/new/`:** `page.tsx` (Server Component) + `create-organization-form.tsx` (Client Component, react-hook-form + `createOrgSchema` yeni `packages/validators/organization.ts`). Tek alan: organizasyon adı; slug eski wizard'ın Türkçe-karakter-normalize eden `slugify()`'ı inlined halde otomatik türetiyor, kullanıcıya gösterilmiyor. Submit doğrudan authenticated client ile `createOrganization()` (yeni `packages/db/queries/organizations.ts`) → `supabase.from("organizations").insert({name,slug})` — service-role YOK, RLS zaten `is_super_admin()`-only (023'ten beri). `plan` gönderilmiyor (DB default `'free'`). Sayfa/route için AYRI bir auth kontrolü YAZILMADI — mevcut convention taklit edildi: `/admin/*` zaten yalnızca `middleware.ts`'te (`pathname.startsWith("/admin")` + `platform_role !== "super_admin"` → `/dashboard`'a redirect) korunuyor, `admin/page.tsx`'in kendisi de hiç auth kontrolü içermiyor. Başarı ekranı: "✅ oluşturuldu" + "ilk adminini eklemek için mevcut davet ekranını kullanın" mesajı + `/settings`'e link (yeni bir davet mekanizması YAZILMADI, var olan `invite-member` akışına yönlendirildi — kullanıcı onayıyla, bu linkin bugün org'u otomatik hedefleyemediği bilinçli olarak kabul edildi, bkz. BUGS.md). `admin/page.tsx`'e küçük bir "Yeni Organizasyon" linki eklendi (aksi halde yeni sayfa hiçbir yerden linklenmiyordu). **Keşif bulguları:** `is_super_admin()` hiçbir yerde RPC ile çağrılmıyor, web tarafı her yerde `user.user_metadata?.["platform_role"] === "super_admin"` okuyor (JWT/user metadata) — CLAUDE.md'nin "003_functions.sql" referansı hafif güncel değil (gerçek tanım `002_rls.sql`, sertleştirme `009_security_fixes.sql`), engel değil. `apps/web/app/api/teams/route.ts` (dashboard'un "takım ekle" özelliği) doğrulandı, signup'tan tamamen bağımsız, DOKUNULMADI. **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh` + gerçek `next dev -p 3099`, Node/fetch ile gerçek Auth REST login + inşa edilmiş `sb-*-auth-token` cookie'si — Playwright yok, önceki partilerin yöntemiyle aynı):** 8/8 kontrol geçti — (1) gerçek super_admin girişiyle `GET /admin/organizations/new` → 200; (2) super_admin'in access token'ıyla `POST /rest/v1/organizations` (service-role YOK, tıpkı formun yapacağı gibi) → 201, RLS `is_super_admin()` izin verdi; (3) geçici bir coach test hesabıyla aynı sayfa → 307 → `/dashboard` (mevcut middleware guard'ı yeni route'u otomatik kapsıyor, ekstra kod gerekmedi); (4) migration 024 sonrası, hiçbir membership'i olmayan taze bir test kullanıcısının kendi `user_id`'siyle `role:"admin"` self-insert denemesi → **403, `42501: new row violates row-level security policy`** (güvenlik açığının gerçekten kapandığı doğrulandı); (5) `invite-member` Edge Function'ı, super_admin'in access token'ıyla yeni oluşturulan org'a gerçek bir admin daveti gönderdi → başarılı (`isPlatformAdmin` dalı `org_id`'yi sınırlamıyor); (6) Admin API `generate_link` (`type:"magiclink"`) ile alınan token, gerçek `/auth/confirm`'e istek atıldığında → 307 → `/athletes`; (7) `memberships` tablosunda doğru `org_id`/`role:"admin"` satırının oluştuğu SQL ile doğrulandı. Tüm test verisi (test org, coach/fresh/invitee test kullanıcıları + membership'leri) service-role ile temizlendi, `leftover=0` doğrulandı ayrıca. `curl /signup` (cookiesiz) → 307 → `/login?next=%2Fsignup` (route artık yok, middleware'in bilinmeyen-path davranışı — Parti 5.A'daki `/demo` ile aynı desen, regresyon değil). `pnpm --filter web build` → 23 sayfa (önceki 25'ten `/signup`+`/api/signup/create-org`+`/api/signup/create-team` düşük, `/admin/organizations/new` eklendi) + `pnpm turbo run type-check` (6/6 paket) temiz. `pnpm docs:sync` çalıştırıldı. **BUGS.md:** Parti 5.A'nın middleware/signup guard çakışması notu ✅ FIXED (MOOT) olarak kapatıldı (route'lar artık yok); yeni bir Orta-seviye not eklendi (`/settings` davet formunun org-hedefleme sınırlaması, kullanıcı onayıyla bilinçli kabul edildi, düzeltilmedi). Detay: § Parti 5.B, § Parti 5 Kapanış Özeti)
> Önceki: 2026-07-29 (**Parti 5.A — Landing page, trial sistemi, demo/pricing kaldırma** — kök `/` rotası artık `!user` dalında `<LandingPage />` render etmiyor, doğrudan `redirect("/login")` yapıyor (authenticated dal — super_admin/membership/redirectByRole — dokunulmadı). Silinen dosyalar (grep ile apps/mobile+packages/* dahil sıfır dış referans doğrulandıktan sonra): `landing-page.tsx`, `marketing-shell.tsx`, `app/(marketing)/` (layout.tsx + demo/page.tsx), `app/api/demo-request/route.ts`, `trial-banner.tsx`, `trial-banner-wrapper.tsx` (+ `(dashboard)/layout.tsx`'teki import/JSX çağrısı kaldırıldı). `login-form.tsx`'teki "Hesabın yok mu? Ücretsiz başla" (`/signup`) linki kaldırıldı (signup'ın kendisi 5.B'nin işi, dokunulmadı); `middleware.ts`'in `PUBLIC_ROUTES`'undan `/demo` çıkarıldı (`/signup`/`AUTH_ROUTES` dokunulmadı), stale "marketing layout'a geçiyor" yorumu düzeltildi. **Yeni migration `023_drop_trial_system.sql`:** `org_trial_status` view'ı drop edildi (önce — `organizations.plan_status`/`trial_ends_at`/`owner_id`'ye bağımlıydı), `orgs_insert` RLS politikası (008_rls_signup.sql'in `owner_id = auth.uid()`'a bağımlı versiyonu) `002_rls.sql`'deki orijinal `is_super_admin()`-only haline döndürüldü, sonra 3 kolon (`trial_ends_at`, `plan_status`, `owner_id`) `organizations`'dan drop edildi. **Keşfedilen ve kullanıcı onayıyla aynı partide düzeltilen kritik bağımlılık:** `apps/web/app/api/signup/create-org/route.ts`, service-role client ile (RLS bypass) `organizations`'a `plan_status:"trial"`/`owner_id:user.id` insert ediyordu — kolonlar silinince bu, her yeni org signup'ında "column does not exist" 500'üne yol açacaktı (RLS'ten bağımsız bir runtime kırılması). İnsert objesinden bu 2 alan çıkarıldı (`plan`/`name`/`slug` kaldı, membership insert'e dokunulmadı). `packages/db/types.ts` aynı commit'te `supabase gen types typescript --linked` ile regenerate edildi (organizations Row/Insert/Update'ten 3 alan kalktı, `org_trial_status` Views girdisi tamamen kalktı). **Doğrulama (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh` + gerçek `next dev -p 3091`):** (a) cookiesiz `GET /` → 307 → `/login`; (b) gerçek admin girişiyle `/dashboard` → 200, SSR HTML'de trial-banner metni yok; (c) authenticated `GET /demo` ve `POST /api/demo-request` → gerçek 404 (route'lar app'ten tamamen kalkmış — unauthenticated istek için bunlar zaten `/login`'e 307 düşüyor, bu middleware'in her bilinmeyen path için önceden var olan davranışı, regresyon değil); (d) create-org fix'i SQL seviyesinde doğrulandı — yeni 3-alanlı insert şekli başarılı, eski 5-alanlı şekil (`plan_status`/`owner_id` dahil) gerçekten `42703: column "plan_status" of relation "organizations" does not exist` ile reddediliyor (endişe gerçekti, fix doğru); ayrıca taze bir test kullanıcısı+admin API üzerinden gerçek HTTP akışı da denendi, tüm test verisi (org, auth kullanıcı) temizlendi. `pnpm --filter web build` (25 sayfa, önceki 27'den `/demo` ve `/api/demo-request` düşük) + `pnpm turbo run type-check` (5/5 paket) temiz. Supabase `get_advisors` migration sonrası yeni ERROR/WARN üretmedi (yalnızca önceden var olan, kapsam dışı WARN'lar — SECURITY DEFINER fonksiyonların anon/authenticated'a açık olması ve leaked-password-protection). `pnpm docs:sync` çalıştırıldı (CLAUDE.md migration listesine 023 eklendi). **Yan bulgu (kapsam dışı, Parti 5.B'ye not düşüldü):** `middleware.ts`'in "authenticated ama memberships satırı yok → `/login?error=no_membership`" guard'ı `/api/signup/*` dahil TÜM public-olmayan path'lere uygulanıyor — bu, teoride taze signup olmuş (henüz membership'i olmayan) bir kullanıcının `/api/signup/create-org`'a yaptığı gerçek tarayıcı isteğinin de bu guard'a takılıp `/login`'e redirect olabileceği anlamına geliyor (bu Parti'nin dokunduğu hiçbir koddan kaynaklanmıyor — PUBLIC_ROUTES'un diğer elemanları ve membership-check mantığı değişmedi, yalnızca `/demo` çıkarıldı). Bu Parti'nin kapsamı dışında (signup akışının kendisi 5.B'nin işi), curl testinde SQL seviyesinde izole edilerek doğrulandı, düzeltilmedi. Detay: § Parti 5.A)
> Önceki: 2026-07-29 (**Dokümantasyon otomasyon sistemi (docs-sync)** — kalıcı bir altyapı görevi, Parti numarasına dahil değil. `scripts/docs-sync.mjs` eklendi: CLAUDE.md §2 (klasör ağacı), §3 (tablo şeması) ve §11'deki migration listesi artık `pnpm docs:sync` ile canlı Supabase şemasından (service-role + PostgREST OpenAPI introspection, `information_schema`'ya REST üzerinden erişilemediği için) ve `supabase/migrations/`'dan otomatik üretiliyor — elle senkronize etmeye gerek kalmadı. Tablo açıklamaları `scripts/table-descriptions.json`'da tutuluyor; bu partide 8 daha önce dokümante edilmemiş tablo (`platform_exercises`, `org_exercise_categories`, `org_exercises`, `athlete_1rm_records`, `wellness_checkins`, `readiness_scores`, `exercise_sets`, `program_blocks`) + bir sürpriz 9. tablo (`athlete_push_tokens`, kullanıcının listesinde yoktu ama CLAUDE.md §6'da zaten adı geçiyordu) dolduruldu. Ayrıca 3 bayat anlatı düzeltildi: TanStack Query hiç kullanılmadığı halde stack'te yazıyordu (gerçek pattern `router.refresh()`), davet akışı diyagramı artık kullanılmayan `/invite/[token]`'ı gösteriyordu (gerçek yol `/auth/confirm` + `token_hash`), `packages/ui` "web+mobile ortak" etiketliydi ama aslında yalnızca `apps/web` kullanıyor. §4 RLS başlığındaki "(TAM)" yanlışı da düzeltildi (yalnızca çekirdek tablolar). İki ardışık `pnpm docs:sync` çalıştırması aynı SHA256'yı üretti (idempotency doğrulandı).)
> Önceki: 2026-07-28 (**Parti 4.E — Rol sistemi regresyon testi + Parti 4 kapanış dokümantasyonu** — kod değişikliği yok, yalnızca canlı doğrulama + dokümantasyon. Süper admin (9 route, hepsi 200), coach (geçici test hesabıyla — projede belgeli coach kimliği yoktu), toggle-KAPALI ve toggle-AÇIK sporcu hesapları (4.B/4.C/4.D'nin ürettiği gerçek yollarla, `/api/athletes/create-account` proxy'si + login formunun sentetik-e-posta dönüşümü dahil), ve coach/admin `invite-member` daveti uçtan uca (`/auth/confirm`'e kadar) — hepsi gerçek Supabase Cloud + gerçek `next dev` server'a karşı curl ile test edildi (Playwright yok, önceki partilerin yöntemiyle aynı: gerçek Auth REST login + elle inşa edilmiş `sb-*-auth-token` cookie'si). **Sonuç: hiçbir regresyon yok** — 4 katmanlı athlete guard (middleware/sidebar/layout/UI) hâlâ tutarlı, `/auth/callback` hâlâ zararsız ölü kod, invite-member coach/admin daveti Parti 4'ten hiç etkilenmemiş. Mobil fiziksel cihaz testi yapılamadı (cihaz erişimi yok) — yerine kod seviyesinde doğrulandı: `apps/mobile/app/(auth)/login.tsx` web'in login değişikliğinden tamamen bağımsız (sıfır ortak import, git commit `80a3966` bu dosyaya dokunmamış), iki kapsam-dışı bulgu (mobil hâlâ Magic Link sunuyor, kullanıcı-adı→sentetik-e-posta dönüşümü yok) Parti 7'ye not düşüldü. Tüm test verisi (geçici coach hesabı, 2 test sporcusu, invite test kullanıcısı) temizlendi, `leftover=0` doğrulandı. Detay: § Parti 4 Kapanış Özeti)
> Önceki: 2026-07-27 (**Parti 4.D — Login sayfası: tek giriş yöntemi (e-posta veya kullanıcı adı + şifre)** — Magic Link tamamen kaldırıldı, e-posta VEYA kullanıcı adı ile giriş yapılabilen tek bir şifre formu bırakıldı. `login-form.tsx`'ten tab state'i, Magic Link UI'ı, `onMagicLink`/`signInWithOtp` tamamen silindi; `?tab=password` param'ı (ve onu okuyan `defaultTab` mantığı) kaldırıldı — projede bu param'a link veren başka bir yer bulunamadı (grep ile doğrulandı). Submit artık `identifier.includes("@")` ile e-posta/kullanıcı adı ayrımı yapıp kullanıcı adıysa `${identifier.toLowerCase()}@athleteiq.app` sentetik e-postasına çeviriyor, hata mesajı her zaman aynı genel metin ("E-posta/kullanıcı adı veya şifre hatalı") — `error.message` hiçbir dalda UI'a sızmıyor (enumeration riski yok). **`/auth/callback` incelendi, DOKUNULMADI:** grep ile doğrulandı, bu route SADECE Magic Link'in (`signInWithOtp` → `emailRedirectTo`) PKCE code-exchange'i için kullanılıyordu; davet akışı tamamen farklı bir route'u (`/auth/confirm`, `verifyOtp` + `token_hash`/`type`) kullanıyor — `invite-member` Edge Function'ının `redirectTo`'su (`supabase/functions/invite-member/index.ts:88`) doğrudan `/auth/confirm`'e işaret ediyor. Bu yüzden `/auth/callback` artık zararsız ölü kod olarak bırakıldı, silinmedi/değiştirilmedi. **Yan bulgu + düzeltme:** `loginSchema.password`'ün `min(8)` şartı, Parti 4.B'nin `create-athlete-account` Edge Function'ının kabul ettiği minimum (`>= 6` karakter) ile uyuşmuyordu — 6-7 karakterlik bir sporcu şifresiyle giriş denemesi sunucuya hiç ulaşmadan client-side Zod tarafından reddedilirdi. `packages/validators/auth.ts`'te `loginSchema` `email`+`min(8)` yerine `identifier`+`min(1)` (hem e-posta hem kullanıcı adını kabul eden, salt boş-olmama kontrolü) olarak yeniden yazıldı — login formunda karmaşıklık kontrolü sunucunun işi, client yalnızca boş alanı engeller. Kullanılmayan `magicLinkSchema`/`MagicLinkInput` da `auth.ts`'ten silindi (grep ile projede başka hiçbir çağıran kalmadığı doğrulandı). Canlıda (gerçek dev server + Supabase Cloud, taze oluşturulup temizlenen bir test sporcu hesabıyla) uçtan uca doğrulandı. Detay: § Parti 4.D)
> Önceki: 2026-07-27 (**Parti 4.C — add-athlete-modal.tsx: opsiyonel giriş erişimi** — Parti 4.B'nin `create-athlete-account` Edge Function'ını UI'a bağlayan ilk parti. `add-athlete-modal.tsx`'e varsayılan KAPALI bir "Giriş erişimi oluştur (kullanıcı adı ve şifre)" toggle'ı eklendi; AÇIKKEN kullanıcı adı + şifre alanları görünüyor (client-side format kontrolü Edge Function'ın `USERNAME_RE`'siyle birebir aynı). Toggle KAPALIYKEN davranış tamamen aynı kaldı (roster-only doğrudan insert); toggle AÇIKKEN yeni `apps/web/app/api/athletes/create-account/route.ts` proxy route'u üzerinden Edge Function çağrılıyor (projede `supabase.functions.invoke` deseni hiç yoktu — bulunan gerçek desen `/api/auth/invite`'ın server-side session+fetch proxy'siydi, bu parti onu birebir taklit etti). 409/400 hataları ilgili forma alanına (`username`/`password`) `setError` ile inline bağlanıyor. Canlıda (gerçek admin session cookie + gerçek dev server + gerçek Supabase Cloud) her iki yol da uçtan uca doğrulandı, test verisi temizlendi. Detay: § Parti 4.C)
> Önceki: 2026-07-27 (**Parti 4.B — `athletes.username` kolonu + `create-athlete-account` Edge Function** — e-posta gerektirmeyen, kullanıcı adı+parola tabanlı sporcu hesabı oluşturma akışı eklendi. Yeni migration (`022_add_athlete_username.sql`): `athletes.username` (nullable text) + `idx_athletes_username_lower` (case-insensitive, org'dan bağımsız GLOBAL benzersizlik, partial index `where username is not null`). Yeni Edge Function `supabase/functions/create-athlete-account/index.ts`: sentetik `${username}@athleteiq.app` e-postasıyla `auth.admin.createUser` → `athletes` insert → `memberships` insert (role assignment — bkz. aşağıdaki "rol nasıl atanıyor" bulgusu), her adımda başarısızlık öncekileri geri alıyor (auth kullanıcısı asla yetim kalmıyor). Canlıda (Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek admin JWT'siyle gerçek HTTP çağrıları) doğrulandı: başarı/409/400 üçü de beklenen sonucu verdi, test verisi temizlendi. Detay: § Parti 4.B)
> Önceki: 2026-07-23 (**Tip Güvenliği Temizliği v2 — client sınırında dar assertion** — `apps/web/lib/supabase/client.ts`/`server.ts`'te `createBrowserClient`/`createServerClient`'ın dönüş değeri `as unknown as SupabaseClient<Database, "public">` ile assert edildi (`@supabase/ssr@0.5.2` / `@supabase/supabase-js@2.108.2` peer-dep generic imza uyuşmazlığı için dar bir düzeltme, runtime davranışı değiştirmiyor). Bu sayede `new-program-client.tsx`/`edit-program-client.tsx`'teki 3 RPC call site'ında (`create_program_with_weeks`, `update_program_week`, `propagate_week_to_future`) `const db = supabase as any;` kaldırılıp doğrudan tipli `supabase.rpc(...)` çağrılabildi. RPC'lerin nullable Args'ı (`p_team_id`/`p_athlete_id`/`p_phase`/`p_notes`) ve `Json` dönüş tipi (`create_program_with_weeks`) için 2 dosyada dar, yerel `as` cast'leri eklendi (gen-types kısıtı, client'a dokunulmadı). Doğrulama: (a) RPC katmanı — 3.C/3.E/3.F test seti aynen tekrarlandı (weeks_count=1/4, update_program_week, propagate_week_to_future, yetkisiz erişim), birebir aynı sonuç; (b) yazım hatası testi — `create_program_with_weks` typo'su artık TS2345 ile derleme aşamasında reddediliyor; (c) auth sağlamlık kontrolü — gerçek admin login (Auth REST + elle inşa edilmiş `sb-*-auth-token` session cookie'siyle gerçek dev server'a istek), middleware doğru role/org_id çözüyor, `/auth/logout` oturumu sunucu tarafında da geçersiz kılıyor, İbrahim'in gerçek kimliğiyle RLS SELECT'i hâlâ doğru filtreliyor; (d) `pnpm --filter web build` + `pnpm turbo run type-check` (5/5 paket) temiz. Detay: § Tip Güvenliği Temizliği v2)
> Önceki: 2026-07-22 (**Parti 3.F — sonraki haftalara uygula, Parti 3 tamamen kapandı** — yeni `copy_program_tree`/`propagate_week_to_future` RPC'leri (`021_propagate_week.sql`) bir haftanın kaydedilmiş session/exercise/exercise_sets ağacını aynı bloktaki sonraki haftalara kopyalar, hedeflerin kendi start_date/end_date/week_number/notes'una dokunmadan; yetkilendirme 018/020 ile birebir aynı coalesce deseni. `edit-program-client.tsx`'e "Sonraki Haftalara Uygula" butonu eklendi (Kaydet'ten ayrı aksiyon, onay penceresinde etkilenecek haftaları açıkça listeliyor), yalnızca block_id'li ve son olmayan haftalarda görünüyor. `packages/db/types.ts` bu partide regen edildi (program_blocks/block_id/week_index_in_block + tüm RPC imzaları artık tipli — 3.B'den beri ertelenen regen). Yerelde (rollback dahil, tetikleyici trigger'la simüle edilmiş çok-hedefli kesinti senaryosu) ve canlıda (gerçek Auth JWT + PostgREST) uçtan uca doğrulandı. **Parti 3 (3.B → 3.F) bu partiyle tamamen kapandı** — üst-özet için § Parti 3 Kapanış Özeti. Detay: § Parti 3.F)
> Önceki: 2026-07-22 (**Parti 3.E — düzenleme akışı transactional RPC'ye taşındı** — 018'in session→exercise→exercise_sets insert mantığı paylaşılan `insert_sessions_tree()` fonksiyonuna çıkarıldı (019, davranış değişikliği yok — 3.C test seti tekrarlandı, birebir aynı sonuç), yeni `update_program_week` RPC'si (020) eklendi (training_programs.programs_write ile birebir aynı yetkilendirme, coalesce zorunlu, week_number her zaman start_date'ten yeniden hesaplanıyor, tüm alan+ağaç güncellemesi TEK transaction). `edit-program-client.tsx` artık bu RPC'yi çağırıyor — eski delete-then-reinsert (transactionsız, sıralı insert) kodu tamamen kaldırıldı. `week_number`/`end_date` input'ları kaldırıldı (start_date zorunlu, end_date otomatik +6 gün); BUGS.md'deki start_date/end_date bug'ı bu dosya için de kapandı. Program kapsamı (takım/sporcu) artık düzenlenemez hale geldi — RPC'nin imzasında yok, bilinçli karar (aşağıda detaylı). `buildSessionsPayload`/`mapRpcError` `apps/web/lib/program-rpc.ts`'e çıkarıldı, iki client de oradan import ediyor. Gerçek TGF/İbrahim verisiyle uçtan uca doğrulandı (Hipertrofi programı düzenlenip eski haline geri döndürüldü). Detay: § Parti 3.E)
> Önceki: 2026-07-21 (**Parti 3.D — wizard RPC'ye bağlandı** — `new-program-client.tsx` artık `create_program_with_weeks` RPC'sini çağırıyor; eski sıralı insert kodu (training_programs→sessions→exercises→exercise_sets tek tek) tamamen kaldırıldı. `week_number`/`end_date` input'ları wizard'dan silindi (RPC bunları otomatik türetiyor), yerine `weeks_count` (1-12, varsayılan 1) eklendi; `start_date` artık zod seviyesinde zorunlu (BUGS.md'deki start_date/end_date bug'ının start_date kısmı bu partiyle kapandı). `edit-program-client.tsx`'e DOKUNULMADI (Parti 3.E kapsamı). Detay: § Parti 3.D)
> Önceki: 2026-07-21 (**Parti 3.C — create_program_with_weeks RPC** — çok haftalı program+hafta ağacını TEK transaction'da oluşturan security definer fonksiyon (`018_create_program_with_weeks.sql`), cloud'a push edildi. Doğrulama sırasında KRİTİK bir yetkilendirme bug'ı bulundu ve düzeltildi (bkz. § Parti 3.C). SADECE FONKSİYON — hiçbir UI henüz çağırmıyor. Detay: § Parti 3.C)
> Önceki: 2026-07-21 (**Parti 3.B — program_blocks şeması** — çok haftalı program grubu (blok) kavramı için yeni `program_blocks` tablosu + `training_programs.block_id`/`week_index_in_block` kolonları, cloud'a push edildi ve RLS simülasyonuyla doğrulandı. Tamamen additive, hiçbir UI henüz bu tabloyu okumuyor. Detay: § Parti 3.B)
> Önceki: 2026-07-21 (**Parti 2.2.F — Tonaj özet metriği (Parti 2'nin son adımı)** — program detay sayfası artık her seans ve programın tamamı için toplam tonajı (kg) hesaplayıp gösteriyor; %1RM setleri sporcunun en güncel 1RM kaydından çözülüyor, kayıt yoksa set tonaja dahil edilmeyip ayrı sayılıyor, vücut ağırlığı/bant setleri kg değil tekrar sayısıyla ayrı gösteriliyor. **Parti 2 (2.1 → 2.2.F) bu partiyle tamamen kapandı** — üst-özet için § Parti 2 Kapanış Özeti. Detay: § Parti 2.2.F)
> Önceki: 2026-07-20 (**Parti 2.2.E — 1RM manuel giriş formu + mevcut query'leri bağlama** — `/tests` sayfasına "1RM Kayıtları" alt-bölümü eklendi (liste + ekleme formu, `create1RMRecord`/`getAthleteMaxes` mevcut haliyle çağrılıyor), program builder'ın ExercisePickerModal'ına `athleteMaxes` prop'u bağlandı ("Son max" rozeti artık görünüyor). Detay: § Parti 2.2.E)
> Önceki: 2026-07-20 (**Parti 2.2.D — set bazlı UI, uçtan uca kablolama** — program builder artık egzersiz başına tek satırlık grid yerine set listesi kullanıyor (kg/%1RM/vücut ağırlığı/direnç bandı + RPE, set başına), `exercise_sets` tablosuna yazıyor/okuyor. Detay: § Parti 2.2.D)
> Önceki: 2026-07-20 (**Parti 2.2.C — ExerciseList paylaşılan bileşene taşındı (davranış değişikliği yok)** — new/edit program builder'daki birebir aynı egzersiz listesi alt-bileşeni `apps/web/components/features/program-builder/exercise-list.tsx`'e çıkarıldı. Detay: § Parti 2.2.C)
> Önceki: 2026-07-18 (**Parti 2.2.B — session_rpe şeması (atıl, Parti 6/7'de bağlanacak)** — `training_sessions.session_rpe` kolonu eklendi, cloud'a push edildi ve doğrulandı. Detay: § Parti 2.2.B)
> Önceki: 2026-07-18 (**Parti 2.1 — exercise_sets şeması** — set bazlı yoğunluk takibi için yeni tablo + RLS, cloud'a push edildi ve doğrulandı. Detay: § Parti 2.1)
> Önceki: 2026-07-15 (**Mobil donma çözüldü** — css-interop `printUpgradeWarning` deep-stringify HANG'i patch'lendi; Program ekranı + 4 tab cihazda çalışıyor. Realtime publication boştu, dolduruldu. Detay: § Bilinen Sorunlar #4)
> Son commit: `14562dd` — 2026-07-01
> Bu dosya her session başında okunmalı. CLAUDE.md ile birlikte projenin hafızasıdır.

---

## Tamamlanan Özellikler

### Parti 15 — 1RM Kayıt Yönetimi ✅ (2026-08-11)

#### Kapsam

`athlete_1rm_records` şeması Parti 2.2.E'den beri vardı (0 satır, org-geneli `/tests`
sayfasında salt-ekleme bir alt-bölüm) ama üç eksik vardı: (1) `1rm_insert`/`1rm_update`/
`1rm_delete` RLS politikaları org-only'di (`BUGS.md`'de Parti 8.E'nin bilinçli olarak
ertelediği, ayrı bırakılmış bir bulgu), (2) sporcu bazlı bir yönetim ekranı (geçmiş/edit/
delete) yoktu, (3) Parti 12'nin tonaj hesabı bu tablodan hiç veri çekemiyordu (DB boş
olduğu için `%1RM` setleri hep "1RM kaydı yok" diyordu) ve eşleştirme tam string-eşitliğiyle
yapılıyordu (Türkçe karakter/case toleransı yoktu). Bu parti üçünü birden kapattı: bir
migration (Görev 1), tek bir paylaşılan Türkçe-normalize fonksiyonu (Görev 2), sporcu detay
sayfasına yeni bir "1RM Kayıtları" sekmesi (Görev 3), ve tonaj hesabının tarih-duyarlı
çözümlemeye geçmesi (Görev 4).

#### Değişiklikler

- **`supabase/migrations/031_1rm_team_scoped_rls.sql`** (yeni migration): `1rm_insert`/
  `1rm_update`/`1rm_delete` `ALTER POLICY` ile (DROP+CREATE değil — migration 025/026
  konvansiyonu) yerinde güncellendi. Coach dalı `my_role(a.org_id) in ('admin','coach')`
  (org-only) → `my_role(a.org_id) = 'admin' or (my_role(a.org_id) = 'coach' and a.team_id =
  my_team_id(a.org_id))` (`wellness_insert`/`athletes_select` şablonu), tüm koşul
  `coalesce(..., false)` ile sarıldı (proje konvansiyonu — burada da `exists(...)` zaten
  fail-closed, coalesce yalnızca tutarlılık için). `1rm_select`'e dokunulmadı (görev
  talimatı). `is_super_admin()` dalı bilinçli eklenmedi — orijinal politikada hiç yoktu,
  tek admin hesabı zaten org'da `admin` membership'ine sahip. Şema/kolon değişmediği için
  `packages/db/types.ts` regenerasyonu gerekmedi.
- **`packages/validators/athlete.ts`**: un-exported `TR_MAP` → exported `TR_CHAR_MAP`
  (davranış aynı, sadece görünürlük — `exercise.ts`'in yeniden kullanması için).
- **`packages/validators/exercise.ts`** (yeni): `normalizeExerciseName(name)` — Türkçe
  karakterleri `toLowerCase()`'den ÖNCE case-sensitive map eder (`suggestUsername`'deki
  "İ" bug'ının aynısını tekrar yaşamamak için), boşluk/case normalize eder. `packages/
  validators/exercise.test.ts` (yeni, 5 test — Türkçe fold, "İnverted Row", case/boşluk
  toleransı, çoklu varyantın aynı anahtara düşmesi).
- **`packages/db/queries/exercises.ts`**: `getAthleteMaxHistory` (yeni — tam geçmiş,
  dedup YOK), `getAthleteMaxes` artık ona sarılıp `normalizeExerciseName` ile dedup ediyor
  (önceden exact-string'di — saf iyileştirme, farklı case'li aynı egzersiz artık doğru
  birleşiyor), `dedupeLatestMaxes` (yeni, saf fonksiyon), `updateAthlete1RMRecord`/
  `deleteAthlete1RMRecord` (yeni — edit/delete UI'ı hiç yoktu), `buildMaxLookup`/
  `resolveOneRepMaxKg` imzaları AYNEN kalıp (mobil `ExerciseCard.tsx`/`program/[day].tsx`
  kırılmasın) iç anahtarlama `normalizeExerciseName`'e geçti, `buildMaxHistoryLookup`/
  `resolveOneRepMaxKgForDate` (yeni — tarih-duyarlı çözümleme, aşağıya bkz.).
  `packages/db/package.json`'a `@athleteiq/validators` (`workspace:*`) + `@types/node`
  (crypto global'i için — db'nin validators'a bağımlı olması `athlete.ts`'i de programına
  çekti, db'nin kendi `node_modules`'ünde `@types/node` yoktu, `packages/validators`'a da
  aynı sebeple eklendi) devDependency olarak eklendi.
- **`apps/web/components/features/exercises/exercise-picker-modal.tsx`**: `PickedExercise`'e
  opsiyonel `id`/`source` eklendi (mevcut program-builder kullanımı bozulmadı, geriye dönük
  uyumlu), arama filtresi + "Son max" `maxMap` anahtarlaması `normalizeExerciseName`'e geçti.
- **`apps/web/app/(dashboard)/athletes/[id]/page.tsx`** + **`athlete-detail-client.tsx`**:
  sayfa artık `getAthleteMaxHistory`/`getPlatformExercises`/`getOrgExercises`/
  `getOrgCategories`'i de paralel çekiyor; sayfa `@/components/ui/tabs` ile "Genel Bakış"
  (mevcut içerik, davranış değişmedi) ve yeni "1RM Kayıtları" sekmesine ayrıldı.
- **`apps/web/app/(dashboard)/athletes/[id]/one-rm-records-tab.tsx`** (yeni): güncel liste
  (egzersiz/kg/tarih/"X gün önce", `buildMaxHistoryLookup` ile grupluyor), satıra tıklayınca
  geçmiş açılıyor (edit/sil inline), ekleme formu `ExercisePickerModal` ile katalog araması
  (`name_tr` dahil) üzerinden `exercise_id`/`exercise_source`/`exercise_name` dolduruyor.
  Aynı egzersiz+tarih (exercise_id+exercise_source+test_date) varsa engellemeyen bir uyarı
  gösteriliyor. Gelecek tarih Zod `.refine` + `<input max>` ile engelleniyor. "Bugün"
  `packages/validators/wellness.ts`'teki `getLocalDateString` ile hesaplanıyor
  (`tests-client.tsx`'in kendi UTC-tabanlı `today()`'si DEĞİL — aynı gece-yarısı-kayması
  sınıfını tekrar yazmamak için).
- **`apps/web/lib/tonnage.ts`**: `TonnageContext.maxLookup`/`buildMaxLookup` →
  `maxHistoryLookup: Map<string, Athlete1RMRecord[]>`/`buildMaxHistoryLookup` + yeni
  `programStartDate: string | null`; `calculateSetTonnage` artık `resolveOneRepMaxKgForDate`
  çağırıyor. `REASON_LABELS`/`UnresolvedReason`/`summarizeUnresolved` dokunulmadı.
- **`apps/web/app/(dashboard)/programs/[id]/page.tsx`** + **`program-detail-client.tsx`**:
  `getAthleteMaxes` → `getAthleteMaxHistory`, `athleteMaxes` prop → `athleteMaxHistory`,
  `tonnageContext`'e `programStartDate: program.start_date` eklendi. `programs/new/` ve
  `programs/[id]/edit/`'teki `getAthleteMaxes` kullanımına (tek-değer "Son max" rozeti,
  tarihsiz) dokunulmadı.
- **Tarih-duyarlı çözümleme mantığı** (`resolveOneRepMaxKgForDate`): egzersiz için
  `test_date <= programStartDate` olan kayıtların en büyüğü kullanılır; hiç yoksa en eski
  kayıt kullanılır (unresolved SAYILMAZ — `resolvedSetCount`'a dahil olur); egzersiz için
  hiç kayıt yoksa `no_1rm_record` (mevcut davranış, değişmedi).

#### Doğrulama

- Type-check: `@athleteiq/validators`, `@athleteiq/db`, web (`tsc --noEmit`), mobile
  (`npx tsc --noEmit`) — **4/4 paket 0 hata**. `pnpm --filter @athleteiq/validators test`
  → **12/12 test yeşil** (7 mevcut `athlete.test.ts` + 5 yeni `exercise.test.ts`).
  `pnpm --filter web lint` → 0 hata (23 önceden var olan, bu partiden bağımsız uyarı).
  `pnpm --filter web build` → **27 sayfa**, sıfır derleme hatası.
- **Canlı RLS testi** (Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek Auth REST + gerçek
  JWT'ler — `parti15-temp-coach-ace@athleteiq.test` (ACE takımı, İbrahim'in takımı) ve
  `parti15-temp-coach-ack@athleteiq.test` (ACK takımı, farklı takım) geçici hesapları
  `auth.admin.createUser` ile oluşturuldu): **6/6 kontrol geçti** — (1) ACK coach'u
  İbrahim'e (ACE) INSERT dener → `403 42501 "new row violates row-level security policy"`;
  (2) ACE coach'u İbrahim'e INSERT dener → `201` başarılı; (3)/(4) ACK coach'u o satırı
  UPDATE/DELETE dener → PostgREST `200 []` (RLS `using` 0 satır görünür kılıyor, sessiz
  no-op — beklenen davranış); (5)/(6) ACE coach'u aynı satırı UPDATE sonra DELETE eder →
  ikisi de başarılı (regresyon yok). Geçici hesaplar + membership satırları + test satırı
  temizlendi, `athlete_1rm_records` **0 satırla** doğrulandı. `get_advisors` migration
  sonrası yeni ERROR/WARN üretmedi.
- **Tarih-duyarlı çözümleme, gerçek veriyle** (admin JWT'siyle İbrahim'e 3 Back Squat kaydı
  seed edildi: 140kg/2026-08-11, 142kg/2026-08-11 [mükerrer-tarih senaryosu — DB engellemedi,
  beklenen], 135kg/2026-07-01; İbrahim'in 3 gerçek "Müsabaka" programının `start_date`'lerine
  karşı `resolveOneRepMaxKgForDate`'in birebir aynı algoritması gerçek veriye çalıştırıldı):
  `start_date=2026-08-10` (iki 08-11 kaydından ÖNCE) → doğru şekilde 135kg/07-01'i seçti
  (gelecekteki kaydı YOK saydı); `start_date=2026-08-17`/`2026-08-24` (08-11'den SONRA) →
  140kg'ı seçti; senteik "tüm kayıtlar referans tarihinden sonra" senaryosu → en eski kaydı
  kullandı (unresolved DEĞİL); eşleşen egzersiz yok senaryosu → `null`. Test verisi silindi,
  `athlete_1rm_records` tekrar 0 satır.
- **Katalog verisi** (SQL ile doğrudan sorgulandı): `Inverted Row` hem `platform_exercises`
  hem `org_exercises`'ta mevcut (picker'ın `combined=[...org,...platform]` sıralaması org'u
  önce listeliyor); `Bear Crawl`'ın `name_tr`'si `Ayı Yürüyüşü`.
- **Canlı tarayıcı/manuel UI testi bu ortamda yapılamadı** (headless tarayıcı erişimi yok).
  Kod incelemesiyle doğrulanan ama interaktif olarak TIKLANMAYAN davranışlar: gelecek
  `test_date` engeli (Zod `.refine` + `<input max>`), mükerrer-tarih UI uyarısının render'ı,
  arama kutusunun gerçek klavye girişiyle filtrelemesi, sekme geçişleri. Kullanıcı canlıda
  bir kez gözden geçirmeli.

#### Kapsam dışı bırakılan (görev talimatı gereği)

`exercises` tablosuna katalog referansı eklenmedi (eşleştirme hâlâ isim üzerinden — artık
normalize edilmiş isim, ama isim değişirse yine kırılabilir; `BUGS.md`'ye açık madde
eklendi). `athlete_1rm_records`'a UNIQUE kısıt eklenmedi (geçmiş kaydı meşru). Mobile'a 1RM
giriş ekranı eklenmedi. `1rm_select` değiştirilmedi. Tonaj bileşeninin gerekçe/reason
gösterme mantığı (`UnresolvedReason`/`REASON_LABELS`) değişmedi.

---

### Parti 14 — Sabah Wellness Check-in ✅ (2026-08-11)

#### Kapsam

Mobilde sporcunun günlük 5 maddelik (McLean ve ark. 2010 uyarlaması) wellness self-report
formu + son 7 gün geçmişi, web'de koçun takımının bugünkü check-in durumunu gördüğü
salt-okunur `/readiness` ekranı + sporcu bazlı 14 günlük geçmiş. `wellness_checkins`/
`readiness_scores` şeması ve RLS'i zaten canlıydı (`012_wellness.sql`/`013_readiness_scores.sql`,
READINESS_PLAN.md AŞAMA 1, 2026-07-15'te uygulandı) — bu parti üzerine ilk gerçek okuma/yazma
yüzeyini inşa etti. **Bu partide migration YOK**, şema/RLS'e dokunulmadı.

#### Keşif — görev talimatıyla çelişen bir bulgu

Görev talimatı `wellness_total`'ın "generated DEĞİL, uygulama hesaplayacak" düz bir kolon
olduğunu, canlı DB'den doğrulandığını iddia ediyordu. Gerçek migration dosyası
(`supabase/migrations/012_wellness.sql:28-29`) bunu bir Postgres GENERATED kolonu olarak
tanımlıyor:
```sql
wellness_total integer generated always as
  (sleep_quality + soreness + stress + fatigue + mood) stored,
```
Hiçbir sonraki migration bu kolona dokunmamış (`wellness_total` için repo genelinde tek eşleşme).
Önceki partilerin kullandığı Supabase MCP (`execute_sql`/`list_tables` vb.) bu oturumda
bağlı değildi, canlı DB'ye doğrudan sorgu atılıp gerçek durum teyit edilemedi. Kullanıcıya
soruldu; **migration dosyası kaynak alınmasına karar verildi** — `wellness_total` hiçbir
insert/upsert payload'ına dahil edilmiyor (Postgres reddeder: generated kolona değer
yazılamaz), DB'nin otomatik hesapladığı değer okuma yolunda kullanılıyor. Client-side
`computeWellnessTotal` yalnızca formu doldururken gösterilen canlı "../25" önizlemesi için
var — asla sunucuya gönderilmiyor.

#### İki gerçek, görev talimatında olmayan blokaj

1. **`apps/mobile/package.json` `@athleteiq/validators`'ı bağımlılık olarak bildirmiyordu**
   (yalnızca `@athleteiq/db` vardı). `@athleteiq/db`'nin tarihsel boşluğu (MOBILE_STATUS.md)
   zararsızdı çünkü tüm kullanımlar `import type`di (build'de silinir); bu partinin
   `computeWellnessTotal`/`getLocalDateString`/`wellnessCheckinSchema`'sı RUNTIME'da
   çağrılıyor — eklenmeden Metro modülü çözemezdi. `"@athleteiq/validators": "workspace:*"`
   eklendi + `pnpm install`.
2. **Hem `packages/db/package.json` hem `packages/validators/package.json` barrel değil,
   açık alt-yol `exports` map'i kullanıyor** (örn. `"./team": "./team.ts"`). Yeni dosyaları
   yalnızca `index.ts` barrel'ine eklemek yetmiyor — `"./queries/wellness"` ve `"./wellness"`
   girdileri `package.json`'a da eklendi, yoksa subpath import (`@athleteiq/db/queries/wellness`,
   bu kod tabanının baskın import biçimi) çözümlenmezdi.
3. (Savunma amaçlı, talimat dışı ek) Metro'nun pnpm workspace symlink'leri üzerinden
   transitive npm bağımlılığı (zod) çözme davranışı bu ortamda cihazda doğrulanamadığı için
   `zod` mobile'a da doğrudan bağımlılık olarak eklendi — `apps/web` zaten aynı şekilde hem
   doğrudan hem `@athleteiq/validators` üzerinden dolaylı bildiriyor, aynı konvansiyon
   mobile'a da uygulandı.

#### Değişiklikler

- **`packages/validators/wellness.ts`** (yeni): `wellnessCheckinSchema` (Zod, DB CHECK'leriyle
  birebir: 5 madde `int().min(1).max(5)`, `sleep_hours` `min(0).max(24)` opsiyonel, `notes`
  opsiyonel) + `computeWellnessTotal` (görev talimatının açık isteği — paket normalde
  şema-only, deliberate bir sapma) + `getLocalDateString` (cihaz/tarayıcı YEREL tarihini
  `YYYY-MM-DD` döner, `getFullYear/getMonth/getDate` ile — ASLA `toISOString()` kullanmıyor,
  o UTC'dir ve bu partinin çözmeye çalıştığı TR UTC+3 kaymasının aynısını üretirdi). Tek
  kaynak: mobil banner, mobil form ve web koç görünümü "bugün"ü hep bu fonksiyondan okuyor.
- **`packages/db/queries/wellness.ts`** (yeni): `getWellnessCheckin`/`getAthleteWellnessHistory`
  (7 günlük mobil listesi ve 14 günlük web detayı için aynı fonksiyon, farklı pencere)/
  `upsertWellnessCheckin` (`onConflict:"athlete_id,checkin_date"` — `acwr_logs`'un bilinen
  aynı-gün-upsert bug'ının (UPDATE RLS politikası yok) aksine `wellness_update` politikası
  VAR, bu upsert güvenli)/`getOrgWellnessCheckins` (`athletes!inner(org_id)` join,
  `getWearableConnections`/`getTests` deseniyle birebir aynı — `wellness_checkins`'in kendi
  `org_id` kolonu yok). `WellnessCheckinUpsertInput` tipi `wellness_total`/`id`/`created_at`/
  `updated_at`'i `Omit` ile payload tipinden derleme-zamanında dışlıyor (yukarıdaki generated-
  kolon bulgusunun tip-seviyesinde bir daha tekrarlanmaması için).
- **`apps/mobile/app/(tabs)/program/checkin.tsx`** (yeni route): `[day].tsx` ile aynı desende
  ayrı bir Stack ekranı — MOBILE_STATUS.md'nin dokümante ettiği `program/index.tsx` css-interop
  dev-mode donma riski yüzünden form ASLA o dosyaya inline edilmedi. 5 madde için 1-5 dokunmalı
  seçici (yalnızca uç değerler — 1 ve 5 — için görev talimatının verdiği Türkçe etiketler
  gösteriliyor; 2/3/4 için talimatta etiket tanımlı değildi, standart Likert uçlandırma
  konvansiyonu uygulandı, uydurulmadı), üstte canlı "../25" toplam göstergesi
  (`computeWellnessTotal`, 5 madde dolana kadar "…/25"), opsiyonel `sleep_hours`
  (`keyboardType="decimal-pad"`, virgüllü Türkçe klavye girişini de kabul ediyor) ve `notes`.
  5 madde dolmadan Kaydet butonu pasif (client-side kontrol); kaydetmeden hemen önce
  `wellnessCheckinSchema.safeParse` ikinci savunma katmanı olarak çalışıyor — ham Postgres
  CHECK ihlali hatası hiçbir zaman kullanıcıya ulaşmıyor, Türkçe `Alert.alert` gösteriliyor.
  Aynı ekranda formun altında son 7 gün geçmişi (`getAthleteWellnessHistory`) — yalnızca
  bugünün satırında "Düzenle" görünüyor (RLS `checkin_date >= current_date-1` ile dünü de
  düzenlemeye izin veriyor ama UI bilinçli olarak yalnızca bugüne izin veriyor — dünün verisini
  geriye dönük değiştirmek izleme kalitesini bozar); form zaten üstte ve doldurulmuş olduğu
  için "Düzenle" bir navigasyon değil, scroll-to-top. Silme aksiyonu YOK (`wellness_checkins`'te
  DELETE RLS politikası yok, denemek anlamsız bir hata döndürürdü).
- **`apps/mobile/app/(tabs)/program/_layout.tsx`**: `checkin` için `[day]` ile birebir aynı
  `Stack.Screen` seçenekleri (`headerTitle:"Sabah Değerlendirmesi"`, `headerBackTitle:"Geri"`,
  `headerTintColor:"#534AB7"` — sibling ekranla tutarlılık için, gövdenin `blue-700`'ü değil).
- **`apps/mobile/app/(tabs)/program/index.tsx`**: en üste tek, sığ bir "Sabah Değerlendirmesi"
  kartı eklendi (3-4 düz `View`/`Text`/`TouchableOpacity` node'u, tek seviye ternary className,
  döngü yok) — bilinçli olarak EN SON ve EN KÜÇÜK değişiklik olarak yapıldı, çünkü bu dosya
  MOBILE_STATUS.md'nin dokümante ettiği `react-native-css-interop` donma bug'ının kanıtlanmış
  tetikleyici alanı. Kart, check-in yoksa "Bugün doldurulmadı"+"Doldur", varsa `{toplam}/25`+
  "Düzenle" gösterip `checkin.tsx`'e yönlendiriyor. `useFocusEffect` (`@react-navigation/native`
  — yeni doğrudan bağımlılık; `expo-router` bu hook'u re-export etmiyor, ama pnpm store'da
  zaten `7.3.4` olarak resolve edilmiş haldeydi, `pnpm install` yeni bir şey indirmedi) ile
  `checkin.tsx`'ten `router.back()` sonrası kart otomatik güncelleniyor (aynı screen instance
  remount olmadığı için bu olmadan mevcut `useEffect` yeniden çalışmazdı).
- **`apps/web/app/(dashboard)/readiness/page.tsx`** + **`readiness-client.tsx`** (yeni):
  sunucu bileşeni `wearables/page.tsx` deseninde `aiq_org_id` cookie'sinden org roster +
  `getOrgWellnessCheckins` (sunucu saati UTC'ye yakın olduğu için ±1 gün paylı bir pencere —
  gerçek "bugün" ayrımı client'ta yapılıyor) çekiyor. Client bileşen "bugün"ü tarayıcının
  yerel saatiyle bir `useEffect` içinde hesaplıyor, render gövdesinde DEĞİL — bir Client
  Component da hydration öncesi bir kez sunucuda render edildiği için render'da hesaplamak
  server/client uyuşmazlığı riski taşırdı (tam da bu partinin çözdüğü UTC/TR-yerel sınıfında
  bir bug'ı render katmanına taşımak olurdu); `todayLocal===null` iken `Skeleton` gösteriliyor.
  Roster × bugünün check-in'leri `useMemo` ile bellek-içi LEFT JOIN'lenip iki ayrı bölüme
  render ediliyor: "Bugün Check-in Yapmayanlar" (gri rozetler, KIRMIZI DEĞİL — eksik veri bir
  uyum/compliance sorunu, tehlike sinyali değil; tıklanınca da 14 günlük geçmişe gidiyor) ve
  "Bugün Check-in Yapanlar" (ad/toplam/uyku/doldurma saati tablosu, satır tıklanınca detaya
  gidiyor). Realtime: `athletes-client.tsx`'teki `postgres_changes` deseninin birebir aynısı
  (`event:"*"`, filtre yok — RLS zaten aboneye ulaşan satırları kısıtlıyor), `wellness_checkins`
  tablosuna bağlandı, `router.refresh()`+toast. Sidebar'a `roles:["admin","coach"]` ile tek
  satır eklendi (`/acwr`'den hemen sonra). Middleware'e DOKUNULMADI — athlete zaten
  `/programs*` dışına genel olarak kilitli, yeni route'lar için ayrı bir allowlist olmadığı
  doğrudan `middleware.ts` okunarak doğrulandı.
- **`apps/web/app/(dashboard)/readiness/[athleteId]/page.tsx`** + **`readiness-detail-client.tsx`**
  (yeni): `athletes/[id]/page.tsx` deseninde (`getAthleteById(...).catch(()=>null)` →
  `notFound()`, sunucu saatiyle gevşek 15 günlük pencere — burada "bugün" ayrımı yapılmadığı
  için client-taraflı yerel tarih hesaplamasına ihtiyaç yok). 14 günlük düz liste (tarih/
  toplam/uyku/not) — grafik veya renk-kodlama YOK, 5-25 aralığı için "iyi/kötü" eşiği henüz
  tanımlı değil, bunu icat etmek kapsam dışı bırakılan readiness-skor motorunun işi olurdu.
- Grafik/trend/baseline/z-skor, koç-vekil (`source='coach_proxy'`) girişi UI'ı,
  `readiness_scores` yazımı — hiçbiri bu partide YOK (görev talimatının Yapılmayacaklar'ı).

#### Doğrulama

- `pnpm --filter @athleteiq/validators type-check` + `pnpm --filter @athleteiq/db type-check`
  + web `npx tsc --noEmit` + mobile `npx tsc --noEmit` — **4/4 paket 0 hata**.
- Mobile `npx eslint .` → 0 hata (1 önceden var olan, bu partiden bağımsız `lib/auth.tsx`
  `react-hooks/exhaustive-deps` uyarısı). Web `npx eslint` (değişen dosyalar) → 0 hata
  (1 önceden var olan, ilgisiz `sidebar.tsx`'teki kullanılmayan `Calendar` import uyarısı —
  `git diff --stat` ile bu partiden önce var olduğu doğrulandı, bu parti yalnızca `Sunrise`
  import'u + 1 nav satırı ekledi).
- `pnpm --filter web build` → **29 sayfa** (öncesi 27 — yeni `/readiness` +
  `/readiness/[athleteId]`), sıfır derleme hatası, yalnızca önceden var olan ESLint uyarıları.
- `git diff --stat` ile Parti 13'ün süperset/sekme dosyalarının (`ProgramTabStrip.tsx`,
  `SupersetGroup.tsx`, `apps/mobile/lib/supersetGroups.ts`, `[day].tsx`) **SIFIR** değiştiği
  doğrulandı — bu parti tamamen additive, hiçbir mevcut dosyanın program/süperset mantığına
  dokunmadı.
- **Fiziksel cihaz/tarayıcı testi bu ortamda yapılamadı** (mobil cihaz veya headless
  tarayıcı erişimi yok) — kod/tip/build doğrulaması geçti. Görev talimatının Görev 4'teki
  uçtan uca senaryoları (`ibrahim.colak` ile gerçek form doldurma + `wellness_total`/`source`/
  `entered_by` SQL doğrulaması, gece yarısı `checkin_date` testi, aynı-gün upsert satır sayısı,
  eksik alanla engelleme, `sleep_hours=25` client-side engeli, web'de İbrahim/Mehmet Ayberk
  parite, `parti8f-temp-coach` takım izolasyonu, Parti 13 regresyon kontrolü) ve test verisi
  temizliği (`wellness_checkins`'te DELETE politikası yok, temizlik Supabase MCP
  `execute_sql` gerektiriyor — bu oturumda bağlı değildi) **kullanıcı tarafından canlıda
  yapılmalı.**

#### Kapsam dışı bırakılan (bilinçli, görev talimatı gereği)

`readiness_scores` yazımı/motoru, RLS/migration değişikliği, koç-vekil (`coach_proxy`) giriş
UI'ı, trend grafiği/baseline/z-skor hesabı, push bildirimi/hatırlatma, `athletes` tablosuna
dokunma.

---

### Parti 13 — Mobil Program Ekranı: Süperset Gösterimi ve Çoklu Program Sekmeleri ✅ (2026-08-10)

#### Keşif

Görev talimatı `get_athlete_programs(p_athlete_id)` RPC'sinin (`029_program_archive.sql`) zaten
mobil tarafından çağrıldığını ve daraltmanın client tarafında olduğunu varsayıyordu ("Bunu dosya
üzerinden doğrula" talimatıyla). Repo genelinde bu RPC'ye tek bir `.rpc("get_athlete_programs"...)`
çağrısı bulunamadı. Gerçekte iki bağımsız, birbirinden habersiz mantık vardı:
- `apps/mobile/app/(tabs)/program/index.tsx`'in kendi inline `fetchPrograms`'ı — `training_programs`'ı
  doğrudan `.or(athlete/team)` + `.eq(is_published,true)` ile sorgulayıp `.limit(5)` alıyor,
  `is_archived` filtresi YOK, sonuçtaki ilk kaydı (`programs[0]`) tek "aktif program" sayıyordu.
- `getActiveProgramId` (`packages/db/queries/programs.ts`) — `[day].tsx`'in kullandığı ayrı bir
  sorgu, o da `is_archived` farkında değil.

Bu, Parti 12'nin PROGRESS.md'sinin kendi bıraktığı bir takip notuyla birebir örtüşüyor:
*"Mobile'a `get_athlete_programs` filtresi dışında dokunulmadı; `getActiveProgramId` ... aynı
`is_archived` farkındalığından yoksun ama görev kapsamı dışı bırakıldı — takip gerektiriyor."*
Bu parti bu boşluğu kapattı: mobil artık gerçekten `get_athlete_programs`'ı çağırıyor (RPC'nin
kendisine dokunulmadı — talimatın açık kısıtı).

**Kapsam kararı (kullanıcı onayıyla):** Koçun sporcu programını izlediği salt-okunur klon ekranlar
(`apps/mobile/app/(tabs)/my-athletes/[athleteId]/program/*`, Parti 8.D) bu partide bilinçli olarak
dokunulmadan bırakıldı — görev talimatının Görev 4 doğrulama adımları da yalnızca sporcu tarafını
(`(tabs)/program/*`) kapsıyor. Bu ekranlar hâlâ çalışıyor, sadece yeni özellik (sekme/süperset)
almadı.

#### Görev 1 — `discipline` kolonu + RPC'ler + web formları

Migration `030_program_discipline.sql`: `training_programs` alanına `discipline text` eklendi —
`teams.discipline` (`001_schema.sql`) ile birebir aynı desen: nullable, serbest metin, CHECK
constraint yok. `program_blocks`'a bilinçli olarak eklenmedi (blok kendi title/phase/notes'unu
zaten yalnızca oluşturma anında yazıp senkronlamıyor, discipline aynı ayrışmayı izliyor).

`create_program_with_weeks` ve `update_program_week` RPC'lerine `p_discipline text default null`
parametresi eklendi (title/phase/notes ile birebir aynı muamele — oluşturmada bloktaki her hafta
aynı değeri alıyor, düzenlemede yalnızca o hafta güncelleniyor, blok senkronize edilmiyor).
**Postgres detayı (canlıda gerçek bir risk, keşifte bulundu):** parametre SAYISI değişince
`create or replace function` gerçek bir "replace" olmuyor — Postgres fonksiyon kimliğini parametre
tip listesiyle belirliyor, sayı değişince eski imza silinmeden yeni bir overload yaratılıyor. Bu
yüzden migration, yeni imzayı tanımlamadan ÖNCE `drop function if exists create_program_with_weeks(
uuid, uuid, uuid, text, text, text, int, date, jsonb)` / `drop function if exists
update_program_week(uuid, text, text, text, date, date, jsonb)` ile eski (9/7 parametreli) imzaları
açıkça sildi. Canlıda `pg_proc` sorgusuyla her iki fonksiyonun da TEK (yeni, `p_discipline` dahil)
imzayla var olduğu doğrulandı — eski imza kalıntısı yok.

Web'in program oluşturma sihirbazına (`new-program-client.tsx`) ve hafta-düzenleme formuna
(`week-editor-form.tsx`) serbest metin "Branş" alanı eklendi — `<input list="discipline-suggestions">`
+ `<datalist>` ile 4 önerili (Artistik Cimnastik/Kuvvet & Kondisyon/Atletik Performans/Fizyoterapi),
zorunlu değil, altında "Sekmede görünecek, kısa tutun" yardım metni. `packages/ui/components/input.tsx`
zaten `...props`'u native `<input>`'a spread ettiği için `list` prop'u ek bir değişiklik gerektirmeden
forward edildi. **Gen-types nüansı:** `p_discipline`'ın SQL'de `default null` olması, gen-types'ta onu
opsiyonel (`p_discipline?: string`) üretti — `p_phase`/`p_notes`'un (default'suz, nullable ama
required-string üretilen, `new-program-client.tsx`'te belgelenmiş) aksine `as string` cast'ine gerek
kalmadı, sadece `data.discipline?.trim() || undefined` yeterli oldu.

`update_program_week`'in discipline'ı "sıfırlamadığı" doğrulaması: form her zaman `program.discipline`'ı
yükleyip aynı değeri (değiştirilmediyse) geri gönderiyor — `title`/`phase`/`notes` bugün zaten aynı
şekilde çalışıyor, ayrı bir coalesce/koruma mantığı gerekmedi. `insert_sessions_tree`'ye ve
`propagate_week_to_future`/`copy_program_tree`'ye dokunulmadı — ikisi de hedef `training_programs`
satırının kendi kolonlarına (discipline dahil) hiç yazmıyor, yalnızca session/exercise/exercise_sets
ağacını taşıyor.

#### Görev 2 — Mobil: çoklu program sekmeleri

`packages/db/queries/programs.ts`'e üç yeni export: `isDateActive` (bugün `start_date`/`end_date`
aralığında mı), `sortAthletePrograms` (sporcu-kapsamlı programlar takım-kapsamlılardan önce,
eşitlikte `start_date` yenisi önce), `getProgramSessionsSummary` (bir programın haftalık grid için
hafif seans özeti — tam ağaç çeken `getDaySessions`'tan farklı). `get_athlete_programs` RPC çağrısı
BİLEREK bu dosyaya sarmalanmadı — repo genelinde `.rpc()` hiçbir zaman `packages/db/queries` içinde
çağrılmıyor (her zaman UI bileşeninde, tam tipli client üzerinden), `DbClient` tipi de zaten `rpc`
metodunu tanımlamıyor; bu yüzden çağrı `program/index.tsx`'te doğrudan `supabase.rpc(...)` olarak
kaldı (mevcut konvansiyonla tutarlı, gerçek tip kontrolü korunuyor).

Yeni `apps/mobile/components/ProgramTabStrip.tsx` — yatay kaydırılabilir sekme şeridi (dumb
component, `tabs.length > 1` kontrolü çağıranda). `apps/mobile/app/(tabs)/program/index.tsx`
yeniden yapılandırıldı: `programs[0]`'ı "aktif program" sayan eski mantık kaldırıldı, yerine
`get_athlete_programs` RPC'sinden gelen listeyi bugün-tarih-aktif olacak şekilde filtreleyip
(`isDateActive`) sıralayan (`sortAthletePrograms`) bir `activePrograms` + `activeTabIndex` state'i
geldi. Sekme etiketi `discipline?.trim() || title`. Gün satırına dokununca artık `programId`
route param olarak da taşınıyor (`router.push({ pathname: "/(tabs)/program/[day]", params: { day,
programId }})`) — `[day].tsx` artık `getActiveProgramId` ile programı YENİDEN çözmek yerine bu
param'ı doğrudan kullanıyor (`getActiveProgramId` SİLİNMEDİ, koç-klonu `[day].tsx`'in hâlâ canlı
bir çağıranı var). Seçili sekme kalıcı saklanmıyor — mobil uygulamada zaten hiçbir yerde
AsyncStorage/persist kullanılmadığı için (grep ile doğrulandı) bu, mevcut idiomla (`useState`)
tutarlı; uygulama yeniden açılınca ilk sekmeye döner.

#### Görev 3 — Mobil: süperset gruplaması

Yeni `apps/mobile/lib/supersetGroups.ts` (`groupExercisesForRender`) — bir seansın (zaten
`order_index`'e göre sıralı) egzersiz listesini `superset_group`'a göre gruplar, grup içinde
`superset_order`'a göre sıralar. `superset_group === null` olanlar asla gruplanmaz (her biri kendi
başına tekil birim); 2'den az üyeli "gruplar" da tekil render edilir. Birim sırası grubun en küçük
`order_index`'ine göre belirlenir — seansın genel egzersiz sırası bozulmaz. Yeni
`apps/mobile/components/SupersetGroup.tsx` — çerçeve + "X Grubu — Süperset (n egzersiz)" başlık
etiketi (web'in `exercise-list.tsx:199`'daki terminolojisiyle tutarlı) + kartlar arası küçük bir
bağlayıcı rozeti. `ExerciseCard.tsx`'e HİÇ dokunulmadı — yalnızca `[day].tsx`'in egzersiz render
döngüsü, gruplanmış birimleri (`single`/`group`) `ExerciseCard`/`SupersetGroup` olarak dağıtacak
şekilde değişti. Set/tamamlama etkileşimleri egzersiz bazında kaldı.

#### Doğrulama

`pnpm --filter web exec tsc --noEmit` + `pnpm --filter @athleteiq/db exec tsc --noEmit` +
`pnpm --filter web build` (26 sayfa, mevcut uyarılar dışında temiz) + mobilde `npx tsc --noEmit`
+ `pnpm --filter @athleteiq/mobile lint` (`expo lint`, 0 hata) hepsi temiz. `get_advisors`
(security + performance) migration sonrası yeni ERROR üretmedi; mevcut `SECURITY DEFINER` WARN
kategorisi (tüm `security definer` fonksiyonlar için) migration öncesinde de vardı, bu partiyle
ilgisiz.

RPC davranışı Supabase Cloud'da (`nlmwcygmbbxmfpsubvmh`) gerçek veriye dokunmadan, izole bir test
programıyla (`create_program_with_weeks` ile oluşturulup sonra silinen) doğrulandı: (1)
`p_discipline` ile oluşturma → satırda doğru değer; (2) `update_program_week` ile discipline'ı
değiştirme → doğru güncellendi; (3) yalnızca `notes`'u değiştirip discipline'ı (formun her zaman
yaptığı gibi) aynı değerle yeniden gönderme → discipline DEĞİŞMEDEN kaldı (round-trip koruması,
ayrı bir coalesce mantığına gerek olmadığını doğruladı); test programı silindi, `leftover=0`.

Gerçek İbrahim Çolak / Mehmet Ayberk Koşak verisiyle `get_athlete_programs` doğrudan çağrılarak
doğrulandı: test kurulumu olarak "aaaaaaaaaaa" takım programına "Artistik Cimnastik", "Müsabaka"
1. haftaya "Kuvvet & Kondisyon" atandı ve 1. hafta geçici olarak yayınlandı (görev talimatının
Görev 4 adım 1'i). İbrahim için RPC 3 yayınlanmış+arşivlenmemiş program döndürdü, bunlardan
`isDateActive` ile Haziran'daki "Hipertrofi" (tarih aralığı bugünü kapsamıyor) elendi, kalan
2'si (`sortAthletePrograms` ile) sporcu-kapsamlı "Müsabaka" önce, takım-kapsamlı "aaaaaaaaaaa"
sonra sıralandı — beklenen sekme sırasıyla birebir eşleşti. Mehmet Ayberk için aynı RPC 2 program
döndürdü, tarih filtresinden sonra yalnızca "aaaaaaaaaaa" kaldı (tek program → sekme şeridi
render edilmeyecek regresyon senaryosu doğrulandı). Test sonunda "Müsabaka" 1. haftanın yayın
durumu geri alındı (`is_published=false`); discipline atamaları (test kurulumunun asıl amacı,
kalıcı bırakılması görev talimatınca beklenen) korundu. Orijinal 12 program/3 yarışma/3
sporcu/5 auth hesabı sayıca dokunulmadan kaldı, SQL ile doğrulandı.

`git diff` ile `apps/mobile/app/(tabs)/my-athletes/[athleteId]/program/index.tsx` ve `[day].tsx`'te
sıfır değişiklik olduğu doğrulandı (kapsam dışı bırakma kararının gerçekten uygulandığının kanıtı).

**Bu ortamda yapılamayan:** fiziksel mobil cihaz veya headless tarayıcı erişimi yok — sekme
geçişinin/süperset çerçevesinin gerçek görsel doğrulaması (Görev 4'ün 2-4/6/11-13. adımları)
yapılamadı. Kod/tip/SQL doğrulaması geçti; görsel UI doğrulaması kullanıcı tarafından fiziksel
cihazda yapılmalı.

---

### Parti 12 — Tonaj Hesabı, Program Silme/Arşivleme, Yarışma Düzenleme ✅ (2026-08-10)

**Görev 1 — Tonaj hesabını tamamla.** `apps/web/lib/tonnage.ts` yeniden tasarlandı:
`TonnageSummary` artık `{ totalKg, totalSetCount, resolvedSetCount, unresolved: {reason,
exerciseName}[] }` taşıyor. `calculateSetTonnage` bir `TonnageContext` (`maxLookup`,
`athleteWeightKg`, `hasAthleteContext`) alıyor ve önceliği spesifikasyondaki sırayla
uyguluyor: `reps == null` → hesaba katma; `load_kg` → doğrudan; `is_bodyweight` →
`athleteWeightKg` (takım programında/`weight_kg` boşken sebep kodlu unresolved); `percent_1rm`
→ `resolveOneRepMaxKg` (1RM kaydı yoksa unresolved); `band_resistance` → her zaman unresolved.
Yeni `summarizeUnresolved()` sebep bazında gruplayıp benzersiz egzersiz adlarını döndürüyor —
UI'da "4 set hesaplanamadı → 1RM kaydı yok (Back Squat, Bench Press)" formatında gösteriliyor.
`apps/web/app/(dashboard)/programs/[id]/page.tsx` artık `athletes.weight_kg`'ı da çekiyor;
`program-detail-client.tsx` hem program hem seans seviyesinde "Tonaj hesaplanamıyor" fallback'ini
(`totalSetCount > 0 && resolvedSetCount === 0`) ve sebep dökümünü gösteriyor.
**Not düşülen takip:** tonaj sayılarının anlamlı olması için `athlete_1rm_records` tablosuna
gerçek veri girilmesi gerekiyor (şu an 0 satır).

**Görev 2 — Program silme ve arşivleme.** Migration `029_program_archive.sql`:
`training_programs.is_archived boolean not null default false` + `idx_training_programs_active`
partial index + `get_athlete_programs`'a `and is_archived = false` eklendi. `packages/db/types.ts`
aynı commit'te regenerate edildi (Supabase MCP `generate_typescript_types`, local Docker
stack çalışmadığı için CLI yerine cloud'a doğrudan `apply_migration` ile push edildi).
`packages/db/queries/programs.ts`'e üç fonksiyon: `setProgramsArchived(ids, isArchived)`,
`deletePrograms(ids)`, `deleteProgramBlock(blockId)` (yetim kalan `program_blocks` satırını
temizler — hiçbir FK bunu otomatik yapmıyor). `program-detail-client.tsx`'e "Sil" butonu:
`block_id` doluysa `getProgramsByBlockId` ile TÜM haftaları çekip hedef kapsamını genişletiyor,
`willDelete = target.every(p => !p.is_published)` — tek bir hafta bile yayındaysa tüm blok
arşivleniyor (karma işlem yok). Onay diyaloğu için mevcut `AthleteDataWarningDialog`
(Parti 11'den, zaten `affectedWeeks`/`isBusy`/`error` destekliyor) yeniden kullanıldı, yeni
bir dialog bileşeni yazılmadı. `programs-client.tsx`'e "Arşivi göster" toggle'ı, arşivlenmiş
kartlarda "Arşivlendi" rozeti ve tek satırlık (blok kapsamına genişletilmeyen, kasıtlı basit)
"Arşivden çıkar" aksiyonu eklendi; athlete dalı `is_published && !is_archived` ile
daraltıldı (istemci tarafı UX filtresi — RLS `is_archived`'dan habersiz bırakıldı, yeni
politika yazılmadı, talimatın kapsamı buydu). ACWR (`acwr_logs`) `training_programs`'a hiç
bağlı değil — dokunulmadı. Mobile'a `get_athlete_programs` filtresi dışında dokunulmadı;
`getActiveProgramId` (yalnızca mobile ekranlarından çağrılıyor) aynı `is_archived`
farkındalığından yoksun ama görev kapsamı dışı bırakıldı — takip gerektiriyor.

**Görev 3 — Yarışma düzenleme.** `packages/db/queries/competitions.ts`'e `updateCompetition`
(competitions'ta `updated_at` kolonu YOK — `updateProgram`'daki otomatik spread burada
uygulanmadı) ve `deleteCompetition` eklendi. `competitions-client.tsx`'teki mevcut inline
"yarışma ekle" formu `editTarget` state'iyle create/edit iki modu da kullanacak şekilde
genişletildi (ayrı form yazılmadı) — düzenle tıklanınca `reset(editTarget değerleri)` ile
dolduruluyor. Her karta kalem/çöp ikonu eklendi, silme mevcut `DeleteConfirmDialog`
(`components/features/exercises/`) ile, açıklamada `competition_results.length` sayısı
gösteriliyor (zaten eager-load edilmiş veri, ek sorgu yok). `competitions_write` RLS zaten
`ALL` — yeni politika yazılmadı.

**Doğrulama (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh`, Supabase MCP ile):**
- `pnpm --filter web exec tsc --noEmit`, `pnpm --filter @athleteiq/db exec tsc --noEmit`,
  `pnpm --filter web build` — üçü de temiz (build'deki uyarılar hepsi bu partiden önce
  vardı, ilgisiz).
- Tonaj mantığı: geçici `apps/web/lib/tonnage.verify.test.ts` (Vitest, 6 test) — öncelik
  sırası (load_kg > is_bodyweight > percent_1rm > band_resistance), sebep kodlama
  (`no_1rm_record`/`unknown_bodyweight`/`no_athlete_context`/`band_resistance`), takım
  programında hem bodyweight hem %1RM'in `no_athlete_context`'e düşmesi, ve
  `summarizeUnresolved`'ın gruplama/dedupe davranışı doğrulandı — 6/6 geçti, dosya silindi
  (kalıcı test paketine eklenmesi görev kapsamında istenmedi).
- DB davranışı gerçek SQL ile: (1) yayınlanmamış test programı (session+exercise+exercise_set
  ile) silindi → 0 yetim kayıt (training_sessions/exercises/exercise_sets); (2) 2 haftalık
  test bloğu oluşturulup her iki hafta da silindi, ardından `program_blocks` satırı da
  silindi → 0 yetim hafta, 0 yetim blok; (3) yayında bir test programı arşivlendi →
  `get_athlete_programs()` çağrısı artık onu döndürmüyor (arşivleme öncesi döndürüyordu);
  (4) test yarışması oluşturuldu, güncellendi, `competition_results` ile birlikte silindi →
  0 yetim sonuç kaydı. Tüm test kayıtları (`PARTI12_TEST_*` başlıklı) temizlendi ve SQL ile
  0 kaldığı doğrulandı — orijinal 12 program/3 yarışma/3 sporcu dokunulmadan kaldı (canlı
  sayım 12 çıktı, CLAUDE.md §11'deki "9 program" notu bu partiden önce zaten bayattı — iki
  block'un toplam 6 haftası + 6 bağımsız program = 12; ayrı bir düzeltme gerektirmiyor,
  gözlem olarak not düşüldü).

---

### Parti 11 — Çok haftalı program düzenleme arayüzü ✅ (2026-08-10)

**Not numaralandırma hakkında:** görev talimatı bu işi "Parti 10" olarak adlandırıyordu, ama
o numara PROGRESS.md'de zaten "Sporcu Giriş Erişimi Yönetimi"ne verilmişti (yukarıdaki bölüm,
aynı gün daha önce kapandı) — çakışmayı önlemek için bu iş **Parti 11** olarak kaydedildi.

**Kapsam:** Saf UI işi — migration yok, yeni RPC yok, RLS değişikliği yok. Coach'un
`create_program_with_weeks` ile oluşturulmuş çok haftalı bir bloktaki (`program_blocks` +
`training_programs.block_id`/`week_index_in_block`) her haftayı ayrı ayrı açıp kapatmak yerine
tek ekranda sekmelerle gezip düzenleyebilmesi, sekme değiştirirken otomatik kaydetme, sporcu
verisi (RPE/not/tamamlanma) kaybı riskine karşı onay diyaloğu, ve blok-geneli toplu yayınlama.

#### Keşif — talimatın varsaymadığı mevcut durum

Talimat "hafta sekmeleri + autosave + propagate + blok yayınlama, hepsi sıfırdan" diye geldi.
Gerçek kod tabanı incelemesinde şu zaten TAMAMEN kuruluydu (Parti 3.D/3.E/3.F):
- `programs/[id]/edit/edit-program-client.tsx` — 3 adımlı wizard, `update_program_week` RPC'sini
  çağırıyor, kendi "Sonraki Haftalara Uygula" butonu + onay penceresi zaten vardı.
- `apps/web/lib/program-rpc.ts` — `buildSessionsPayload` (form state → RPC'nin beklediği JSONB
  ağacı) ve `mapRpcError` zaten doğru sözleşmeyle çalışıyordu.
- `packages/db/types.ts` — `program_blocks`, `block_id`, `week_index_in_block` ve üç RPC'nin
  tipleri zaten güncel.

Eksik olan yalnızca: (1) birden fazla haftayı AYNI ekranda gösterip aralarında gezinme, (2)
sekme geçişinde otomatik kaydetme, (3) sporcu-verisi-kaybı koruması (mevcut propagate onayı
yalnızca "kaydedilmemiş değişiklik" uyarısı veriyordu, sporcu verisi kaybı uyarısı YOKTU), (4)
blok-geneli yayınlama butonu.

#### Değişiklikler

- **`packages/db/queries/programs.ts`** — 3 yeni fonksiyon: `getProgramsByBlockId` (bir bloktaki
  tüm haftaları `week_index_in_block` sırasına göre, tam ağaçlarıyla — `training_sessions(*,
  exercises(*, exercise_sets(*)))` — çeker); `getProgramIdsWithAthleteData` (görevin verdiği ham
  SQL — `training_sessions LEFT JOIN exercises WHERE session_rpe IS NOT NULL OR ... `— PostgREST
  ile birebir ifade edilemiyor, bunun yerine nested select + JS'te filtre); `setBlockPublished`
  (`update training_programs set is_published=:v where block_id=:id`, `publishProgram`'ın
  deseniyle birebir aynı).
- **`apps/web/components/features/program-builder/week-editor-form.tsx`** (yeni) — eski
  `EditProgramClient`'ın gövdesi (3 adımlı form, `programSchema`, submit/propagate mantığı)
  buraya taşındı, `forwardRef`+`useImperativeHandle` ile `isDirty()`/`checkAthleteData()`/
  `save(opts?: {force})`/`discardChanges()` dışa açıldı. Manuel "Değişiklikleri Kaydet" butonu
  ve "Sonraki Haftalara Uygula" akışı da AYNI guard'lı `save`/athlete-data-kontrolü çekirdeğinden
  geçiyor artık (tek kaynak, iki tetikleyici).
- **`apps/web/app/(dashboard)/programs/[id]/edit/edit-program-client.tsx`** (yeniden yazıldı) —
  artık ince bir orkestratör: `activeId`/`dirtyIds` state'i tutuyor, `WeekTabs`'ı yalnızca
  `blockWeeks.length > 1` iken render ediyor (tek haftalık programlarda sekme şeridi hiç
  görünmüyor — regresyon korunuyor), sekme geçişini `requestSwitch`→(dirty değilse anında switch;
  dirty ise `checkAthleteData`→gerekirse onay diyaloğu→`save`) akışıyla yönetiyor, `beforeunload`
  guard'ı ekliyor (bu repoda ilk kez — önceden hiç yoktu).
- **`apps/web/app/(dashboard)/programs/[id]/edit/page.tsx`** — `program.block_id` varsa
  `getProgramsByBlockId` ile TÜM bloğu (tam ağaçlarıyla) eager-fetch edip `blockWeeks` prop'u
  olarak geçiyor; yoksa tek elemanlı `[program]` (davranış değişmiyor).
- **`apps/web/components/ui/tabs.tsx`** (yeni) — standart shadcn Tabs sarmalayıcısı,
  `@radix-ui/react-tabs` ZATEN `apps/web/package.json`'da bağımlılıktı (yeni paket kurulmadı),
  yalnızca eksik olan wrapper component'i eklendi (`dialog.tsx` ile aynı desen).
- **`apps/web/components/features/program-builder/week-tabs.tsx`** (yeni) — controlled `Tabs`
  (`value`/`onValueChange`), her sekmede "Hafta {week_index_in_block}", tarih aralığı, yayın
  rozeti, dirty-dot. `value` yalnızca ebeveyn onaylayınca değiştiği için sekme geçişi doğal
  olarak "kilitli" kalıyor (kaydetme/onay sürerken).
- **`apps/web/components/features/program-builder/athlete-data-warning-dialog.tsx`** (yeni) —
  hem sekme-geçişi hem propagate guard'ı için ortak, el-yapımı overlay (bu repoda Radix
  AlertDialog yok, mevcut `delete-confirm-dialog.tsx`/eski propagate modalıyla aynı desen).
- **`apps/web/app/(dashboard)/programs/[id]/program-detail-client.tsx`** — "Tüm bloğu yayınla"
  butonu buraya eklendi (edit ekranına DEĞİL — görev talimatı "program başlığının yanına"
  diyordu, ama `program.title` bir başlık olarak yalnızca bu sayfada gösteriliyor; edit ekranında
  düzenlenebilir form alanı olarak var, statik başlık değil). Mevcut tek-hafta `handlePublish`'e
  dokunulmadı. Sibling haftaların `is_published` sayısını hafif bir client-side sorgu ile çekiyor
  (mevcut `futureWeeks` desenine benzer, ağır `getProgramsByBlockId`'yi kullanmıyor).

#### Bulunan ve düzeltilen gerçek bug (yalnızca canlı tarayıcı testinde yakalandı)

İlk implementasyonda, sekme-geçişi autosave'i **her zaman doğru kaydediyordu** (SQL ile
doğrulandı) ama kaydedilen haftanın dirty-dot'u hiç temizlenmiyordu. Kök neden: `WeekEditorForm`
`reset(data, {keepValues:true})` çağırıp `formState.isDirty`'yi false yapıyor, bu da kendi
`useEffect`'i üzerinden `onDirtyChange(id, false)`'u tetikliyor — AMA orkestratör aynı tick'te
`setActiveId(nextId)`'yi de çağırdığı için, `key` değişimi eski `WeekEditorForm` instance'ını
React'in pending re-render'ı flush etmesine FIRSAT VERMEDEN unmount ediyordu (React, key
değişince eski ağacı reconcile etmez, direkt atar). Düzeltme: orkestratör dirty temizliğini
child'ın effect'ine güvenmek yerine `commitSwitch` ve `handleSwitchDialogCancel` içinde
EXPLICIT yapıyor. **Bu sınıf bug statik analiz/tip kontrolüyle YAKALANAMAZ** — yalnızca gerçek
bir sekme geçişi gerçek bir tarayıcıda çalıştırılınca ortaya çıktı.

#### Doğrulama ortamı notu — headless Chromium + Supabase login

Bu sandbox'ta Playwright'ın headless Chromium'u, `@supabase/ssr`'ın browser client'ının
`signInWithPassword` çağrısında "Failed to fetch" veriyor — kök neden muhtemelen
`credentials`+CORS header kombinasyonu (elle `credentials:'include'` eklenen bir fetch AYNI
hatayı yeniden üretiyor), ama bu **bu partinin kodundan tamamen bağımsız** bir sandbox/headless-
tarayıcı kısıtı (Node'un kendi `fetch`'i ve gerçek PostgREST erişimi sorunsuz çalışıyor). Login
UI'ını atlamak için: Node'da gerçek access/refresh token alınıp `@supabase/ssr`'ın cookie
formatına (`sb-<project-ref>-auth-token`, `base64-` + base64url) elle kodlanıp
`context.addCookies()` ile enjekte edildi; bundan sonrası (middleware, RLS, RPC çağrıları, sayfa
render'ı) tamamen gerçek uygulama koduyla, gerçek Supabase Cloud'a karşı çalıştı. Bu notun
amacı: bu repoda ileride Playwright/headless tarayıcı tabanlı bir E2E kurulacaksa (BUGS.md/
CLAUDE.md §11'de hâlâ "⏳ E2E Playwright testleri" olarak bekliyor), gerçek login formunu
otomatikleştirmeye çalışmadan önce bu kısıtı bilmek zaman kaybettirmeyecek.

**DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek admin JWT'siyle, mevcut
"Yarışma Dönemi" 3 haftalık bloğu — Hafta 33/34/35 — üzerinde):**
1. Edit ekranı açıldığında 3 sekme doğru render oldu (tarih aralıkları, Hafta 33 için "Yayında"
   rozeti, 34/35 için "Taslak").
2. Dirty olmayan bir sekmeye geçiş anında oldu, dialog/gecikme yok.
3. Hafta 2'de başlık değiştirilip Hafta 3'e geçildi → SQL ile doğrulandı: yalnızca Hafta 2'nin
   `title`/`updated_at`'i değişti, Hafta 1 ve 3 bit-bit aynı kaldı.
4. Süperset içeren bir haftada (`Bench Press`+`Ab Wheel Rollout` = grup A, `Back Squat`+
   `B-Stance Hip Thrust` = grup A) sekme-geçişi autosave'i tetiklendi → `superset_group`/
   `superset_order` tam delete+reinsert döngüsünden değişmeden çıktı (SQL ile doğrulandı — bu
   sözleşmenin en kolay kırılacağı yerdi, kırılmadı).
5. "Tüm bloğu yayınla" → 3/3 hafta `is_published=true` oldu, buton "Tüm bloğu yayından kaldır"a
   döndü; tekrar tıklanınca 3/3 tekrar `false` oldu.
6. Bir haftanın `session_rpe`'i SQL ile elle 7'ye dolduruldu → o haftayı düzenleyip başka sekmeye
   geçmeye çalışınca uyarı diyaloğu çıktı. İptal: başlık değişikliği DB'ye hiç yazılmadı (SQL ile
   doğrulandı), sekme yine de geçti (veri kaybı riski yok, ama edit de kaybolmadı — dialog
   göründüğü an autosave henüz olmamıştı). Devam Et: başlık değişikliği kaydedildi VE
   `session_rpe` uyarıda söylendiği gibi `null`'a döndü (SQL ile doğrulandı — uyarı metninin
   doğruluğunun da kanıtı).
7. Tek haftalık (`block_id IS NULL`) bir program açıldı: sekme şeridi hiç render olmadı, notlar
   alanı değiştirilip manuel "Değişiklikleri Kaydet" ile kaydedildi, kayıt sonrası eski
   `/programs/{id}` yönlendirme davranışı korundu (regresyon yok).

Tüm test verisi (geçici başlık/not değerleri, `session_rpe` test değeri, yayın durumu) orijinal
haline geri döndürüldü. `pnpm --filter web type-check` + `pnpm --filter @athleteiq/db type-check`
+ `pnpm --filter web lint` temiz (yalnızca bu partiden önce de var olan, ilgisiz uyarılar).

**Ek doğrulama — Görev 5 madde 1 (sıfırdan create akışı, ayrı bir turda kapatıldı):** Yukarıdaki
1-7 testleri mevcut "Yarışma Dönemi" bloğu üzerindeydi; `create_program_with_weeks`'in kendisi
(wizard → RPC → çoklu `training_programs` satırı) hiç egzersiz edilmemişti. Gerçek "Yeni Program
Oluştur" formuyla, süperset içeren (Back Squat + Ab Wheel Rollout, Grup A) 4 haftalık bir test
bloğu oluşturuldu: 4 `training_programs` satırı, `start_date` 7'şer gün kayıyor
(10.08→17.08→24.08→31.08), her hafta eşit set sayısı (4) — SQL ile doğrulandı. Ardından Hafta
2/3/4'te Back Squat'ın ilk setinin `%1RM`'i sırasıyla 75/80/85 yapılıp sekme değiştirilerek
(autosave) kaydedildi; SQL sorgusu her haftanın YALNIZCA kendi ilk setinin değiştiğini, diğer
setlerin (70) ve süperset atamasının (Grup A, sıra 1/2) dört haftada da korunduğunu doğruladı —
create → edit → autosave zincirinin uçtan uca, sıfırdan üretilmiş veriyle de sağlam olduğunun
kanıtı. Test bloğu doğrulama sonrası silindi (`training_programs` + `program_blocks`,
`block_id=3f17ba17-...`).

#### Bilinçli olarak yapılmayanlar / kapsam dışı bırakılanlar

- RPC'lerin içine dokunulmadı (yalnızca çağrıldı).
- Tek haftalık program akışı DEĞİŞMEDİ (yukarıdaki 7. madde regresyon testiyle doğrulandı).
- Blok seviyesinde tek seferlik kayıt (B modeli) kurulmadı — haftalık autosave (A modeli)
  bilinçli tercih, görev talimatının kendisi de bunu istiyordu.
- Otomatik yüzde progresyonu aracı eklenmedi (ayrı bir iş olarak bırakıldı).
- `packages/validators/program.ts` (dead code, gerçek RPC sözleşmesiyle uyumsuz — bkz. BUGS.md
  yeni madde) bilinçli olarak DOKUNULMADI, kapsam dışı.

### Parti 10 — Sporcu Giriş Erişimi Yönetimi ✅ (2026-08-10)

**Kapsam:** Girişsiz eklenen (`create_login` kapalıyken, roster-only) sporculara sonradan giriş
erişimi verme ve mevcut girişli sporcuların şifresini sıfırlama. Migration yok (görev talimatı
zaten "bu partide migration yok" diyordu). Dokunulan/eklenen dosyalar: `supabase/functions/
grant-athlete-access/index.ts` (yeni), `supabase/functions/reset-athlete-password/index.ts`
(yeni), `apps/web/app/api/athletes/grant-login/route.ts` (yeni), `apps/web/app/api/athletes/
reset-password/route.ts` (yeni), `apps/web/components/features/athletes/grant-access-modal.tsx`
(yeni), `apps/web/components/features/athletes/reset-password-modal.tsx` (yeni), `apps/web/app/
(dashboard)/athletes/athletes-client.tsx`, `packages/validators/athlete.ts`, `packages/
validators/athlete.test.ts` (yeni), `packages/validators/package.json`.

**0. Keşif (talimatın varsaydığından farklı çıktı):** İki paralel Explore agent'ıyla mevcut
sporcu-ekleme akışı ve `create-athlete-account` Edge Function'ı okundu. Beklenenin aksine,
"girişle sporcu ekleme" yolu (`add-athlete-modal.tsx`'teki `create_login` checkbox'ı →
`submitWithLogin` → `/api/athletes/create-account` proxy'si → `create-athlete-account` Edge
Function'ı, Parti 4.B/4.C'de kurulmuş) zaten uçtan uca TAMAMDI — ama org'da `athlete` rolünde
tek bir membership olmaması, bu fonksiyonun bugüne dek canlı Supabase Cloud'a karşı hiç
çağrılmadığını gösteriyordu (görev talimatındaki not doğrulandı). `packages/validators/
athlete.ts`'te `ATHLETE_USERNAME_RE` zaten vardı (Edge Function'daki `USERNAME_RE` ile elle
senkron tutulan bir yorum eşliğinde); Türkçe transliterasyon/slug helper'ı ve rastgele şifre
üretici repoda hiç yoktu. `apps/web`'de `supabase.functions.invoke` hiç kullanılmıyor — her
Edge Function için elle yazılmış bir Next.js proxy route (`createClient()`→`getUser()` guard→
`getSession()`→`fetch(.../functions/v1/<fn>)`) konvansiyonu var (`apps/web/app/api/auth/
invite/route.ts` kanonik örnek), `_shared/` bir Edge Function yardımcı modülü YOK (`create-
athlete-account`/`invite-member` JWT-doğrulama bloğunu birbirinden bağımsız kopyalamış).
`athletes-client.tsx` Server Component + `router.refresh()` kullanıyor, TanStack Query
(package.json'da var ama hiç kullanılmayan bir bağımlılık, CLAUDE.md'nin iddiasıyla tutarlı)
DEĞİL.

**Tasarım kararları (keşfe dayalı):**
- Yeni 2 Edge Function, mevcut `_shared/` yokluğu konvansiyonuna uyularak JWT-doğrulama +
  yetki bloğunu KENDİ İÇİNDE tekrarlıyor — yeni bir soyutlama icat edilmedi (görev talimatı
  zaten "aynısını kullan, yeni kural icat etme" diyordu).
- `suggestUsername`/`generateTempPassword`, zaten `ATHLETE_USERNAME_RE`'yi barındıran
  `packages/validators/athlete.ts`'e eklendi (yeni modül açmaya gerek kalmadı). Türkçe map
  (`İ/I/ı→i`, `Ç/ç→c`, `Ğ/ğ→g`, `Ö/ö→o`, `Ş/ş→s`, `Ü/ü→u`) case-sensitive olarak
  `toLowerCase()`'DEN ÖNCE uygulanıyor (aksi halde `"İ".toLowerCase()` beklenmedik sonuç verir).
  `generateTempPassword` `crypto.getRandomValues` kullanıyor (tarayıcı + Node 20+'ta global,
  ek bağımlılık yok), karıştırılabilir karakterleri (`0 O o 1 l I`) hariç tutuyor.
- 2 yeni proxy route, mevcut `create-account/route.ts`'nin birebir kopyası (aynı desen: session
  guard → body'yi olduğu gibi forward et, Edge Function'ın kendi validasyonuna güven).
- Web UI'da "TanStack Query invalidate et" talimatı, projenin gerçek konvansiyonuna
  (`router.refresh()`) çevrildi.

**Görev 5 — DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek Auth REST + gerçek
admin JWT'siyle, curl/Node — bu oturumda fiziksel Expo cihazı/emülatör mevcut değildi, "mobilde
giriş yap" adımı `supabase.auth.signInWithPassword`'ün birebir sunucu eşdeğeri olan Auth REST
`token?grant_type=password` çağrısıyla test edildi, bu açıkça not düşülüyor):**
1. Girişsiz test sporcusu (`PW10-TEST Sporcu`, admin JWT'siyle gerçek `athletes` insert'i,
   `submitRosterOnly`'nin yaptığının aynısı) eklendi → `user_id`/`username` **NULL** doğrulandı.
2. `grant-athlete-access` çağrıldı (`username:"pw10.test"`) → **200**; SQL ile `auth.users`
   (email `pw10.test@athleteiq.app`, confirmed), `athletes.user_id`/`username`, `memberships`
   (`role:"athlete"`, `invited_by`=admin) üçünün de doğru oluştuğu tek sorguyla doğrulandı.
3. Auth REST `token?grant_type=password` ile `pw10.test@athleteiq.app`/şifre → **200**,
   `access_token` döndü, `user.id` beklenen id ile eşleşti.
4. `reset-athlete-password` çağrıldı → **200**; yeni şifreyle login **200**, ESKİ şifreyle
   login **400 invalid_credentials**.
5. Aynı username (`pw10.test`) ikinci bir girişsiz sporcuya (`Mert Efe Kılıçer`) denendi →
   **409** `"Bu kullanıcı adı alınmış"`; SQL ile ikinci sporcunun `user_id`/`username`'inin hâlâ
   NULL olduğu VE orphan bir `auth.users` satırı oluşmadığı doğrulandı (ilk `createUser` çağrısı
   hiç tetiklenmemiş — `ilike` ön kontrolü çalışıyor).
6. `parti8f-temp-coach@athleteiq.app` regresyonu — gerçek şifresi bilinmediğinden (ve "BUNA
   DOKUNMA" talimatı gereği sıfırlanmadığından) canlı login yerine RLS simülasyonu kullanıldı
   (`begin; set local role authenticated; set local request.jwt.claims='{"sub":"<coach_uid>"}';
   select ... from athletes; commit;`) — coach hâlâ yalnızca kendi takımının (ACE) 4 sporcusunu
   görüyor (yeni granted test sporcusu dahil, doğru şekilde), başka takımdan sızma yok.
Test sporcusu + granted auth user + membership doğrulama sonrası silindi, `leftover=0`
(3 ayrı sorgu: `auth.users`/`athletes`/`memberships`) doğrulandı.

**Canlıda yakalanan bir üretim veri bütünlüğü hatası (Görev 6 sırasında, anında düzeltildi):**
İbrahim'i `create-athlete-account` ile yeniden oluştururken ilk `curl` denemesinde `full_name`
alanı ("İBRAHİM ÇOLAK") doğrudan bash komut metnine yazılmıştı — Windows konsolunun kod
sayfası Türkçe karakterleri curl'e ulaşmadan `U+FFFD` (replacement character) bozdu; DB'ye
`"�BRAH�M �OLAK"` olarak yazıldığı `encode(full_name::bytea,'hex')` (`efbfbd...` tekrarı) ile
teşhis edildi. O satır + oluşan auth kullanıcısı hemen silinip, payload bu kez Node'da
`"İBRAHİM ÇOLAK"` Unicode escape'lerinden üretilip bir UTF-8 dosyaya yazılarak
`curl --data-binary @dosya` ile gönderildi — `hex_bytes` `c4b0...c387...` (doğru UTF-8 İ/Ç)
ile doğrulandı. Ders: bu ortamda Türkçe/non-ASCII içerikli payload'lar shell komut metnine
gömülmemeli, Node'da (veya dosyadan) UTF-8 olarak üretilmeli.

**Görev 6 — İbrahim'in yeniden oluşturulması (kullanıcı onayıyla):** Silmeden önce
`athlete_id` FK'lı 12 tablo tek tek sorgulandı (hepsi migration dosyalarında `on delete cascade`
olarak doğrulandı): `athlete_1rm_records`(3), `training_programs`(2, → `training_sessions`(4) →
`exercises`(6) → `exercise_sets`(14)), `test_results`(3), `acwr_logs`(1), `program_blocks`(1),
diğer 7 tablo(0). Toplam 34 satır + `athletes` satırının kendisi + eski
`tosunbeytullah9+ibrahim@gmail.com` auth kullanıcısının silineceği raporlandı,
**AskUserQuestion ile onay istendi**, kullanıcı "Evet, sil ve yeniden oluştur"u seçti. Silme
sonrası cascade `leftover=0` (7 ayrı sayaç) doğrulandı. `create-athlete-account` ÜZERİNDEN
(**bu fonksiyonun ilk gerçek/başarılı çağrısı**) `ibrahim.colak` kullanıcı adı + yeni şifreyle
yeniden oluşturuldu; `full_name` byte-seviyesinde doğru UTF-8, `memberships` (`role:"athlete"`)
doğru oluştu, Auth REST login **200** ile doğrulandı.

**Kod doğrulaması:** `pnpm --filter web build` → 26 sayfa (yeni `/api/athletes/grant-login` +
`/api/athletes/reset-password` route'ları dahil), 0 yeni hata/uyarı. `pnpm turbo run
type-check` → 5/5 paket temiz. `pnpm --filter @athleteiq/validators test` → 7/7 yeşil
(`suggestUsername` Türkçe-karakter/çok-kelimeli/tek-harf vakaları + `ATHLETE_USERNAME_RE`
uyumu, `generateTempPassword` uzunluk/yasak-karakter kontrolleri).

**Yapılmayanlar (talimat gereği):** `create-athlete-account`'ın mantığına dokunulmadı (yalnızca
referans alınıp çağrıldı). `parti8f-temp-coach*` hesapları değiştirilmedi. Girişsiz sporcu
ekleme yolu (`submitRosterOnly`) kaldırılmadı. Yeni RLS politikası/migration yazılmadı. Mobil
rol çözümleme mantığına dokunulmadı. Yeni bir `_shared/` Edge Function soyutlaması icat
edilmedi.

### Parti 7 — Mobil: set-bazlı egzersiz görüntüleme, exercise_sets join'i ✅ (2026-08-08)

**Kapsam:** Mobil `ExerciseCard.tsx`'in Parti 2.2.D'den beri açık olan deprecated-kolon bug'ını kapatmak (BUGS.md § Orta) — `exercise_sets` tablosunu program sorgularına join etmek, set-bazlı reps/yük/RPE render etmek, %1RM'den mutlak kg çözümlemesini paylaşılan bir helper'a çıkarmak. Dokunulan dosyalar: `apps/mobile/components/ExerciseCard.tsx`, `apps/mobile/app/(tabs)/program/[day].tsx`, `apps/mobile/app/(tabs)/my-athletes/[athleteId]/program/[day].tsx`, `packages/db/queries/programs.ts`, `packages/db/queries/exercises.ts`, `apps/web/lib/tonnage.ts`.

**Düzeltme:**
- `packages/db/queries/programs.ts`'e `getActiveProgramId`/`getDaySessions` eklendi — mobilin iki `[day].tsx` ekranında (sporcunun kendi görünümü + koçun salt-okunur "sporcularım" görünümü, Parti 8.D) birebir aynı şekilde iki kez inline yazılmış olan "aktif yayınlanmış programı bul → günün seanslarını çek" sorgusu tek bir yere çıkarıldı. `getDaySessions` artık `exercises(*, exercise_sets(*))` seçiyor (önceden yalnızca `exercises(*)`).
- `packages/db/queries/exercises.ts`'e `buildMaxLookup` taşındı (önceden `apps/web/lib/tonnage.ts`'in kendi yerel kopyasıydı — aynı fonksiyon iki kez yazılıydı; `tonnage.ts` artık import edip geriye dönük uyumluluk için re-export ediyor) ve yeni `resolveOneRepMaxKg` eklendi (`tonnage.ts`'te inline yazılı olan `%1RM → kg` hesabını — `reps * (percent_1rm/100) * oneRm` — bir fonksiyona çıkarıyor).
- `ExerciseCard.tsx`: eski `formatLoad`/`formatVolume` (deprecated `exercises.load_kg`/`load_percent`/`unit`/`sets`/`reps`/`duration_sec` okuyordu) kaldırıldı. Artık `exercise.exercise_sets`'i `set_number`'a göre sıralayıp her seti ayrı satır olarak render ediyor; `formatSetReps`/`formatSetLoad` set bazlı `reps`/`duration_sec`/`load_kg`/`percent_1rm`/`band_resistance`/`is_bodyweight` okuyor. `resolveOneRepMaxKg` sayesinde mobil ilk kez %1RM'li setler için mutlak kg gösterebiliyor (öncesinde yalnızca "%X 1RM" etiketi vardı, hesap yapılmıyordu).
- **Mimari kazanım:** `getActiveProgramId`/`getDaySessions`/`buildMaxLookup`/`resolveOneRepMaxKg` artık `packages/db`'de tek kaynak — mobil ve web aynı sorgu/hesap mantığını paylaşıyor, üçüncü bir kopyanın (bir sonraki ekranın bu mantığı yeniden yazması) önü kesildi.
- **Keşif notu (Parti 8.F'ye düzeltme):** `ExerciseCard.tsx`'teki mavi `w-8 h-8 rounded-full` rozetin (`index + 1` gösteren) bir tamamlama toggle'ı değil, salt-okunur sıra numarası rozeti olduğu doğrulandı — `onPress`/state yok. Parti 8.F'nin salt-okunur ekran testi bu elemanı yanlışlıkla toggle sanmıştı; test SONUCU (mobilin bu ekranda hiç yazma yapmadığı) doğruydu, yalnızca gerekçe yanlış anlaşılmıştı. BUGS.md'de not düşüldü.

**DOĞRULAMA:** Fiziksel cihazda, hem sporcu (İbrahim) hem coach hesabıyla doğrulandı — set satırları, yük formatı, RPE doğru görünüyor; web'den (`new`/`edit` program builder) yapılan bir değişiklik mobilde anında yansıyor (koçun görünümü dahil, Parti 8.D'nin salt-okunur klonu üzerinden). `pnpm turbo run type-check` temiz.

**BUGS.md:** Orta-kategori "mobil `ExerciseCard` deprecated kolon okuyor" maddesi ✅ FIXED olarak kapatıldı ("sessizce bozuk" niteliği not düşüldü — 13 egzersizin 12'sinde deprecated kolonlar zaten NULL'dı, ekran yalnızca Parti 2.1 backfill'inden kalan tek satır sayesinde çalışıyor gibi görünüyordu). İki yeni AÇIK kayıt eklendi: `exercises.completed_at` ölü kolonu (planlı, Parti 10) ve Realtime'ın `exercise_sets` değişikliklerini yalnızca `training_programs.updated_at` üzerinden dolaylı tetiklemesi (düşük öncelik, kırılgan). Özet tabloları ve TOPLAM güncellendi: 32 bulgunun 25'i ✅ FIXED.

**MOBILE_STATUS.md:** güncellendi — set-bazlı görüntüleme artık doğru çalışıyor, deprecated kolon bağımlılığı kalmadı.

### Parti 9 — Egzersiz kütüphanesi: super-admin platform yönetim ekranı ✅ (2026-08-07)

**Kapsam:** `platform_exercises`'a (135 satır, 16 hareket paterni) super_admin için tam CRUD (soft-delete: `is_active` toggle) — yeni migration, yeni query fonksiyonları, genelleştirilmiş form bileşeni, yeni `/admin/exercises` route.

**0. Keşif:** İki paralel Explore agent'ı ile (a) `apps/web/components/features/exercises/`'teki org-egzersizi create/edit modallarının TAM yapısı (`exercise-form-fields.tsx` + `create-exercise-modal.tsx`/`edit-exercise-modal.tsx`) ve (b) `apps/web/app/admin/` route convention'ı (`organizations/new/` örneği) + PROGRESS.md/BUGS.md ilgili geçmişi çıkarıldı. **Kritik bulgu #1:** `platform_exercises` kolonları `org_exercises`'ın kesin bir alt kümesi (`005_exercises.sql`) — fazladan olan tek şey `org_id`/`created_by`/`updated_by`/`forked_from_platform`/`custom_category_id`/`coach_notes`/`updated_at`, yani mevcut formu uyarlamak talimatın DUR şartını ("beklenenden karmaşıksa") tetiklemedi. **Kritik bulgu #2:** org-egzersizi modalları CLAUDE.md'nin genel "React Hook Form + Zod" kuralını takip ETMİYOR (düz `useState`+elle validasyon+`(supabase as any)` cast) — talimat açıkça "aynı form bileşenini kullan, yeni form icat etme" dediği için bu Parti'de bu desen bilinçli olarak korundu, `/admin/organizations/new`'in kullandığı daha idiomatik RHF+Zod deseni burada TERCİH EDİLMEDİ (iki ayrı konvansiyonun bir arada var olduğu, kayıt altına alınan bir tutarsızlık). **Kritik bulgu #3:** `platform_exercises`'ın o güne dek YALNIZCA `platform_read_all` (SELECT, `using(true)`) politikası vardı — INSERT/UPDATE/DELETE hiç yoktu, `025_team_scoped_training_rls.sql` bunu bilinçli kapsam-dışı olarak belgelemişti.

**Düzeltme:**
- **Migration `supabase/migrations/028_platform_exercises_admin_rls.sql`:** `is_super_admin()` ile gate'li `platform_exercises_insert`/`platform_exercises_update` politikaları (organizations tablosundaki `orgs_insert`/`orgs_update` ile aynı desen). **DELETE politikası bilinçli olarak eklenmedi** — UI zaten silme sunmuyor (`is_active` toggle var), RLS de izin vermesin diye.
- **`packages/db/queries/exercises.ts`:** `createPlatformExercise`/`updatePlatformExercise` (mevcut ama modallarca kullanılmayan `createOrgExercise`/`updateOrgExercise` ile aynı imza/stil) + yeni `getPlatformExercisesAdmin` (mevcut `getPlatformExercises`'ten farklı olarak `is_active` filtresi YOK — admin pasif satırları da görüp geri açabilmeli; coach-facing `getPlatformExercises` değişmedi).
- **`exercise-form-fields.tsx`:** `MOVEMENT_PATTERNS` export edildi (admin tablosunda Türkçe etiket göstermek için), `Props`'a opsiyonel `scope?: "org"|"platform"` eklendi (default `"org"` — iki eski modalın çağrı yeri DEĞİŞMEDEN çalışıyor). `scope==="platform"` iken "Org Kategorisi" select'i ve "Koç Notları" textarea'sı render edilmiyor, hareket paterni tek başına tam genişlik + `*` ile zorunlu işaretleniyor (org'daki "OR kategori" kaçış yolu platform'da yok, DB'de `not null`).
- **Yeni modallar** `create-platform-exercise-modal.tsx`/`edit-platform-exercise-modal.tsx`: org modalların yapısal ikizi, farklar — org-only alanlar payload'dan çıkarıldı, zorunlu alan kontrolü sadece `name`+`movement_pattern`, yeni tipli query helper'ları çağırıyor (org modallarının aksine `(supabase as any).from(...)` yerine — düşük riskli, tutarlılığı artıran bir iyileştirme).
- **Yeni route `apps/web/app/admin/exercises/`** (`page.tsx` Server Component + `exercises-client.tsx` Client Component): middleware guard'ı zaten kapsıyor (Parti 5.B convention'ı — sayfa seviyesinde EK auth kodu YOK). Arama/hareket-paterni filtreli tablo (`@/components/ui/table`, `admin/page.tsx`'teki organizasyon tablosuyla aynı desen — 135 satırlık yoğun liste için kart-grid değil tablo tercih edildi), Demo var/yok rozeti, tıklanabilir `is_active` rozeti (yeni bir `Switch` primitive'i EKLENMEDİ, mevcut `Badge`/`Button` yeterli), Düzenle butonu. `admin/page.tsx`'e "Egzersiz Kütüphanesi" giriş linki eklendi ("Yeni Organizasyon" butonunun yanına — `/admin` altında başka hub sayfası olmadığı için).

**Migration geçmişi engeli (implementasyon sırasında):** `supabase db push` `LegacyDbPushMissingLocalError` ile durdu — `supabase migration list` cloud'da 023-027 local dosyalarıyla eşleşmeyen 5 timestamp-prefixli kayıt (`20260729091519` vb.) gösterdi, BUGS.md'nin "PARTİ 3" bölümünde belgelenen AYNI sınıf local/cloud sürüklenme. `supabase db query` ile şema seviyesinde 023-027'nin zaten canlı olduğu doğrulandı (`calculate_acwr` fonksiyonu yok/027, `create_program_with_weeks`+`insert_sessions_tree` fonksiyonları var/018-019, `athletes_insert`/`athletes_update` takım-bazlı politikaları var/025) — yalnızca takip tablosu senkron değildi, şema kaybı riski yoktu. **Kullanıcı onayıyla** (hard-to-reverse, paylaşılan cloud altyapısı) `supabase migration repair --status reverted 20260729091519 20260729120606 20260801193702 20260801202658 20260805195742` + `supabase migration repair --status applied 023 024 025 026 027` çalıştırıldı, `migration list` Local=Remote'a döndü, sonra `supabase db push` ile yalnızca 028 uygulandı.

**DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh` + gerçek `next dev`, Playwright/`@playwright/test` ile — bu ortamda paket zaten kuruluydu, `run` skill'inin `chromium-cli` fallback'i izlendi, önceki partilerin curl+elle-cookie yöntemine göre bir ilk):**
- Gerçek super_admin (`tosunbeytullah9@gmail.com`) girişiyle `/admin/exercises`'a gidildi (135 egzersiz listelendi), "Back Squat" arandı, edit modalı açıldı (Org Kategorisi/Koç Notları alanları YOK, hareket paterni `*` ile zorunlu — genelleştirme doğrulandı), gerçek bir YouTube linki eklenip kaydedildi, satırın "Var" rozetine döndüğü ekran görüntüsüyle doğrulandı, konsol hatası yok.
- `forkPlatformExercise`'ın (`packages/db/queries/exercises.ts`, dokunulmadı) `demo_url: platform.demo_url` satırıyla zaten birebir kopyaladığı kod okumasıyla teyit edildi.
- Geçici bir coach hesabıyla (Admin API `auth.admin.createUser`, TGF org/ACE takım/`role:coach`, Parti 4.E/8.B'nin deseni) `/admin/exercises`'a gidildiğinde middleware `/dashboard`'a (sonra `/dashboard`'un kendi admin-only guard'ıyla `/athletes`'e) yönlendirdi.
- AYNI coach'un anon-key client'tan (gerçek `signInWithPassword` sonrası JWT) doğrudan `platform_exercises` UPDATE denemesi RLS tarafından sessizce 0 satır etkiledi, INSERT denemesi açık `42501: new row violates row-level security policy` hatasıyla reddedildi; Back Squat'ın `instructions` alanının saldırı denemesi sonrası `null` (dokunulmamış) kaldığı service-role client'la doğrulandı.
- Aynı coach'un kendi `/exercises` (org_exercises) sayfası ve "Yeni Egzersiz" modalı (Org Kategorisi + Koç Notları alanları hâlâ orada, `count()>0` ile doğrulandı) regresyonsuz çalıştı — `scope` prop'unun `"org"` varsayılanı doğrulandı.
- `pnpm turbo run type-check` (5/5 paket, `@athleteiq/db`/`@athleteiq/web` dahil) + `pnpm --filter web build` (yeni `/admin/exercises` route'u derleme çıktısında görünüyor, 0 hata — yalnızca projede zaten var olan `@typescript-eslint/no-explicit-any` uyarıları, org modallarının deseniyle tutarlı).
- Geçici coach hesabı+membership'i service-role ile silindi, `leftover_memberships=0`/`leftover_auth_user=false` iki ayrı sorguyla doğrulandı.
- `packages/db/types.ts` `supabase gen types typescript --linked` ile regenerate edildi (CLAUDE.md §4.2) — diff boş çıktı (beklenen: RLS politikası kolon/tablo şemasını değiştirmiyor).
- `pnpm docs:sync` çalıştırıldı (CLAUDE.md migration listesine `028_platform_exercises_admin_rls.sql` eklendi, 27 migration, senkron tarihi güncellendi).

### Parti 6 — ACWR Konsolidasyonu ✅ (2026-08-05)

**Kapsam:** Yalnızca DB + dokümantasyon — yeni migration `027_drop_calculate_acwr.sql`, `packages/db/types.ts` regen, `READINESS_PLAN.md` §1.2/§8.1 düzeltmesi, `BUGS.md`'de yeni kapalı madde. `apps/web/app/(dashboard)/acwr/acwr-client.tsx`'e DOKUNULMADI — hesaplama mantığı değişmedi (kullanıcı kararı: sabit-bölen formül kalıcı standart).

**0. Keşif:** Bir önceki (kod değişikliği yapmayan) keşif oturumu `calculate_acwr(p_athlete_id uuid, p_date date)` SQL fonksiyonunun (`003_functions.sql`'de tanımlı, `009_security_fixes.sql:126-153`'te search_path sertleştirmesiyle aynı mantıkla yeniden tanımlanmış) %100 ölü kod olduğunu kesin doğrulamıştı — repo genelinde onu çağıran hiçbir `.rpc("calculate_acwr", ...)` call site yok. Bu partide bu bulgu tekrar grep ile doğrulandı: repo genelinde toplam 3 `.rpc(` çağrısı var (`create_program_with_weeks`, `update_program_week`, `propagate_week_to_future`), hiçbiri ACWR değil. Kritik olan yalnızca "kullanılmıyor" değil — fonksiyon canlı client-side hesaplamadan (`acwr-client.tsx`'teki `avgLoad()`) **metodolojik olarak farklı**: SQL fonksiyonu DEĞİŞKEN bölen (`avg()` — yalnızca loglanan günler) kullanırken, canlı formül SABİT bölen (7/28 takvim günü, dinlenme günleri sıfır yük) kullanıyor. Somut örnek: 28 günlük pencerede yalnızca 3 kayıtlı seansı (420+300+360=1080 yük) olan yeni bir sporcu için ölü fonksiyon `acwr_ratio ≈ 1.0` ("dengeli") üretirdi, canlı formül `≈ 4.0` ("aşırı yüklenme alarmı") üretiyor — az-veri/yeni-sporcu senaryosunda 4 kat fark. `acwr_logs.acwr_ratio` (`001_schema.sql`) generated column'ının yalnızca `acute_load`/`chronic_load`'a bağlı olduğu, bu fonksiyona bağımlı olmadığı doğrulandı — drop şemayı etkilemiyor. Başka hiçbir view/trigger'ın fonksiyona bağımlı olmadığı da doğrulandı.

**Düzeltme:** Yeni migration `supabase/migrations/027_drop_calculate_acwr.sql` (`drop function if exists calculate_acwr(uuid, date)` — `CASCADE` kullanılmadı, bilinmeyen bir bağımlılık olsaydı ifade hata verip duracaktı), Supabase MCP `apply_migration` ile `nlmwcygmbbxmfpsubvmh`'a uygulandı (`success:true`). `list_migrations` ile `20260805195742`/`drop_calculate_acwr` kaydı doğrulandı. `packages/db/types.ts` `supabase gen types typescript --linked` ile regenerate edildi (MCP `generate_typescript_types` DEĞİL — Parti 5.A'nın kendi dokümante ettiği bulgu gereği, MCP çıktısında `graphql_public` şema bloğu eksik çıkıyor, CLI `--linked` bu bloğu koruyor); diff yalnızca `Functions.calculate_acwr` bloğunun (8 satır) kalkması, başka hiçbir şey değişmedi.

**DOĞRULAMA:** `pnpm --filter web build` → 23 sayfa, 0 hata (yalnızca önceden var olan ESLint uyarıları — `/acwr` dahil tüm route'lar derlendi). `pnpm turbo run type-check` → 5/5 paket temiz (mobile'da ayrı script yok, önceki partilerin de gördüğü durum) — silinen RPC tipinin hiçbir yerde referanslanmadığının asıl kanıtı. `mcp__Supabase__get_advisors` (security) → `calculate_acwr` ile ilgili hiçbir bulgu yok, migration öncesine göre yeni ERROR/WARN yok (mevcut EXECUTE-grant/leaked-password WARN'ları ilgisiz/beklenen, değişmedi). **Canlı `/acwr` kontrolü** (gerçek admin Auth REST login + elle inşa edilmiş `sb-nlmwcygmbbxmfpsubvmh-auth-token` cookie'si — önceki partilerin yöntemiyle aynı, Playwright bu ortamda yok): `pnpm --filter web dev` ile `localhost:3000`'de başlatılan dev server'a admin JWT'siyle `GET /acwr` → `200`, SSR HTML'de "ACWR Dashboard" başlığı, sporcu seçici (İbrahim Çolak), 4 istatistik kartı (Mevcut ACWR / Akut Yük / Kronik Yük / Toplam Log) ve beklenen boş-durum mesajı ("Bu sporcu için henüz yük logu yok" — veri yok, hata değil) doğru render edildi; hiçbir exception/error boundary tetiklenmedi, `role:"admin"` doğru çözüldü. Hesaplama mantığı değişmediği için regresyon beklenmiyordu, doğrulandı. `pnpm docs:sync` çalıştırıldı — CLAUDE.md'nin migration listesine `027_drop_calculate_acwr.sql` eklendi (26 migration), senkron tarihi güncellendi.

**BUGS.md:** Yeni bir Orta-kategori madde zaten kapalı (`✅ FIXED`) olarak eklendi — bulgu, karar, düzeltme ve doğrulama tek maddede birleştirildi (4x örnek dahil). Özet tablosu güncellendi: 🟡 Orta `11 → 12`, TOPLAM `29 → 30` / `23 → 24 ✅ FIXED`. Açık kod bug'ı sayısı (**4**) DEĞİŞMEDİ — yeni madde zaten kapalı eklendi. Header'daki "Son güncelleme" parantezi bir katman içeri alınıp "Önceki güncelleme" yapıldı, yeni dış parantez bu Parti'nin özetini taşıyor.

**READINESS_PLAN.md:** §1.2'deki "Readiness motoru `calculate_acwr()`'ı canlı çağırmalı" önerisi kaldırıldı — artık var olmayan bir fonksiyona işaret ediyordu. Yerine: ACWR bileşeni için standart formülün `acwr-client.tsx`'teki sabit-bölen (7/28 takvim günü) yaklaşım olduğu, bunun Gabbett/Hulin rolling-average ACWR metodolojisiyle örtüştüğü ve az-veri/yeni-sporcu senaryosunda akut yüklenme sıçramasını doğru yakaladığı belirtildi; Readiness motoru yazıldığında bu formülü yeniden implement ederek ya da `acwr-client.tsx`'in mantığını `packages/`'e çıkarıp paylaşarak kullanmalı, ayrı bir SQL fonksiyonu YENİDEN YAZILMAMALI. §8.1'deki bulgu #2 (`calculate_acwr() ölü kod`) 🟡 → ✅ olarak işaretlenip Parti 6'da migration 027 ile kapandığı belirtildi. Bulgu #1 (`acwr_logs` UPDATE politikası eksik) ve #3 (`acwr_ratio` snapshot bayatlığı) bu partinin kapsamı DIŞINDA bırakıldı, dokunulmadı.

### Parti 8 Kapanış Özeti — 8.B'den 8.I'ye ✅ (2026-08-05)

Parti 8, mobil uygulamaya coach/admin için salt-okunur bir deneyim ekledi — rol tespitinden
(8.B) sporcu listesi + program + recovery + yarışmalar görünümüne (8.C/8.D/8.H) ve bu arada
DB tarafında bulunan iki gerçek yetkisiz-erişim açığının kapatılmasına (8.E/8.G) kadar. 8.I bir
sign-out regresyonunu düzeltti. Bu özet, 8.C/8.D/8.H'nin bıraktığı ertelenmiş fiziksel cihaz
testinin de (aşağıda "8.F") bu partide tamamlandığını kayda geçirir.

| Alt-parti | Ne yaptı |
|---|---|
| 8.B | `memberships`'ten rol/org/takım tespiti (`AuthContext`'e eklendi) + role'e göre tab dallanması: coach/admin 2 tab (Sporcularım/Profil), athlete/null eski 4 tab birebir |
| 8.C | "Sporcularım" placeholder'ı gerçek sorguya bağlandı (`getAthletes`/`getTeams`, hiçbir client-side rol filtresi yok — `athletes_select` RLS'e güveniliyor) + sporcu seçim/hub navigasyonu |
| 8.D | Hub'daki "Program" kartı — atletin haftalık/günlük program akışının salt-okunur klonu; yeni paylaşılan `useCoachAthlete` yetkilendirme guard'ı |
| 8.E | GÜVENLİK: `training_programs`/`training_sessions`/`exercises`/`exercise_sets`/`program_blocks` için coach RLS'i org-only'den takım-bazlıya genişletildi (migration 025) — canlıda kanıtlanmış bir cross-team okuma/yazma açığını kapattı |
| 8.F | 8.C/8.D/8.H'nin ertelediği fiziksel cihaz testi tamamlandı — sporcu listesi, hub, program (haftalık+günlük), recovery, yarışmalar ekranları cihazda dokunma/navigasyon ile test edildi, admin/coach parite ve takım izolasyonu doğrulandı, regresyon yok |
| 8.G | GÜVENLİK: 4 program RPC fonksiyonunun (SECURITY DEFINER — RLS'i bypass eden gerçek yazma yolu) yetkilendirmesi takım-bazlı yapıldı (migration 026); `insert_sessions_tree`'nin hiç kontrolü yoktu |
| 8.H | Hub'daki "Recovery" ve "Yarışmalar" kartları — atlet ekranlarının salt-okunur klonu; wearable RLS'i zaten takım-bazlıydı, `competitions` bilinçli olarak org-geneli kaldı |
| 8.I | "Çıkış Yap" sonrası navigasyon eksikliği düzeltildi — kök layout'a global `useSegments` tabanlı geri-yön guard'ı + her iki sign-out handler'ına explicit `router.replace` |

**Mimari kararlar (kalıcı, gelecekteki partiler bunlara güvenebilir):**
- **5. tab yerine ayrı ekran ağacı:** coach/admin `(tabs)/_layout.tsx`'te tamamen ayrı bir
  `<Tabs>` dalına düşer (`my-athletes` + `coach-profile`, 2 tab); athlete'ın 4 tab'ı `href:null`
  ile gizlenir. expo-router'da her route klasörü otomatik bir route'tur — `<Tabs.Screen>`
  filtrelemez, yalnızca görünürlüğü değiştirir (8.B keşfi). Yeni bir role-özel ekran eklenirken bu
  dallanma + `href:null` deseni tekrar kullanılmalı, yeni bir 5. tab EKLENMEMELİ.
- **`useCoachAthlete` guard'ı:** `training_programs` ailesinde coach RLS'i 8.E/8.G'den önce
  yalnızca org bazlıydı, takım bazlı değildi. `lib/hooks/useCoachAthlete.ts` bu yüzden hem hub hem
  program/recovery/competitions ekranlarında paylaşılan bir client-side org/team eşleşme kontrolü
  uyguluyor (defense-in-depth). Yeni bir coach/admin veri ekranı eklenirken önce ilgili tablonun
  RLS'inin takım-bazlı olup olmadığı kontrol edilmeli — değilse ya migration ile düzeltilmeli ya
  da bu hook deseni tekrarlanmalı; tek başına client-side kontrole güvenilmemeli (RLS asıl sınır).
- **Salt-okunur garantisi:** 8.C-8.H'de eklenen hiçbir coach/admin ekranı insert/update/delete
  içermiyor — hepsi atlet ekranlarının birebir salt-okunur klonu (aynı fetch/realtime deseni,
  formsuz). Düzenleme/yönetim (program oluşturma, sporcu ekleme, publish) mobilde YOK ve bilinçli
  olarak bu Parti'nin dışında bırakıldı — ileride ayrı bir iş olarak ele alınacak (kullanıcının
  adlandırdığı "Seçenek C": mobilde tam coach yazma paritesi). MOBILE_STATUS.md buna göre
  güncellendi.
- **Çözüldü (Parti 8.F, 2026-08-05):** 8.C/8.D/8.H'nin ertelediği dokunma/navigasyon testi
  tamamlandı — sporcu listesi (admin tüm org, coach yalnızca kendi takımı), hub ekranı, program
  (haftalık+günlük), recovery, yarışmalar ekranlarının hepsi cihazda gezinildi, regresyon
  bulunmadı (athlete'ın 4-tab deneyimi de ayrıca yeniden kontrol edildi). PROGRESS.md § 8.C/8.D/
  8.H'deki "YAPILMADI" notları buna göre güncellendi.

### Parti 8.I — Mobil: "Çıkış Yap" sonrası login'e dönmüyor düzeltmesi ✅ (2026-08-04)

- **Kapsam:** `apps/mobile/app/_layout.tsx`, `apps/mobile/lib/signOut.ts`, `apps/mobile/app/(tabs)/profile/index.tsx`, `apps/mobile/app/(tabs)/_layout.tsx`. Dokunulmadı: `apps/mobile/lib/auth.tsx` (zaten doğru), `apps/mobile/lib/hooks/useAthleteProfile.ts` (mount-only fetch, kapsam dışı), web/DB — mobile-only görev.
- **Bildirilen belirti:** Coach mobil hesabında "Çıkış Yap"a basınca uygulama login ekranına dönmüyor; aynı ekranda kalıyor, e-posta/rol alanları `"—"` gösteriyor, Çıkış Yap butonu sonsuza kadar dönüyor.
- **Bağlam:** MOBILE_STATUS.md'nin Parti 8.B bölümünde flag edilip hiç ele alınmamış bir riskin gerçekleşmesi — "Açık buglar" düşük-öncelik madde 6: *"Profil çıkış akışı `supabase.auth.signOut()` + 'root layout yönlendirecek' yorumuna güveniyor... muhtemelen çalışır; doğrulanmalı."*
- **0. Keşif:** `lib/auth.tsx`'teki `AuthContext` session `null` olduğunda `role`/`orgId`/`teamId`'yi ZATEN doğru sıfırlıyordu — `[session?.user.id]`'e bağlı ikinci `useEffect`, session null olunca `id` `undefined`'a döndüğü için tekrar tetiklenip `setRole(null)`/`setOrgId(null)`/`setTeamId(null)`/`setRoleLoading(false)` çalıştırıyor. Bu katmanda bug YOKTU. Gerçek eksik: hiçbir yerde GERİYE DÖNÜK bir navigasyon guard'ı yoktu. `app/index.tsx`'teki tek redirect mantığı (`!session` → `<Redirect href="/(auth)/login"/>`) SADECE `/` route'u mount olduğunda çalışıyor; `(auth)/login.tsx`'in ileri-yön guard'ının (`if (session) router.replace("/")`, Parti 8.B'de cihaz testinde bulunup eklenmişti) geri yönde hiçbir eşdeğeri yoktu. `lib/signOut.ts`'teki `confirmSignOut` (coach-profile'ın kullandığı) ve `(tabs)/profile/index.tsx`'in (athlete) inline `handleSignOut`'u, `await supabase.auth.signOut()` sonrası yalnızca `// Root layout auth guard yönlendirecek` yorumuna güveniyordu — böyle bir guard hiç var olmamıştı. Kullanıcı hangi ekran derinliğinde olursa olsun (`(tabs)/coach-profile`, `(tabs)/profile` vb.) sign-out sonrası hiçbir şey navigasyon yapmıyordu; ekran unmount olmadığı için `signingOut` state'i asla sıfırlanmıyordu (sonsuz spinner), `session`/`role` null olduğu için alanlar `"—"` gösteriyordu (bildirilen belirtiyle birebir eşleşiyor). Repo geneli grep (`router.replace|router.push|SIGNED_OUT|useSegments|Redirect`, `signOut|confirmSignOut`, `yönlendirecek|auth guard`) ile bu hayalî guard'a güvenen başka bir dosya olmadığı doğrulandı. Kök neden coach ve athlete tarafında AYNIYDI (paylaşılan "yorum var, guard yok" deseni) — ikisi de düzeltildi.
- **Tasarım doğrulaması (Plan agent ile, kurulu `expo-router@6.0.24` kaynağı okunarak):** `import { router } from "expo-router"` imperative singleton'ının component-dışı yardımcı fonksiyonlardan (örn. `lib/signOut.ts`) güvenle çağrılabildiği doğrulandı (`router.replace()` → `linkTo()` → modül-seviyeli bir routing queue'ya push eder, `NavigationContainer` ref'i mount olmadan önce çağrılsa bile action kaybolmaz, yalnızca buffer'lanır). `useSegments()`-tabanlı yeni guard'ın `app/index.tsx`'in kendi `<Redirect>`'i ve `login.tsx`'in ileri-yön `useEffect`'iyle çakışma/döngü riski taşımadığı da doğrulandı — ilk boot'ta ikisi de aynı hedefe (`/(auth)/login`) `replace` yapar (idempotent, döngü yok), segments `["(auth)","login"]` olunca guard durur; sign-out sırasında ise guard, `signOut.ts`/`profile/index.tsx`'teki explicit `router.replace` çağrısıyla birlikte aynı hedefe iki kez (biri anında, biri auth-state round-trip'iyle) yönlendirir — zararsız bir fazlalık, kasıtlı çift güvence.
- **Düzeltme (4 dosya):**
  1. **`app/_layout.tsx` — asıl fix:** `AuthProvider` içinde `useAuth()`/`useSegments()`/`useRouter()` kullanan yeni bir `RootLayoutNav` bileşeni eklendi. `useEffect`: `loading` ise çık; `inAuthGroup = segments[0] === "(auth)"`; `!session && !inAuthGroup` ise `router.replace("/(auth)/login")`. `_layout.tsx` her zaman mount olduğu için (Slot'un üstünde), kullanıcı hangi ekran derinliğinde olursa olsun session `null` olduğunda login'e döner.
  2. **`lib/signOut.ts`:** yorum satırı `router.replace("/(auth)/login")` çağrısına çevrildi (`import { router } from "expo-router"`, hook değil — component dışı fonksiyonda güvenli). `coach-profile/index.tsx`'e dokunulmadı, `confirmSignOut`'u zaten çağırdığı için fix'i otomatik miras aldı.
  3. **`(tabs)/profile/index.tsx`:** `handleSignOut`'taki aynı yorum satırı, zaten scope'ta olan `useRouter()`'ın `router`'ıyla `router.replace("/(auth)/login")` şeklinde değiştirildi.
  4. **`(tabs)/_layout.tsx`:** fonksiyon başına üç net dallanma eklendi — `loading || !session` → `return null` (guard #1 zaten yönlendirecek, burada eski/null veriyle sekme render edilmiyor); `roleLoading` → dedike bir loading spinner (`(tabs)` genelinde kullanılan `bg-gray-50`+`ActivityIndicator color="#1d4ed8"` deseniyle tutarlı, önceden bu durumda sessizce athlete tab setine düşülüyordu); aksi halde mevcut `isCoachOrAdmin` dallanması (artık `!roleLoading` kontrolüne gerek yok, o noktada garanti `false`) — iki `<Tabs>` JSX bloğu AYNEN korundu.
- **Bilinçli dokunulmayanlar:** `lib/auth.tsx` — zaten doğru, ikinci bir "SIGNED_OUT" branch'i eklemek iki ayrı doğruluk kaynağı yaratırdı (gereksiz). `lib/hooks/useAthleteProfile.ts` — mount-only fetch, session değişikliğine tepki vermiyor ama yeni guard'lar ekranı hızla unmount edeceği için bayat veri kullanıcıya görünmeden kayboluyor, kapsam dışı bırakıldı.
- **DOĞRULAMA:** `npx tsc --noEmit` (apps/mobile) — 0 hata. `pnpm --filter @athleteiq/mobile lint` (`expo lint`) — 0 hata/uyarı. **Fiziksel cihazda kullanıcı tarafından test edildi** (Expo dev server + Expo Go, LAN üzerinden, `pnpm dev --filter=@athleteiq/mobile`): coach ile giriş → Çıkış Yap → login ekranına düzgün dönüyor (`"—"`/sonsuz spinner yok) → tekrar coach girişi → doğru 2 tab (Sporcularım/Profil) görünüyor → athlete (İbrahim) ile aynı test tekrarlandı, regresyon yok. Kullanıcı onayı: **"Her şey çok iyi çalışıyor."**
- **BUGS.md:** Yüksek (özellik bozuk) kategorisine yeni bir ✅ FIXED maddesi eklendi (Parti 8.B'de flag edilip doğrulanmamış riskin gerçekleşmesi notuyla). MOBILE_STATUS.md'deki "Açık buglar" düşük-öncelik madde 6 kapatıldı.
- `pnpm docs:sync` ÇALIŞTIRILMADI — CLAUDE.md §9.1 yalnızca şema/route/klasör-yapısı değişikliklerinde gerektiriyor, bu parti mevcut dosyalarda yalnızca mantık değişikliği yaptı (yeni route/tablo/klasör yok).

### Parti 8.H — Seçilen sporcu için salt-okunur Recovery + Yarışmalar görünümü ✅ (2026-08-03)

- **Kapsam:** `apps/mobile/app/(tabs)/my-athletes/[athleteId]/recovery.tsx` ve `.../competitions.tsx`
  — 8.C'nin stub'ları üzerine, atlet akışının (`(tabs)/recovery/index.tsx` + `(tabs)/competitions/index.tsx`)
  salt-okunur birebir klonu yazıldı. Dokunulmadı: atlet ekranlarının kendisi, `useCoachAthlete.ts`,
  `useAthleteProfile.ts`, hub `_layout.tsx`/`index.tsx` (zaten bu route'lara yönlendiriyordu, kart
  navigasyonu 8.C'den beri hazırdı), hiçbir migration.
- **Numaralandırma notu (kullanıcı onaylı):** Talimat bu işi "Parti 8.E" olarak adlandırmıştı ve
  yalnızca 8.G ile çakışmaya karşı uyarmıştı. Ancak PROGRESS.md/BUGS.md'de 8.E zaten 2026-08-01'de
  tamamen farklı bir iş için kullanılmıştı (takım-bazlı RLS güvenlik düzeltmesi, bkz. § Parti 8.E) ve
  8.F, 8.C/8.D'nin bıraktığı bekleyen cihaz testi için zaten ayrılmıştı (§ Parti 8.D, madde 4). Bu
  durum implementasyona başlamadan önce kullanıcıya raporlandı, **Parti 8.H** olarak adlandırılması
  onaylandı.
- **0. Keşif — talimatın varsaydığından farklı çıktı:** Atlet `recovery/index.tsx`'i
  `wellness_checkins`/`readiness_scores`'a HİÇ dokunmuyor — `useAthleteProfile()`'dan `athlete.id`
  alıp yalnızca `wearable_connections` (aktif bağlantı var mı) + `wearable_daily_metrics` (son 7 gün)
  sorguluyor. Talimatın "muhtemelen bir günlük wellness check-in FORMU var" varsayımı bu kod tabanı
  için geçersiz çıktı — grep ile doğrulandı, `apps/mobile` içinde `wellness_checkins`/`readiness_scores`
  hiçbir yerde kullanılmıyor. `competitions/index.tsx` da yalnızca `competitions` tablosunu
  (`competition_results` değil) `athlete.org_id`'ye göre sorguluyor. Her iki ekranda da interaktif
  eleman (form/input) YOK — pull-to-refresh dışında zaten %100 salt-okunur (8.D'nin Program ekranında
  bulduğu durumla aynı örüntü, bu yüzden "salt-okunur yap" işi yine "veri kaynağını koç-seçili
  sporcuya çevir" işine indirgendi).
- **RLS team-scope kontrolü (talimatın DURMA şartı) — GAP bulunmadı, migration gerekmedi:**
  - `wearable_connections` / `wearable_daily_metrics` (`004_wearables.sql`, o tarihten beri hiçbir
    migration dokunmamış — grep ile doğrulandı): coach dalı **zaten** `my_role(a.org_id)='coach' and
    a.team_id=my_team_id(a.org_id)` ile takım-bazlı. 025'in `training_programs`/`training_sessions`/
    `exercises`/`exercise_sets`/`program_blocks` için yapmak zorunda kaldığı düzeltmeye bu iki tabloda
    hiç ihtiyaç yoktu — baştan doğru yazılmışlar.
  - `competitions` / `competition_results` (`002_rls.sql`, o tarihten beri hiçbir migration
    dokunmamış): coach dalı `my_role(org_id) is not null` — yani org-geneli, TAKIM BAZLI DEĞİL. Bu
    **bilinçli bir tasarım, güvenlik açığı değil**: CLAUDE.md §3'e göre `competitions` zaten
    "takım VEYA bireysel" org-seviyeli bir etkinlik kaydı, ve atletin kendi ekranı da zaten `org_id`'ye
    göre (hiç takım filtresi olmadan) sorguluyor — org'daki her sporcu/koç/admin zaten aynı yarışma
    takvimini görüyor. Bu ekranların ihtiyacı olan tek şey `competitions` (org-geneli), `competition_results`
    değil.
  - **Sonuç:** talimatın 1. adımındaki "DUR, implementasyona geçme" şartı tetiklenmedi, doğrudan
    2. adıma geçildi.
- **Implementasyon:** Her iki dosya da 8.D'nin `my-athletes/[athleteId]/program/index.tsx`'ini şablon
  aldı — `useLocalSearchParams`+`useCoachAthlete(athleteId)` (client-side org_id/team_id savunma
  katmanı DEĞİŞMEDEN reuse edildi), aynı loading/notFound blokları (geri butonu + "Sporcu bulunamadı"),
  header'da `athlete.full_name` (kimin verisine bakıldığı her zaman görünür, hub/program
  konvansiyonuyla tutarlı). `recovery.tsx`: `RecoveryRing`/`MetricRow`/`formatDate` + `fetchData()`
  sorgu mantığı atlet ekranından birebir taşındı, yalnızca parametre `athlete.id` (route'tan gelen
  koç-seçili sporcu) oldu. `competitions.tsx`: `LEVEL_LABELS`/`LEVEL_COLORS`/`CountdownBadge`/
  `fetchCompetitions()` birebir taşındı, parametre `athlete.org_id` oldu. `_layout.tsx`'e dokunulmadı
  — `recovery`/`competitions` zaten düz dosya (`name="recovery"`/`name="competitions"`) olarak
  tanımlıydı, Program'ın aksine gün bazlı drill-down olmadığı için klasöre çevrilmelerine gerek yok.
- **DOĞRULAMA:**
  1. `npx tsc --noEmit` (apps/mobile) — temiz. `npx eslint .` — 0 hata (1 önceden var olan, bu
     Parti'den bağımsız `react-hooks/exhaustive-deps` uyarısı `lib/auth.tsx`'te, 8.C'den beri aynı,
     dokunulmadı).
  2. **Backend-seviyeli canlı doğrulama** (Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek Auth REST +
     gerçek JWT'lerle — TGF org'una 2 geçici coach hesabı, biri İbrahim'in takımı ACE'ye biri farklı
     bir takım ACK'ye, Node script ile uçtan uca, önceki partilerle aynı yöntem): **8/8 kontrol geçti**
     — (a) aynı-takım(ACE) coach JWT'siyle İbrahim'in `wearable_connections`/`wearable_daily_metrics`
     (son 7 gün) + org'un `competitions` sorguları, service-role ground-truth'la **birebir aynı**
     (İbrahim'in şu an bağlı bir wearable'ı yok — bu doğal olarak "Wearable Bağlı Değil" boş-durumunu
     da doğruluyor); (c) farklı-takım(ACK) coach JWT'siyle aynı wearable sorguları → **0 satır** (RLS
     zaten baştan takım-bazlıydı, regresyon testi); farklı-takım coach'un `competitions` sorgusu ise
     ground-truth'la **yine aynı** (org-geneli tasarımın canlı kanıtı, bug değil, beklenen); farklı-takım
     coach'un İbrahim'i `athletes` tablosundan `id` ile çekmesi → **0 satır** (hub'ın "Sporcu bulunamadı"
     savunma yolunu doğru tetikleyecek — 8.C/8.D'den regresyonsuz); aynı-takım coach için bu erişim
     çalışıyor (regresyon yok). Tüm test verisi (2 geçici auth kullanıcı + membership) silindi,
     `leftover_memberships=0`/`leftover_auth_user=404` (iki hesap için de) doğrulandı.
  3. ~~**Cihaz/dokunma testi bilinçli olarak YAPILMADI** — 8.C/8.D'den beri süregelen, kullanıcı onaylı
     erteleme; Parti 8.F kapsamında toplu yapılacak.~~ — **TAMAMLANDI (Parti 8.F, 2026-08-05):**
     recovery/yarışmalar kartları da dahil cihazda dokunma/navigasyon ile test edildi, regresyon
     yok. Detay: § Parti 8 Kapanış Özeti.
- **Kapsam dışı bırakılan (bilinçli):** `wellness_checkins`/`readiness_scores`/`competition_results`
  (yukarıda açıklandığı gibi bu iki ekranın hiçbiri bu tabloları kullanmıyor, dokunulmadı). ~~Cihaz
  testi (Parti 8.F).~~ — Parti 8.F kapsamında tamamlandı (bkz. yukarı). `pnpm docs:sync` çalıştırılmadı — CLAUDE.md §9.1 yalnızca şema/route-klasör-yapısı/
  migration sayısı değiştiğinde gerekiyor, bu Parti ikisini de değiştirmedi (mevcut stub dosyalarının
  içeriği güncellendi).

### Parti 8.G — GÜVENLİK: program RPC fonksiyonlarına takım-bazlı yetkilendirme ✅ (2026-08-01)

- **Kapsam:** Yeni `supabase/migrations/026_team_scoped_program_rpc.sql`. Dokunulmadı: uygulama
  kodu (yalnızca DB migration), `copy_program_tree` (021 — kapsam dışı, görev adlandırmadı),
  `apps/web/lib/program-rpc.ts` (yeni hata mesajı UI'dan hiç tetiklenmiyor).
- **Amaç:** Parti 8.E'nin (RLS düzeltmesi) doğrulaması sırasında BUGS.md'ye 🟠 AÇIK düşülen
  bulguyu kapatmak: web'in gerçek program yazma akışı RLS-korumalı tablolara değil, RLS'i
  SECURITY DEFINER ile bypass eden 4 RPC fonksiyonuna yazıyor — bunlar org-only (team check'siz)
  manuel yetkilendirme kullanıyordu.
- **0. Keşif bulguları:** `018_create_program_with_weeks.sql`/`019_shared_session_tree_insert.sql`/
  `020_update_program_week.sql`/`021_propagate_week.sql` okunup 4 fonksiyonun tam yetkilendirme
  bloğu çıkarıldı. Talimatın "hepsi org-only coalesce kontrolü yapıyor" varsayımı
  `create_program_with_weeks`/`update_program_week`/`propagate_week_to_future` için doğruydu, ama
  **`insert_sessions_tree`'nin şu ana kadar HİÇ yetkilendirme kontrolü olmadığı** ortaya çıktı
  (org-only bile değil — yorumda "çağıran zaten kontrol ediyor" deniyordu, `security definer`
  olduğu için EXECUTE grant'ı `authenticated`'a açıkken doğrudan/malicious RPC çağrısıyla
  arbitrary `p_program_id`'ye session/exercise/set enjekte edilebilirdi). Bu sapma DURULMADAN
  kullanıcıya raporlanıp fonksiyona sıfırdan tam (org+team) kontrol eklendi — görev bu fonksiyonu
  açıkça 4'ün biri olarak kapsıyordu. `athlete_id`'ye ulaşım zinciri: `create_program_with_weeks`'te
  `p_team_id`/`p_athlete_id` doğrudan parametre; diğer 3'ünde `p_program_id` →
  `training_programs.org_id`/`team_id`/`athlete_id` (yeni select — `update_program_week` öncesinde
  yalnızca `org_id`, `propagate_week_to_future` öncesinde yalnızca `org_id`+`block_id`+
  `week_index_in_block` çekiyordu). Migration 025'in `programs_select`/`programs_write` coach
  dalının TAM SQL'i (`team_id=my_team_id(org) or exists(select 1 from athletes where
  id=athlete_id and team_id=my_team_id(org))`) referans şablon alındı.
- **Yetkilendirme deseni (talimatın literal okuması — tek merge'lenmiş coalesce değil, iki
  ardışık adım):**
  1. Adım 1 (mevcut org-only kontrol) AYNEN korundu — admin/super_admin için davranış değişmedi.
  2. Adım 1'in hemen ardına Adım 2 eklendi — çağıran admin/super_admin DEĞİLSE (guard:
     `not coalesce(is_super_admin() or my_role(org)='admin', false)`, yani gerçekten sadece
     coach), migration 025'in coach dalıyla birebir aynı takım kontrolü uygulanıyor; uyuşmazlıkta
     ayrı, spesifik bir mesajla reddediliyor: `'Bu sporcu sizin takımınızda değil'` — mevcut
     tek-genel-`'yetkisiz'` konvansiyonundan bilinçli sapma (talimatın örnek verdiği mesaj).
  3. Her iki adım `coalesce(...,false)` ile sarılı (CLAUDE.md §4.1).
  `insert_sessions_tree`'ye ilk kez `select org_id, team_id, athlete_id from training_programs
  where id = p_program_id` + `'program bulunamadı'` guard'ı + aynı iki adımlı kontrol eklendi —
  `create_program_with_weeks`/`update_program_week`'in mevcut çağrılarına şeffaf geçiyor (aynı
  org/team/athlete zaten üst seviyede doğrulanmış, regresyon riski yok), asıl amacı doğrudan/
  malicious RPC çağrısını kapatmak.
- **`copy_program_tree` bilinçli olarak DEĞİŞTİRİLMEDİ** (görev kapsamı yalnızca adlandırılan 4
  fonksiyonu kapsıyordu) — `propagate_week_to_future` artık yalnızca KAYNAK programı doğruluyor,
  canlı sorguyla doğrulanmış bir değişmez sayesinde (`training_programs.block_id` gruplarının
  TAMAMI aynı `team_id`/`athlete_id`'yi paylaşıyor — ayrık grup sayısı hem migration öncesi hem
  test verisiyle birlikte tekrar sorgulandığında 0) her hedef hafta da otomatik olarak aynı
  kapsamda.
- **`apps/web/lib/program-rpc.ts`'e DOKUNULMADI** — yeni `'Bu sporcu sizin takımınızda değil'`
  mesajı `mapRpcError`'ın hiçbir dalına düşmüyor (jenerik catch-all'a düşer), ama bu bilinçli:
  bu red yolu gerçek UI'dan hiç tetiklenemez çünkü coach'un athlete/team picker'ı (`new-program-
  client.tsx`) zaten RLS ile kendi takımına kısıtlı — cross-team seçenek dropdown'da hiç
  görünmüyor, doğrulandı.
- **Düzeltme:** yeni migration `supabase/migrations/026_team_scoped_program_rpc.sql` — 4
  fonksiyon `create or replace function` ile (imzalar DEĞİŞMEDİ — `apps/web/lib/program-rpc.ts` +
  `new-program-client.tsx` + `edit-program-client.tsx` etkilenmedi) güncellendi.
- **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek Auth REST + gerçek JWT'ler —
  geçici bir coach hesabı ACE'ye + geçici bir athlete-rollü hesap + mevcut admin hesabı + ACE/
  ACK'de birer test sporcusu, Node.js script ile uçtan uca):** 15/15 kontrol geçti:
  1. **Admin cross-team regresyon yok:** admin JWT'siyle ACK sporcusu için `create_program_with_weeks`
     (weeks_count=3) → başarı; `update_program_week` → başarı; `propagate_week_to_future` → başarı.
  2. **Coach, KENDİ takımı (ACE) — en kritik test:** coach JWT'siyle hem `p_team_id=ACE` hem
     `p_athlete_id=<ACE sporcusu>` varyantıyla `create_program_with_weeks` → başarı;
     `update_program_week` → başarı; `propagate_week_to_future` → başarı; DOĞRUDAN
     `insert_sessions_tree` çağrısı (kendi ACE programına) → başarı — yeni eklenen ikinci kontrolün
     own-team akışını kırmadığını izole doğruladı.
  3. **Coach, BAŞKA takım (ACK):** admin'in oluşturduğu ACK programının/sporcusunun id'sini coach'a
     manuel vererek aynı 5 çağrı (create×2 varyant, update, propagate, doğrudan
     `insert_sessions_tree`) → **hepsi `'Bu sporcu sizin takımınızda değil'` ile reddedildi**
     (migration öncesi hepsi sessizce BAŞARILI olurdu — asıl fark testi, özellikle
     `insert_sessions_tree` için kritik çünkü öncesinde HİÇ kontrolü yoktu).
  4. **Athlete rolü:** 4 fonksiyonun hepsi → hâlâ `'yetkisiz'` (Adım 1'de zaten reddedilir,
     regresyon yok).
  5. **Propagate kaynak/hedef tutarlılık değişmezi:** test bloklarıyla birlikte
     `select block_id, count(distinct team_id), count(distinct athlete_id) from training_programs
     where block_id is not null group by block_id having count(distinct team_id)>1 or
     count(distinct athlete_id)>1` tekrar çalıştırıldı → **0 satır**.
  6. `get_advisors` (security) migration sonrası yeni ERROR/WARN üretmedi (yalnızca önceden var
     olan, kapsam dışı `anon_security_definer_function_executable`/
     `authenticated_security_definer_function_executable` WARN'ları — ayrı, bilinen bir
     sertleştirme maddesi, bu Parti'nin kapsamı dışı).
  7. `pnpm --filter web build` → 23 sayfa (değişiklik yok, kod dokunulmadı) + `pnpm turbo run
     type-check` → 5/5 paket temiz (mobile'da ayrı `type-check` script'i yok, `tsc --noEmit`
     doğrudan çalıştırıldı, 0 hata — kod değişmediği için beklenen).
  8. `pnpm docs:sync` çalıştırıldı (CLAUDE.md migration listesine 026 eklendi, toplam 25
     migration).
  9. Tüm test verisi (2 geçici auth kullanıcı+membership, 2 test sporcusu, 7 test
     `training_programs` satırı, 2 test `program_blocks`) silindi; `leftover_programs=0`/
     `leftover_blocks=0`/`leftover_athletes=0`/`leftover_memberships=0`/`leftover_auth_users=0`
     beş ayrı sorguyla doğrulandı.
- **BUGS.md:** Parti 8.E'nin bıraktığı 🟠 AÇIK RPC bulgusu ✅ FIXED olarak kapatıldı (madde
  gövdesi, header özeti, Yüksek kategori satırı, TOPLAM satırı — hepsi senkron edildi, 22→23
  FIXED, açık kod bug'ı 5→4).

### Parti 8.E — GÜVENLİK: coach için takım-bazlı RLS ✅ (2026-08-01)

- **Kapsam:** Yeni `supabase/migrations/025_team_scoped_training_rls.sql`. Dokunulmadı: uygulama
  kodu (yalnızca DB migration), `platform_exercises`/`org_exercises`/`org_exercise_categories`
  RLS'i, `athlete_1rm_records` RLS'i, migration 018-021'deki 4 RPC fonksiyonu.
- **Amaç:** Parti 8.D'nin mobil koç program görünümü keşfi sırasında bulunan ve canlıda kanıtlanan
  bir yetkilendirme açığını kapatmak: `training_programs`/`training_sessions`/`exercises` (ve
  aynı ailede `exercise_sets`/`program_blocks`) RLS'inin coach dalı yalnızca ORG kontrolü
  yapıyordu, `athletes` tablosunun aksine TAKIM kontrolü yoktu.
- **0. Keşif bulguları:** `002_rls.sql`/`014_exercise_sets.sql`/`017_program_blocks.sql` okunup
  coach dalının tam SQL'i çıkarıldı — hepsinde `my_role(org_id)='coach'` (veya join edilmiş
  `my_role(p.org_id)='coach'`), hiçbir `team_id`/`athlete_id` karşılaştırması yok. `exercise_sets`
  ve `program_blocks`'un KENDİ bağımsız politikalarıyla aynı kusuru taşıdığı görüldü —
  `exercises_select`'i düzeltmek `exercise_sets_select`'i korumuyor. `athletes_select`
  (002_rls.sql:73-78) şablon alındı: `my_role(org_id)='coach' and team_id=my_team_id(org_id)`.
  FK zinciri: `training_programs`/`program_blocks` doğrudan `org_id`/`team_id`/`athlete_id`
  (XOR) kolonlarına sahip (athletes ile birebir aynı şekil); `training_sessions`→`exercises`→
  `exercise_sets` sırasıyla `training_programs`'a join ile bağlı, kendi team_id/athlete_id'leri
  yok. `platform_exercises`/`org_exercises`/`org_exercise_categories` (005_exercises.sql)
  kapsam dışı bırakıldı — sporcuya özel değil, org-geneli paylaşılan bir egzersiz kütüphanesi,
  team-scoping'e ihtiyacı yok (`platform_read_all`: `true`, `org_exercises_select`:
  `my_role(org_id) in ('admin','coach','athlete')`, doğru tasarım, dokunulmadı).
- **Etki değerlendirmesi (canlı ürün açığı, yalnızca teorik değil):** web'in `/programs` liste
  sayfası (`packages/db/queries/programs.ts`'teki `getPrograms(orgId)`) hiçbir team filtresi
  uygulamıyor — yani düzeltmeden önce her coach, web arayüzünde org'daki HERHANGİ bir takımın
  programlarını görebiliyordu. `*_write` ("for all") politikaları aynı kusuru taşıdığı için
  (UI'ı atlayan) bir coach başka bir takımın verisini INSERT/UPDATE/DELETE bile edebiliyordu.
- **Kullanıcı kararlarıyla netleşen kapsam (2 soru soruldu, ikisi de önerilen seçenekle
  yanıtlandı):**
  1. **5 tablo birden düzeltildi** (yalnızca istenen `training_programs`/`training_sessions`/
     `exercises` değil) — `exercise_sets` ve `program_blocks` de dahil edildi, çünkü ikisi de
     aynı kusuru KENDİ bağımsız politikalarıyla taşıyordu; dahil edilmeselerdi düzeltme eksik
     kalırdı (coach hâlâ başka takımın set-seviyesi verisini veya program bloklarını doğrudan
     okuyabilirdi).
  2. **RPC bypass'ı yalnızca belgelendi, düzeltilmedi** — web'in gerçek program oluşturma/
     düzenleme/haftaya-yayma UI'ı bu tablolara doğrudan yazmıyor, `create_program_with_weeks`/
     `insert_sessions_tree`/`update_program_week`/`propagate_week_to_future` (migration 018-021)
     adlı `SECURITY DEFINER` RPC fonksiyonlarını çağırıyor — bunlar RLS'i TAMAMEN BYPASS EDER ve
     kendi manuel `coalesce(is_super_admin() or my_role(org)='admin' or my_role(org)='coach',
     false)` kontrolünü kullanır (org-only, team check yok). Bu migration ham sorgu (Postman/
     mobil/`getProgramById`) ve doğrudan tablo yazma vektörünü kapattı, ama bir coach bu 4
     RPC'yi başka bir takımın id'leriyle DOĞRUDAN çağırırsa (UI'ı atlayarak) hâlâ o takımın
     programını oluşturabilir/düzenleyebilir/yayabilir — BUGS.md'ye kesin bir bulgu (fonksiyon
     adları + satırlar + önerilen düzeltme deseniyle) olarak düşüldü, ayrı bir Parti'nin işi.
- **`coalesce(...,false)` nüansı:** CLAUDE.md §4.1'deki kural PLpgSQL `IF NOT (...) THEN RAISE
  EXCEPTION` deseni içindir (orada `NOT NULL = NULL` olduğu için kontrol sessizce ATLANIR —
  fail-OPEN). Bildirimsel RLS `USING` ifadeleri farklı çalışır: üç-değerli mantıkta NULL zaten
  satırı DIŞLAR (fail-CLOSED) — yani migration'daki coalesce'ler burada gerçek bir bypass'ı
  KAPATMIYOR (bu, migration dosyasında bir yorumla açıkça not edildi), yalnızca projenin genel
  konvansiyonuyla tutarlılık/açıklık için eklendi.
- **Düzeltme (migration `025_team_scoped_training_rls.sql`):** mevcut 10 politika (5 tablo ×
  select + write/"for all": `programs_select`/`programs_write`, `sessions_select`/
  `sessions_write`, `exercises_select`/`exercises_write`, `exercise_sets_select`/
  `exercise_sets_write`, `program_blocks_select`/`program_blocks_write`) `ALTER POLICY` ile
  YERİNDE güncellendi (DROP+CREATE değil — talimat gereği mevcut politikalar düşürülmedi, yalnızca
  coach dalı sıkılaştırıldı, super_admin/admin/sporcu-self dalları aynen kaldı). `team_id`/
  `athlete_id` XOR olduğu için coach kontrolü iki dallı: doğrudan `team_id` eşleşmesi VEYA
  (bireysel sporcuya atanan satırlar için) `athletes` tablosu üzerinden o sporcunun `team_id`'sinin
  coach'un takımıyla eşleşmesi. `training_sessions`/`exercises`/`exercise_sets` için aynı blok,
  join edilmiş `training_programs` satırı (`p`) üzerinden uygulandı.
- **DOĞRULAMA:**
  1. Migration `apply_migration` (Supabase MCP) ile canlıya uygulandı, `get_advisors` (security)
     migration sonrası yeni ERROR/WARN üretmedi (yalnızca önceden var olan, kapsam dışı WARN'lar).
  2. **Canlı doğrulama (Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek Auth REST + gerçek JWT'ler
     — geçici bir coach hesabı ACE'ye + geçici bir admin hesabı org'a + ACK takımında test
     sporcusu/programı/seansı/egzersizi/seti/bloğu oluşturuldu, İbrahim'in şifresi geçici
     sıfırlandı):** 12/12 kontrol geçti:
     - Cross-team READ artık engelleniyor: coach(ACE)'ın ACK'nin `training_programs`/
       `training_sessions`/`exercises`/`exercise_sets`/`program_blocks` satırlarını `id` ile
       doğrudan sorgulaması **5/5 tabloda 0 satır** döndü (düzeltmeden önce tümü dönüyordu, hem
       statik SQL okumasıyla hem Parti 8.D'nin kendi canlı testiyle kanıtlanmıştı).
     - Cross-team WRITE artık engelleniyor: coach(ACE)'ın ACK athlete'i için `training_programs`/
       `program_blocks` INSERT denemesi **reddedildi**.
     - Own-team coach erişimi regresyonsuz: coach(ACE) hâlâ İbrahim'in (kendi takımı) programını
       görebiliyor; coach(ACE) kendi takımı için `program_blocks` INSERT edebiliyor (yazma
       regresyonu yok).
     - Admin org'un tamamını hâlâ görüyor (hem ACE hem ACK'nin programı).
     - Athlete-self erişimi regresyonsuz: İbrahim kendi yayınlanmış programını athlete JWT'siyle
       hâlâ görüyor.
  3. Web'in `/programs`/`/programs/[id]` sayfalarının davranış değişikliği ayrı bir canlı testle
     DOĞRULANMADI — RLS satır-bazlı uygulandığı ve `getPrograms(orgId)`'in ek bir WHERE ile
     kısıtlanmadığı için, yukarıdaki `id`-bazlı cross-team read testinin 0 satır dönmesi, aynı
     satırın org-bazlı geniş bir sorguda da (RLS her satıra bağımsız uygulanır) görünmeyeceğini
     mantıksal olarak garanti eder — ayrı bir tekrar test gereksiz görüldü. **Bu, kasıtlı bir
     davranış değişikliği:** coach artık `/programs` listesinde yalnızca kendi takımının
     programlarını görecek, önceden org'un tamamını görüyordu.
  4. Mobil Parti 8.D ekranları (`my-athletes/[athleteId]/program`) ayrı bir canlı testle
     DOĞRULANMADI — aynı mantıkla (coach'un kendi takımı için read/write regresyonsuz olduğu
     yukarıda doğrulandı, `useCoachAthlete`'in client-side kontrolü zaten Parti 8.D'de doğrulanmış
     bağımsız bir savunma katmanı) gereksiz görüldü; artık RLS de ikinci, gerçek bir katman.
  5. `pnpm --filter web build` (23 sayfa, sıfır hata) + `pnpm turbo run type-check` (6/6 paket,
     tümü cache/temiz) + mobil `npx tsc --noEmit`/`eslint` (0 hata) — hepsi temiz (kod
     değişmediği için beklenen, yalnızca DB migration'ı).
  6. `pnpm docs:sync` çalıştırıldı — CLAUDE.md migration listesine `025_team_scoped_training_rls.sql`
     eklendi, senkron tarihi güncellendi.
  7. Tüm test verisi (2 geçici auth kullanıcı + membership, 1 test sporcusu, 1 test programı
     + seansı + egzersizi + seti, 2 test program bloğu) service-role ile silindi; `leftover=0`
     üç ayrı sorguyla doğrulandı (kalan tek `role=admin` membership'in gerçek, kalıcı
     `tosunbeytullah9@gmail.com` süper admin hesabına ait olduğu ayrıca teyit edildi).
- **BUGS.md:** yeni bir "Kritik" bulgu ✅ FIXED olarak eklendi (nasıl keşfedildiği, hangi 5 tablo,
  kök neden, düzeltme, doğrulama sonuçları). Hemen ardından ayrı bir "Yüksek" bulgu 🟠 AÇIK olarak
  eklendi (4 RPC fonksiyonunun org-only yetkilendirmesi, önerilen düzeltme deseniyle). Toplam
  envanter 27→29 bulgu (22 ✅ FIXED, 5 açık kod bug'ı).
- **Kapsam dışı bırakılan (bilinçli):** 4 RPC fonksiyonunun yetkilendirme kontrolü (BUGS.md'ye
  düşüldü, ayrı bir Parti), `athlete_1rm_records` RLS'i (aynı kusuru taşıyor ama training-program
  zincirinin parçası değil, ayrı bir bulgu olarak not edildi, düzeltilmedi).

### Parti 8.D — Seçilen sporcu için salt-okunur Program görünümü ✅ (2026-08-01)

- **Kapsam:** Yeni `apps/mobile/lib/hooks/useCoachAthlete.ts`, yeni
  `apps/mobile/app/(tabs)/my-athletes/[athleteId]/program/{_layout,index,[day]}.tsx` (klasör-bazlı
  route, stub `program.tsx`'in yerine geçti — o dosya SİLİNDİ). Dokunulmadı:
  `apps/mobile/app/(tabs)/program/*` (atlet akışı), `apps/mobile/components/ExerciseCard.tsx`,
  `apps/mobile/app/(tabs)/my-athletes/[athleteId]/index.tsx` (hub), `packages/db/queries/*`.
- **Amaç:** 8.C'nin hub ekranındaki "Program" kartı bugüne kadar "Yakında" stub'uydu — bu Parti,
  koç bir sporcu seçtiğinde o sporcunun mobil uygulamada gördüğü haftalık/günlük programı aynı
  gezinme deneyimiyle (hafta görünümü → gün detayı) ama tamamen salt-okunur görebilmesini sağlıyor.
- **0. Keşif bulgusu (kapsamı belirleyen):** `apps/mobile/app/(tabs)/program/index.tsx` ve
  `[day].tsx` incelendiğinde, bu ekranların zaten **hiçbir yazma-yapan interaktif eleman**
  içermediği görüldü — set tamamlama, ağırlık/RPE girişi, "yaptım" butonu yok; yalnızca
  pull-to-refresh (index), gün satırı tıklaması (index→day) ve geri butonu (day) var, üçü de
  salt navigasyon/refetch. Yani "salt-okunur klon" işi aslında yalnızca veri kaynağını
  `useAthleteProfile()`'ın `auth.uid()`'e bağlı sporcusundan, route'taki `athleteId`'ye bağlı
  seçilmiş sporcuya çevirmekti. Sorgular: `index.tsx`'teki `fetchPrograms` (satır 48-73) —
  `training_programs(*)` + `training_sessions(id,day_of_week,session_type,title,duration_min,
  order_index)`, `.or(athlete_id.eq,team_id.eq).eq(is_published,true).order(start_date desc)
  .limit(5)`, `programs[0]` = "aktif program" (tarih aralığı/`program_blocks` karşılaştırması YOK,
  sadece en yeni `start_date`); `[day].tsx`'teki iki aşamalı sorgu (satır 50-72) — aynı `.or/.eq`
  ile program id bulma, sonra `training_sessions(*)+exercises(*)` `.eq(program_id).eq(day_of_week)
  .order(order_index)` (`exercise_sets` hiç sorgulanmıyor, kopyalanmadı). İkisi de
  `@athleteiq/db/queries` KULLANMIYOR — ham `supabase.from()` deseni bu alanın kendi konvansiyonu,
  yeni ekranlarda da aynen korundu (yeni bir query-layer fonksiyonu yazılmadı).
- **Güvenlik bulgusu (planı belirledi):** `supabase/migrations/002_rls.sql` ve
  `014_exercise_sets.sql` okunduğunda, `athletes` tablosunun RLS'i coach'u gerçekten `team_id`'ye
  göre kısıtlarken, `training_programs`/`training_sessions`/`exercises`/`exercise_sets`'in coach
  branch'inin yalnızca **org** kontrolü yaptığı (takım kontrolü YOK) görüldü. Yani
  `[athleteId]/index.tsx`'teki (hub, Parti 8.C) client-side `org_id===orgId && (admin ||
  (coach && team_id===teamId))` kontrolü, program verisi için "nice-to-have" değil **tek**
  yetkilendirme sınırı. Bu yüzden bu kontrol, hub'a güvenilmeden yeni bir hook'ta
  (`useCoachAthlete`) tekrar edildi ve HER İKİ yeni ekran (index + [day]) bağımsız olarak
  çalıştırıyor — aksi halde bir koç `/my-athletes/<başka-takımın-sporcusu>/program`'a doğrudan
  derin link ile gidip bu sınırı atlatabilirdi.
- **`useCoachAthlete(athleteId)`:** `[athleteId]/index.tsx:26-52`'deki mantığın (fetch
  `getAthleteById` → `org_id`/`team_id` karşılaştırması) aynısı, `{athlete, loading, notFound}`
  döndüren paylaşılan bir hook olarak çıkarıldı — yalnızca bu Parti'nin 2 yeni ekranı tarafından
  kullanılıyor, hub ekranının kendi inline mantığına dokunulmadı (sıfır regresyon riski).
- **`program/index.tsx`:** atletin `program/index.tsx`'inin klonu — aynı `fetchPrograms` sorgusu,
  aynı filtresiz realtime abonelik deseni (`training_programs` tablosunun TÜM değişikliklerini
  dinleyip her event'te refetch — `is_published` filtresi unpublish geçişini kaçırdığı için
  filtre konulmuyor, atlet ekranıyla birebir aynı gerekçe), aynı haftalık gün gruplama/renk
  mantığı. Farklar: `useAthleteProfile()` yerine `useCoachAthlete(athleteId)`; header "Merhaba,
  {isim}" yerine geri butonu + sporcunun tam adı; boş durum metni talimatta verilen aynen "Bu
  sporcu için aktif program yok"; `notFound` dalı eklendi (hub'ınkiyle aynı "Sporcu bulunamadı"
  metni).
- **`program/[day].tsx`:** atletin `[day].tsx`'inin klonu — aynı iki aşamalı sorgu,
  `ExerciseCard`'ı **kullanıcı kararıyla değiştirmeden** olduğu gibi import edip kullanıyor (RPE
  hedefi dahil edilmedi — atlet bugün de görmüyor, koç görünümü birebir aynı kalıyor).
  `useCoachAthlete` üzerinden `notFound` dalı eklendi (deep-link güvenliği).
- **`program/_layout.tsx`:** atletin `program/_layout.tsx`'inin birebir aynısı (index başlıksız,
  `[day]` native header "Günlük Program" + mor tint). `[athleteId]/_layout.tsx`'teki
  `<Stack.Screen name="program" />` girdisi HİÇ değiştirilmedi — klasör-bazlı route'u sorunsuz
  kapsadığı `expo export` ile doğrulandı.
- **DOĞRULAMA:**
  1. `npx tsc --noEmit` (apps/mobile) — temiz. `npx eslint .` (apps/mobile) — 0 hata (1 önceden
     var olan, bu Parti'den bağımsız `react-hooks/exhaustive-deps` uyarısı `lib/auth.tsx`'te).
  2. `pnpm exec expo export --platform android` — Metro 3126 modülü hatasız bundle etti (stub
     dosyadan klasör-bazlı route'a geçişin routing'i kırmadığı doğrulandı).
  3. **Backend/RLS doğrulaması (gerçek Supabase Cloud `nlmwcygmbbxmfpsubvmh`, Auth REST ile
     gerçek JWT'ler — Playwright/cihaz yok, önceki partilerin yöntemiyle aynı):** İbrahim
     Çolak'ın şifresi Admin API ile geçici sıfırlandı (athlete JWT), ACE takımına geçici bir
     coach hesabı oluşturuldu (coach JWT). (a) yeni ekranların sorgu şekli iki JWT ile de
     çalıştırıldı: İbrahim'in 3 yayınlanmış programı + aktif programın bir gününün
     seans/egzersiz verisi **birebir aynı** döndü; (b) hiç team-level programı olmayan Ritmik
     takımında oluşturulan taze bir test sporcusu için sorgu **0 program** döndürdü (boş durum
     dalını doğru tetikleyecek); (c) **güvenlik regresyon kontrolü** (8.C'nin kapsamadığı,
     bu Parti'ye özgü bir senaryo): ACK takımında bir test sporcusu + yayınlanmış test programı
     oluşturuldu; coach(ACE)'ın bu sporcuyu `athletes` tablosundan `id` ile doğrudan çekmesi RLS
     tarafından **0 satırla engellendi** (yani gerçek kullanımda `useCoachAthlete` hiç
     `training_programs`'a ulaşamadan "Sporcu bulunamadı" gösterecek) — AMA aynı coach JWT'siyle
     `training_programs`'ı doğrudan (hook'u atlayarak) sorgulamak ACK'nin programlarını
     **döndürdü**, yukarıdaki RLS bulgusunu canlıda teyit etti. Tüm test verisi (geçici coach
     hesabı+membership'i, 2 test sporcusu, 1 test programı) silindi; `leftover_athletes=0`,
     `leftover_programs=0`, `leftover_memberships=0` üç ayrı sorguyla doğrulandı.
  4. ~~**Fiziksel cihaz testi (talimat madde 3, dokunma/navigasyon/görsel kontrol) YAPILMADI** —
     8.C'nin bıraktığı yerden devam: kullanıcı tarafından ertelenen cihaz testi, bir sonraki
     oturumda (Parti 8.F kapsamında) yapılmalı.~~ — **TAMAMLANDI (Parti 8.F, 2026-08-05):**
     haftalık/günlük program görünümü cihazda dokunma/navigasyon ile test edildi, regresyon yok.
     Detay: § Parti 8 Kapanış Özeti.
- **Kapsam dışı bırakılan (bilinçli):** RPE hedefi gösterimi (kullanıcı kararıyla — `ExerciseCard`
  değiştirilmedi), `exercise_sets`/tonnage hesaplaması (web'in `apps/web/lib/tonnage.ts`'i burada
  kopyalanmadı, atlet mobil ekranı da bunu göstermiyor), Recovery/Yarışmalar hub kartlarının
  gerçek içeriği (hâlâ stub, kapsam dışı).

### Parti 8.C — Mobilde koç/admin sporcu listesi + seçim navigasyonu ✅ (2026-08-01)

- **Kapsam:** `apps/mobile/app/(tabs)/my-athletes/index.tsx` (placeholder'ın üzerine gerçek sorgu yazıldı), `apps/mobile/app/(tabs)/my-athletes/_layout.tsx` (Stack.Screen girdileri eklendi), yeni `apps/mobile/app/(tabs)/my-athletes/[athleteId]/{_layout,index,program,recovery,competitions}.tsx`. `packages/db/queries/*`'e HİÇBİR yeni fonksiyon eklenmedi — mevcut `getAthletes`/`getAthleteById` (`athletes.ts`) ve `getTeams` (`teams.ts`) doğrudan import edildi.
- **Amaç:** 8.B'nin bıraktığı "Yakında" placeholder'ını gerçek bir sporcu listesine ve sporcu seçim/hub navigasyonuna bağlamak.
- **Kritik keşif (tasarımı basitleştirdi):** `athletes_select` RLS politikası (`supabase/migrations/002_rls.sql:73-78`) zaten `is_super_admin() or my_role(org_id)='admin' or (my_role(org_id)='coach' and team_id=my_team_id(org_id)) or user_id=auth.uid()` şeklinde — admin'in org'un tamamını, coach'un yalnızca kendi takımını görmesi tamamen Postgres tarafında zaten sağlanıyor. Web'in `apps/web/app/(dashboard)/athletes/page.tsx`'i de bunu doğrulayan canlı bir örnek: `getAthletes(supabase, orgId)`'i hiçbir role/team_id filtresi olmadan çağırıyor. Bu yüzden mobile tarafında da `role`/`teamId`'ye göre ekstra bir client-side filtreleme dalı YAZILMADI — `getAthletes(supabase, orgId)` çağrısı RLS sayesinde otomatik doğru satır kümesini dönüyor.
- **Mobile için ilk kez: runtime `@athleteiq/db` importu.** Şimdiye kadar mobile'daki HER `@athleteiq/db` importu yalnızca `import type { Database } from "@athleteiq/db/types"` (derleme zamanında silinen, Metro'nun hiç görmediği bir import) idi. Bu Parti ilk kez `import { getAthletes } from "@athleteiq/db/queries/athletes"` gibi gerçek bir runtime fonksiyon import ediyor. Risk doğrulandı ve giderildi: `apps/mobile/node_modules/@athleteiq/db` zaten `packages/db`'ye bir pnpm junction olarak duruyordu; `npx expo export --platform android` ile Metro'nun bu importu hatasız bundle ettiği doğrulandı (3123 modül, sıfır "Unable to resolve module" hatası).
- **`my-athletes/index.tsx`:** `useAuth()`'tan `orgId`; `Promise.all([getAthletes(supabase, orgId), getTeams(supabase, orgId)])` ile sporcu + takım listesi çekiliyor, `teamMap = Object.fromEntries(teams.map(t=>[t.id,t.name]))` (web'in `athletes-client.tsx:69-71`'iyle birebir aynı desen) ile satırlarda takım adı gösteriliyor. `ScrollView`+`RefreshControl` (FlatList değil, `competitions/index.tsx` ile tutarlı), her satır `router.push(/(tabs)/my-athletes/${athlete.id})`. Boş liste: "Henüz sporcu yok" mesajı.
- **`my-athletes/[athleteId]/` (yeni klasör):** `_layout.tsx` (`index`/`program`/`recovery`/`competitions` için Stack, `headerShown:false` — uygulamanın baskın "kendi banner'ını render et" konvansiyonuyla tutarlı, `program/_layout.tsx`'teki native-header varyantı yerine). `index.tsx` (hub ekranı): `getAthleteById(supabase, athleteId)` çekiyor, **savunma katmanı** olarak dönen `data.org_id`/`data.team_id`'yi `useAuth()`'un `orgId`/`teamId`'siyle karşılaştırıyor (uyuşmazsa veya RLS zaten hiç satır döndürmezse "Sporcu bulunamadı" gösteriyor, veriyi state'e hiç yazmıyor). Sporcu adı başlıkta, 3 kart (Program/Recovery/Yarışmalar) → ilgili placeholder route'a `router.push`. `program.tsx`/`recovery.tsx`/`competitions.tsx`: "Yakında" mesajı (gerçek içerik Parti 8.D'de).
- **Kullanıcı onaylı karar — org-level coach edge case:** Talimat, `role='coach'` ama `team_id=null` (örgüt-geneli/takımsız koç) durumunda DUR deyip sormamı istedi. Kullanıcıya soruldu, **"otomatik boş liste (önerilen)"** seçildi: hiçbir özel kod yazılmadı — RLS zaten bu durumda coach için sıfır satır döner (`team_id = NULL` SQL'de asla `true` olmaz), ekran generic "Henüz sporcu yok" durumunu otomatik gösterir. Org-level coach'un tüm org'u görmesi istenirse `athletes_select` politikasının değişmesi (yeni migration, DB Agent kapsamı) gerekir — bilinçli olarak bu Parti'nin dışında bırakıldı.
- **DOĞRULAMA:**
  1. `npx tsc --noEmit` (apps/mobile) — temiz. `npx eslint .` (apps/mobile) — 0 hata (1 önceden var olan, bu Parti'den bağımsız `react-hooks/exhaustive-deps` uyarısı `lib/auth.tsx`'te, dokunulmadı).
  2. `npx expo export --platform android` — Metro 3123 modülü hatasız bundle etti (yukarıda açıklanan runtime-import riski giderildi).
  3. **Backend/RLS doğrulaması (gerçek Supabase Cloud `nlmwcygmbbxmfpsubvmh`, curl + gerçek Auth REST login):** Geçici bir coach test hesabı (TGF org, ACE takımı, Parti 4.E/8.B'nin deseni) + ACK takımında geçici bir test sporcusu ("ZZZ Test Athlete Parti8C") oluşturuldu. (a) coach JWT'siyle `getAthletes` eşdeğeri sorgu → SADECE İbrahim Çolak (ACE) dönüyor, ACK'daki test sporcusu görünmüyor; (b) coach JWT'siyle ACK'daki test sporcusunu `id` ile doğrudan çekme (`getAthleteById` eşdeğeri) → **boş sonuç** (hub ekranının "Sporcu bulunamadı" savunma yolunu doğru tetikliyor); (c) admin JWT'siyle aynı sorgu → **her iki sporcu da** dönüyor (İbrahim + ZZZ Test), admin'in org'un tamamını gördüğü doğrulandı; (d) admin JWT'siyle ACK'daki test sporcusunu `id` ile çekme → başarılı (whole-org erişimi doğrulandı); (e) her iki rol için `getTeams` eşdeğeri (`teams` tablosu) → 4 takımın tamamı dönüyor (rol farkı yok, isim-eşleme amaçlı beklenen davranış). Tüm test verisi silindi: `leftover_athletes=0`, `leftover_memberships=0`, `leftover_auth_user=404 (user_not_found)` doğrulandı.
  4. ~~**Fiziksel cihaz testi (talimat madde 4) YAPILMADI** — kullanıcıya soruldu, şimdilik ertelenmesi tercih edildi ("cihaz testini şimdi atla"). Dokunma/navigasyon/görsel boş durum kontrolleri (admin tüm org'u görüyor mu, coach sadece kendi takımını görüyor mu, hub ekranı doğru açılıyor mu, 3 kart placeholder'lara gidiyor mu, sporcusu olmayan biri için boş durum) bir sonraki oturumda kullanıcı uygun olduğunda tamamlanmalı.~~ — **TAMAMLANDI (Parti 8.F, 2026-08-05):** cihazda dokunma/navigasyon ile test edildi, admin tüm org'u/coach yalnızca kendi takımını görüyor, hub ekranı ve 3 kart doğru açılıyor, regresyon yok. Detay: § Parti 8 Kapanış Özeti.
- **Kapsam dışı bırakılan (bilinçli):** Program/Recovery/Yarışmalar hub kartlarının gerçek içeriği (Parti 8.D'nin işi), org-level coach'un tüm org'u görmesi (ayrı bir RLS migration'ı gerektirir).

### Parti 8.B — Mobilde rol tespiti + role göre tab seti ✅ (2026-07-30)

- **Kapsam:** `apps/mobile/lib/auth.tsx` (AuthContext'e `role`/`orgId`/`teamId`/`roleLoading` eklendi), `apps/mobile/app/index.tsx` (role-aware redirect), `apps/mobile/app/(tabs)/_layout.tsx` (role'e göre tab dallanması), `apps/mobile/lib/signOut.ts` (yeni, paylaşılan logout helper), `apps/mobile/app/(tabs)/coach-profile/{_layout,index}.tsx` (yeni), `apps/mobile/app/(tabs)/my-athletes/{_layout,index}.tsx` (yeni), `apps/mobile/app/(auth)/login.tsx` (kapsam dışı bulunup kullanıcı onayıyla eklenen bir navigasyon düzeltmesi — aşağıya bkz.). Dokunulmadı: `apps/mobile/app/(tabs)/profile/index.tsx`, `apps/mobile/lib/hooks/useAthleteProfile.ts` (talimat gereği izole bırakıldı).
- **Görev adlandırma notu:** Talimat "Keşif raporunu (8.A) referans al" diyordu; repo genelinde (`PROGRESS.md`/`BUGS.md`/`MOBILE_STATUS.md`) "Parti 8.A" adında bir belge YOK — mevcut dokümantasyon bu işi hâlâ "Parti 7" olarak etiketliyor (bkz. Parti 4 Kapanış Özeti, BUGS.md). Engel değildi: 8.A'nın doğrulayacağı iki bulgu (memberships self-select RLS'i zaten çalışıyor, kalıcı bir coach test hesabı yok) birincil kaynaklardan (`002_rls.sql`, CLAUDE.md §11) bağımsız olarak doğrulandı.
- **Amaç:** Mobil uygulamada rol kavramı yoktu — `AuthContext` yalnızca `{session, loading}` tutuyordu, `useAthleteProfile` doğrudan `athletes` tablosunu sorguluyordu, her giriş aynı 4 sporcu tab'ına (Program/Recovery/Yarışmalar/Profil) yönlendiriliyordu. Bir coach/admin girişinde her ekran "sporcu profili bulunamadı" zarif-ama-işe-yaramaz boş durumu gösteriyordu (MOBILE_STATUS.md'de bilinen sınırlama). Bu parti `memberships` tablosundan gerçek rol tespiti ekliyor, coach/admin'e minimal ama doğru bir 2-tab deneyimi (Sporcularım placeholder + Profil) veriyor, athlete yolunu birebir koruyor.
- **`auth.tsx`:** session çözüldükten sonra (`session?.user.id`'e bağlı ayrı bir `useEffect`, token-refresh'te tekrar tetiklenmesin diye) `memberships`'ten `role, org_id, team_id` çekiliyor (`.order("joined_at").limit(1).maybeSingle()` — membership'i olmayan/teorik çoklu-org durumunda hata fırlatmıyor, `role` `null` kalıyor). `roleLoading`, mevcut `loading`'den AYRI tutuldu (session-hazır ile rol-hazır iki bağımsız durum). Session `null` olduğunda (logout) `role`/`orgId`/`teamId` açıkça sıfırlanıyor — aksi halde aynı uygulama oturumunda farklı rollü bir sonraki girişte bayat rol verisi kalırdı.
- **`index.tsx`:** spinner artık `loading || roleLoading`'e bağlı; session yoksa `/(auth)/login` (değişmedi), `role∈{coach,admin}` ise `/(tabs)/my-athletes`, diğer her durum (athlete veya `role=null`) `/(tabs)/program` (eski hedef, değişmedi).
- **`(tabs)/_layout.tsx` — kritik keşif:** `expo-router@~6.0.24`'te `(tabs)/` altındaki her klasör bir route'tur, `<Tabs.Screen>` ile tanımlanıp tanımlanmadığından bağımsız — `<Tabs.Screen>` yalnızca tab-bar görünümünü özelleştirir, hangi route'ların göründüğünü FİLTRELEMEZ. `coach-profile/` ve `my-athletes/` klasörleri var olduğu için, HER İKİ dal da tüm 6 `Tabs.Screen`'i render edip kendine ait olmayanları `options={{href:null}}` ile gizlemek ZORUNDA — aksi halde athlete 6 tab (4 gerçek + 2 yabancı) görürdü ve tersi. Athlete/null/roleLoading dalı eski 4 `Tabs.Screen`'i birebir koruyor (Program/Calendar, Recovery/Activity, Yarışmalar/Trophy, Profil/User) + 2 gizli; coach/admin dalı yalnızca `my-athletes` ("Sporcularım", `Users` ikonu) + `coach-profile` ("Profil", `User` ikonu) görünür, diğer 4'ü gizli.
- **`signOut.ts` + `coach-profile/`:** `profile/index.tsx`'in inline `handleSignOut`'u (aynı `Alert.alert` metni/butonları) `confirmSignOut(onStart?)` olarak `lib/signOut.ts`'e çıkarıldı, yalnızca yeni coach-profile ekranından çağrılıyor — `profile/index.tsx`'e dokunulmadı. Coach-profile ekranı e-posta/organizasyon adı/rol (Türkçe etiket: admin→"Admin", coach→"Antrenör") gösteriyor; **coach/admin kullanıcılar için veri modelinde hiç isim alanı yok** (`invite-member`'ın `user_metadata`'sı yalnızca `pending_org_id`/`pending_role`/`pending_team_id` taşıyor, ad/soyad yok) — bu bilinçli olarak `session.user.email`'in gösterge kimliği olarak kullanılmasına yol açtı, düzeltilecek bir eksik değil. Organizasyon adı ayrı bir yerel sorguyla (`organizations.name`, `org_id`'ye göre) çekiliyor (`memberships` adı tutmuyor).
- **`my-athletes/`:** basit placeholder ("Yakında" / "Sporcu listesi yakında burada görünecek") — gerçek sorgu Parti 8.C'nin işi.
- **Cihaz testi sırasında bulunan ve onaylanan ek düzeltme (`login.tsx`):** `handlePasswordLogin`/`handleMagicLink` başarılı `signInWithPassword`/`signInWithOtp` sonrası HİÇBİR YERE navigasyon yapmıyordu — tek redirect mantığı `app/index.tsx`'teydi, ama `/` rotasından `/(auth)/login`'e geçildiğinde `Index` unmount oluyor, session sonradan geçerli olduğunda kimse yeniden tetiklenmiyordu (repo genelinde `router.replace`/`push` çağrısı grep'lendi, auth state değişikliğine tepki veren tek bir satır bulunamadı). Belirti: "Giriş Yap"a basınca kısa bir spinner, sonra hatasız ama navigasyonsuz eski ekrana dönüş — HERHANGİ bir hesap için. Kullanıcı onayıyla düzeltildi: `login.tsx` artık `useAuth()`+`useRouter()` kullanıyor, `session` truthy olduğunda `router.replace("/")` çağıran bir `useEffect` ekliyor — böylece zaten doğru (ve artık role-aware) `index.tsx` mantığı devralıyor. `tsc --noEmit`/`expo lint` bu düzeltmeden sonra da temiz.
- **DOĞRULAMA (canlı, fiziksel iOS cihazda, Expo dev server `pnpm dev --filter=@athleteiq/mobile` üzerinden, LAN üzerinden Expo Go ile):**
  1. **Coach yolu:** Supabase Admin API ile geçici bir coach test hesabı oluşturuldu (`auth.admin.createUser`, e-posta `parti8b-temp-coach@athleteiq.app`) + TGF org/ACE takımına `role:'coach'` membership'i (Parti 4.E'nin aynı deseni) — cihazda giriş yapıldı, doğrudan `/(tabs)/my-athletes`'e düştü, athlete tab'larının flaş'ı YOK, tam olarak 2 tab (Sporcularım/Profil) görüldü, coach-profile ekranı doğru e-posta + "Türkiye Cimnastik Federasyonu" + "Antrenör" gösterdi, "Sporcularım" placeholder'ı doğru render oldu (ekran görüntüsüyle doğrulandı).
  2. **Athlete regresyonu:** Mevcut kalıcı test sporcusu İbrahim Çolak (`tosunbeytullah9+ibrahim@gmail.com`) ile — şifresi unutulduğu için Admin API ile geçici olarak sıfırlandı (yalnızca şifre; `full_name`/takım/programlar/ACWR vb. hiçbiri değişmedi) — cihazda giriş yapıldı, **aynı 4 tab birebir eskisi gibi** görüldü (kullanıcı tarafından doğrulandı).
  3. **Admin yolu:** ayrı bir test hesabı gerekmedi — mevcut standing super_admin (`tosunbeytullah9@gmail.com`, gerçek `role:'admin'` membership'i) kod yoluyla `coach`'la aynı dalı (`role==='admin'`) egzersiz ediyor; ayrıca test edilmedi (kapsam/zaman gereği coach yolunun `admin`'le paylaştığı dallanma mantığına güvenildi).
  4. **Temizlik:** Geçici coach test hesabı + membership'i Admin API/SQL ile silindi; `leftover_auth_users=0`/`leftover_memberships=0` ayrı bir SQL sorgusuyla doğrulandı.
  5. `npx tsc --noEmit` (apps/mobile) ve `expo lint` (apps/mobile) — ikisi de temiz (mobile'ın kendi `tsconfig`/eslint config'i, monorepo'nun `turbo run type-check`'i mobile'ı kapsamıyor, önceki partilerin de gördüğü durum).
- **Kapsam dışı bırakılan (bilinçli):** "Sporcularım" ekranının gerçek sorgusu (Parti 8.C), mobil'in hâlâ kullanmadığı username→sentetik-e-posta girişi ve Magic Link'in kaldırılması (Parti 7, bu partiden etkilenmedi).

### Veritabanı (Agent 1 — DB Agent) ✅
- `supabase/migrations/007_trial.sql` — Trial sütunları (trial_ends_at, plan_status, owner_id) + `org_trial_status` view — **uygulandı** (2026-06-29)
- `supabase/migrations/001_schema.sql` — Tüm core tablolar
- `supabase/migrations/002_rls.sql` — Row Level Security politikaları
- `supabase/migrations/003_functions.sql` — Helper fonksiyonlar (my_role, my_team_id, is_super_admin, calculate_acwr, get_athlete_programs)
- `supabase/migrations/004_wearables.sql` — Wearable tabloları + athlete_push_tokens
- `supabase/migrations/005_exercises.sql` — Egzersiz kütüphanesi tabloları + RLS (platform_exercises, org_exercise_categories, org_exercises, athlete_1rm_records)
- `supabase/migrations/006_exercise_seed.sql` — 135 platform egzersizi (16 hareket paterninden) + TGF için 5 org kategorisi
- `supabase/seed.sql` — Başlangıç test verisi
- `packages/db/types.ts` — Supabase'den üretilmiş TypeScript tipleri
- `packages/db/queries/` — athletes, programs, acwr, competitions, tests, wearables, teams, memberships, **exercises** sorguları

### Parti 5.A — Landing page, trial sistemi, demo/pricing kaldırma ✅ (2026-07-29)
- **Kapsam:** `apps/web/app/page.tsx`, `apps/web/app/(dashboard)/layout.tsx`, `apps/web/app/(auth)/login/login-form.tsx`, `apps/web/middleware.ts`, `apps/web/app/api/signup/create-org/route.ts`, `supabase/migrations/023_drop_trial_system.sql` (yeni), `packages/db/types.ts` (regen) — silinen: `apps/web/components/features/landing/landing-page.tsx`, `apps/web/components/shared/marketing-shell.tsx`, `apps/web/app/(marketing)/` (layout.tsx + demo/page.tsx), `apps/web/app/api/demo-request/route.ts`, `apps/web/components/shared/trial-banner.tsx`, `apps/web/components/shared/trial-banner-wrapper.tsx`.
- **Amaç:** Ürün artık self-serve pazarlama hunisi (landing/pricing/demo/trial) kullanmıyor — onboarding doğrudan davet/admin üzerinden yapılıyor. Bu parti kök `/` rotasını doğrudan `/login`'e yönlendiriyor, deneme-süresi alt yapısını (kolonlar + view + banner) tamamen kaldırıyor, demo-talebi akışını siliyor. Signup (`/signup`) bilinçli olarak kapsam dışı bırakıldı (Parti 5.B'nin işi) — bu parti yalnızca login formundaki signup linkini temizledi.
- **`page.tsx`:** `!user` dalı artık `<LandingPage />` yerine `redirect("/login")` (dosyada zaten import edilmiş `next/navigation`'ın `redirect`'i, authenticated daldaki (`redirect("/login?error=no_membership")` vb.) aynı konvansiyon). Authenticated dal (super_admin kontrolü, cached-role kısayolu, membership sorgusu, `redirectByRole`) hiç değişmedi.
- **Silme öncesi doğrulama (3 paralel Explore agent'ıyla):** `landing-page.tsx`'in tek importer'ı `page.tsx`; `marketing-shell.tsx`'in tek iki importer'ı `(marketing)/layout.tsx` ve `landing-page.tsx` (ikisi de bu partide gidiyor); `(marketing)/` klasöründe yalnızca bu iki dosya var (başka bir şey yok, dizin listelemesiyle doğrulandı); `demo-request` route'unun tek çağıranı `(marketing)/demo/page.tsx`; `trial-banner-wrapper.tsx`'in tek importer'ı `(dashboard)/layout.tsx`. `apps/mobile` ve `packages/*` genelinde bu isimlerin (landing/marketing/demo-request/TrialBanner) SIFIR referansı bulundu.
- **`(dashboard)/layout.tsx`:** `TrialBannerWrapper` import'u ve `<TrialBannerWrapper />` JSX çağrısı kaldırıldı (Sidebar/Header/Toaster dahil geri kalan layout dokunulmadı).
- **`login-form.tsx`:** "Hesabın yok mu? Ücretsiz başla" (`/signup`) linki içeren `<p>` bloğu tamamen kaldırıldı — formun geri kalanı (identifier/password, submit mantığı, hata mesajları) değişmedi.
- **`middleware.ts`:** `PUBLIC_ROUTES`'tan `"/demo"` çıkarıldı (`["/login", "/signup", "/auth/callback", "/auth/confirm"]`); `AUTH_ROUTES`'a dokunulmadı (`/signup` kalıyor, 5.B'nin işi). `if (!user) { if (pathname === "/") {...} }` bloğundaki artık yanlış olan "Root page marketing layout'a geçiyor — geçir" yorumu "Root page kendi redirect'ini yapıyor — geçir" olarak düzeltildi (davranış değişmedi, bu blok zaten sadece pass-through yapıyordu).
- **Migration `023_drop_trial_system.sql` (sıra zorunlu, Postgres bağımlılık hatası vermeden):**
  1. `drop view if exists org_trial_status;` — view, üç kolona da bağımlıydı (`009_security_fixes.sql`'in `security_invoker` versiyonu), önce düşürülmezse `DROP COLUMN` "other objects depend on it" hatası verirdi.
  2. `orgs_insert` RLS politikası (`008_rls_signup.sql`'in `owner_id = auth.uid()`'a bağımlı versiyonu) drop edilip `002_rls.sql`'deki orijinal `is_super_admin()`-only haline döndürüldü — `owner_id` kolonu düşürülmeden önce zorunlu (aynı bağımlılık hatası riski). Bu güvenli: `organizations`'a insert eden tek kod yolu (`create-org/route.ts`) zaten service-role client kullanıyor (RLS bypass), yani `owner_id`'ye bağlı dal zaten hiç tetiklenmiyordu — davranış değişikliği yok.
  3. `alter table organizations drop column if exists trial_ends_at, drop column if exists plan_status, drop column if exists owner_id;`
  - Supabase MCP `apply_migration` ile canlıya uygulandı (`nlmwcygmbbxmfpsubvmh`, local Docker stack'i bu oturumda da kapalıydı — `--linked`/MCP ile doğrudan cloud'a). `list_migrations` ile `023` öncesi hâlâ `022`'nin son sıra olduğu, disk listesiyle birebir eşleştiği doğrulandı.
- **Keşfedilen kritik bağımlılık (kullanıcıya soruldu, "5.A'da düzelt" onaylandı):** `apps/web/app/api/signup/create-org/route.ts` service-role client ile (`createServiceClient`, RLS bypass) `organizations`'a `{name, slug, plan:"free", plan_status:"trial", owner_id:user.id}` insert ediyordu. Bu bir RLS sorunu değildi — kolonlar silinince her yeni org signup'ında anında "column does not exist" 500'üne yol açacaktı. Insert objesinden `plan_status`/`owner_id` çıkarıldı (`plan`/`name`/`slug` kaldı); membership insert'e, hata kodlarına, response şekline dokunulmadı.
- **`packages/db/types.ts`:** `supabase gen types typescript --linked` ile aynı commit'te regenerate edildi (CLAUDE.md §4.2 konvansiyonu) — `organizations` Row/Insert/Update'ten 3 alan kalktı, `org_trial_status` Views girdisi tamamen kalktı (dosyada artık `Views: { [_ in never]: never }`), dağınık `referencedRelation: "org_trial_status"` FK artefaktları (8 yerde) otomatik temizlendi. `graphql_public` şema bloğu CLI ile korundu (MCP `generate_typescript_types`'ın ürettiği çıktıda bu blok yoktu — önce onunla karşılaştırıldı, sonra CLI'nin `--linked` çıktısı kullanıldı, projenin var olan regen konvansiyonuyla birebir eşleşsin diye).
- **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh` + gerçek `next dev -p 3091`, gerçek admin Auth REST login + elle inşa edilmiş `sb-*-auth-token` cookie'si — önceki partilerin yöntemiyle aynı, Playwright bu ortamda yok):**
  1. `pnpm --filter web build` → 25 sayfa (önceki 27'den `/demo` + `/api/demo-request` düşük), 0 hata, sadece önceden var olan uyarılar. `pnpm turbo run type-check` → 5/5 paket temiz (ilk çalıştırmada `.next/types/validator.ts` silinen route'lara stale referans verdi — beklenen, build'in kendisi bu dosyayı yeniden ürettikten sonra type-check temiz çıktı).
  2. **(a)** Cookiesiz `GET /` → `307` → `Location: /login`.
  3. **(b)** Gerçek admin cookie'siyle `GET /dashboard` → `200`; SSR HTML'de trial-banner metni/DOM'u aranıp **0 eşleşme** bulundu.
  4. **(c)** Authenticated cookie'yle `GET /demo` → `404`, `POST /api/demo-request` → `404` (route'lar app'ten tamamen kalkmış). Cookiesiz aynı istekler `307 → /login` dönüyor — bu, middleware'in her bilinmeyen/public-olmayan path için ZATEN var olan davranışı (unauthenticated + non-public → login redirect), regresyon değil, `/demo` artık public olmadığı için beklenen sonuç.
  5. **(d) create-org fix'i — SQL seviyesinde izole doğrulama:** yeni 3-alanlı insert şekli (`name, slug, plan`) doğrudan SQL ile denendi → başarılı. Eski 5-alanlı şekil (`plan_status`/`owner_id` dahil) aynı şekilde denendi → **`42703: column "plan_status" of relation "organizations" does not exist`** ile reddedildi — yani endişe gerçekti (migration fix'siz ships edilseydi signup kırılırdı) ve fix doğru çalışıyor. Ayrıca gerçek bir akışla da denendi: Admin API ile taze bir test kullanıcısı oluşturulup gerçek session'ı alındı; `/api/signup/create-org`'a hem cookie hem body `accessToken` ile istek atılırken, middleware'in "authenticated ama memberships yok → `/login?error=no_membership`" guard'ına takıldığı görüldü (bkz. aşağıdaki yan bulgu) — bu yüzden asıl doğrulama SQL seviyesinde yapıldı, test org'u ve test kullanıcısı service-role ile temizlendi (`leftover=0`).
  6. Supabase `get_advisors` (security) migration sonrası çalıştırıldı — yalnızca önceden var olan, bu partiyle ilgisiz WARN'lar (SECURITY DEFINER fonksiyonların anon/authenticated rolüne RPC olarak açık olması, leaked-password-protection kapalı) döndü, yeni ERROR/WARN yok.
  7. `pnpm docs:sync` çalıştırıldı — CLAUDE.md migration listesine `023_drop_trial_system.sql` eklendi, senkron tarihi güncellendi. `organizations` tablo açıklaması zaten trial alanlarından bahsetmiyordu (değişiklik gerekmedi), klasör ağacı zaten `(marketing)` gibi route-group'ları listeleyecek derinlikte değildi (o yüzden oradan da bir şey silinmedi).
- **Yan bulgu (kapsam dışı, Parti 5.B'ye not düşüldü — DÜZELTİLMEDİ):** `middleware.ts`'in membership-yok-ise-login'e-redirect guard'ı, `PUBLIC_ROUTES` dışındaki HER path'e (API route'ları dahil) uygulanıyor. `/api/signup/create-org` `PUBLIC_ROUTES`'ta yok (`/signup`'ın kendisi orada ama `/api/signup/create-org` "/signup" ile başlamıyor) — yani teoride, taze signup olmuş (auth kullanıcısı var ama henüz `memberships` satırı yok) bir kullanıcının tarayıcısından bu endpoint'e giden gerçek istek de bu guard'a takılıp `/login?error=no_membership`'e redirect olabilir, route handler'a hiç ulaşmadan. Bu, Parti 5.A'nın dokunduğu hiçbir koddan kaynaklanmıyor (PUBLIC_ROUTES'un `/demo` dışındaki elemanları ve membership-check mantığı hiç değişmedi) — mevcut haliyle onaylanmadı/incelenmedi, sadece bu doğrulama sırasında fark edildi. Parti 5.B (signup kaldırma/yeniden ele alma) kapsamında değerlendirilmeli.

### Parti 5.B — Public signup wizard kaldırıldı, super-admin dahili org oluşturma ✅ (2026-07-29)

- **Kapsam:** Sil: `apps/web/app/(auth)/signup/{page.tsx,signup-form.tsx}`, `apps/web/app/api/signup/{create-org,create-team}/route.ts`. Düzenle: `apps/web/middleware.ts`, `apps/web/app/admin/page.tsx`, `packages/validators/{index.ts,package.json}`, `packages/db/queries/{index.ts (queries),package.json}`, `BUGS.md`. Yeni: `supabase/migrations/024_revert_signup_self_serve_rls.sql`, `packages/validators/organization.ts`, `packages/db/queries/organizations.ts`, `apps/web/app/admin/organizations/new/{page.tsx,create-organization-form.tsx}`.
- **Amaç:** Parti 5.A landing/trial/demo'yu kaldırıp onboarding'i davet-tabanlı hale getirmişti ama self-serve `/signup` wizard'ının kendisine bilinçli olarak dokunmamıştı. Bu parti onu tamamen kaldırıp yerine, yalnızca platform sahibinin (super_admin) kullanabileceği dahili bir org-oluşturma formu koydu — yeni org'un ilk admin'i artık self-signup ile değil, mevcut `invite-member` akışıyla ekleniyor.
- **0. Keşif (implementasyondan önce):** `is_super_admin()` `002_rls.sql`'de tanımlı, `009_security_fixes.sql`'de sertleştirilmiş (`set search_path=''`, mantık aynı) — CLAUDE.md'nin "003_functions.sql" referansı hafif güncel değil, engel değil. Web tarafında bu fonksiyon HİÇBİR yerde RPC ile çağrılmıyor; her yerde (`middleware.ts`, `app/page.tsx`, `useUserContext.ts`, `sidebar.tsx`) doğrudan `user.user_metadata?.["platform_role"] === "super_admin"` okunuyor. Mevcut gating convention: `apps/web/app/admin/` klasörü ZATEN var (org listesi), erişim kontrolü YALNIZCA `middleware.ts`'te (`pathname.startsWith("/admin")` → değilse `/dashboard`'a redirect) — `admin/page.tsx`'in kendisinde hiç auth kodu yok. Yeni sayfa bu yüzden `/admin/organizations/new` altına konup middleware guard'ını bedavaya miras aldı, ekstra kod yazılmadı. `apps/web/app/api/teams/route.ts` (dashboard'un "takım ekle" özelliği, cookie-tabanlı auth + admin/coach rol kontrolü) doğrulandı — signup'tan tamamen bağımsız, tek çağıranı `settings-client.tsx`, DOKUNULMADI.
- **Silinen dosyalar:** wizard yalnızca 2 dosyaydı (`page.tsx` + `signup-form.tsx` — ayrı adım sayfaları/layout yoktu, 4 adım tek client component içinde state ile yönetiliyordu) + 2 destekleyici API route'u (`create-org`, `create-team`, ikisi de service-role client + bearer `accessToken` body ile, cookie auth değil). Repo geneli grep (`apps/mobile`, `packages/*` dahil) sıfır başka referans doğruladı; `login-form.tsx` zaten Parti 5.A'da signup linkinden arındırılmıştı.
- **`middleware.ts`:** `PUBLIC_ROUTES`/`AUTH_ROUTES`'tan `"/signup"` çıkarıldı (`["/login", "/auth/callback", "/auth/confirm"]` / `["/login"]`). Başka mantık değişmedi.
- **Migration `024_revert_signup_self_serve_rls.sql` — keşfedilen güvenlik açığı (kullanıcı onayıyla kapatıldı):** `008_rls_signup.sql`'in `memberships_insert_self` politikası hâlâ canlıydı ve `023_drop_trial_system.sql`'in `orgs_insert`'e yaptığı düzeltmenin eşdeğeri hiç uygulanmamıştı. Bu politika, herhangi bir authenticated kullanıcının (athlete dahil), üyesi olmadığı HERHANGİ bir org'a doğrudan `supabase.from("memberships").insert({user_id: self, org_id: <hedef>, role:"admin"})` ile — app UI'ını hiç kullanmadan — admin olarak sızabilmesine izin veriyordu. Politika `is_super_admin() or my_role(org_id) in ('admin','coach')`'a döndürüldü (self-serve dalı tamamen kaldırıldı). `teams_insert`'e dokunulmadı (zaten aynı desende, self-serve deliği yoktu). Supabase MCP `apply_migration` ile canlıya (`nlmwcygmbbxmfpsubvmh`) uygulandı; `packages/db/types.ts` regen GEREKMEDİ (RLS-only değişiklik, tip şemasını etkilemiyor).
- **Yeni org-oluşturma formu:** `packages/validators/organization.ts` (`createOrgSchema`, tek alan: `name`) ve `packages/db/queries/organizations.ts` (`createOrganization`) mevcut `team.ts`/`athletes.ts` desenleriyle birebir aynı şekilde eklendi — her iki paketin `package.json`'ındaki explicit `exports` map'ine yeni subpath'ler eklenmesi gerekti (wildcard export yok, her dosya elle kayıtlı). `apps/web/app/admin/organizations/new/page.tsx` (Server Component) + `create-organization-form.tsx` (Client Component, `add-athlete-modal.tsx` deseniyle: react-hook-form + zodResolver + `@athleteiq/ui` bileşenleri). Tek alan organizasyon adı — kullanıcı onayıyla ilk takım alanı formdan tamamen çıkarıldı ("sade tut"). Slug, eski wizard'ın Türkçe-karakter-normalize eden `slugify()`'ı inlined halde isimden otomatik türetiliyor, kullanıcıya hiç gösterilmiyor. Submit doğrudan authenticated browser client ile (`createClient()` + `createOrganization()`) — service-role YOK; `organizations.plan` gönderilmiyor (DB kolonu `default 'free'`). Unique slug çakışması (`23505`) inline hata mesajıyla yakalanıyor. Başarı ekranında "✅ oluşturuldu" + "ilk adminini eklemek için mevcut davet ekranını kullanın" mesajı + `/settings`'e link — yeni bir davet mekanizması YAZILMADI.
- **Bilinçli kabul edilen sınırlama (kullanıcı onayıyla, düzeltilmedi):** `/settings`'in davet formu `org_id`'yi giriş yapanın KENDİ membership'inden (cookie) alıyor; super_admin'in yeni oluşturduğu org'da membership'i yok, dolayısıyla link bugün o org'u otomatik hedefleyemiyor. Bu bir RLS açığı değil — `invite-member` Edge Function'ı zaten `isPlatformAdmin` ise `org_id`'yi sınırlamıyor (canlı doğrulandı, aşağıya bkz.), engel yalnızca `/settings` UI'ının tek-org-context varsaymasında. BUGS.md'ye not düşüldü, düzeltme kapsam dışı bırakıldı.
- **`admin/page.tsx`:** başlığın yanına `<Link href="/admin/organizations/new">Yeni Organizasyon</Link>` (shadcn `Button asChild`) eklendi — aksi halde yeni sayfa hiçbir yerden linklenmiyor olurdu.
- **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh` + gerçek `next dev -p 3099`, Node/fetch ile gerçek Auth REST login + inşa edilmiş `sb-nlmwcygmbbxmfpsubvmh-auth-token` cookie'si — Playwright yok, önceki partilerin yöntemiyle aynı):**
  1. `pnpm --filter web build` → 23 sayfa (önceki 25'ten `/signup`+`/api/signup/create-org`+`/api/signup/create-team` düşük, `/admin/organizations/new` eklendi), 0 hata. `pnpm turbo run type-check` → 6/6 paket temiz (ilk çalıştırmada `.next/types/validator.ts` silinen route'lara stale referans verdi — beklenen, `next build`'in kendisi bu dosyayı yeniden ürettikten sonra type-check temiz çıktı, Parti 5.A'daki aynı desen).
  2. Bir Node script'iyle (Playwright yerine, önceki partilerin yöntemi) 8 kontrol çalıştırıldı, **8/8 PASS**: (a) gerçek super_admin girişi; (b) `GET /admin/organizations/new` super_admin cookie'siyle → **200**; (c) super_admin'in access token'ıyla doğrudan `POST /rest/v1/organizations` (service-role YOK — formun yapacağı ile birebir aynı yol) → **201**, RLS `is_super_admin()` izin verdi; (d) geçici bir coach test hesabıyla aynı sayfa → **307 → `/dashboard`** (var olan middleware guard'ı yeni route'u otomatik kapsadı, ekstra kod gerekmedi); (e) migration 024 sonrası, hiçbir membership'i olmayan taze bir test kullanıcısının `role:"admin"` self-insert denemesi → **403, `42501: new row violates row-level security policy for table "memberships"`** (güvenlik açığının gerçekten kapandığı doğrulandı); (f) `invite-member` Edge Function'ı super_admin'in token'ıyla yeni org'a gerçek bir admin daveti gönderdi → başarılı; (g) Admin API `generate_link` (`type:"magiclink"`) token'ı gerçek `/auth/confirm`'e verildi → **307 → `/athletes`**; (h) `memberships` tablosunda doğru `org_id`/`role:"admin"` satırı SQL ile doğrulandı.
  3. Tüm test verisi (test org, coach/fresh/invitee test kullanıcıları + membership'leri) service-role ile temizlendi; ayrı bir sorguyla `leftover_test_orgs=0`/`leftover_test_users=0` doğrulandı.
  4. `curl http://localhost:3099/signup` (cookiesiz) → **307 → `/login?next=%2Fsignup`** (route artık yok; middleware'in bilinmeyen-path-için-login'e-yönlendir davranışı, Parti 5.A'daki `/demo` ile birebir aynı desen, regresyon değil).
  5. `pnpm docs:sync` çalıştırıldı (yeni route + migration listeye yansıdı).
- **BUGS.md kapanışı:** Parti 5.A'nın middleware/signup guard çakışması notu → ✅ FIXED (MOOT) — route'lar artık yok, blokladığı bir şey kalmadı. Yeni bir Orta-seviye not eklendi: `/settings` davet formu org-hedefleme sınırlaması (yukarıya bkz., bilinçli kabul edildi).

### Parti 5.C — Org oluşturma akışına ilk-admin daveti gömüldü ✅ (2026-07-29)

- **Kapsam:** Düzenle: `apps/web/app/admin/organizations/new/create-organization-form.tsx`, `BUGS.md`. Dokunulmadı: `supabase/functions/invite-member/index.ts`, `apps/web/app/api/auth/invite/route.ts`, `packages/validators/auth.ts`, `apps/web/app/(dashboard)/settings/*`.
- **Amaç:** Parti 5.B'nin org oluşturma formu, başarı ekranında "ilk adminini eklemek için mevcut davet ekranını kullanın" diyip `/settings`'e link veriyordu — ama `/settings`'in davet formu `org_id`'yi çağıranın KENDİ membership'inden (cookie) okuduğu için, membership'i olmayan bir super_admin'in yeni oluşturduğu org'u bu linkten asla hedefleyemediği BUGS.md'de bilinçli kabul edilmiş bir sınırlama olarak duruyordu. Bu parti, `/settings`'e dokunmadan (talimat gereği izole bırakıldı), org oluşturma sayfasının kendi içine, yeni org'un id'sini doğrudan bilen bir "ilk admini davet et" mini-adımı gömdü.
- **0. Keşif sonucu (implementasyondan önce, kritik):** `supabase/functions/invite-member/index.ts:60-76` doğrudan okundu — yetki kontrolü `isPlatformAdmin` (`caller.user_metadata?.["platform_role"] === "super_admin"`) **OR** `callerMembership?.role === "admin"` şeklinde bir OR zinciri; `isPlatformAdmin` dalı, hedef org'da çağıranın HİÇ membership'i olmasa bile (yeni oluşturulmuş, sıfır üyeli bir org dahil) geçiyor ve `org_id`'yi çağıranın kendi org'una hiçbir yerde kısıtlamıyor. **Sonuç: CASE (A)** — Edge Function'a dokunmaya gerek yoktu, yalnızca UI'ı bağlamak yeterliydi. Ayrıca mevcut generic proxy `apps/web/app/api/auth/invite/route.ts` (`settings-client.tsx`'in `onSendInvite`'ının da kullandığı) `{email, role, org_id, team_id?}` body'sini olduğu gibi bearer token'la `invite-member`'a forward ediyor, `org_id`'yi hiç kısıtlamıyor — bu proxy AYNEN reuse edildi, yeni bir route/Edge Function yazılmadı.
- **Değişen dosya:** `create-organization-form.tsx`'teki `createdOrg` state'i `{name}` yerine `{id, name}` tutacak şekilde genişletildi (`createOrganization()` zaten `id, name, slug` döndürüyordu, yalnızca `org.id`'yi de state'e almak yeterliydi). Başarı bloğunun statik "mevcut davet ekranını kullanın + `/settings` linki" JSX'i kaldırıldı, yerine `inviteStep: "pending"|"sent"|"skipped"` state'ine göre dallanan inline bir form eklendi: `"pending"` → yalnızca e-posta alanı + "Davet Gönder"/"Şimdilik atla, sonra davet ederim" butonları; `"sent"` → statik başarı metni; `"skipped"` → statik "atlandı" metni. `onSendInvite` handler'ı `settings-client.tsx`'teki `onSendInvite` ile BİREBİR AYNI desen (plain `useState` + `fetch("/api/auth/invite", {...})`, react-hook-form DEĞİL) — `{email, role:"admin", org_id: createdOrg.id}` gönderiyor (team_id yok, admin rolü takım gerektirmiyor). Kullanılmayan `Link` import'u kaldırıldı.
- **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh` + gerçek `next dev -p 3100`, Node/fetch ile gerçek Auth REST login + elle inşa edilmiş `sb-nlmwcygmbbxmfpsubvmh-auth-token` cookie'si — Playwright yok, önceki partilerin yöntemiyle aynı):**
  1. Gerçek super_admin girişiyle (`tosunbeytullah9@gmail.com`), doğrudan PostgREST'e (`is_super_admin()` RLS, service-role YOK — formun yapacağıyla birebir aynı yol) test org'u ("ZZZ Test Org Parti5C A") oluşturuldu → **201**.
  2. Test org'un id'siyle `POST /api/auth/invite`'a (yeni mini-formun çağıracağı AYNI istek) `role:"admin"` daveti gönderildi → **200 `{success:true}`**.
  3. **Regresyon kontrolü:** AYNI generic proxy'ye, `/settings`'in `onSendInvite`'ının kullandığı şekilde `role:"athlete"` ile ikinci bir davet gönderildi (aynı test org'a) → **200 `{success:true}`** — kod değişmediği için beklenen, canlı olarak da teyit edildi.
  4. Admin API `generate_link` (`type:"magiclink"`) ile davet edilen admin test kullanıcısı için alınan `hashed_token`, gerçek `/auth/confirm`'e verildi → **307 → `/athletes`**.
  5. `memberships` tablosunda SQL ile doğrulandı: davet edilen admin'in satırı DOĞRU yeni-org `org_id`'siyle (`role:"admin"`) oluşmuş (çağıranın KENDİ org'u DEĞİL — asıl düzeltilen budur), regresyon kullanıcısının satırı da aynı org'a (`role:"athlete"`) doğru yazılmış.
  6. İkinci bir test org'u ("ZZZ Test Org Parti5C B") oluşturulup "Şimdilik atla" akışı simüle edildi (hiç invite çağrısı yapılmadan) → SQL ile org'un `membership_count=0` ile kalıcı olduğu doğrulandı.
  7. Tüm test verisi (2 test org'u, 2 davet edilen auth kullanıcı + membership'leri) service-role/Admin API ile temizlendi; `leftover_orgs=0`/`leftover_users=0`/`leftover_memberships=0` ayrı bir SQL sorgusuyla doğrulandı.
  8. `pnpm --filter web build` → 23 sayfa (Parti 5.B ile aynı sayı — yeni route eklenmedi, mevcut sayfa düzenlendi), 0 hata (yalnızca önceden var olan, bu partiyle ilgisiz uyarılar). `pnpm turbo run type-check` → 5/5 paket temiz.
- **BUGS.md kapanışı:** Parti 5.B'de bulunan `/settings` davet formu org-hedefleme sınırlaması notu ✅ FIXED (PARTİ 5.C) olarak kapatıldı — 4 konum senkron edildi (madde gövdesi, header özeti/"Son güncelleme", kategori tablosu satırı, toplam satırı).

### Parti 5 Kapanış Özeti — 5.A + 5.B + 5.C ✅ (2026-07-29)

Parti 5, ürünü self-serve pazarlama/deneme modelinden tamamen çıkardı ve onboarding'i davet-tabanlı hale getirdi:

| Alt-parti | Ne yaptı |
|---|---|
| 5.A | Landing page, trial sistemi (kolonlar+view+banner), demo-talep akışı kaldırıldı; kök `/` doğrudan `/login`'e yönlendiriyor; `023_drop_trial_system.sql` ile `organizations.trial_ends_at/plan_status/owner_id` drop edildi, `orgs_insert` RLS `is_super_admin()`-only'e döndürüldü |
| 5.B | Public self-serve signup wizard (4 adım, hesap→org→takım→tebrikler) tamamen kaldırıldı; yerine super_admin-only `/admin/organizations/new` dahili formu eklendi (yalnızca org adı, ilk admin invite-member ile eklenir); `024_revert_signup_self_serve_rls.sql` ile `memberships_insert_self`'teki self-serve delik kapatıldı |
| 5.C | `/admin/organizations/new`'in başarı ekranına izole bir "ilk admini davet et" mini-formu eklendi (yalnızca e-posta, `role:"admin"` sabit, atlanabilir) — 5.B'nin bıraktığı `/settings` org-hedefleme sınırlaması, `/settings`'e hiç dokunmadan, mevcut `invite-member` bypass'ı + mevcut `/api/auth/invite` proxy'si reuse edilerek kapatıldı |

**Mimari kararlar (kalıcı, gelecekteki partiler bunlara güvenebilir):**
- **Org oluşturma artık tamamen super_admin'e özel:** `orgs_insert` RLS (`is_super_admin()`-only, 023) + `/admin/organizations/new` dahili form (024 sonrası `memberships_insert_self` de kapatıldığı için) — hiçbir kullanıcı artık kendi kendine org veya org-admin-membership'i oluşturamaz.
- **`/admin/*` gating convention'ı middleware-only:** Süper-admin sayfaları kendi içlerinde auth kontrolü İÇERMEZ, `middleware.ts`'teki tek bir `pathname.startsWith("/admin")` bloğuna güvenirler — yeni bir `/admin/*` sayfası eklerken bu convention'ı taklit edin, sayfa/layout seviyesinde ekstra kontrol YAZMAYIN.
- **`packages/validators`/`packages/db/queries` export map'leri elle bakımlı:** Wildcard export yok — yeni bir `.ts` dosyası eklendiğinde ilgili `package.json`'ın `exports` alanına subpath elle eklenmeli, aksi halde `@athleteiq/<pkg>/<yeni-dosya>` importu derleme zamanında "Cannot find module" ile patlar.
- **`invite-member`'ın `isPlatformAdmin` bypass'ı org-agnostik:** Süper admin, hedef org'da HİÇ membership'i olmasa bile herhangi bir org'a davet gönderebilir (`org_id` çağırana göre kısıtlanmıyor) — gelecekte super_admin'in başka bir org'a davet göndermesi gereken bir akış daha çıkarsa, önce bu bypass'ın yeterli olup olmadığına bakın, yeni bir yetki mekanizması icat ETMEYİN (Parti 5.C'nin CASE (A) keşfiyle aynı desen).
- **Çözüldü (Parti 5.C):** `/settings` davet formunun org-hedefleme sınırlaması artık kapsam dışı bir madde DEĞİL — `/admin/organizations/new` üzerinden org oluşturan bir super_admin, aynı akışta ilk adminini de davet edebiliyor. `/settings`'in kendisi hâlâ tek-org-context (kasıtlı, değiştirilmedi).

### Parti 4 Kapanış Özeti — 4.B'den 4.E'ye ✅ (2026-07-28)

Parti 4, sporcu onboarding'ine e-posta gerektirmeyen bir ikinci yol (kullanıcı adı + şifre) ekledi ve bunun doğal sonucu olarak login sayfasını Magic Link'ten tamamen arındırıp tek bir e-posta/kullanıcı-adı + şifre formuna indirgedi. Görev talimatı "4.A'dan 4.E'ye" diyordu; PROGRESS.md/BUGS.md'de ve git geçmişinde (`6593d41`/`7b97b5a`/`80a3966`) ayrı etiketlenmiş bir "4.A" bulunmuyor — bu grubun ilk kaydı **4.B**'dir (`athletes.username` kolonu + `create-athlete-account` Edge Function), bu yüzden özet 4.B'den başlıyor (uydurulmadı, Parti 3 Kapanış Özeti'ndeki aynı "3.A yok" tespitiyle tutarlı bir desen).

| Alt-parti | Ne yaptı | Yeni tablo/fonksiyon/dosyalar |
|---|---|---|
| 4.B | `athletes.username` kolonu (global case-insensitive benzersizlik) + `create-athlete-account` Edge Function — sentetik `${username}@athleteiq.app` e-postasıyla, e-posta gerektirmeyen sporcu hesabı oluşturma, 3 adımlı rollback (auth kullanıcısı asla yetim kalmıyor) | `022_add_athlete_username.sql`, `supabase/functions/create-athlete-account/index.ts` |
| 4.C | `add-athlete-modal.tsx`'e varsayılan KAPALI "Giriş erişimi oluştur (kullanıcı adı ve şifre)" toggle'ı — `create-athlete-account`'ı gerçek bir UI'a bağlayan ilk parti, `/api/auth/invite`'ın proxy desenini birebir taklit eden yeni bir server route üzerinden | `packages/validators/athlete.ts` (genişletildi), `apps/web/app/api/athletes/create-account/route.ts` (yeni), `add-athlete-modal.tsx` (genişletildi) |
| 4.D | Login sayfası tek giriş yöntemine indirgendi — Magic Link sekmesi/UI'ı/`signInWithOtp` tamamen silindi, kalan tek form `identifier` (e-posta VEYA kullanıcı adı) + `password`; `loginSchema.password`'ün `create-athlete-account`'ın minimumuyla (6) uyuşmayan `min(8)` tutarsızlığı bulunup `min(1)`'e düşürüldü | `login-form.tsx` (yeniden yazıldı), `packages/validators/auth.ts` (`loginSchema` değişti, `magicLinkSchema` silindi) |
| 4.E | Rol sistemi regresyon testi (canlı, gerçek Supabase Cloud + gerçek dev server) + bu kapanış dokümantasyonu — kod değişikliği içermedi | — (yalnızca doğrulama + dokümantasyon) |

**Mimari kararlar (kalıcı, gelecekteki partiler bunlara güvenebilir):**
- **Global kullanıcı adı benzersizliği:** `idx_athletes_username_lower` tüm `athletes` tablosu genelinde (org'dan bağımsız) case-insensitive benzersiz — çünkü sentetik e-posta tek bir `@athleteiq.app` alan adı altında, org-scoped benzersizlik iki farklı org'da aynı username'in aynı sentetik e-postaya çakışmasına yol açardı.
- **Opsiyonel giriş erişimi:** roster-only (giriş yok) hâlâ varsayılan ve dokunulmamış davranış; `create_login` toggle'ı açıkça AÇILMADIKÇA hiçbir auth/membership satırı oluşmuyor.
- **Magic Link tamamen kaldırıldı (web):** `signInWithOtp`, `magicLinkSchema`/`MagicLinkInput`, `?tab=` param'ı — hepsi silindi. **`/auth/callback` artık kesin ölü kod** (repo genelinde sıfır canlı referans, yalnızca `/auth/*` middleware muafiyetiyle zararsızca duruyor) — silinmedi, gelecekte bir OAuth sağlayıcısı eklenirse yeniden kullanılabilir bir iskelet olarak bırakıldı. Davet akışı (`/auth/confirm`, `verifyOtp` + `token_hash`/`type`) bundan tamamen bağımsız, hiç etkilenmedi.
- **Mobil bu grubun hiçbir parçasını almadı:** `apps/mobile/app/(auth)/login.tsx` hâlâ kendi bağımsız email/password + Magic Link (`signInWithOtp`) akışını kullanıyor, kullanıcı-adı→sentetik-e-posta dönüşümü yok — Parti 7'yi bekliyor (aşağıda 4.E doğrulaması).

**4.E doğrulaması (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh` + gerçek `next dev` — Playwright bu ortamda yok, önceki partilerin de kullandığı yöntemle: gerçek Auth REST login + `sb-*-auth-token` cookie'si elle inşa edilip gerçek dev server'a curl ile istek):**
1. **Süper admin:** gerçek admin kimliğiyle (CLAUDE.md § 11) 9 route'un (`/admin /dashboard /athletes /programs /acwr /competitions /tests /wearables /settings`) tamamı **200**, SSR HTML'de tam 7 öğelik sidebar (Sporcular/Programlar/Egzersizler/ACWR/Yarışmalar/Testler/Wearable/Ayarlar) doğrulandı.
2. **Coach:** projede hiç coach kimlik bilgisi belgeli değildi (koç ekleme hâlâ bekliyor) — geçici bir coach test hesabı+membership'i (TGF/ACE) servis-rolüyle oluşturulup test edildi: `/athletes /programs /acwr /competitions /tests /wearables /exercises` **200**, `/admin` → `/dashboard` → `/athletes` zincirine 307 ile düşüyor, `/settings` doğrudan `/athletes`'e **307** — beklenen.
3. **Toggle KAPALI (roster-only) sporcu:** taze bir roster-only satır (`user_id`/`username` null) oluşturulup, o sporcu için tahmin edilen bir kullanıcı adıyla giriş denendi → gerçek admin'in yanlış şifreyle denemesiyle **birebir aynı** `400 invalid_credentials` — hiçbir kullanıcı adı sızıntısı/çökme yok (4.D'nin doğruladığı davranışın bu özel "kimlik bilgisi hiç var olmadı" durumunda da geçerli olduğu teyit edildi).
4. **Toggle AÇIK sporcu:** `/api/athletes/create-account` proxy'si üzerinden gerçek bir kullanıcı adı+şifre hesabı oluşturulup login formunun yapacağı sentetik-e-posta dönüşümüyle giriş yapıldı → `/programs` **200**, `/athletes` `/programs/new` `/acwr` `/settings` `/dashboard` hepsi **307 → `/programs`**, sidebar'da yalnızca "Programlar", "Yeni Program" butonu yok — **4 katmanlı guard'ın (middleware/sidebar/layout/UI) hepsi 4.B+4.C+4.D'nin ürettiği hesapla birlikte doğru çalışıyor**.
5. **invite-member uçtan uca:** gerçek admin JWT'siyle canlı deploy edilmiş (`v5`, ACTIVE) `invite-member`'a coach rolüyle gerçek bir davet gönderildi; Admin API'nin `generate_link` uç noktasıyla (Dashboard'a gitmeye gerek kalmadan, invite-member'ın oluşturduğu kullanıcı için) gerçek `token_hash` alınıp gerçek dev server'daki `/auth/confirm`'e curl ile istek atıldı → **307 → `/athletes`** (coach için beklenen hedef), DB'de `memberships` satırı doğru `org_id`/`team_id`/`role:"coach"` ile oluştu. **Bu akış Parti 4'ten hiç etkilenmemiş, hâlâ sağlam.** (Not: Supabase'in varsayılan SMTP'si yalnızca proje ekip üyelerine gönderiyor — bu yüzden gerçek inbox'a düşmek yerine Admin API'den token doğrudan alındı, aynı gerçek kod yolunu test eden daha az sürtünmeli bir yöntem.)
6. **Mobil:** fiziksel cihaza erişim yok — kod seviyesinde doğrulandı (`apps/mobile/app/(auth)/login.tsx`, `packages/validators` importu sıfır, git commit `80a3966` bu dosyaya hiç dokunmamış) — web'in login değişikliğinden **tamamen bağımsız**, sıfır regresyon riski. İki kapsam-dışı bulgu not düşüldü (Parti 7): mobil hâlâ Magic Link sunuyor, mobil'de kullanıcı-adı→sentetik-e-posta dönüşümü yok (bu yüzden `create_login` hesapları bugün mobilde pratikte giriş yapamıyor).
7. **Temizlik:** Adım 2-5'te oluşturulan tüm satırlar (coach test hesabı+membership'i, iki test sporcusu, invite test kullanıcısı+membership'i) service-role ile silindi — `leftover_athletes=0`/`leftover_memberships=0`/`leftover_auth_users=0` doğrulandı.
8. **Bulgu:** hiçbir regresyon yok. Önceden bilinen ve Parti 4'ten bağımsız iki durum tekrar teyit edildi (düzeltilmedi, kapsam dışı): davet edilen *sporcuların* `athletes.user_id`'sinin hiç bağlanmaması (Bilinen Sorunlar #2, yalnızca athlete daveti için geçerli — coach/admin daveti bundan etkilenmiyor), ve CLAUDE.md § 11'in Edge Functions deploy durumu/migration sayısının güncel olmadığı (Supabase MCP ile `invite-member` v5 ve `create-athlete-account` v1'in ikisinin de ACTIVE olduğu doğrulandı — bu ayrı, dar kapsamlı bir CLAUDE.md düzeltmesiyle not düşüldü, bu partinin dar kapsamı gereği genişletilmedi).

### Parti 4.D — Login sayfası: tek giriş yöntemi ✅ (2026-07-27)
- **Kapsam:** `apps/web/app/(auth)/login/login-form.tsx` (yeniden yazıldı), `packages/validators/auth.ts` (`loginSchema` değişti, `magicLinkSchema`/`MagicLinkInput` silindi).
- **Amaç:** Login sayfasında iki ayrı sekme (Magic Link / Şifre ile Giriş) vardı. Magic Link tamamen kaldırılıp, e-posta VEYA kullanıcı adı + şifre ile giriş yapılan tek bir form bırakıldı — Parti 4.B/4.C'de eklenen kullanıcı-adı-tabanlı sporcu hesapları (`${username}@athleteiq.app` sentetik e-postası) için doğal bir giriş yolu.
- **ADIM 0 — `/auth/callback` araştırması (talimatın "emin olamazsan DUR" gereği, kod DEĞİŞTİRİLMEDEN önce yapıldı):**
  - `apps/web/app/auth/callback/route.ts`: `searchParams.get("code")` okuyup `supabase.auth.exchangeCodeForSession(code)` çağırıyor — bu, PKCE "code" tabanlı akışların (Magic Link `signInWithOtp`, gelecekte OAuth) callback'i.
  - Grep ile `emailRedirectTo`/`redirectTo` çağıran TÜM yerler tarandı: **sadece** `login-form.tsx:59`'daki eski `onMagicLink` fonksiyonu `/auth/callback`'e işaret ediyordu (`emailRedirectTo: .../auth/callback?next=...`).
  - `invite-member` Edge Function'ı (`supabase/functions/invite-member/index.ts:88`) davet linkini `redirectTo: ${SITE_URL}/auth/confirm` ile gönderiyor — **tamamen farklı bir route**, `verifyOtp({type, token_hash})` kullanıyor (`apps/web/app/auth/confirm/route.ts`), `pending_org_id`/`pending_role`/`pending_team_id` metadata'sından membership oluşturuyor.
  - **Sonuç: iki route hiç kesişmiyor.** Talimatın verdiği "SADECE magic-link için kullanılıyorsa DOKUNMA" koşulu birebir sağlandı → `/auth/callback` route dosyasına, `middleware.ts`'teki `PUBLIC_ROUTES`/`/auth/*` muafiyetine dokunulmadı. Magic Link kaldırıldıktan sonra bu route artık hiçbir kod yolundan çağrılmıyor (ölü kod, zararsız — gelecekte bir OAuth sağlayıcısı eklenirse yeniden kullanılabilir bir iskelet).
- **ADIM 1 — `login-form.tsx` yeniden yazıldı:**
  - `Tab` tipi, `tab`/`defaultTab`/`magicSent` state'leri, `magicForm`, Magic Link sekmesinin tüm JSX'i (buton + form bloğu), `onMagicLink` fonksiyonu ve `signInWithOtp` çağrısı tamamen silindi.
  - `?tab=password` okuyan `searchParams.get("tab")` satırı kaldırıldı. Projede bu param'a link veren başka bir yer olup olmadığı grep ile tarandı (`tab=password`, `?tab=`) — tek eşleşme `trial-banner.tsx`'teki alakasız `?tab=billing` (settings sayfası için, login'le ilgisi yok), başka güncellenecek yer yok.
  - Kalan tek form: "E-posta veya kullanıcı adı" (`id="login-identifier"`, `autoComplete="username"`) + "Şifre". `useForm<LoginInput>` tek bir `zodResolver(loginSchema)` kullanıyor.
  - `onSubmit`: talimatın verdiği mantık birebir uygulandı —
    ```ts
    const identifier = values.identifier.includes("@")
      ? values.identifier
      : `${values.identifier.toLowerCase()}@athleteiq.app`;
    supabase.auth.signInWithPassword({ email: identifier, password: values.password });
    ```
  - Hata mesajı artık her zaman sabit: `"E-posta/kullanıcı adı veya şifre hatalı"` — eski kod `` `Hata: ${error.message}` `` ile Supabase'in ham hata metnini (örn. "Email not confirmed" gibi bilgi sızdırabilecek varyasyonları) doğrudan kullanıcıya gösteriyordu; artık `error.message` yalnızca `console.error`'a gidiyor, UI'a hiç sızmıyor. Başarılı giriş sonrası davranış (hard navigation `window.location.href = next`, ROL CACHE fix'inin gerektirdiği) değişmedi.
- **ADIM 2 — `packages/validators/auth.ts`:**
  - `loginSchema`: `email: z.string().email(...)` + `password: z.string().min(8, ...)` → `identifier: z.string().min(1, "E-posta veya kullanıcı adı girin")` + `password: z.string().min(1, "Şifre girin")`.
  - **Bulunan ve düzeltilen tutarsızlık:** eski `min(8)` şartı `create-athlete-account` Edge Function'ının parola minimumuyla (`>= 6` karakter, bkz. PROGRESS.md § Parti 4.B madde 5) uyuşmuyordu. 6-7 karakterlik geçerli bir sporcu şifresiyle giriş denemesi, sunucuya hiç ulaşmadan client-side Zod tarafından "Şifre en az 8 karakter olmalı" ile reddedilirdi — bu, madde 3.b'nin (kullanıcı adıyla giriş doğrulaması) canlı testinde fiilen karşılaşılabilecek bir kilitlenme senaryosuydu. Çözüm: login formunda karmaşıklık/uzunluk kontrolü kaldırıldı (yalnızca boş-olmama), gerçek doğrulama zaten sunucuda (`signInWithPassword`) yapılıyor — login formu bir hesap OLUŞTURMUYOR, var olan bir şifreyi kabul ediyor, dolayısıyla client-side minimum uzunluk zorlaması yanlış yerde bir kısıtlamaydı.
  - `magicLinkSchema`/`MagicLinkInput` export'ları tamamen silindi — grep ile projede (`apps/mobile` dahil) başka hiçbir çağıran kalmadığı doğrulandı (mobile kendi ayrı `signInWithOtp` çağrısını doğrudan yapıyor, bu şemayı hiç import etmiyordu).
- **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek dev server `next dev -p 3071`, Playwright bu ortamda yok — önceki partilerin de kaydettiği kısıt, yerine gerçek Auth REST + gerçek middleware'e karşı `sb-*-auth-token` cookie'siyle istek deseni kullanıldı):**
  1. **Build/type-check önce:** `pnpm turbo run type-check` → 5/5 paket temiz. `pnpm --filter web build` → 27 sayfa, 0 hata (yalnızca önceden var olan uyarılar, `login-form.tsx`/`auth.ts` kaynaklı yeni uyarı yok).
  2. **(a) E-posta+şifre giriş (admin, CLAUDE.md § 11):** `identifier.includes("@")` dalını simüle etmek için gerçek admin e-postası+şifresiyle doğrudan Supabase Auth REST'e (`POST /auth/v1/token?grant_type=password`) istek atıldı → **200**, `access_token` alındı (kodun bu identifier'ı hiç dönüştürmeden geçirdiği doğrulandı).
  3. **(b) Kullanıcı adıyla giriş:** Parti 4.C'nin kurduğu `/api/athletes/create-account` proxy'siyle (admin session cookie + gerçek dev server) taze bir test sporcusu oluşturuldu (`username: "parti4d.test1"`, TGF org/ACE takım, `password: "testpass123"`) → **200**. Ardından `login-form.tsx`'in `onSubmit`'teki dönüşüm mantığı elle uygulanıp (`parti4d.test1` → `parti4d.test1@athleteiq.app`) aynı Auth REST endpoint'ine istek atıldı → **200**, `access_token` alındı — kullanıcı adı yolu doğru sentetik e-postaya çevrilip başarıyla doğrulandı.
     - **Rota/profil doğrulaması:** bu sporcunun gerçek session'ından inşa edilen `sb-nlmwcygmbbxmfpsubvmh-auth-token` cookie'siyle gerçek dev server'a `GET /programs` → **200**, middleware `aiq_role=athlete`/`aiq_org_id=<TGF>`/`aiq_team_id=<ACE>` cookie'lerini DB'den taze çekip doğru yazdı (yani athlete kendi org/takımına doğru çözüldü). Aynı cookie'yle `GET /athletes` → **307 → `/programs`** (athlete guard'ın kullanıcı adıyla girmiş bir hesap için de aynen çalıştığı doğrulandı).
  4. **(c) Yanlış şifre / var olmayan kullanıcı — enumeration kontrolü:** `parti4d.test1@athleteiq.app` + yanlış şifre VE var olmayan bir kullanıcı adı + rastgele şifre, ikisi de doğrudan Auth REST'e denendi → **ikisi de birebir aynı** `400 {"error_code":"invalid_credentials","msg":"Invalid login credentials"}` döndürdü (Supabase API'si zaten ayrım yapmıyor). Kod tarafında da `onSubmit` her `error` durumunda `error.message`'ı hiç okumadan sabit `"E-posta/kullanıcı adı veya şifre hatalı"` gösteriyor (madde ADIM 1'de doğrulanan kod incelemesi) — iki katmanlı doğrulama: ne API ne UI, kullanıcı adının var olup olmadığını sızdırmıyor.
  5. **(d) Magic Link kalıntısı taraması:** derlenmiş `/login` sayfası HTML'i çekilip `grep -i "magic"` ile tarandı → **0 eşleşme**. Ayrıca tüm codebase'de `signInWithOtp` grep edildi → web tarafında **0 eşleşme** (yalnızca `apps/mobile/app/(auth)/login.tsx` kaldı — ayrı, kapsam dışı bir uygulama, dokunulmadı). `magicLinkSchema`/`MagicLinkInput` grep'i de **0 eşleşme**.
  6. **(e) Temizlik:** test sporcusunun `memberships`/`athletes` satırları + `auth.users` kaydı service-role ile silindi (`leftover_athletes=0`, `leftover_memberships=0`). Dev server (port 3071) durduruldu, session token'ları içeren scratch dosyaları silindi.
- **Kapsam dışı bırakılan (bilinçli):** `apps/web/app/(auth)/invite/[token]/page.tsx` — bu sayfa `/auth/confirm`'den TAMAMEN AYRI bir mekanizma kullanıyor (`getSession()` ile URL hash'inden okuma), talimat kapsamında değildi, dokunulmadı. `apps/mobile`'ın kendi Magic Link giriş yolu (`apps/mobile/app/(auth)/login.tsx`) — talimat yalnızca web login sayfasını kapsıyordu.

### Parti 4.C — add-athlete-modal.tsx: opsiyonel giriş erişimi ✅ (2026-07-27)
- **Kapsam:** `packages/validators/athlete.ts` (genişletildi), `apps/web/app/api/athletes/create-account/route.ts` (yeni), `apps/web/components/features/athletes/add-athlete-modal.tsx` (genişletildi).
- **Amaç:** Parti 4.B, `create-athlete-account` Edge Function'ını yalnızca şema+fonksiyon seviyesinde bırakmıştı ("Bu fonksiyonu web/mobile UI'dan çağıran bir form eklenmedi"). Bu parti, `add-athlete-modal.tsx`'e bir toggle ekleyip fonksiyonu koç/admin'in gerçekten kullanabileceği bir yere bağladı.
- **Önce-araştırma bulgusu (talimatın "mevcut supabase.functions.invoke pattern'ini projede ara" adımı):** Projede `supabase.functions.invoke(...)` literal olarak **hiç kullanılmıyor** (grep ile doğrulandı — `functions.invoke` sıfır eşleşme). Edge Function çağırmanın gerçek, tek örneği `apps/web/app/api/auth/invite/route.ts`: bir Next.js API route, kendi server-side Supabase client'ıyla oturumu okuyup (`supabase.auth.getSession()`), `${supabaseUrl}/functions/v1/<fn>`'e `Authorization: Bearer <access_token>` + `apikey: <anon key>` header'larıyla `fetch` atıyor; client component (`settings-client.tsx`) da bu route'a kendi `fetch("/api/auth/invite", ...)` çağrısıyla ulaşıyor. Talimatın "yeni bir fetch client'ı icat etme" isteğine uyularak bu **gerçek** desen birebir taklit edildi — yeni `/api/athletes/create-account/route.ts` (server-side proxy) + modal'dan ona `fetch` (bkz. aşağıda ADIM 2/3). "Zod şeması ya da form state yönetimiyle çakışan bir şey bulursan DUR" talimatı burada tetiklenmedi çünkü bu bir çakışma değil, yalnızca talimattaki varsayımın (`.functions.invoke` deseni var) gerçekte farklı bir mekanizmayla (proxy route) karşılandığı bir durumdu — talimatın ruhuna (yeni bir fetch client icat etmemek) tam uyduğu için onaylanmadan devam edildi.
- **ADIM 1 — Zod şeması (`packages/validators/athlete.ts`):** `createAthleteSchema` tek bir `z.object(...)` iken, iç yapı `createAthleteBaseSchema` (düz `ZodObject`) + `createAthleteSchema = createAthleteBaseSchema.superRefine(...)` olarak ikiye ayrıldı. **Neden:** `updateAthleteSchema = createAthleteSchema.partial()` mevcut kodda vardı (kullanılmıyor ama export ediliyor); `.superRefine()` bir `ZodEffects` döndürür ve `ZodEffects`'in `.partial()` metodu yok — talimatı harfiyen uygulayıp `createAthleteSchema`'yı doğrudan refine edersem `updateAthleteSchema` derleme hatası verirdi. Çözüm: `updateAthleteSchema` artık `createAthleteBaseSchema.partial()`'dan türüyor (davranışı değişmedi), `createAthleteSchema` (talimatın istediği isim) ise base + koşullu doğrulamayı taşıyor. Yeni alanlar: `create_login: z.boolean().optional().default(false)`, `username: z.string().optional()`, `password: z.string().optional()`. `superRefine`: `create_login=false` ise hiçbir ek kontrol yok (dokunulmamış roster-only akışla tam uyumlu); `true` ise `username` için `ATHLETE_USERNAME_RE = /^[a-z0-9._]{3,30}$/` (Edge Function'daki `USERNAME_RE`'nin **birebir kopyası**, kaynak dosyadan okunarak) ve `password.length >= 6` kontrol edilip hatalar `ctx.addIssue({path:["username"|"password"], ...})` ile ilgili alana bağlanıyor (react-hook-form `errors.username`/`errors.password` olarak otomatik yakalıyor).
- **ADIM 2 — Proxy route (`apps/web/app/api/athletes/create-account/route.ts`, yeni):** `/api/auth/invite/route.ts` ile satır satır aynı iskelet: `createClient()` (server) → `auth.getUser()` yoksa 401 → `auth.getSession()`'dan `access_token` → `fetch(`${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-athlete-account`, {Authorization, apikey})` → Edge Function'ın döndürdüğü **status kodu ve body'yi olduğu gibi** çağırana geçiyor (400/409/200 hepsi şeffaf geçiyor, invite route'un yaptığı gibi). İstek body'si hiç dönüştürülmeden olduğu gibi Edge Function'a iletiliyor (validasyon zaten hem client'ta hem Edge Function'da var, route'ta üçüncü bir kopya yaratılmadı — tekilleştirme).
- **ADIM 3 — Modal (`add-athlete-modal.tsx`):**
  - `useForm`'a `defaultValues: {create_login: false}` (varsayılan KAPALI, talimatın istediği gibi), `watch`/`setError` eklendi.
  - Formun sonuna (Notlar'dan sonra, hata mesajından önce) bir `border-t` ile ayrılmış checkbox satırı ("Giriş erişimi oluştur (kullanıcı adı ve şifre)") + `createLogin && (...)` ile koşullu render edilen kullanıcı adı (`placeholder="orn. kerem.sener"`) ve şifre (`type="password"`, `placeholder="En az 6 karakter"`) alanları eklendi. Projede özel bir `Checkbox` bileşeni olmadığından (yalnızca `Input`/`Label`/`Button`/`Badge`/`Card`/`Skeleton` var, `packages/ui/components/`), modalın zaten `team_id`/`gender` için yaptığı gibi çıplak `<select>`/`<input>` konvansiyonuna uyularak düz `<input type="checkbox">` kullanıldı — "özel tasarım yapma" kuralına aykırı değil, dosyanın kendi mevcut deseni.
  - **`onSubmit` iki fonksiyona bölündü:**
    - `submitRosterOnly(data)` — **toggle KAPALIYKEN çağrılan, davranışça DOKUNULMAMIŞ yol.** Tek fark: eskiden `{...data, org_id, height_cm, weight_kg}` ile `data` **spread** ediliyordu; artık `data` yeni `create_login`/`username`/`password` alanları da taşıdığından (bunlar `athletes` tablosunda kolon değil — `username` **hariç**, o Parti 4.B'de eklendi ama burada hep `undefined` kalmalı), spread yerine yalnızca gerekli 8 alan **açıkça** listelenip `createAthlete()`'e geçiliyor. Davranış birebir aynı (aynı sütunlar, aynı değerler) — yalnızca yeni alanların insert payload'ına sızmaması için zorunlu bir uygulama detayı değişikliği, talimatın "DOKUNMA" dediği iş mantığı değişmedi.
    - `submitWithLogin(data)` — **toggle AÇIKKEN çağrılan yeni yol.** `/api/athletes/create-account`'a `{username, password, full_name, org_id, team_id, birth_date, gender, height_cm, weight_kg, position, notes}` POST ediyor. `res.ok` değilse: `409` → her zaman `setError("username", {message:"Bu kullanıcı adı alınmış, başka bir tane deneyin"})` (talimatın istediği birebir metin); `400` ve mesaj "Kullanıcı adı" içeriyorsa → `username` alanına, "Parola" içeriyorsa → `password` alanına inline bağlanıyor; ikisine de uymayan bir 400/500 → genel `submitError` banner'ına düşüyor (yedek). Fonksiyon `false` dönerse `onSubmit` modalı **kapatmıyor**, `reset()`/`onSuccess()` çağırmıyor — kullanıcı hatayı görüp düzeltebiliyor.
  - `onSuccess()` çağrısı (mevcut `router.refresh()` pattern'i, `athletes-client.tsx`'te tanımlı) her iki yolda da aynı — talimatın "invalidateQueries pattern'i neyse onu kullan" isteği karşılandı (projede TanStack Query kullanılmıyor, gerçek pattern `router.refresh()`, ona dokunulmadı).
- **GÜVENLİK (madde 4):** Şifre hiçbir `console.log`/`console.error`'a yazılmıyor (her iki yeni fonksiyon da inceleme sonucu doğrulandı — yalnızca `fetch` body'sine JSON olarak giriyor). Proxy route da body'yi loglamıyor, olduğu gibi Edge Function'a forward ediyor. Tarayıcıdan Edge Function'a giden tüm trafik zaten HTTPS (`https://nlmwcygmbbxmfpsubvmh.supabase.co`).
- **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek admin JWT + gerçek çalışan `next dev` + gerçek `sb-*-auth-token` session cookie'siyle, Tip Güvenliği Temizliği v2'de kurulan yöntemin aynısı — Playwright bu ortamda yok):**
  1. **(a) Toggle KAPALI:** `submitRosterOnly`'nin ürettiği payload'ın birebir aynısı (`username`/`create_login`/`password` alanları OLMADAN) gerçek admin access_token'ıyla doğrudan PostgREST'e (`POST /rest/v1/athletes`) gönderildi → **201**, dönen satırda `user_id: null`, `username: null` — roster-only, hiçbir auth kaydı yok.
  2. **(b) Toggle AÇIK:** `next dev -p 3061` başlatıldı; admin'in gerçek şifresiyle (CLAUDE.md § 11) Auth REST'ten alınan gerçek session, `@supabase/ssr` kodlamasıyla (`"base64-" + base64url(JSON.stringify(session))`) bir `sb-nlmwcygmbbxmfpsubvmh-auth-token` cookie'sine paketlenip gerçek dev server'a `POST http://localhost:3061/api/athletes/create-account` ile gönderildi (TGF org `b6ad5c19-...`/ACE takım `0ae7416f-...`, `username:"parti4c.test1"`) → **200**, `{success:true, athlete:{...}, username:"parti4c.test1"}`. SQL ile üç tablo doğrulandı: `athletes` (username/org/team doğru), `memberships` (`role:"athlete"`), `auth.users` (`email:"parti4c.test1@athleteiq.app"`, `email_confirmed_at` dolu). Cookie'siz aynı istek → middleware zaten `/login`'e 307 atıyor (route'un kendi 401 guard'ı yalnızca middleware'i atlatan/geçersiz session durumları için ikinci savunma katmanı).
  3. **(c) Aynı kullanıcı adıyla tekrar:** aynı route'a `username:"parti4c.test1"` tekrar gönderildi → **409** `{"error":"Bu kullanıcı adı alınmış"}` — modal bunu `username` alanına inline bağlıyor. Ayrıca `password:"123"` (kısa parola) ile ayrı bir kullanıcı adı denendi → **400** `{"error":"Parola en az 6 karakter olmalı"}`, ve `auth.users`'ta bu kullanıcı adı için **hiçbir** yetim kayıt oluşmadığı doğrulandı (`orphan_count:0`).
  4. **(d) Temizlik:** `parti4c.test1` + `PARTI4C-ROSTER-ONLY` satırları (athletes/memberships/auth.users) service-role SQL ile silindi — `leftover_athletes=0`/`leftover_memberships=0`/`leftover_auth_users=0`. `next dev` süreci (port 3061) durduruldu, session token'larını içeren scratch dosyaları silindi.
  5. **(e) Build/type-check:** `pnpm turbo run type-check` → 5/5 paket temiz (yeni `create_login`/`username`/`password` alanları ve yeni route dahil, 0 hata). `pnpm --filter web build` → başarılı (27 sayfa + yeni `/api/athletes/create-account` route listede), yalnızca önceden var olan uyarılar, yeni uyarı yok.

### Parti 4.B — `athletes.username` kolonu + `create-athlete-account` Edge Function ✅ (2026-07-27)
- **Kapsam:** `supabase/migrations/022_add_athlete_username.sql` (yeni), `packages/db/types.ts` (regen, aynı commit), `supabase/functions/create-athlete-account/index.ts` (yeni).
- **Amaç:** Mevcut tek sporcu onboarding yolu (`invite-member` Edge Function → gerçek e-postaya davet linki → `/auth/confirm` → membership) e-postası olmayan/olmaması istenen sporcular (örn. küçük yaştaki sporcular) için uygun değildi. Bu parti, koç/admin'in doğrudan bir kullanıcı adı + parola ile sporcu hesabı oluşturmasını sağlıyor.
- **Önce-araştırma bulgusu (talimatın adım h'si — "ÖNCE incele/raporla" gereği, implementasyondan önce plan dosyasında raporlandı, kullanıcı onayladı):** Rol ataması projede **yalnızca** `memberships` tablosu üzerinden yapılıyor. Kanıt: `apps/web/middleware.ts:98-122` — kullanıcının `memberships` satırı yoksa `/login?error=no_membership`'e redirect ediliyor (giriş fiilen imkansız); `apps/web/app/auth/confirm/route.ts:36-44` — mevcut davet akışı `verifyOtp` sonrası `memberships`'e upsert yapıyor, rol `athletes` satırından hiç türetilmiyor. **Sonuç:** Yeni fonksiyon `memberships` satırı oluşturmazsa, oluşturduğu sporcu hiçbir zaman giriş yapamaz — bu yüzden adım (h) atlanabilir bir "ekstra" değil, fonksiyonun çalışması için zorunlu bir adım olarak uygulandı.
- **Kapsam genişletmesi (kullanıcıya soruldu, onaylandı):** Talimatın girdi sözleşmesi çağıranın kim olduğunu belirtmiyordu, ama fonksiyon doğrudan request body'deki `org_id`/`team_id` ile gerçek bir login hesabı oluşturuyor — yetkisiz bir çağıran, UUID'leri bilerek herhangi bir org'da hesap açabilirdi. `invite-member`'daki (`supabase/functions/invite-member/index.ts:60-76`) çağıran-yetkilendirme deseninin burada da gerekli olduğu kullanıcıya soruldu, "admin/coach gerektir" (önerilen) seçeneği onaylandı. **Uygulanan kural** icat edilmedi, canlıdan okunan `athletes_insert` RLS politikasıyla (`supabase/migrations/002_rls.sql:80-84`: `is_super_admin() or my_role(org_id)='admin' or (my_role(org_id)='coach' and team_id=my_team_id(org_id))`) birebir eşleştirildi — super_admin her zaman, org admin'i org genelinde, coach ise SADECE kendi `team_id`'sine sporcu ekleyebiliyor (invite-member'ın aksine — o yalnızca admin'e izin veriyor, çünkü üyelik davet etmek farklı bir yetki sınıfı; burada CLAUDE.md §6 Agent 3'ün "Coach sporcu ekleyebilir" ürün kararına uyularak coach de dahil edildi).
- **Migration (`022_add_athlete_username.sql`):** `alter table athletes add column username text` (nullable — mevcut e-posta tabanlı hesaplar, örn. İbrahim, zorla migrate edilmiyor) + `create unique index idx_athletes_username_lower on athletes (lower(username)) where username is not null` (case-insensitive, **org'dan bağımsız global** benzersizlik — talimatın istediği gibi, çünkü sentetik e-posta tek bir alan adı `@athleteiq.app` altında, iki farklı org'da aynı username iki farklı sentetik e-postaya çakışırdı). `supabase db push` ile cloud'a uygulandı (yerel Docker stack'i bu oturumda kapalıydı, `docker ps` bağlanamadı — bu yüzden hem migration hem types regen hem function deploy doğrudan cloud'a karşı yapıldı, `--local` yerine `--linked`). `packages/db/types.ts` aynı adımda `supabase gen types typescript --linked` ile regenerate edildi (CLAUDE.md §4.2 konvansiyonu) — `athletes` Row/Insert/Update tiplerinde `username: string | null` doğrulandı. `pnpm turbo run type-check` → 5/5 paket temiz, yeni hata yok (saf additive kolon).
- **Edge Function akışı (`create-athlete-account/index.ts`, `invite-member`'ın `corsHeaders`/`createClient`/caller-JWT deseni birebir taklit edilerek):**
  1. `Authorization` header yoksa 401.
  2. Çağıran-yetkilendirme (yukarıdaki `athletes_insert` eşleşmesi) — değilse 403.
  3. `team_id`'nin gerçekten `org_id`'ye ait olduğu doğrulanıyor (`teams` tablosunda `id=team_id and org_id=org_id` var mı) — değilse 400. Talimatın adım listesinde yoktu, org/team uyuşmazlığına karşı düşük riskli bir savunma eklemesi olarak dahil edildi.
  4. Username formatı `/^[a-z0-9._]{3,30}$/` — uymuyorsa 400.
  5. Parola `< 6` karakter — 400.
  6. Benzersizlik ön kontrolü (`athletes` tablosunda `ilike` ile case-insensitive) — varsa 409 "Bu kullanıcı adı alınmış".
  7. Sentetik e-posta `${username.toLowerCase()}@athleteiq.app`, `auth.admin.createUser({ email, password, email_confirm: true })`.
  8. `athletes` insert — **başarısızsa rollback: `auth.admin.deleteUser`** (unique-index ihlaliyse 409, aksi halde 500).
  9. `memberships` insert (`role: "athlete"`, `invited_by: caller.id`) — **başarısızsa rollback: hem az önce eklenen `athletes` satırını hem de auth kullanıcısını sil** (talimatın adım-g rollback disiplini adım-h'ye de genişletildi — aksi halde giriş yapamayan yetim bir sporcu satırı kalırdı).
  10. Başarı: `200 { success: true, athlete: {...}, username }`.
- **DOĞRULAMA (canlı, Supabase Cloud `nlmwcygmbbxmfpsubvmh`, mock YOK):**
  1. `supabase functions deploy create-athlete-account` → başarılı.
  2. Gerçek admin JWT: `/auth/v1/token?grant_type=password` ile CLAUDE.md §11 test admin kimliği (`tosunbeytullah9@gmail.com`) — gerçek `access_token` alındı.
  3. Gerçek `org_id`/`team_id`: TGF org (`b6ad5c19-09e0-4116-9ce8-a31e0dba36f5`) + ACE takımı (`0ae7416f-451f-42b4-9a40-bb32a7b36139`), admin'in kendi `memberships` satırı (`role:"admin", team_id:null` — org geneli) SQL ile doğrulandı.
  4. **Başarı testi (`test.sporcu1`):** gerçek HTTP POST → **200**, `{success:true, athlete:{...}, username:"test.sporcu1"}`. SQL ile üç tablo da doğrulandı: `athletes` (username/org/team doğru), `memberships` (`role:"athlete"`, org/team doğru), `auth.users` (email `test.sporcu1@athleteiq.app`, `email_confirmed_at` dolu).
  5. **Tekrar aynı username:** **409** `{"error":"Bu kullanıcı adı alınmış"}`.
  6. **Kısa parola (`test.sporcu2`, `password:"123"`):** **400** `{"error":"Parola en az 6 karakter olmalı"}`. Ardından hem `athletes` hem `auth.users` (tam kullanıcı listesi taranarak) kontrol edildi — `test.sporcu2` için **hiçbir** satır oluşmadığı doğrulandı (uzunluk kontrolü `createUser`'dan önce çalışıyor, orphan yok).
  7. **Temizlik:** `test.sporcu1`'in `memberships`/`athletes`/`auth.users` satırları service-role ile silindi; sonrasında `auth.users` listesi tam olarak orijinal 2 kullanıcıya (İbrahim + admin) döndüğü doğrulandı — `leftover=0`.
- **Kapsam dışı bırakılan:** Gerçek tarayıcı/Playwright doğrulaması (araç bu ortamda mevcut değil, önceki partilerin de kaydettiği kısıt) — yerine gerçek Edge Function HTTP çağrıları + gerçek admin Auth JWT'siyle canlı SQL doğrulaması kullanıldı (en güçlü alternatif). Bu fonksiyonu web/mobile UI'dan çağıran bir form eklenmedi — talimat yalnızca şema + Edge Function kapsamındaydı.

### Tip Güvenliği Temizliği v2 — client sınırında dar assertion ✅ (2026-07-23)
- **Kapsam:** `apps/web/lib/supabase/client.ts`, `apps/web/lib/supabase/server.ts` (2 export: `createClient`, `createServiceClient`), `apps/web/app/(dashboard)/programs/new/new-program-client.tsx`, `apps/web/app/(dashboard)/programs/[id]/edit/edit-program-client.tsx`.
- **Kök neden doğrulaması (talimat gereği, tahmin edilmedi):** `node_modules/.pnpm` altından gerçek sürümler okundu — `@supabase/ssr@0.5.2`, `@supabase/supabase-js@2.108.2` (tek hoisted kopya, pnpm workspace). `@supabase/ssr`'ın kendi `package.json`'ı `peerDependencies: { "@supabase/supabase-js": "^2.43.4" }` diyor — yüklü sürüm bunun çok ötesinde. `createBrowserClient.d.ts`/`createServerClient.d.ts` hâlâ `SupabaseClient<Database, SchemaName, Schema>` (3 generic) dönüyor; bu, çağıranın (client.ts/server.ts) beklediği düz kullanım biçimiyle (RPC/`.from()` çağrılarında) tam hizalanmıyor — önceki partilerde (2.2.D'den beri, bkz. Parti 2.2.D/3.D notları) bu üç RPC call site'ında (`create_program_with_weeks`, `update_program_week`, `propagate_week_to_future`) `const db = supabase as any;` ile aşılıyordu.
- **ADIM 1 — `client.ts`/`server.ts`:** `createBrowserClient<Database, "public">(...)` ve her iki `server.ts` export'unun (`createClient`, `createServiceClient`) `createServerClient<Database, "public">(...)` çağrıları **aynı kaldı** (zaten hatasız derleniyordu) — yalnızca dönüş değeri `as unknown as SupabaseClient<Database, "public">` ile assert edildi. Değişikliğin dar kalması için mevcut çağrı imzasına dokunulmadı, yalnızca dış katmana bir cast eklendi. Her iki dosyanın fonksiyon tanımının hemen üstüne talimatın verdiği açıklayıcı yorum harfiyen eklendi.
- **ADIM 2 — 3 call site:** `new-program-client.tsx`'te 1, `edit-program-client.tsx`'te 2 (`update_program_week`, `propagate_week_to_future`) olmak üzere `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + `const db = supabase as any;` satırları kaldırıldı, doğrudan `supabase.rpc(...)` çağrılıyor.
- **ADIM 3 — Yeni TS hataları (dar şekilde çözüldü, client'a dokunulmadı):** `db = supabase as any` kaldırılınca `tsc --noEmit` 9 yeni hata verdi, ikisi ayrı kök nedenden:
  - **(a) Nullable Args:** `create_program_with_weeks`'in `p_team_id`/`p_athlete_id`/`p_phase`/`p_notes` parametreleri (ve `update_program_week`'in `p_phase`/`p_notes`'u) Postgres tarafında nullable, ama `supabase gen types`'ın ürettiği `Args` tipi bunu `string` (nullable değil) olarak işaretliyor — bilinen bir gen-types kısıtı, RPC'nin kendisi zaten `null` kabul ediyor (018/020 migration'larında parametre tipleri nullable). Çözüm: yalnızca bu 4+2 parametrenin değerine `as string` (ör. `(data.phase ?? null) as string`) — `string`, `string | null`'a assignable olduğundan TS bu cast'e izin veriyor, `client.ts`'e dokunmadan.
  - **(b) `create_program_with_weeks`'in dönüş tipi:** Postgres'te jsonb (`{block_id, program_ids}`), gen-types'ta genel `Json` birleşimi olarak üretilmiş. Çözüm: `result` yerine `const typedResult = result as { block_id: string | null; program_ids: string[] } | null;` — yalnızca bu dönüş değeri için dar bir cast, RPC'nin gerçek dönüş şekliyle (018_create_program_with_weeks.sql) birebir.
  - `propagate_week_to_future` call site'ı `error`'dan başka bir şey okumadığından ek cast gerekmedi.
- **DOĞRULAMA (talimatın istediği iki katman + build/type-check):**
  1. **RPC katmanı (3.C/3.E/3.F test setinin aynen tekrarı, canlı Supabase Cloud `nlmwcygmbbxmfpsubvmh`, `set local role authenticated` + `set local request.jwt.claims` simülasyonu, gerçek TGF/İbrahim/ACE verisiyle):** Geçici `TYPE-SAFETY-TEST 1 Hafta` (weeks_count=1 → `block_id:null`, tek program) ve `TYPE-SAFETY-TEST 4 Hafta` (weeks_count=4 → 1 block + 4 program, `week_index_in_block` 1-4, `week_number` 32-35 ardışık, her haftada 2 seans/1 egzersiz birebir klonlanmış) admin kimliğiyle oluşturuldu. Hafta 2'de `update_program_week` (Back Squat 80→90kg, yeni Bench Press egzersizi, `notes:"düzenlendi"`) → yalnızca hedef program değişti. `propagate_week_to_future(hafta2)` → hafta 3 ve 4'ün içeriği (2 egzersiz) hafta 2 ile birebir aynı oldu, kendi `notes`/`start_date`/`end_date`'leri (null, orijinal tarihler) değişmedi; hafta 1 tamamen etkilenmedi (1 egzersiz, `notes:null`). İbrahim'in gerçek kimliğiyle (0 membership) aynı `update_program_week` çağrısı → `ERROR: P0001: yetkisiz`, program değişmedi (title kontrol edildi). Test verisi silindi, `leftover_programs=0`/`leftover_blocks=0` doğrulandı — **beşi de önceki partilerin dokümante ettiği sonuçlarla birebir eşleşti, davranış farkı yok** (beklenen: bu parti yalnızca TS tip katmanını değiştirdi, RPC'lerin SQL'ine hiç dokunmadı).
  2. **Yazım hatası testi:** `new-program-client.tsx`'te `"create_program_with_weeks"` geçici olarak `"create_program_with_weks"` yapıldı → `tsc --noEmit` `TS2345: Argument of type '"create_program_with_weks"' is not assignable to parameter of type '"calculate_acwr" | "copy_program_tree" | "create_program_with_weeks" | ...'` ile reddetti (önceki `as any` altında bu sessizce derlenip yalnızca runtime'da `PGRST202`/"function not found" ile patlardı). Düzeltilip tekrar `tsc --noEmit` çalıştırıldı, 0 hata.
  3. **Auth sağlamlık kontrolü (client.ts'e dokunulduğu için zorunlu adım):** Playwright bu ortamda yok (önceki partilerin de kaydettiği kısıt) — bunun yerine **gerçek bir tarayıcı oturumunun üreteceği duruma en yakın alternatif** kullanıldı: `apps/web` içinde `next dev -p 3057` başlatıldı; admin test kullanıcısının (tosunbeytullah9@gmail.com, CLAUDE.md § 11) gerçek şifresiyle Supabase Auth REST'ine (`/auth/v1/token?grant_type=password`) POST edilip gerçek `access_token`/`refresh_token` alındı; `@supabase/supabase-js`'in `storageKey` formülüyle (`sb-${hostname.split('.')[0]}-auth-token`, `SupabaseClient.ts:324`) ve `@supabase/ssr`'ın kendi cookie kodlamasıyla (`cookies.ts`: `"base64-" + base64url(JSON.stringify(session))`, `MAX_CHUNK_SIZE=3180` altında kaldığı için tek parça) birebir eşleşen bir `sb-nlmwcygmbbxmfpsubvmh-auth-token` cookie'si elle inşa edildi ve gerçek dev server'a `curl` ile gönderildi:
     - Cookiesiz `/programs` → `307` → `/login` (temel davranış, referans).
     - Gerçek admin cookie'siyle `/programs` → `200`, middleware `aiq_uid`/`aiq_role=admin`/`aiq_org_id` cookie'lerini DB'den taze çekip doğru yazdı (rol cache mantığı, bkz. "ROL CACHE" fix'i çalışıyor), sayfa body'sinde admin'e özel "Yeni Program" butonu render edildi.
     - `POST /auth/logout` (gerçek cookie'yle) → `200`, `sb-...-auth-token` cookie'si `Max-Age=0` ile temizlendi, `aiq_*` cookie'leri silindi; **aynı (artık eski) cookie'yle** tekrar `/programs` → `307` → `/login` — yani `supabase.auth.signOut()` yalnızca yerel cookie'yi değil, sunucu tarafında refresh token'ı da geçersiz kılmış (gerçek bir oturum sonlandırma, sahte değil).
     - RLS SELECT: İbrahim'in gerçek kimliğiyle (`set local request.jwt.claims`, membership'siz, sadece `athletes` tablosunda ACE takımının bir satırı) `select * from training_programs` → yalnızca kendi takımının 2 yayınlanmış programı (`aaaaaaaaaaa`, `Hipertrofi`) döndü, RLS'in `programs_select` politikası (athletes tablosu üzerinden, memberships'ten bağımsız) hâlâ doğru çalışıyor.
     - **Sonuç: assertion'ın gerçekten SADECE tip seviyesinde olduğu kanıtlandı** — middleware, login, logout, RLS'in hiçbiri runtime'da farklı davranmadı.
  4. **Build/type-check:** `pnpm --filter @athleteiq/web build` → 0 hata (yalnızca önceden var olan uyarılar, yenisi yok). `pnpm turbo run type-check` → 5/5 paket temiz (mobile'da script yok, önceki partilerin de gördüğü durum).
- **Kapsam dışı bırakılan (bilinçli, talimat gereği):** `apps/web/app/(dashboard)/acwr/acwr-client.tsx`, `exercises-client.tsx`, `components/features/exercises/*` dosyalarındaki diğer `(supabase as any)` kullanımları — talimat yalnızca `client.ts`/`server.ts` + 3 RPC call site'ını kapsıyordu, bu dosyalara dokunulmadı. `@supabase/ssr` sürüm yükseltmesi (peer dep aralığı gerçekten hizalanınca assertion'ın kaldırılabilirliği kontrol edilmeli — bkz. BUGS.md).
- **Test verisi temizliği:** `TYPE-SAFETY-TEST 1 Hafta`/`4 Hafta` programları + block'u SQL ile silindi (`leftover_programs=0`, `leftover_blocks=0`). Auth testinde kullanılan gerçek session token'ları içeren scratch dosyaları (`session.json`, `cookieval.txt`, response header dump'ı, dev server log'u) silindi. Dev server (port 3057) durduruldu.

### Parti 3.F — Sonraki haftalara uygula ✅ (2026-07-22)
- **Kapsam:** `supabase/migrations/021_propagate_week.sql` (yeni — `copy_program_tree`, `propagate_week_to_future`), `apps/web/app/(dashboard)/programs/[id]/edit/edit-program-client.tsx` (buton + onay penceresi), `apps/web/lib/program-rpc.ts` (`mapRpcError`'a iki yeni dal), `packages/db/types.ts` (regen).
- **Önce-kontrol (talimat gereği):** `update_program_week`'in (020) kullandığı yetkilendirme — `coalesce(is_super_admin() or my_role(org)='admin' or my_role(org)='coach', false)` — canlı dosyadan doğrudan okunup `propagate_week_to_future`'a **birebir aynı** şekilde uygulandı, yeni bir mantık icat edilmedi.
- **ADIM 1 — `copy_program_tree(p_source_program_id, p_target_program_id)`:** `insert_sessions_tree`'nin (019) jsonb girdisi yerine VAR OLAN bir kaynağın session→exercise→exercise_sets ağacını doğrudan satırlardan (`select * from ... where program_id/session_id/exercise_id = ... order by order_index/set_number`) okuyup hedefe yeniden-üretilmiş ID'lerle kopyalayan kardeşi. `v_new_session_id`/`v_new_exercise_id` değişkenleriyle seviye-bazlı ID eşlemesi korunuyor. Kendi başına yetkilendirmesi yok (insert_sessions_tree ile aynı desen — çağıranın zaten kontrol ettiği varsayılıyor).
- **ADIM 2 — `propagate_week_to_future(p_source_program_id)`:** (1) org_id çekilir, bulunamazsa `program bulunamadı`; (2) yukarıdaki coalesce'li yetkilendirme; (3) `block_id is null` ise `bu program bir bloğun parçası değil`; (4) `block_id` aynı VE `week_index_in_block > kaynağın index'i` olan hedefler sayılır, `0` ise `sonraki hafta yok`; (5) her hedef için `training_sessions` silinir (CASCADE ile exercises/exercise_sets), `copy_program_tree` çağrılır — hedeflerin start_date/end_date/week_number/title/phase/notes/is_published alanlarına **dokunulmaz**; (6) tek plpgsql fonksiyonu = tek transaction, herhangi bir hedefte hata olursa önceki başarılı hedefler DAHİL tümü rollback olur; (7) dönüş `[{program_id, week_index_in_block}, ...]` jsonb dizisi.
- **DOĞRULAMA — yerel (Docker/local Supabase stack, disposable coach/athlete test kimlikleriyle, `set local role authenticated` + `set local request.jwt.claims` simülasyonu):**
  1. **(a) İçerik + izolasyon:** 4 haftalık test bloğu oluşturuldu (`create_program_with_weeks`), hafta 2 `update_program_week` ile düzenlendi (Back Squat 80→90kg, yeni Bench Press egzersizi), `propagate_week_to_future(hafta2)` çağrıldı → hafta 3 ve 4'ün seans/egzersiz/set içeriği hafta 2 ile **birebir aynı** oldu, ama kendi `start_date`/`end_date`/`week_number`/`notes` alanları **değişmedi** (oluşturulduklarındaki orijinal değerlerinde kaldı). Hafta 1 (öncesi) tamamen etkilenmedi.
  2. **(b) Son hafta:** hafta 4'te (block'un son haftası) çağrıldı → temiz `sonraki hafta yok` hatası.
  3. **(c) Bloksuz program:** seed'deki bloksuz bir programda çağrıldı → temiz `bu program bir bloğun parçası değil` hatası.
  4. **(d) Yetkisiz erişim:** disposable athlete-rollü kimlikle çağrıldı → `yetkisiz`.
  5. **(e) Rollback (çok-hedefli kesinti senaryosu):** talimatın "mümkünse geçersiz veri, değilse kesinti senaryosu" seçeneklerinden ikincisi kullanıldı — `copy_program_tree` yalnızca zaten geçerli olan kaynak satırları kopyaladığından (client'tan gelen serbest jsonb değil), 018'in `band_resistance` testindeki gibi bir "geçersiz literal" senaryosu burada doğrudan uygulanamıyordu. Bunun yerine 5 haftalık bir test bloğu kuruldu (hedefler: hafta 3, 4, 5), hafta 2 düzenlendi, ve **geçici bir `before insert on training_sessions` trigger'ı** yalnızca hafta 5'in program_id'sine yazılan insert'te `raise exception` tetikleyecek şekilde eklendi (döngü sırasıyla hafta 3 → 4 → 5 işlendiğinden, hata gelmeden önce hafta 3 ve 4 başarıyla kopyalanmış oluyor). `propagate_week_to_future(hafta2)` çağrıldı → hata, ve **hafta 3, 4, 5'in hepsi çağrı öncesi orijinal (henüz kopyalanmamış) içeriğiyle birebir aynı** kaldı — yani zaten başarıyla işlenmiş hafta 3 ve 4 de dahil, TEK transaction'ın tamamı geri alındı. Test trigger'ı hemen kaldırıldı.
  6. **(f) Temizlik:** İki test bloğu + programları + disposable kimliklerin geçici membership'leri silindi, `leftover_blocks=0`/`leftover_programs=0`/`leftover_memberships=0` doğrulandı.
- **DOĞRULAMA — canlı (Supabase Cloud `nlmwcygmbbxmfpsubvmh`, gerçek admin Auth JWT'siyle `/rest/v1/rpc/*` PostgREST çağrıları, İbrahim'in gerçek kimliğiyle yetkisizlik testi):**
  - (a) senaryosu gerçek TGF org/ACE takımıyla tekrarlandı — 4 haftalık gerçek blok, hafta 2 güncellendi, `propagate_week_to_future` → hafta 3/4 içeriği birebir kopyalandı, kendi `start_date`/`end_date`/`week_number`/`notes` değişmedi (HTTP 200), hafta 1 etkilenmedi.
  - (b) son haftada (hafta 4) çağrıldı → HTTP 400, `sonraki hafta yok`.
  - (c) İbrahim'in gerçek, yayında, bloksuz **Hipertrofi** programında çağrıldı → HTTP 400, `bu program bir bloğun parçası değil`; öncesi/sonrası session/exercise/set join-count fingerprint'i **değişmeden** kaldı (madde i'nin istediği "hiç etkilenmedi" doğrulaması).
  - (d) İbrahim'e geçici `athlete` membership'i verilip onun gerçek `user_id`'siyle simüle edildi → `yetkisiz`; geçici membership hemen silindi.
  - UI'ın `useEffect`'inin kullandığı sorgu şekli (`block_id=eq....&week_index_in_block=gt....&order=week_index_in_block.asc`) gerçek JWT + gerçek RLS ile ayrıca test edildi — beklenen sonraki haftaları (2, 3) doğru döndürdü.
  - Test verisi (blok + programlar) silindi, `total_blocks=0`'a geri döndü (bu partiden önce de 0'dı — canlıda hâlâ hiçbir gerçek çok-haftalı blok yok, hepsi legacy/bloksuz).
- **ADIM 3 — UI (`edit-program-client.tsx`):** Program `block_id`'ye sahipse VE aynı blokta kendisinden sonraki en az bir hafta varsa (bu ikisi TEK bir `useEffect` sorgusuyla, mount anında belirleniyor — talimatın "tıklanınca sorgula" ifadesinin ruhu korunuyor, ama aynı sorgu hem buton görünürlüğünü hem onay penceresinin listesini besliyor, gereksiz ikinci bir round-trip'ten kaçınmak için) "Sonraki Haftalara Uygula" butonu **Kaydet butonundan ayrı**, altında görünüyor. Tıklanınca onay penceresi etkilenecek haftaları AÇIKÇA listeliyor ("Hafta 3, Hafta 4 — devam edilsin mi?") ve ayrıca RPC'nin formun kaydedilmemiş state'ini değil, programın **DB'deki son kaydedilmiş halini** kopyaladığını hatırlatan bir not gösteriyor (talimatın "önce kaydet, sonra yay" sıralamasının neden ayrı tutulduğunu netleştirmek için, düşük riskli/faydalı bir ek açıklama). Onaylanınca `propagate_week_to_future` çağrılır, `mapRpcError` (iki yeni dal eklendi: "bloğun parçası değil"/"sonraki hafta yok" — buton normalde bu durumlarda hiç görünmez, ama başka bir sekmede eşzamanlı değişiklik olursa RPC yine de reddedebilir) ile aynı hata gösterme deseni kullanılıyor, başarıda kısa bir onay mesajı gösteriliyor.
- **Yan bulgu — `packages/db/types.ts` regen edildi (3.B'den beri ertelenen iş, bu partide gerekli hale geldi):** `program.block_id`/`week_index_in_block` okumak için `Tables<"training_programs">`'ın bu iki kolonu içermesi gerekiyordu. `supabase gen types typescript --local` ile regen edildi — tamamen additive diff (yeni `program_blocks` tablosu, `block_id`/`week_index_in_block` kolonları, 5 RPC imzası: `copy_program_tree`/`create_program_with_weeks`/`insert_sessions_tree`/`propagate_week_to_future`/`update_program_week`). CLI sürüm farkı yüzünden dosyanın üst yapısı da değişti (`__InternalSupabase.PostgrestVersion` markörü kalktı, `graphql_public` şeması eklendi) — bu zararsız: `createBrowserClient<Database, "public">(...)`/`createServerClient<Database, "public">(...)` (apps/web/lib/supabase/client.ts, server.ts) zaten şema adını **açıkça** "public" olarak geçiyor, marköre dayanan otomatik çıkarıma hiç ihtiyaç duymuyor. Regen sonrası `@athleteiq/db`, `@athleteiq/web`, `@athleteiq/validators`, `@athleteiq/integrations`, `@athleteiq/ui` tsc'leri 0 hata.
- **DOĞRULAMA — build/type-check:** `pnpm --filter web build` → 0 hata (yalnızca önceden var olan uyarılar). `pnpm turbo run type-check` → 5/5 paket temiz (mobile'da script yok, önceki partilerin de gördüğü durum).
- **Kapsam dışı bırakılan (bilinçli):** Gerçek tarayıcı/Playwright doğrulaması (araç bu ortamda mevcut değil — 3.D/3.E'nin de kaydettiği kısıt); onun yerine gerçek admin Auth JWT'siyle gerçek PostgREST çağrıları (RPC'ler + UI'ın kullandığı SELECT sorgusunun kendisi) kullanıldı.

### Parti 3 Kapanış Özeti — 3.B'den 3.F'ye ✅ (2026-07-22)

Parti 3, tek haftalık programları çok-haftalı **bloklara** genişletti: oluşturma, düzenleme ve bir haftanın içeriğini sonraki haftalara yayma — hepsi transactional RPC'lerle, ayrı ayrı doğrulanmış coalesce'li yetkilendirmeyle. Görev talimatı "3.A'dan 3.F'ye" diyordu; PROGRESS.md/BUGS.md'de ayrı etiketlenmiş bir "3.A" bulunmuyor — bu grubun ilk kaydı **3.B**'dir (program_blocks şeması), bu yüzden özet 3.B'den başlıyor (uydurulmadı, mevcut kayıtla doğrulandı).

| Alt-parti | Ne yaptı | Yeni tablo/RPC/dosyalar |
|---|---|---|
| 3.B | `program_blocks` şeması (additive) — `training_programs.block_id`/`week_index_in_block` | `017_program_blocks.sql` |
| 3.C | `create_program_with_weeks` RPC — bir blok + N haftayı TEK transaction'da oluşturur | `018_create_program_with_weeks.sql` |
| 3.D | Wizard'ı (`new-program-client.tsx`) RPC'ye bağlama, `week_number`/`end_date` input'larını kaldırma | — (yalnızca UI) |
| 3.E | Session-tree insert mantığını `insert_sessions_tree`'ye çıkarma, `update_program_week` RPC'si, edit akışını RPC'ye taşıma | `019_shared_session_tree_insert.sql`, `020_update_program_week.sql` |
| 3.F | Bir haftanın içeriğini sonraki haftalara yayma (`propagate_week_to_future`) | `021_propagate_week.sql` |

**`week_number` artık nasıl davranıyor:** Hiçbir RPC'de `week_number` bir parametre olarak **alınmıyor** — her zaman `to_char(start_date, 'IW')::int` ile ISO 8601 takvim haftasından **yeniden hesaplanıyor** (`create_program_with_weeks`, `update_program_week` içinde; `propagate_week_to_future` bu alana hiç dokunmuyor, yalnızca kopyaladığı hedeflerin KENDİ zaten-doğru week_number'ını koruyor). Sonuç: eski manuel-girilen `week_number` değerleri (RPC'lerden önce oluşturulmuş legacy programlarda, örn. Hipertrofi) yalnızca o program RPC üzerinden düzenlendiğinde doğru ISO değerine normalize ediliyor — legacy programlar RPC'yle dokunulmadığı sürece eski (muhtemelen yanlış) değerlerini koruyor.

**Mobil hâlâ Parti 7'yi bekliyor:** Parti 2 kapanışında bulunan `ExerciseCard.tsx` deprecated-kolon bug'ı (BUGS.md, AÇIK) hâlâ çözülmedi — mobil sporcu görünümü hâlâ `exercises.sets/reps/load_kg/load_percent/unit` okuyor, `exercise_sets`'i değil. Parti 3'ün eklediği blok/propagate katmanı **web-only**; mobil tarafında block_id/week_index_in_block'a dair hiçbir okuma/gösterim yok (sporcu, aynı bloktaki farklı haftaları ayrı programlar olarak görüyor, aralarında "blok" ilişkisi mobil UI'da hiç yüzeye çıkmıyor) — bu, Parti 7 kapsamında ele alınmalı.

### Parti 3.E — Düzenleme akışı transactional RPC'ye taşındı ✅ (2026-07-22)
- **Kapsam:** `supabase/migrations/019_shared_session_tree_insert.sql` (yeni), `supabase/migrations/020_update_program_week.sql` (yeni), `apps/web/lib/program-rpc.ts` (yeni), `apps/web/app/(dashboard)/programs/[id]/edit/edit-program-client.tsx` (yeniden yazıldı), `apps/web/app/(dashboard)/programs/new/new-program-client.tsx` (yalnızca import değişikliği — `buildSessionsPayload`/`mapRpcError` paylaşılan dosyaya taşındı, mantık BİREBİR AYNI).
- **Önce-kontrol bulguları (talimat gereği, tahmin edilmedi):**
  - Canlı `pg_policies` sorgusuyla `training_programs.programs_write` politikasının TAM SQL'i doğrulandı: `for all using (is_super_admin() or my_role(org_id)='admin' or my_role(org_id)='coach')` (002_rls.sql:107-111) — **INSERT ve UPDATE için AYRI bir politika/WITH CHECK YOK**, tek "for all" policy'nin USING'i her ikisine de aynen uygulanıyor. Yani 018'in INSERT'te kullandığı yetkilendirme kontrolüyle update_program_week'in UPDATE'te kullanması gereken kontrol **birebir aynı** — org'daki herhangi bir admin/coach herhangi bir programı düzenleyebilir, `created_by`/`team_id`'ye göre ek bir kısıtlama yok. Varsayılmadı, canlı sorguyla kanıtlandı.
  - `buildSessionsPayload`/`mapRpcError`: `new-program-client.tsx`'te **inline tanımlıydı**, hiçbir paylaşılan dosyada değildi (grep ile doğrulandı) — bu partide `apps/web/lib/program-rpc.ts`'e çıkarıldı.
- **ADIM 1 — Refaktör (`019_shared_session_tree_insert.sql`):** 018'deki session→exercise→exercise_sets iç içe insert döngüsü `insert_sessions_tree(p_program_id uuid, p_sessions jsonb) returns void` adlı private (security definer, `set search_path=''`) bir fonksiyona çıkarıldı. `create_program_with_weeks` (018) `create or replace` ile güncellendi — artık kendi döngüsünü yazmıyor, `perform insert_sessions_tree(...)` çağırıyor. **Doğrulama — 3.C'nin AYNI test setini tekrarlama (local Supabase stack, Docker):** weeks_count=1 (block_id null, week_number=32, session/exercise/set ağacı girdiyle birebir) ✅, weeks_count=4 (block oluşuyor, 4 hafta ardışık week_number/start_date, 2 seans — biri boş — her haftada birebir klonlanmış) ✅, yetkisiz erişim (membership'siz kullanıcı → `ERROR: yetkisiz`, 0 leftover) ✅, rollback band_resistance ihlali (0 leftover) ✅, rollback ISO hafta-53 kenar durumu (0 leftover, block dahil) ✅ — **beşi de 3.C'nin dokümante ettiği sonuçlarla birebir eşleşti, davranış farkı YOK**. Local test için `auth.users`'a iki geçici disposable kimlik (coach + membership'siz) eklendi, test sonunda memberships temizlendi. Commit sonrası `supabase db push` ile cloud'a uygulandı.
- **ADIM 2 — Yeni RPC (`020_update_program_week.sql`):** `update_program_week(p_program_id uuid, p_title text, p_phase text, p_notes text, p_start_date date, p_end_date date, p_sessions jsonb)` — talimatın verdiği imza harfiyen uygulandı. Mantık: (1) `p_program_id`'den `org_id` çekilir, bulunamazsa `raise exception 'program bulunamadı'`; (2) yetkilendirme `coalesce(is_super_admin() or my_role(org)='admin' or my_role(org)='coach', false)` — programs_write ile birebir aynı, çıplak OR zinciri YAZILMADI (3.C'nin öğrenimi); (3) `week_number := to_char(p_start_date,'IW')::int` — parametre olarak ASLA alınmıyor; (4) `training_programs` güncellenir (title/phase/notes/start_date/end_date/week_number/updated_at); (5) `training_sessions` silinir (exercises/exercise_sets CASCADE ile, 2.2.D'de doğrulanmış davranış); (6) `insert_sessions_tree` çağrılır — hepsi tek fonksiyon çağrısı = tek transaction, herhangi bir RAISE tüm adımları (alan güncellemesi dahil) geri alır.
  - **Bilinçli tasarım kararı — kapsam (team_id/athlete_id) bu RPC'de YOK:** Talimatın verdiği imzada `p_org_id`/`p_team_id`/`p_athlete_id` yok — yani bu RPC bir programın hangi takıma/sporcuya ait olduğunu DEĞİŞTİREMEZ, yalnızca içerik (başlık/faz/not/tarih/seans ağacı) günceller. Bu, eski `edit-program-client.tsx`'in (`updateProgram` ile team_id/athlete_id de güncelleyebilen) davranışından bir **kısıtlama** — bilerek yapıldı: RPC'nin desteklemediği bir alanı UI'da editable bırakmak, kullanıcının kapsam değişikliğinin sessizce kaydedilmemesi riskini taşırdı (BUGS.md'nin defalarca bulduğu "sessiz" bug sınıfının aynısı). UI'da (Adım 3) kapsam artık salt-okunur gösteriliyor ("Takım — {ad}" / "Sporcu — {ad}", "düzenlerken değiştirilemez" notuyla).
  - **Doğrulama sırasında bulunan ikinci bilinçli fark — `is_published` bu RPC'de de YOK:** Eski akış, yayında bir program düzenlenince `is_published:false` yazıp taslağa çekiyordu (o dönem non-transactional sıralı insert'in yarım kalma riskine karşı bir güvenlik önlemiydi). Talimatın adım 4 alan listesi (`title, phase, notes, start_date, end_date, week_number`) `is_published`'ı içermiyor — yeni RPC artık bunu hiç değiştirmiyor. Bu bilerek/doğru bir sonuç: RPC tamamen atomik olduğundan (tüm ağaç TEK transaction'da değişiyor), eski önlemin var olma nedeni (yarım kalmış/bozuk bir programın sporcuya görünmesi riski) ortadan kalktı. UI'daki "unpublishWarning" ekranı ve özet adımındaki amber uyarı kutusu buna göre güncellendi — artık YALAN söylemiyor ("taslağa çekilecek" yerine "yayında kalacak, sporcular hemen görecek").
  - **Doğrulama (canlı cloud, gerçek TGF org + İbrahim/ACE verisiyle, `supabase db query --linked` ile SQL + gerçek admin/İbrahim Auth JWT'siyle PostgREST):**
    1. Geçici bir test programı oluşturuldu (`create_program_with_weeks` ile, admin kimliğiyle) — gerçek Hipertrofi/aaaaaaaaaaa verisine dokunmadan test etmek için (talimatın "tercihen bu" dediği seçenek).
    2. **(a) Güncelleme + izolasyon:** Admin kimliğiyle `update_program_week` çağrıldı (başlık/faz/not/tarih değişti, bir set güncellendi, bir egzersiz eklendi) → yalnızca hedef program değişti; Hipertrofi ve aaaaaaaaaaa'nın `session_count`/`exercise_count`/`set_count`/set-değer fingerprint'i **öncesi ve sonrası birebir aynı** kaldı.
    3. **(b) Yetkisiz erişim:** İbrahim'e geçici `athlete` rolü membership'i verildi (aynı ACE takımı), İbrahim'in kimliğiyle test programını güncellemeye çalıştı → `ERROR: yetkisiz` (P0001), program değişmedi. Geçici membership temizlendi.
    4. **(c) Rollback:** Geçersiz `band_resistance` değeriyle güncelleme denendi (title/phase/notes/start_date DAHİL tüm alanları değiştirmeye çalışan bir payload'la) → CHECK constraint hatası, **training_programs'ın title/phase/notes/start_date alanları dahil hiçbir şey değişmedi** (bir önceki başarılı güncellemenin değerleriyle birebir aynı kaldı) — talimatın istediği "kısmi güncelleme kalmamalı" doğrulandı.
    5. **(d) week_number yeniden hesaplama:** `p_start_date='2026-09-08'` için RPC `week_number=37` yazdı; bağımsız `to_char('2026-09-08','IW')::int` sorgusu da `37` döndürdü — birebir eşleşti.
    6. Test verisi (geçici program) silindi, İbrahim'in geçici membership'i kaldırıldı, `leftover=0` her ikisinde de doğrulandı, toplam program sayısı orijinal `6`'ya döndü.
- **ADIM 3 — UI:**
  - `apps/web/lib/program-rpc.ts` (yeni): `buildSessionsPayload`, `mapRpcError`, `setToInsertColumns`, `SessionFormValues` tipi — `new-program-client.tsx`'teki tanımların **birebir aynısı** (davranış değişikliği yok, yalnızca konum değişti). `new-program-client.tsx` artık buradan import ediyor, kendi local tanımlarını sildi.
  - `edit-program-client.tsx` tamamen yeniden yazıldı: eski delete-then-reinsert sıralı kod (training_sessions delete + döngüde tek tek `insert().select().single()` — 3 tablo, transactionsız) silindi, tek `db.rpc("update_program_week", {...})` çağrısıyla değiştirildi.
  - `week_number`/`end_date` input'ları kaldırıldı (`new-program-client.tsx`'teki gibi). `start_date` artık `.min(1, "Başlangıç tarihi gerekli")` ile zorunlu — BUGS.md'deki start_date/end_date bug'ının bu dosya için AÇIK kalan kısmı bu partiyle kapandı (aşağıda BUGS.md güncellendi). `end_date`, `deriveEndDate(start_date)` (start+6 gün, UTC-safe) ile client'ta hesaplanıp RPC'ye `p_end_date` olarak geçiliyor — RPC'nin kendisi (018'in aksine) bunu bir parametre olarak aldığından (talimatın verdiği imza), 018'deki gibi DB içi otomatik türetme YOK, ama UI hiçbir zaman bu alanı göstermiyor/kullanıcıya doldurtmuyor, tıpkı new-program-client'taki gibi.
  - `weeks_count` YOK (talimat gereği — tek hafta düzenleniyor, çoğaltma yok).
  - Hata gösterimi `new-program-client.tsx` ile tutarlı: aynı `mapRpcError`, aynı inline kırmızı çerçeveli hata kutusu (`submitError` state).
  - `packages/db/queries/programs.ts`'teki `updateProgram` fonksiyonuna DOKUNULMADI (görev kapsamı dışı, artık hiçbir yerden çağrılmıyor ama silinmedi — export edilmiş paylaşılan bir fonksiyon, gelecekte başka bir akış kullanabilir).
- **DOĞRULAMA (gerçek PostgREST + gerçek Auth JWT, Playwright bu ortamda mevcut değildi — Parti 2.2.F/3.D'deki aynı araç kısıtı):**
  1. `pnpm --filter web build` → 0 hata (yalnızca önceden var olan uyarılar + `edit-program-client.tsx`'teki pre-existing `_orgId` unused-var uyarısı, `useMemo` eksik bağımlılık uyarısı düzeltildi). `pnpm turbo run type-check` → 5/5 paket temiz (mobile'da script yok, önceki partilerin de gördüğü durum).
  2. **Gerçek uçtan uca düzenleme (İbrahim'in gerçek "Hipertrofi" programı, TGF org, admin'in gerçek Auth JWT'siyle — email/password grant ile canlı alındı, tıpkı Parti 3.D'nin yöntemi):** `buildSessionsPayload`'ın üreteceği JSON birebir elle türetilip gerçek `/rest/v1/rpc/update_program_week` endpoint'ine POST edildi (Back Squat set1 80→82.5kg, yeni "Romanian Deadlift" egzersizi eklendi, Bench Press değişmedi) → HTTP 204. DB doğrulaması: değişiklikler birebir yansımış, `end_date` 2026-06-30→2026-07-02 (start+6, otomatik), `week_number` 3→26 (**beklenen** — Hipertrofi RPC'lerden ÖNCE, eski manuel-girilen week_number ile oluşturulmuştu; `to_char('2026-06-26','IW')::int` bağımsız sorguyla da `26` çıktı, yani eski "3" değeri hiçbir zaman gerçek ISO haftası değildi, RPC onu artık doğru değere normalize ediyor — kalıcı ve doğru bir yan etki, bug değil). Aynı anda "aaaaaaaaaaa" programının fingerprint'i (session/exercise/set sayısı + set değerleri) **değişmeden** kaldı.
  3. **Gerçek veri geri yüklendi:** Aynı RPC'ye orijinal Back Squat/Bench Press verisiyle (Romanian Deadlift olmadan) tekrar POST edildi → Hipertrofi'nin içeriği (isim/kg/tekrar/rest_sec) orijinaliyle birebir aynı doğrulandı (yalnızca `week_number` kalıcı olarak 26'da kaldı — RPC'nin deterministik yeniden-hesaplamasının doğal sonucu, her iki çağrıda da aynı start_date için aynı sonucu üretti).
  4. **Regresyon — `new-program-client.tsx` (yalnızca import değişti):** Aynı gerçek JWT ile `create_program_with_weeks`'e (paylaşılan `program-rpc.ts`'in üreteceği payload şekliyle) POST edildi → HTTP 200, program doğru oluşturuldu (`week_number` ISO ile otomatik, `end_date` start+6) → refaktörün wizard akışını bozmadığı doğrulandı. Test programı silindi.
  5. Test verisi/geçici membership'ler temizlendi, toplam program sayısı `6`'ya döndü (leftover=0).
- **Kapsam dışı bırakılan (bilinçli):** `packages/db/types.ts` RPC regen'i (dosyaların kendi `any` cast'i yeterli, önceki partilerin de izlediği desen). Program kapsamını (team/athlete) değiştirebilen ayrı bir RPC/akış (istenirse ayrı bir parti olarak ele alınabilir). Gerçek tarayıcı/Playwright doğrulaması (araç bu ortamda mevcut değil — gerçek PostgREST + gerçek Auth JWT + gerçek veri kullanıldı, en güçlü alternatif).

### Parti 3.D — Wizard'ı RPC'ye bağlama, week_number/end_date kaldırma ✅ (2026-07-21)
- **Kapsam:** SADECE `apps/web/app/(dashboard)/programs/new/new-program-client.tsx`. `edit-program-client.tsx`'e talimat gereği dokunulmadı (Parti 3.E kapsamı, legacy programları düzenlemek için mevcut delete-then-reinsert akışı olduğu gibi çalışmaya devam ediyor).
- **Önce-kontrol bulguları (talimat gereği, tahmin edilmedi):**
  - `exerciseSchema`/`exerciseSetSchema` (2.2.D'de `exercise-list.tsx`'e taşındı) TAM alan adları çıkarıldı: set şeması `reps`/`duration_sec`/`load_type`/`load_kg`/`percent_1rm`/`band_resistance`/`rpe`/`notes` (form-only `load_type`, DB'de karşılığı yok — hangi kolonun dolu olduğundan türetiliyor); egzersiz şeması `name`/`category`/`is_duration_based`/`rest_sec`/`notes`/`superset_group`/`superset_order`/`exercise_sets[]`. RPC'nin `p_sessions` jsonb'si bu alanları DEĞİL, kendi `->>'...'` okumalarını (`sets`, `reps`, `load_kg`, `percent_1rm`, `is_bodyweight`, `band_resistance`, `rpe` — bkz. 018_create_program_with_weeks.sql:171-187) bekliyor — en kritik fark: RPC set listesini `"sets"` anahtarı altında okuyor, form state'indeki `"exercise_sets"` değil. `buildSessionsPayload` mapping fonksiyonu bu ayrımı gözeterek yazıldı (yanlış isimle sessizce boş dizi/null üretme riski böylece kapatıldı).
  - `end_date` grep taraması: `program-detail-client.tsx`, `edit/edit-program-client.tsx`, `new-program-client.tsx` (bu partiden önce), `programs-client.tsx`, `athlete-detail-client.tsx`, `packages/validators/program.ts` (kullanılmayan eski bir şema, hiçbir client bunu import etmiyor) — hepsi salt-okunur gösterim (`{new Date(program.end_date)...}`), hiçbiri bağımsız bir yazma yolu değil. Bu yüzden `end_date`'i `start_date+6` olarak RPC içinde otomatik türetmek (zaten 018'in tasarımı) güvenli — hiçbir okuma noktası bozulmuyor.
  - `week_number` grep taraması: yukarıdakilere ek olarak `apps/mobile/app/(tabs)/program/index.tsx:204` (`Hafta {activeProgram.week_number}`) ve `apps/web/app/(dashboard)/athletes/[id]/page.tsx:18` (server sorgusunda `select(...week_number)`, salt görüntüleme). Hepsi salt-okunur — mobil zaten Parti 7'yi bekliyor (BUGS.md'deki `ExerciseCard` deprecated kolon bug'ıyla aynı kapsam), bu partide dokunulmadı, yalnızca rapor ediliyor.
- **Uygulama:**
  1. Adım 1'den `week_number`/`end_date` input'ları kaldırıldı. Yerine `weeks_count` (number, min 1 max 12, varsayılan 1, "Kaç hafta sürecek?") eklendi. **max=12 sınırı görev talimatında verildi, yalnızca UI seviyesinde zorlanıyor** — RPC'nin kendisi (`018_create_program_with_weeks.sql`) `p_weeks_count >= 1` dışında bir üst sınır kontrolü yapmıyor; DB seviyesinde bir CHECK yok. Bu partinin kapsamı dışında bırakıldı (yalnızca UI/UX kısıtı, RPC'ye ayrı bir CHECK eklenmedi).
  2. `start_date` zod'da `.min(1, "Başlangıç tarihi gerekli")` ile zorunlu yapıldı (`.optional()` kaldırıldı) — BUGS.md'deki "start_date/end_date boş bırakılırsa Postgres insert reddi" bug'ının **start_date kısmı** bu partiyle kapandı (aşağıda BUGS.md güncellendi). `end_date` alanı tamamen kaldırıldığı için o kısım bug'ı bu dosya için de fiilen ortadan kalktı (artık kullanıcıya gösterilen bir `end_date` input'u yok) — ama BUGS.md maddesi `edit-program-client.tsx` için hâlâ geçerli olduğundan tamamen kapatılmadı, ikiye bölündü.
  3. `onSubmit` tamamen yeniden yazıldı: eski sıralı `insert()` zinciri (4 tablo, döngü içinde tek tek) silindi. Yerine `buildSessionsPayload()` (form state → RPC'nin `p_sessions` jsonb'si, yukarıdaki anahtar-adı ayrımını uygulayan saf fonksiyon) + tek bir `db.rpc("create_program_with_weeks", {...})` çağrısı. `db = supabase as any` cast'i **korundu** (dosyada zaten var olan, TypeScript'in supabase-js generic tiplemesiyle ilgili bilinen bir quirk'ü aşmak için kullanılan yerleşik desen — bkz. Parti 2.2.D/2.2.E notları) — `packages/db/types.ts`'e RPC imzası regen edilmedi, bu dosyanın kendi `any` cast'i zaten tip güvenliğini bu çağrı için de kapsıyor, ayrı bir regen bu partinin kapsamı dışında tutuldu (yalnızca bu dosyaya dokunma kısıtına uyum).
  4. Başarı durumunda: `block_id` null ise (`weeks_count=1`) doğrudan `/programs/{program_ids[0]}` detay sayfasına yönlendirme (eski davranışla aynı hedef). `block_id` doluysa önce `alert("${weeks_count} hafta oluşturuldu.")` (dosyanın zaten kullandığı `alert()` idiomuyla tutarlı — `onInvalid` handler'ı da aynı deseni kullanıyor, senkron/bloklayıcı olduğu için kullanıcı mesajı kapatmadan navigasyon gerçekleşmiyor) sonra aynı hedefe (hafta 1'in id'si) yönlendirme.
  5. Hata durumunda: `console.error` + ham mesajı gösteren `alert()` yerine `submitError` state'i + Adım 3'te (Özet) submit butonunun üstünde kırmızı çerçeveli bir hata kutusu. Yeni `mapRpcError()` fonksiyonu RPC'nin `RAISE EXCEPTION` mesajlarını (`yetkisiz`, XOR ihlali, `week_number` CHECK'i — bu sonuncusu 3.C'nin d2 testinde bulunan ISO hafta-53 kenar durumunun aynısı) kısa Türkçe mesajlara çeviriyor, tanınmayan her şey için jenerik bir mesaja düşüyor (ham Postgres/plpgsql metni kullanıcıya hiç gösterilmiyor).
  6. Adım 2'ye küçük bir bilgi notu eklendi (`weeksCount > 1` iken): "Bu seans planı, oluşturulacak N haftanın hepsinde aynen tekrarlanacak." — RPC'nin klonlama davranışını (aynı seans ağacı her hafta tekrar ediliyor) kullanıcıya açıkça bildirmek için, görev talimatında istenmese de düşük riskli/faydalı bir netlik eklemesi.
  7. Adım 3 özetindeki "Hafta" (`week_number`) alanı "Hafta Sayısı" (`weeks_count`) ile değiştirildi.
- **Doğrulama — Playwright bu oturumda mevcut değildi (araç notu Parti 2.2.F'dekiyle aynı):** bu ortamda hiçbir browser/Playwright aracı yoktu. Bunun yerine en güçlü alternatif kullanıldı — **gerçek supabase-js'in browser'da yapacağı isteğin birebir aynısı** doğrudan PostgREST üzerinden, TGF'nin gerçek admin kullanıcısının (tosunbeytullah9@gmail.com) gerçek Auth JWT'siyle (email/password grant ile canlı alınmış) tetiklendi:
  1. `pnpm --filter web build` → 0 hata (yalnızca önceden var olan uyarılar, yenisi yok). `pnpm turbo run type-check` → 5/5 paket temiz (mobile'da bu script tanımlı değil, atlandı — önceki partilerin de gördüğü durum).
  2. **weeks_count=1, gerçek ACE takımı verisiyle:** `buildSessionsPayload`'ın üreteceği JSON birebir elle türetilip (Back Squat 3×8×80kg, RPE 7/7.5/8) gerçek JWT ile RPC'ye POST edildi → `{block_id:null, program_ids:[tek id]}` (yeni client kodunun beklediği şekille birebir). DB doğrulaması: tek `training_programs` satırı, `block_id`/`week_index_in_block` null, `week_number=37`/`end_date=2026-09-13` **RPC tarafından otomatik türetilmiş** (start_date=2026-09-07, UI'da artık bu alanlar hiç girilmiyor), session/exercise/set ağacı JSON girdisiyle birebir.
  3. **weeks_count=4 (2 seans, biri boş/dinlenme günü — 3.C'nin test deseninin tekrarı):** Aynı yöntemle → `{block_id, program_ids:[4 id]}`. DB: 1 `program_blocks` (`total_weeks=4`), 4 `training_programs` (`week_index_in_block` 1-4, `start_date`'ler 7'şer gün arayla 09-07/09-14/09-21/09-28, `week_number` 37-40 ardışık), her haftada aynı 2 seans (Squat Günü: 1 egzersiz/2 set + Dinlenme Günü: 0 egzersiz) birebir klonlanmış.
  4. **Yetkisiz erişim simülasyonu (İbrahim'in gerçek Auth kullanıcısı, `tosunbeytullah9+ibrahim@gmail.com`, hâlâ 0 membership — 3.C'nin temizlik sonrası bıraktığı durumun aynısı):** `set local role authenticated` + `set local request.jwt.claims` ile (3.B/3.C'nin kanıtlanmış simülasyon yöntemi) gerçek `create_program_with_weeks` çağrısı → `ERROR: yetkisiz` (transaction rollback edildi, `begin/rollback` ile sarıldı). `leftover=0` doğrulandı. Bu, `mapRpcError()`'ın `.includes("yetkisiz")` kontrolünün RPC'nin gerçek hata metniyle **birebir eşleştiğini** kanıtlıyor (PostgREST'in RAISE EXCEPTION'ları `message` alanına ham metin olarak koyduğu bu oturumda ayrıca bir `PGRST301` hatasıyla da doğrulandı — aynı response şekli).
  5. **start_date boş bırakma validasyonu:** Playwright olmadan tarayıcı etkileşimi simüle edilemedi — bu adım yalnızca **kod incelemesiyle** doğrulandı: `programSchema.start_date` artık `.min(1, "Başlangıç tarihi gerekli")`, boş `""` bu kuralı ihlal eder, `zodResolver` `errors.start_date` üretir, input'un altında kırmızı mesaj render edilir VE mevcut `onInvalid` handler'ı (Parti 2.2.D'den beri var) genel bir `alert()` gösterir — sessiz reddetme artık mümkün değil. Gerçek tarayıcıda tıklama/doldurma testi yapılamadı, bu bir araç kısıtı olarak burada not düşülüyor.
  6. **Regresyon — `edit-program-client.tsx` (dokunulmadı):** `git status`/`git diff --stat` ile bu partide yalnızca `new-program-client.tsx`'in değiştiği doğrulandı. İbrahim'in ACE takımının 5 orijinal programı (Hipertrofi/Hazırlık-2/adasdasd×2/aaaaaaaaaaa — "asdasdasd" farklı bir takıma ait, bu sorgunun kapsamı dışında) test verisi eklenmeden/silinmeden önce ve sonra DB'de değişmeden bulundu. `edit-program-client.tsx`'in bağımlı olduğu `getProgramById` sorgusunun (`packages/db/queries/programs.ts:20`, `*, training_sessions(*, exercises(*, exercise_sets(*)))`) BİREBİR AYNISI gerçek JWT ile Hipertrofi programı için PostgREST'e atıldı → 1 session/2 egzersiz (Back Squat 3 set, Bench Press 3 set) — Parti 2.2.F'de dokümante edilen veriyle birebir, sorunsuz dönüyor.
  7. **Temizlik:** Test verisi (`PARTI-3D-TEST 1 Hafta`, `PARTI-3D-TEST 4 Hafta` + bunların `program_blocks` satırı) SQL ile silindi (cascade ile session/exercise/set dahil), `leftover_programs=0`/`leftover_blocks=0`, ACE takımının program sayısı orijinal `5`'e döndü.
- **Kapsam dışı bırakılan (bilinçli, talimat gereği):** `edit-program-client.tsx` (Parti 3.E). `packages/db/types.ts` RPC regen'i (dosyanın kendi `any` cast'i zaten yeterli, ayrı bir paylaşılan-paket değişikliği bu partinin "SADECE new-program-client.tsx" kısıtına girmiyordu). `weeks_count` için DB seviyesinde üst sınır CHECK'i (yalnızca UI kısıtı, RPC'de yok — yukarıda not edildi). Mobil `week_number` okuma noktası (Parti 7).

### Parti 3.C — create_program_with_weeks RPC ✅ (2026-07-21)
- **Kapsam:** `supabase/migrations/018_create_program_with_weeks.sql` (yeni). SADECE FONKSİYON — talimat gereği hiçbir UI dosyası bu partide değiştirilmedi/bağlanmadı.
- **Önce-kontrol (talimat gereği, tahmin edilmedi):** Canlı `pg_policies` sorgusuyla `training_programs.programs_write` politikasının TAM SQL'i çıkarıldı: `for all using (is_super_admin() or my_role(org_id)='admin' or my_role(org_id)='coach')` — ayrı bir `with check` yok, tek `using` hem select hem write için geçerli. Helper fonksiyonların (`is_super_admin() returns boolean`, `my_role(org uuid) returns text`, `my_team_id(org uuid) returns uuid`, hepsi `security definer stable set search_path=''`) TAM imzası `pg_proc`'tan doğrulandı — 009_security_fixes.sql'deki hardened versiyonlar canlıda aktif.
- **Fonksiyon tasarımı:** `create_program_with_weeks(p_org_id, p_team_id, p_athlete_id, p_title, p_phase, p_notes, p_weeks_count, p_block_start_date, p_sessions jsonb)`, plpgsql, `security definer`, `set search_path=''` (mevcut hardening deseniyle tutarlı). İlk satırda `programs_write` ile birebir aynı yetkilendirme kontrolü, ardından `program_scope_check` (001_schema.sql) ile birebir aynı XOR kontrolü. `p_weeks_count > 1` ise `program_blocks` satırı oluşur (block_id), `= 1` ise `block_id`/`week_index_in_block` null kalır — 017'nin tasarımıyla tutarlı. Döngü `p_sessions` ağacını (session→exercise→set, `jsonb_array_elements` ile) her hafta için AYNEN klonlar; `week_number` yalnızca bilgi amaçlı `to_char(week_start,'IW')::int` (ISO 8601) ile hesaplanır. Deprecated `exercises` kolonlarına (sets/reps/load_kg/load_percent/load_percent_1rm/rpe_target/unit) hiç yazılmıyor — Parti 2.2.D'nin kararıyla tutarlı.
- **🔴 KRİTİK BUG bulundu ve düzeltildi (doğrulama sırasında, test (c)'de):** İlk yazımda yetkilendirme kontrolü `if not (is_super_admin() or my_role(org)='admin' or my_role(org)='coach') then raise exception` şeklindeydi. Org'da hiç `memberships` satırı olmayan bir kullanıcı için `my_role()` **NULL** döner (satır bulunamadığında `language sql` fonksiyonu NULL döner, false değil). Üç-değerli SQL mantığında `false OR null OR null = null` — RLS politikasında NULL "reddet" anlamına gelir, ama plpgsql'de `IF NOT (null) THEN` **hiçbir zaman tetiklenmez** (NULL, IF içinde FALSE gibi davranır, fakat NOT NULL de NULL olduğundan negasyon "raise"i tetiklemiyor). Sonuç: membership'siz bir kullanıcı (İbrahim, athlete rolü, TGF'de hiç membership'i yok) fonksiyonu **başarıyla** çağırıp bir `training_programs` satırı yazabildi — canlı testte gerçekten oldu, tespit edilip hemen temizlendi. **Düzeltme:** `if not coalesce(..., false) then raise exception 'yetkisiz'` — coalesce ile önce false'a sabitlenip sonra negatif alınıyor. Düzeltme hem local (docker exec psql) hem cloud'a (execute_sql ile `create or replace function`) uygulandı, migration dosyası da güncellendi. Düzeltme sonrası aynı senaryo `ERROR: yetkisiz` ile temiz reddedildi.
- **Doğrulama (canlı Supabase Cloud, `nlmwcygmbbxmfpsubvmh`, gerçek `set local request.jwt.claims` + `set local role authenticated` simülasyonu, TGF org + İbrahim Çolak/ACE takımı gerçek verisiyle):**
  1. **Coach kimliği:** Org'da şu an gerçek bir coach membership'i yoktu (tek membership: tosunbeytullah9/admin). İbrahim'in user_id'sine **geçici** bir `role='coach'` membership satırı eklenip test sonunda silindi — Parti 3.B'nin aynı geçici-veri deseninin tekrarı.
  2. **weeks_count=1:** `block_id=null`, tek `training_programs` satırı, `week_number=32` (2026-08-03 için), session/exercise/set ağacı girdiyle birebir. Tüm alanlar doğrudan DB'den sorgulanıp doğrulandı.
  3. **weeks_count=4:** 1 `program_blocks` (`total_weeks=4`) + 4 `training_programs` (`week_index_in_block` 1-4, `start_date`'ler 7'şer gün arayla: 08-03/08-10/08-17/08-24, `week_number` 32-35 ardışık). Her haftada AYNI 2 session (biri 2 egzersiz/3 set, biri 0 egzersiz — boş session da test edildi) birebir klonlanmış bulundu.
  4. **Yetkisiz erişim (İbrahim, athlete rolü, membership yok):** Yukarıdaki bug düzeltildikten sonra `ERROR: yetkisiz` ile reddedildi; `program_blocks`/`training_programs`/`training_sessions`/`exercises`/`exercise_sets` — 5 tablonun hepsinde bu deneme için **0 satır** doğrulandı.
  5. **Rollback testi — iki ayrı senaryo (talimattaki band_resistance örneği + daha derin bir senaryo):** Fonksiyon `p_sessions`'ı her hafta için AYNEN klonladığından (tasarımın kendisi gereği), geçersiz bir değer p_sessions içinde olursa HER hafta aynı olacağından hata her zaman 1. haftada tetiklenir (haftalar sırayla işlenir, 1. hafta tam olarak 3. haftayla aynı veriyi taşır). Bu yüzden talimatın "3. haftada hata" istediğini iki tamamlayıcı testle karşılandı:
     - **(d1) band_resistance='invalid_deger':** `exercise_sets_band_resistance_check` ihlali, 1. haftanın set insert'inde tetiklendi. Sonuç: `program_blocks` (döngüden ÖNCE oluşturulmuştu) dahil 5 tablonun hepsinde **0 satır** — döngü başlamadan önce yazılmış satır bile rollback oluyor.
     - **(d2) ISO hafta-53 kenar durumu:** 2026 yılının Ocak 1'i Perşembe olduğundan 53 ISO haftası var (doğrulandı: `to_char('2026-12-28','IW')=53`, `to_char('2027-01-04','IW')=1`). `p_block_start_date='2026-12-14'`, `weeks_count=3` ile 3. hafta tam olarak `week_start=2026-12-28`, `week_number=53`'e denk geldi — `training_programs.week_number` CHECK'i (1-52) bunu reddetti. Hata mesajındaki satır `week_index_in_block=3` içeriyordu — yani 1. ve 2. haftaların TAM ağaçları (program+session+exercise+set) bu noktaya kadar başarıyla yazılmıştı. Sonuç: yine 5 tablonun hepsinde **0 satır** — 2 haftalık başarılı iş de dahil tamamen rollback oldu. Bu, talimatın istediği "1. ve 2. haftalar dahil hepsi rollback olmalı" senaryosunu tasarımın izin verdiği en yakın şekilde karşılıyor.
  6. **week_number ISO doğrulaması (elle hesap):** 2026-01-01 Perşembe olduğundan (2025-01-01 Çarşamba + 365 gün ≡ +1 gün), ISO hafta 1 = 2025-12-29 (Pzt) başlar. Elle hesaplanan 5 referans tarih (`2026-01-01`→hafta1, `2026-01-05`→hafta2, `2026-08-03`→hafta32 [217 gün = tam 31 hafta sonra], `2026-12-28`→hafta53, `2027-01-04`→hafta1) `to_char(...,'IW')` çıktısıyla birebir eşleşti — hem yukarıdaki testler (a/b/d2) hem bağımsız bir `to_char` sorgusuyla çapraz doğrulandı.
  7. **Temizlik:** Geçici coach membership'i (İbrahim) silindi, tüm `RPC-TEST-%` başlıklı `program_blocks`/`training_programs` (cascade ile session/exercise/set dahil) silindi. Son kontrol: `total_programs=6` (İbrahim'in takımının orijinal 6 programı, dokunulmadı), `total_blocks=0`, İbrahim'in membership sayısı `0` (orijinal duruma dönüldü).
  8. `pnpm --filter web build` → 0 hata (yalnızca önceden var olan 3 lint uyarısı — fork-exercise-modal `any`, sidebar `Calendar` unused import, useUserContext hook dependency). Beklenen: hiçbir UI dosyası bu RPC'yi çağırmıyor.
- **Kapsam dışı bırakılan (bilinçli, talimat gereği):** UI'a bağlama (web/mobile), `packages/db/types.ts` regen (RPC henüz kullanılmıyor), EXECUTE yetkisi revoke/grant (mevcut fonksiyonlarla aynı desen — "RPC exposure" advisory'si zaten BUGS.md'de ayrı bir kalem olarak kayıtlı, bu partinin kapsamı değil).

### Parti 3.B — program_blocks şeması ✅ (2026-07-21)
- **Kapsam:** `supabase/migrations/017_program_blocks.sql` (yeni). Tamamen additive — yeni tablo (`program_blocks`) + `training_programs`'a iki nullable kolon (`block_id`, `week_index_in_block`). Mevcut hiçbir tablo/politika/fonksiyon değiştirilmedi, hiçbir UI dosyasına dokunulmadı (talimat gereği bu parti salt şema).
- **`program_blocks` tablosu:** `org_id`/`team_id`/`athlete_id`/`created_by`/`title`/`total_weeks`/`phase`/`notes`/`created_at`/`updated_at`. XOR constraint (`program_blocks_scope_check`) `001_schema.sql:84-87`'deki `training_programs.program_scope_check` ile birebir aynı mantık (team_id XOR athlete_id). `total_weeks` için `check (total_weeks >= 1)`. `updated_at` için `009_security_fixes.sql`'deki mevcut `update_updated_at()` trigger fonksiyonu yeniden kullanıldı — yeni fonksiyon icat edilmedi.
- **`training_programs` eklemeleri:** `block_id uuid references program_blocks(id) on delete set null` + `week_index_in_block int`. İkisi de nullable, mevcut 6 satır (İbrahim'in verisi) etkilenmedi.
  - **Talimatın istemediği ama eklenen küçük bir karar:** `week_index_in_block`'a `check (week_index_in_block is null or week_index_in_block >= 1)` eklendi — görev talimatı bunu istemiyordu, ama aynı tablodaki kardeş kolon `week_number`'ın zaten `check (week_number between 1 and 52)` taşıdığı (001_schema.sql) göz önüne alınınca, negatif/sıfır bir hafta indeksine izin vermek tutarsız ve anlamsız olurdu. Maliyeti sıfır (mevcut tüm satırlar null), riski yok. Üst sınır (total_weeks'e göre) eklenmedi — bu, blok ile programı çapraz kontrol eden bir trigger/fonksiyon gerektirir, kapsam dışı bırakıldı.
- **RLS — kasıtlı tasarım kararı (talimatın "mevcut deseni tekrar kullan" ifadesinin ötesinde netleştirme gerektirdi):** `program_blocks`'ın `org_id`/`team_id`/`athlete_id`'si `exercises`/`exercise_sets`'teki gibi bir alt tabloda değil, `training_programs`'takiyle birebir aynı şekilde **doğrudan kolon** olarak duruyor — yani "join-hop" deseni (exercise_sets → exercises → training_sessions → training_programs) burada gerekmiyor, çünkü zaten hedef tablonun kendisinde. Bu yüzden RLS, `training_programs`'ın `programs_select`/`programs_write` politikalarıyla (002_rls.sql:93-111) **birebir aynı doğrudan mantık** kullanıyor (`my_role`/`my_team_id`/`is_super_admin`, yeni helper yok).
  - **Kasıtlı fark:** `programs_select`'in sporcu dalı `and is_published = true` ile kısıtlı (taslak programın içeriği sporcuya sızmamalı). `program_blocks`'ta yayın kavramı yok — blok yalnızca başlık/faz/toplam-hafta konteyneri, gerçek içerik (egzersizler) hâlâ `training_programs`/`exercises` altında ve onların kendi `is_published` kapısından geçiyor. Bu yüzden `program_blocks_select`'in sporcu dalında `is_published` kontrolü YOK — sporcu kendi bloğunu veya takımının bloğunu direkt görebilir. Bu bir erişilebilirlik kararı, gözlemlenen bir davranış değil — henüz hiçbir UI bu tabloyu okumadığından gerçek bir sızıntı senaryosu yok, blok UI'ı şevk edilirken yeniden değerlendirilebilir.
  - `program_blocks_write`, `programs_write` ile aynı şekilde coach'u kendi takımıyla kısıtlamıyor (org'daki herhangi bir coach yazabilir) — bu, `training_programs`'ta zaten var olan aynı desenin bilinçli tekrarı, yeni bir sıkılaştırma eklenmedi (talimat: "mevcut deseni tekrar kullan").
- **Doğrulama:**
  1. **Local:** Docker Desktop kapalıydı, başlatıldı; `supabase migration up --local` ile 017 temiz uygulandı. `\d program_blocks` (docker exec psql) ile tablo/index/FK/CHECK/RLS/trigger yapısı doğrulandı.
  2. **Cloud push:** `supabase db push` → `nlmwcygmbbxmfpsubvmh`'e uygulandı. `supabase migration list` → Local = Remote (017 dahil).
  3. **information_schema doğrulaması (cloud):** `program_blocks`'ın tüm kolonları + `training_programs.block_id`/`week_index_in_block` doğru tip/nullable ile mevcut. `pg_constraint` ile XOR constraint (`program_blocks_scope_check`) ve `total_weeks`/`week_index_in_block` CHECK'leri doğrulandı.
  4. **Mevcut veri regresyonu:** `select count(*), count(block_id), count(week_index_in_block) from training_programs` → **6, 0, 0** — İbrahim'in takımının 6 programı (Hipertrofi, Hazırlık-2, adasdasd×2, aaaaaaaaaaa, asdasdasd) tek tek `id`/`title` ile SELECT edildi, hepsi `block_id=null`/`week_index_in_block=null` ile sorunsuz döndü.
  5. **RLS simülasyonu (gerçek `set local request.jwt.claims`, İbrahim'in `user_id`'siyle):**
     - İbrahim (athlete, `memberships`'te kaydı yok — yalnızca `athletes.user_id` üzerinden) kendi adına doğrudan bir `program_blocks` satırı **insert etmeye çalıştı → RLS reddetti (42501)** — beklenen: athlete yazamaz, yalnızca admin/coach yazabilir.
     - Admin ile (service-role eşdeğeri, RLS bypass) 3 geçici test bloğu eklendi: (a) İbrahim'e athlete-scoped, (b) İbrahim'in takımı ACE'ye team-scoped, (c) alakasız bir takıma (asdasdasd'nin takımı) team-scoped.
     - İbrahim'in JWT'siyle SELECT → **yalnızca (a) ve (b) döndü**, (c) görünmedi — org/team/athlete scope doğru uygulandı.
     - Admin'in (tosunbeytullah9, `memberships`'te gerçek admin rolü) JWT'siyle SELECT → **3'ü de döndü** — admin org geneli erişimi doğrulandı.
     - Test verisi (3 satır, `title like 'PW-TEST%'`) SQL ile silindi, `leftover_test_rows=0` doğrulandı.
  6. **Advisor:** `get_advisors(security)` çalıştırıldı — dönen 6 uyarı (RPC exposure ×5, leaked-password) hepsi **önceden var olan** bulgular (BUGS.md'de zaten kayıtlı), `program_blocks` için yeni bir "RLS policy yok" uyarısı YOK — politikalar doğru tanındı.
  7. `pnpm --filter web build` → **0 hata** (yalnızca önceden var olan 3 lint uyarısı — fork-exercise-modal `any`, sidebar kullanılmayan `Calendar` import'u, useUserContext hook dependency — hiçbiri bu partiyle ilgisiz, hiçbiri yeni değil). Beklenen sonuç: hiçbir UI dosyası `program_blocks`'a dokunmuyor.
- **Kapsam dışı bırakılan (bilinçli):** Bu parti yalnızca şema. `program_blocks` için web/mobile UI, `packages/db/queries/program-blocks.ts`, `packages/db/types.ts` regen — hiçbiri yapılmadı. Bir sonraki partide (blok UI) `packages/db/types.ts` regen edilmeli (aksi halde TypeScript bu tabloyu/kolonları görmez).

### Parti 2 Kapanış Özeti — 2.1'den 2.2.F'ye ✅ (2026-07-21)

Parti 2, set bazlı yoğunluk takibini şemadan ekrana kadar uçtan uca kabloladı. Altı alt-parti, kronolojik sırayla:

| Alt-parti | Ne yaptı | Değişen tablo/dosyalar |
|---|---|---|
| 2.1 | `exercise_sets` şeması (additive) | `014_exercise_sets.sql`, `015_exercise_sets_fixes.sql` |
| 2.2.B | `training_sessions.session_rpe` kolonu (atıl, henüz bağlı değil) | `016_session_rpe.sql` |
| 2.2.C | `ExerciseList` alt-bileşenini `new`/`edit` builder'larından paylaşılan tek dosyaya çıkarma (davranış değişikliği yok) | `components/features/program-builder/exercise-list.tsx` |
| 2.2.D | Set bazlı UI'ı uçtan uca kablolama — builder artık `exercise_sets`'e yazıyor/okuyor | `exercise-list.tsx`, `new-program-client.tsx`, `edit-program-client.tsx`, `program-detail-client.tsx`, `packages/db/queries/programs.ts`, `packages/db/types.ts` |
| 2.2.E | 1RM manuel giriş formu + mevcut `getAthleteMaxes`/`create1RMRecord`'u bağlama | `tests/page.tsx` + `tests-client.tsx`, `programs/new/page.tsx`, `programs/[id]/edit/page.tsx` |
| 2.2.F | Tonaj özet metriği (bu parti) | `apps/web/lib/tonnage.ts` [yeni], `programs/[id]/page.tsx`, `programs/[id]/program-detail-client.tsx` |

**Şema tarafı:** `exercise_sets` (014) tamamen additive geldi; `exercises` tablosundaki eski kolonlar (`sets`, `reps`, `duration_sec`, `load_kg`, `load_percent`, `load_percent_1rm`, `rpe_target`, `load_type`) **silinmedi**, hâlâ DB'de duruyor ve `DEPRECATED` yorumuyla işaretli. 2.2.D'den bu yana **hiçbir web akışı bu kolonlara yazmıyor** (hem `new-program-client.tsx` hem `edit-program-client.tsx` yalnızca `exercise_sets`'e insert ediyor) — yani bu partiden sonra oluşturulan/düzenlenen her programda bu kolonlar `null` kalacak. Kolonlar bilinçli olarak silinmedi (geriye dönük veri kaybı riski + gelecekte gerekirse kolay rollback).

**Mobil hâlâ Parti 7'yi bekliyor:** `apps/mobile/components/ExerciseCard.tsx` hâlâ deprecated `exercises.sets/reps/load_kg/load_percent/unit` kolonlarını okuyor (BUGS.md, Parti 2.2.D'de bulundu, AÇIK). 2.2.D'den sonra web'de oluşturulan hiçbir programda bu kolonlar dolu olmayacağı için, mobil sporcu görünümü bu programlarda egzersiz kartlarını boş/anlamsız gösterecek — `ExerciseCard`'ın `exercise_sets` join'i okuyacak şekilde güncellenmesi Parti 7 kapsamında.

**Parti 2'nin genel sonucu:** Koç artık program builder'da set bazına kadar inen bir yoğunluk modeli (kg/%1RM/vücut ağırlığı/direnç bandı + RPE) kuruyor, sporcunun 1RM geçmişini giriyor/görüyor ve program detay ekranında hem set tablosunu hem hesaplanmış tonaj özetini görüyor — hepsi salt görüntüleme/hesaplama katmanında, hiçbir yeni DB yazma yolu açılmadan (2.2.F). Açık kalan tek uç: mobil tarafı (Parti 7).

### Parti 2.2.F — Tonaj özet metriği ✅ (2026-07-21)
- **Kapsam:** `apps/web/lib/tonnage.ts` (yeni dosya), `apps/web/app/(dashboard)/programs/[id]/page.tsx`, `apps/web/app/(dashboard)/programs/[id]/program-detail-client.tsx`. `acwr-client.tsx`/`acwr_logs`'a dokunulmadı (talimat gereği, Parti 6 kapsamı). Yeni DB kolonu/tablosu yok — salt hesaplama + render.
- **Önce-kontrol bulguları:**
  - `programs/[id]/page.tsx` **`athleteMaxes` fetch ETMİYORDU** — 2.2.E'nin "üç server sayfası" (`tests/page.tsx`, `programs/new/page.tsx`, `programs/[id]/edit/page.tsx`) arasında değildi. Eklendi.
  - `program-detail-client.tsx`'in `exercises(*, exercise_sets(*))` join'i (2.2.D'de `packages/db/queries/programs.ts`'e eklenmişti) zaten mevcuttu ve set tablosu zaten render ediliyordu — dokunulmadı, doğrudan tonaj hesabı için kullanıldı.
- **Bireysel vs takım programı ayrımı (2.2.E'deki "Son max" rozeti kararıyla aynı gerekçe):** Program `athlete_id` doluysa (`scope==="athlete"`), o sporcunun `getAthleteMaxes` sonucu `page.tsx`'te çekilip client'a geçiriliyor. Program `team_id` doluysa (`scope==="team"`), tek bir "sahibi" sporcu olmadığından 1RM listesi **boş `[]`** geçiliyor — bu, takım programındaki her `%1RM` setinin otomatik olarak "1RM eksikliği nedeniyle dahil edilmedi" sayılması anlamına gelir (doğru davranış: hangi sporcunun 1RM'i kullanılacağı belirsiz, yanlış bir sayı üretmektense dışlamak tercih edildi).
  - Not: 2.2.E'nin per-athlete-loop deseni (tüm org sporcularının maxlarını çekip birleştirme) burada **kullanılmadı** — bu sayfa tek bir programa ait, org geneline ihtiyaç yok; `program.athlete_id` biliniyorsa doğrudan `getAthleteMaxes(supabase, program.athlete_id)` tek çağrısı yeterli.
- **`apps/web/lib/tonnage.ts` (saf fonksiyonlar, DB'ye dokunmuyor):** `buildMaxLookup` (egzersiz adı → en güncel 1RM kg, `Athlete1RMRecord[]`'den `Map` kurar — `getAthleteMaxes`'in kendi dedup'ından SONRA çalıştığı için ek bir "en güncel kazanır" mantığına gerek yok, ama yine de `Map.set` yalnızca ilk görülende yazıldığından çift güvenli), `calculateExerciseTonnage`/`calculateSessionTonnage`/`calculateProgramTonnage`. Set bazlı kural (`calculateSetTonnage`, dosya içi, export edilmiyor):
  1. `is_bodyweight` veya `band_resistance` doluysa → kg'a hiç girmez, `reps` `bodyweightRepCount`'a eklenir.
  2. `load_kg` doluysa → `reps × load_kg` → `totalKg`.
  3. `percent_1rm` doluysa → `maxLookup`'ta egzersiz adı için kayıt varsa `reps × (percent_1rm/100 × 1RM)` → `totalKg`; yoksa `excludedSetCount += 1` (tonaja hiç girmez).
  4. Hiçbiri doluysa (örn. yalnızca süre bazlı, yük bilgisi hiç girilmemiş) → sessizce atlanır (0 katkı, hiçbir sayaca eklenmez) — spesifikasyonda bu durum için ayrı bir istek yoktu.
  - Session/program toplamı, egzersiz sonuçlarının basit toplamı (`reduce`).
- **`program-detail-client.tsx` render:** Başlık kartında program geneli "Toplam Tonaj: X kg" (+ varsa "N set 1RM eksikliği nedeniyle tonaja dahil edilmedi" amber uyarı). Her seans kartının başlığının altında aynı üçlü (seans tonajı + varsa bodyweight/bant tekrar sayısı + varsa dışlanan set sayısı) — `useMemo` ile `maxLookup` bir kez kuruluyor, tonaj hesapları ondan türüyor.
- **Doğrulama (gerçek Supabase Cloud verisiyle, Playwright bu ortamda mevcut değildi — bkz. not aşağıda):**
  1. `pnpm --filter web build` → 0 hata (yalnızca önceden var olan uyarılar).
  2. **Gerçek mevcut veriyle (görevin kendi manuel örneği):** İbrahim'in takımının canlı "Hipertrofi" programı (Back Squat 3×8×80kg + Bench Press 3×8×50kg — bu tam olarak görev talimatındaki örnek) PostgREST üzerinden `getProgramById`'in kullandığı **birebir aynı** join (`training_sessions(*,exercises(*,exercise_sets(*)))`) ile, test kullanıcısının gerçek oturum JWT'siyle (RLS aktif) çekildi; şu anda sevk edilen `apps/web/lib/tonnage.ts` kodu bu veri üzerinde çalıştırıldı (Node 24 `--experimental-strip-types`, gerçek dosya — el ile taklit edilmiş bir kopya değil). Sonuç: `totalKg=3120` — talimattaki manuel hesapla (`8×80×3 + 8×50×3 = 1920+1200=3120`) birebir eşleşti, `excludedSetCount=0`, `bodyweightRepCount=0`.
  3. **%1RM eksik senaryosu (geçici test verisi, Supabase'e gerçek insert ile):** İbrahim için bireysel (athlete-scoped) bir test programı oluşturuldu — Back Squat (3×8×80kg), Bench Press (3×8×%70, önceden eklenen geçici bir 1RM kaydı: 100kg → beklenen 3×8×70=1680kg), Deadlift (2×5×%80, **kasıtlı olarak 1RM kaydı YOK**), Band Pull Apart (2 set, 15+12 tekrar, direnç bandı). Aynı gerçek-JWT + gerçek-kod yöntemiyle çalıştırıldı: `totalKg=3600` (1920+1680, elle hesapla birebir), `excludedSetCount=2` (Deadlift'in 2 seti — doğru), `bodyweightRepCount=27` (15+12 — doğru). Test programı ve geçici 1RM kaydı doğrulama sonrası SQL ile silindi (cascade ile session/exercise/exercise_sets dahil), DB temizliği SQL ile teyit edildi (`leftover_program=0, leftover_1rm=0, leftover_exercises=0`).
  4. **Regresyon:** "aaaaaaaaaaa" (Bisiklet, 1×1×1kg) ve "asdasdasd" (Arnold Press/Ayı Yürüyüşü/Cable Row kg + Single-Leg Hip Thrust bodyweight/bant karışık) programlarının gerçek verisi de aynı yöntemle çekilip hesaplandı — hiçbiri `percent_1rm` kullanmadığından `excludedSetCount=0` her ikisinde de, hesaplama hatasız çalıştı (crash/NaN yok).
  - **Araç notu:** Bu oturumda bir Playwright/tarayıcı MCP aracı mevcut değildi (önceki partilerin "canlı Playwright doğrulaması" yaptığı ortamdan farklı) — bu yüzden gerçek DOM render'ı görsel olarak doğrulanamadı. Bunun yerine daha güçlü bir yöntem kullanıldı: sevk edilen gerçek `tonnage.ts` kodu, uygulamanın gerçek sorgusuyla (aynı PostgREST join, RLS altında gerçek kullanıcı JWT'si) çekilen gerçek veriye karşı doğrudan çalıştırıldı — hesaplama mantığı için DOM'u görmekten daha kesin bir kanıt, ama JSX/CSS render'ının gözle görülür doğruluğu (örn. amber uyarı rengi, layout) doğrulanamadı. Sonraki bir oturumda Playwright mevcutsa görsel bir geçiş önerilir.
  5. Mevcut hiçbir şey bozulmadı: `program-detail-client.tsx`'in diğer render yolları (yayınla butonu, edit linki, boş-seans durumu) değişmedi; yalnızca ek satırlar eklendi.

### Parti 2.2.E — 1RM manuel giriş formu + mevcut query'leri bağlama ✅ (2026-07-20)
- **Kapsam:** `apps/web/app/(dashboard)/tests/page.tsx`, `tests-client.tsx`, `apps/web/components/features/program-builder/exercise-list.tsx`, `apps/web/app/(dashboard)/programs/new/page.tsx` + `new-program-client.tsx`, `apps/web/app/(dashboard)/programs/[id]/edit/page.tsx` + `edit-program-client.tsx`. `packages/db/queries/exercises.ts`'teki `getAthleteMaxes`/`create1RMRecord` **değiştirilmedi**, sadece çağrıldı (talimat gereği). `test_results` tablosuna/"Maksimal Kuvvet" kategorisine dokunulmadı.
- **Önce-kontrol bulguları (talimat gereği doğrulandı, varsayılmadı):**
  - `create1RMRecord` düz bir `insert()` — her çağrı **yeni satır** ekliyor, geçmiş korunuyor (upsert/üzerine yazma yok).
  - `getAthleteMaxes` bir sporcunun tüm kayıtlarını `test_date desc` sıralayıp her `exercise_name` için **ilk görüleni** (yani **en güncel test_date'li kaydı**) döndürüyor — "en yüksek kg" DEĞİL, "en güncel" dedup. Aynı güne iki kayıt girilirse hangisinin kazanacağı sıralama kararsızlığına bağlı (var olan bir kenar durumu, bu partinin kapsamında düzeltilmedi).
  - `athlete_1rm_records` RLS'i **zaten vardı** (`005_exercises.sql`, `1rm_select/insert/update/delete` politikaları) ve `exercises_select/write` ile aynı erişim mantığını takip ediyor (org'daki herhangi bir admin/coach — takım kısıtı yok — + sporcu kendisi). Yeni politika eklenmedi.
  - **Uyuşmazlık tespiti:** `getAthleteMaxes(client, athleteId)` tek bir sporcu alıyor, ama `/tests` sayfası (`getTests(orgId)` gibi) org geneli. Org-geneli eşdeğeri yok ve fonksiyon değiştirilemiyordu — çözüm: sunucu bileşeninde her sporcu için ayrı ayrı çağrılıp (`Promise.all`) sonuçlar birleştirildi (`packages/db/queries/exercises.ts`'e dokunulmadı).
- **`/tests` sayfası — "1RM Kayıtları" alt-bölümü:** Mevcut `showForm`/`filtered` deseni takip edilerek eklendi. Liste: sporcu, egzersiz, en güncel kg, tarih (org geneli, yukarıdaki per-athlete-loop'tan). Form: sporcu seçimi (mevcut `athletes` prop'u), egzersiz seçimi (`platform_exercises` + `org_exercises`'tan **basit `<select>`** — ExercisePickerModal değil, talimatın "mevcut deseni tercih et" seçeneği izlendi, bu sayfanın geri kalanı zaten plain-select kullanıyor), ağırlık/tarih/not → `create1RMRecord`. Yerel state güncellemesi `getAthleteMaxes`'in "en güncel kazanır" dedup mantığını tekrar eden bir `dedupeLatestMaxes` helper'ıyla yapılıyor (yalnızca UI state, DB fonksiyonuna dokunmuyor).
- **Program builder — "Son max" rozeti:** `ExerciseList`'e `athleteMaxes?: Athlete1RMRecord[]` prop'u eklendi, `ExercisePickerModal`'a geçiriliyor (modal'ın kendi render mantığı zaten hazırdı, dokunulmadı). `new-program-client.tsx`/`edit-program-client.tsx`'te veri, sunucu bileşeninde (tests sayfasındakiyle aynı per-athlete-loop) tüm sporcular için çekilip, client'ta **seçili `athlete_id`'ye göre filtrelenip** geçiriliyor: bireysel (`scope==="athlete"`) programlarda seçili sporcunun maksları görünür, takım (`scope==="team"`) programlarında rozet hiç görünmez — bir takım programının tek bir "sahibi" sporcusu olmadığından "Son max" göstermek anlamsız/yanıltıcı olurdu. Bu, talimattaki "sadece bu satırı ekle" ifadesinin ima ettiğinden daha fazla kablolama gerektirdi (veri hiç çekilmiyordu) ama tasarım kararı minimal tutuldu.
- **Yan bulgu (düzeltildi) — Supabase-js "never" tip çıkarımı:** `programs/new/page.tsx`, `programs/[id]/edit/page.tsx` ve `tests/page.tsx`'te `athletesResult.data ?? []` sonucu tipsiz bir `const athletes = ...`'a atanıp `.map()` ile tekrar kullanılınca (yeni `getAthleteMaxes` loop'u için), TypeScript sporcunun tipini `never`'e indirgiyordu (`Property 'id' does not exist on type 'never'`) — muhtemelen supabase-js'in generic `PostgrestResponse.data` tipinin yalnızca doğrudan bir contextual type hedefine (örn. JSX prop) atanınca doğru çözüldüğü bir quirk. Çözüm: `const athletes: { id: string; full_name: string; team_id: string }[] = ...` gibi açık tip anotasyonu eklendi (3 dosyada). Davranışta etkisi yok, yalnızca derleme zamanı.
- **Doğrulama:**
  1. `pnpm --filter web build` → 0 hata (yalnızca önceden var olan uyarılar).
  2. Playwright ile canlı doğrulama (İbrahim Çolak/tosunbeytullah9 hesabıyla, `localhost:3000`): `/tests`'e "1RM Kayıtları" bölümü eklendi, form dolduruldu (İBRAHİM ÇOLAK, Back Squat, 123.5 kg, 2026-07-20), `POST .../athlete_1rm_records` → 201, tablo satırı DB değerleriyle birebir eşleşti.
  3. `/programs/new`'de: başlık dolduruldu, kapsam="Bireysel Sporcu" + İBRAHİM ÇOLAK seçildi, "Devam", gün eklendi, "Kütüphaneden Seç" açıldı, "Back Squat" arandı → **"Son max: 123.5 kg" rozeti göründü** (yukarıdaki adımda eklenen kayıtla birebir).
  4. RLS simülasyonu (`set local request.jwt.claims`, SQL): İbrahim'in kendi `user_id`'siyle sorgu → kendi 1 kaydını görüyor; alakasız/rastgele bir `sub` (ne sporcu sahibi ne org'da coach/admin) ile sorgu → **0 satır**. Şu an org'da tek aktif sporcu (İbrahim) olduğundan "başka bir sporcunun kaydını göremiyor" senaryosu gerçek ikinci bir sporcuyla test edilemedi, ama politika sporcuya-özgü simetrik olduğundan (yabancı kullanıcı 0 satır görüyor) yapısal olarak izolasyon doğrulandı.
  5. Test verisi (1RM kaydı, `notes='PW-TEST 2.2.E verification'`) doğrulama sonrası SQL ile silindi. Test programı DB'ye hiç yazılmadı (yalnızca builder'ın 1. adımı/picker'ı gezildi, submit edilmedi) — temizlenecek bir şey yok.
- **Araç notu (gelecek Playwright doğrulamaları için):** Bu sandbox ortamında headless Chromium'un varsayılan HTTP/2 ile Supabase Auth'a `fetch()` çağrıları bazen `net::ERR_ABORTED`/"Failed to fetch" ile başarısız oluyordu (saf Node `fetch`/`curl` ve Playwright'ın kendi `page.request` client'ı etkilenmiyor — yalnızca sayfa içi tarayıcı `fetch()`). `chromium.launch({ args: ['--no-sandbox', '--disable-http2'] })` sorunu gideriyor. Kod tabanıyla ilgisi yok, ortam/araç kısıtı.
- PROGRESS.md § Sıradaki Görevler → Öncelik 2'deki "1RM takibi" ✅ işaretlendi.

### Parti 2.2.D — Set bazlı UI, uçtan uca kablolama ✅ (2026-07-20)
- **Kapsam:** `exercise-list.tsx`, `new-program-client.tsx`, `edit-program-client.tsx`, `program-detail-client.tsx`, `packages/db/queries/programs.ts`, `packages/db/types.ts` (regen). 1RM giriş formu ve tonaj gösterimi kapsam dışı (2.2.E/F).
- **Önce-kontrol bulguları (talimat gereği doğrulandı):**
  - Eski tek-satırlık grid'in "yük tipine göre kg/%1RM/RPE" switch'i incelendi (2.2.C'de taşınan hali) — aynı desen (koşullu input render) yeni set-bazlı UI'da tekrar kullanıldı, ama semantik değişti: eski switch **egzersiz seviyesindeydi** (kg/%1RM/RPE, 3 seçenek), yeni switch **set seviyesinde** ve 4 seçenekli (Kg/%1RM/Vücut Ağırlığı/Direnç Bandı) — çünkü `exercise_sets` şemasında yük tipini egzersiz değil set taşıyor (014_exercise_sets.sql). `exercise_sets` tablosunda ayrı bir `load_type` kolonu yok; tip `load_kg`/`percent_1rm`/`is_bodyweight`/`band_resistance` kolonlarından HANGİSİNİN dolu olduğundan türetiliyor — dropdown yalnızca form state'inde yaşıyor, submit'te doğru kolona çevriliyor (`setToInsertColumns` helper, hem new hem edit client'ta simetrik).
  - Nested `useFieldArray` (sessions.N.exercises.M.exercise_sets) spike'ı: React hooks kuralları gereği `useFieldArray`'i bir `.map()` callback'i içinde doğrudan çağırmak geçersiz (hook çağrı sayısı egzersiz sayısına göre değişir) — bu yüzden her egzersiz satırı `ExerciseRow` adında ayrı bir alt-bileşene çıkarıldı, kendi `exercise_sets` alanı için kendi `useFieldArray`'ini çağırıyor. react-hook-form 7.52 bu iç içe deseni sorunsuz destekliyor (zaten var olan `sessions→exercises` nesting'iyle aynı mekanizma, bir seviye daha). Alternatif (flat array + index referansı) gerekmedi.
- **Tasarım:** Egzersiz seviyesinde "Tekrar bazlı"/"Süre bazlı" toggle (`is_duration_based`, form-only — DB'de ayrı kolon yok, hangi set alanının (`reps` vs `duration_sec`) dolu olduğundan edit'te geri türetiliyor). Set satırı: Set# (salt okunur, dizi index'inden), Tekrar/Süre input, Yük Tipi dropdown, koşullu değer alanı (Kg→sayı, %1RM→sayı 0-100, Vücut Ağırlığı→alan yok, Direnç Bandı→Yumuşak/Orta/Sert dropdown), her zaman görünen RPE (1-10, 0.5 adım), sil butonu (son set kalınca disabled — "en az 1 set" kuralı UI'da fiziksel olarak imkansız kılındı, yalnızca zod `.min(1)`'e güvenilmedi). "+ Set Ekle" bir önceki setin tüm alanlarını klonluyor. Egzersiz eklendiğinde otomatik 1 boş set ile başlıyor. `rest_sec` egzersiz seviyesinde tek alan (önceki karar korundu).
- **Zod şeması:** `exerciseSetSchema` (`.superRefine`) yük tipine göre ilgili değer alanının dolu olmasını zorunlu kılıyor (Kg→`load_kg`, %1RM→`percent_1rm`, Bant→`band_resistance`). "reps VEYA duration_sec dolu olmalı" kontrolü set şemasında DEĞİL `exerciseSchema.superRefine`'da — çünkü hangisinin zorunlu olduğu (`is_duration_based`) egzersiz seviyesinde yaşıyor, set kendi başına bilemez.
- **Yeni set alanları NaN sınıfı bug'ı TEKRARLAMIYOR:** `week_number`/`duration_min`'de zaten kayıtlı olan `valueAsNumber` + boş input → `NaN` → zod sessiz reddi deseni (BUGS.md, Parti 2.2.C'de bulundu) bilerek yeni set alanlarında (reps/duration_sec/load_kg/percent_1rm/rpe) kullanılmadı — bunun yerine `setValueAs: (v) => v === "" ? undefined : Number(v)` ile boş input `undefined`'a çevriliyor, optional alan doğru şekilde "girilmemiş" sayılıyor. Pre-existing `week_number`/`duration_min` alanları bu partinin kapsamı dışında bırakıldı, dokunulmadı.
- **Sessiz submit reddi kısmen giderildi (yan etki, bilinçli):** `handleSubmit(onSubmit)` → `handleSubmit(onSubmit, onInvalid)` yapıldı (hem new hem edit client). `onInvalid` artık `alert()` ile kullanıcıya "eksik/hatalı alan var" mesajı gösteriyor. Bu, BUGS.md'deki "sessiz" şikayetini gideriyor (kullanıcı artık bir şey görüyor) ama kök nedenleri (week_number/duration_min'in NaN üretmesi) DÜZELTMİYOR — mesaj hâlâ jenerik, alan-spesifik değil. BUGS.md'de buna göre güncellendi.
- **Submit akışı (new + edit, simetrik):** Egzersizler artık tek tek insert ediliyor (bulk insert + `.select()` yerine döngü içinde `insert().select().single()`) — bulk insert'te dönen satır sırasının insert sırasıyla eşleştiği garantisine güvenmek yerine, her egzersizin kendi id'sini alıp `exercise_sets`'i ona bağlamak için. Deprecated kolonlara (`sets`/`reps`/`load_kg`/`load_percent`/`load_percent_1rm`/`rpe_target`/`load_type`/`unit`) artık hiç yazılmıyor (satırdan tamamen çıkarıldı, DB default'ları/null kalıyor).
- **Edit — delete-then-reinsert doğrulaması:** `training_sessions` silinince `exercises` (FK cascade) ve ardından `exercise_sets` (FK cascade) otomatik siliniyor — ayrı bir `exercise_sets` delete adımına gerek yok, canlı testte doğrulandı (yeni id'ler, eski id'ler DB'de yok).
- **`program-detail-client.tsx`:** `exercises(*, exercise_sets(*))` join'i ile okuyor (packages/db/queries/programs.ts `getProgramById`/`getPrograms` güncellendi), her egzersiz altında set tablosu gösteriyor (Set/Tekrar-Süre/Yük/RPE), yük `formatSetLoad` ile band/bodyweight/%1RM/kg önceliğiyle formatlanıyor.
- **`packages/db/types.ts` regen:** `mcp__Supabase__generate_typescript_types` ile yeniden üretildi — önceki dosyada `exercise_sets` tablosu HİÇ tiplenmemişti (014/015 migration'ları cloud'da uygulanmış ama types.ts asla regen edilmemişti, Parti 2.1/2.2.B/C bunu atlamış). Bu partinin bir parçası olarak düzeltildi, `packages/db` ve `apps/web` `tsc --noEmit` + `pnpm --filter web build` temiz.
- **DEPRECATED KOLON TARAMASI (talimat gereği, dokunulmadı):** `apps/mobile/components/ExerciseCard.tsx` hâlâ `exercise.sets`/`exercise.reps`/`exercise.duration_sec`/`exercise.load_kg`/`exercise.load_percent`/`exercise.unit` okuyor (program ekranındaki sporcu görünümü). Bu partiden sonra oluşturulan/düzenlenen programlarda bu kolonlar hep null olacağından, mobil bu programlar için boş/eksik değer gösterecek (set listesini hiç göstermiyor, sadece "X set" gibi özet). **Mobil Parti 7 kapsamında** — bu partide dokunulmadı, yalnızca raporlanıyor. Web tarafında (exercise-form-fields.tsx, exercise-picker-modal.tsx, create/edit/fork-exercise-modal.tsx) görülen `load_type` referansları farklı bir kavram (platform_exercises/org_exercises katalog metadata'sı — "bu egzersiz genelde nasıl yüklenir"), `exercises` (program instance) tablosuyla ilgisi yok, taranmadı/dokunulmadı çünkü zaten deprecated değil.
- **Doğrulama (Playwright + gerçek veri + RLS simülasyonu):**
  1. `pnpm --filter web build` → 0 hata (yalnızca önceden var olan uyarılar).
  2. Yeni program oluşturuldu (İbrahim'in takımı ACE, "PW-TEST Set Bazlı Program"): Back Squat 4 set (60/70/75/80kg, RPE 7/7.5/8/8.5, hepsi 5 tekrar) + Band Pull Apart 2 set (15/12 tekrar, Orta/Sert direnç bandı). DB sorgusu: `exercise_sets` satırları form girdileriyle birebir, `exercises` tablosundaki deprecated kolonların hepsi `null`.
  3. Programı düzenle: Set 1'in yükünü 60→65kg değiştir, kaydet. DB: `exercises`/`exercise_sets` YENİ id'lerle yeniden oluşmuş (delete-then-reinsert), set1 65kg'a güncellenmiş, diğer 5 set (70/75/80 + 2 bant seti) değişmemiş. İbrahim'in diğer published programı "aaaaaaaaaaa" (Bisiklet, 1 set) **aynı `set_id`, aynı `created_at`** ile bire bir korunmuş — sıfır etki.
  4. `program-detail-client.tsx` DOM metni DB değerleriyle birebir eşleşiyor (Set/Tekrar/Yük/RPE tablosu, "Orta bant"/"Sert bant" formatlaması dahil).
  5. RLS simülasyonu (İbrahim'in `user_id`'siyle `set local request.jwt.claims`): program taslakken (`is_published=false`) İbrahim'e görünen set sayısı **0**; UI'dan "Yayınla"ya basılınca **6** (4+2) — `exercise_sets_select` politikası hem taslak/yayın geçişinde hem yeni satırlarda doğru çalışıyor. Test verisi sonunda `training_programs` satırı silinerek temizlendi (cascade ile `exercise_sets` dahil sıfırlandı, doğrulandı).
- **Playwright test altyapısı notu:** `exercise-list.tsx`'e minimal `data-testid` attribute'ları eklendi (exercise-row/set-row/add-set/add-exercise/load-type/vb.) — karmaşık iç içe set formunu placeholder/class tabanlı kırılgan selector'lar yerine güvenilir şekilde sürmek için. Davranışta hiçbir etkisi yok (yalnızca DOM attribute'u), CLAUDE.md Agent 6'nın gelecekteki Playwright E2E testleri için de yeniden kullanılabilir.

### Parti 2.2.C — ExerciseList paylaşılan bileşene taşındı (davranış değişikliği yok) ✅ (2026-07-20)
- `apps/web/components/features/program-builder/exercise-list.tsx` — yeni dosya. `new-program-client.tsx` ve `edit-program-client.tsx`'teki birebir aynı `ExerciseList` alt-bileşeni (egzersiz ekleme, superset_group atama, set/reps/load grid'i, `getGroupCount`/`handleGroupChange` mantığı) buraya taşındı — satır satır aynen, davranış değişikliği yok. `exerciseSchema`, `SUPERSET_GROUPS`, `SUPERSET_COLORS`, `LOAD_TYPES` de bu dosyaya çıkarıldı ve her iki client artık aynı `exerciseSchema` referansını import ediyor (önceden iki ayrı ama yapısal olarak özdeş zod objesiydi).
- **Bulunan küçük uyuşmazlık (rapor edildi, kullanıcı onayıyla giderildi):** İki orijinal `ExerciseList` birebir değildi — `new-program-client.tsx`'te kullanılmayan bir `groupedLabels` değişkeni (dead code, hiç okunmuyordu) ve kullanılmayan bir `FieldValues` type import'u vardı, `edit-program-client.tsx`'te yoktu. İkisi de runtime'da etkisizdi (unused), paylaşılan bileşene taşınırken ikisi de düşürüldü — davranışta fark yaratmaz.
- **Tip uyarlaması (kaçınılmaz, refactor'ün doğası gereği):** `ExerciseList` artık `TFieldValues extends ProgramFormShape` generic'i ile çalışıyor (iki dosyanın kendi `ProgramForm` tipi yapısal olarak aynı ama nominal olarak farklı zod-türetilmiş tipler). react-hook-form'un `Path<T>`/`ArrayPath<T>` tipleri generic parametre üzerinden path string'lerini doğrulayamadığı için `register`/`watch`/`setValue`/`useFieldArray` çağrılarında hedefli `as Path<TFieldValues>`/`as never` cast'leri eklendi — yalnızca tip seviyesinde, runtime'da hiçbir etkisi yok (build ile doğrulandı).
- `new-program-client.tsx` ve `edit-program-client.tsx`: yerel `ExerciseList` tanımı silindi, ikisi de paylaşılan bileşeni import ediyor. Artık kullanılmayan `BookOpen` icon import'u (ExerciseList ile birlikte taşındığı için) her iki dosyadan da temizlendi.
- **Doğrulama:** `pnpm --filter web build` temiz (0 hata, önceden var olan uyarılar dışında yeni uyarı yok). Playwright ile canlı doğrulama: (1) İbrahim'in takımının "Hipertrofi" (Back Squat 3×8×80kg, Bench Press 3×8×50kg) ve "aaaaaaaaaaa" (Bisiklet 1×1×1kg) programlarının `/edit` sayfası DOM'u DB'deki değerlerle birebir eşleşiyor; (2) yeni program oluşturma akışı (3 adım, egzersiz + superset grubu dahil) uçtan uca test edildi, `exercises` tablosuna yazılan satır form girdileriyle birebir aynı; (3) edit akışında kaydetme (delete-then-reinsert) tetiklendi — session/exercise id'leri değişti ama tüm içerik (name/sets/reps/load_kg/rest_sec/notes/superset_group) korundu. Test verisi (yeni oluşturulan program) doğrulama sonrası silindi.
- **Yan bulgu (kapsam dışı, DOKUNULMADI):** Doğrulama sırasında iki ayrı, ExerciseList'le ilgisiz pre-existing bug bulundu — `week_number` ve `duration_min` (session seviyesi) alanları boş bırakılırsa `valueAsNumber` `NaN` üretiyor, zod `.optional().or(z.literal(undefined))` NaN'ı reddediyor, ve `handleSubmit`'e `onInvalid` handler'ı olmadığı için form **sessizce** submit olmuyor (kullanıcıya hata gösterilmiyor). Ayrıca boş `start_date`/`end_date` `""` olarak gönderiliyor, Postgres `date` kolonu için `invalid input syntax` hatası veriyor (`?? null` yalnızca null/undefined'ı yakalıyor, `""`'ı yakalamıyor). Üçü de `new-program-client.tsx`/`edit-program-client.tsx`'in ExerciseList DIŞINDAKİ, görev kapsamı dışı bırakılan onSubmit/programSchema mantığında — talimat gereği dokunulmadı, burada not düşülüyor.

### Parti 2.2.B — session_rpe şeması (atıl, Parti 6/7'de bağlanacak) ✅ (2026-07-18)
- `supabase/migrations/016_session_rpe.sql` — `training_sessions.session_rpe` (smallint, null, `CHECK between 1 and 10`), additive. Şu an hiçbir UI'dan doldurulmuyor, `acwr_logs`/`acwr-client.tsx` mekanizmasına bağlanmıyor — bağlantı Parti 6 (ACWR/Readiness birleştirme) ve Parti 7 (mobil "yaptım" akışı) kapsamında yapılacak.
- Local'de `supabase migration up` ile test edildi, cloud'a (`nlmwcygmbbxmfpsubvmh`) `supabase db push` ile uygulandı. `migration list` Local=Remote (016 dahil).
- Cloud doğrulaması (`information_schema` + `pg_constraint`): kolon `smallint`/nullable, CHECK constraint `(session_rpe >= 1) AND (session_rpe <= 10)`, kolon yorumu mevcut.
- `pnpm --filter web build` temiz geçti (yalnızca önceden var olan lint uyarıları, migration'la ilgisiz) — beklenen sonuç, çünkü hiçbir UI bu kolonu henüz okumuyor/yazmıyor.

### Parti 2.1 — exercise_sets şeması ✅ (2026-07-18)
- `supabase/migrations/014_exercise_sets.sql` — set bazlı yoğunluk takibi. Tamamen ADDITIVE:
  - **exercise_sets** tablosu: `exercise_id` (FK cascade) + `set_number` (unique birlikte), `reps`, `duration_sec`, `load_kg`, `percent_1rm`, `rpe`, `is_bodyweight`, `band_resistance`, `created_at`.
  - RLS: `exercises_select`/`exercises_write` (002_rls.sql) ile birebir aynı mantık, `exercise_id` üzerinden bir join hop'u fazla.
  - `exercises.completed_at` ve `training_sessions.athlete_session_notes` eklendi (her ikisi de null, henüz UI/RLS yazma yolu yok — bilinçli, Parti 2.2'de).
  - Eski kolonlar (`sets`, `reps`, `duration_sec`, `load_kg`, `load_percent`, `load_percent_1rm`, `rpe_target`) SİLİNMEDİ, `DEPRECATED` yorumu eklendi — UI (Parti 2.2) geçene kadar paralel yaşıyor.
  - Veri migration'ı: 5 mevcut `exercises` satırı → 13 `exercise_sets` satırı (`SUM(sets)` ile birebir). Cloud'da doğrulandı (satır sayısı + örnek satır karşılaştırması).
  - RLS doğrulaması: İBRAHİM ÇOLAK hesabıyla simülasyon (gerçek login değil — `set local request.jwt.claims`) → kendi takımının (Hipertrofi + "aaaaaaaaaaa" programları) 7 set'ini görüyor, diğer takımın published programındaki ("asdasdasd", Arnold Press + Ayı Yürüyüşü, 6 set) hiçbirini görmüyor. İzolasyon çalışıyor.
  - `pnpm --filter web build` temiz geçti (sadece önceden var olan lint uyarıları, migration'la ilgisiz).
- **Not — "yukarıdaki şema" bulunamadı:** Görev talimatı exercise_sets için önceden verilmiş bir şemaya atıfta bulunuyordu ama bu konuşmada/repoda öyle bir şema yoktu (muhtemelen özetlenmiş/düşmüş bir önceki mesaj). Şema, veri migration adımındaki alan listesinden (reps/duration_sec/load_kg/percent_1rm/rpe/is_bodyweight/band_resistance) ve mevcut `exercises` kolon tipleriyle birebir eşleştirilerek yeniden inşa edildi. **Kullanıcı doğrulamalı** — özellikle `band_resistance` (text seçildi, mevcut veride örnek yok) ve `created_at` dışında bookkeeping kolonu eklenmediği (updated_at yok, `exercises` da yok çünkü).
- **Yan bulgu 1 (düzeltildi):** `006_exercise_seed.sql:249` — `array[]` tip cast'i olmadan kullanılmış ("Leg Extension" secondary_muscles), fresh `supabase db reset`'i `ERROR: cannot determine type of empty array (42P18)` ile kırıyordu. `array[]::text[]` yapıldı. Cloud etkilenmedi (135 satır zaten doğruydu, migration remote'ta zaten "applied" işaretli — push bu dosyayı tekrar çalıştırmaz).
- **Yan bulgu 2 (DÜZELTİLMEDİ — karar bekliyor):** `008_rls_signup.sql` ve `009_security_fixes.sql`, `organizations.owner_id`/`plan_status`/`trial_ends_at` kolonlarına referans veriyor ama bu kolonlar ancak `010_trial.sql`'de ekleniyor. Fresh `db reset` bu yüzden 008'de `column "owner_id" does not exist` ile patlıyor (remote etkilenmiyor — gerçek tarihsel apply sırası farklıydı, PARTİ 3'ün migration repair'i bunu gizledi). Local'de sadece elle önden kolon ekleyip `migration up` ile atlatıldı, dosyalar değiştirilmedi. Kalıcı çözüm (numaraları kaydırmak / ara migration eklemek) migration geçmişini etkileyeceğinden burada yapılmadı — talimat isterse ayrı bir görev olarak ele alınmalı.

### Self-Serve Signup & Trial Sistemi ❌ TAMAMEN KALDIRILDI (Parti 5.A + 5.B, 2026-07-29)
> Bu bölüm artık tarihsel — aşağıdaki tüm dosyalar silindi, ürün self-serve pazarlama/deneme
> modelini kullanmıyor. Detay: § Parti 5.A (landing/trial/demo), § Parti 5.B (signup wizard),
> § Parti 5 Kapanış Özeti. Yerine gelen: `apps/web/app/admin/organizations/new/` (super_admin-only
> dahili org oluşturma) + mevcut `invite-member` davet akışı.
- ~~`apps/web/app/(auth)/signup/page.tsx` + `signup-form.tsx`~~ — Parti 5.B'de silindi
- ~~`apps/web/components/shared/marketing-shell.tsx`~~, ~~`apps/web/app/(marketing)/layout.tsx`~~, ~~`apps/web/components/features/landing/landing-page.tsx`~~, ~~`apps/web/app/(marketing)/demo/page.tsx`~~, ~~`apps/web/app/api/demo-request/route.ts`~~, ~~`apps/web/components/shared/trial-banner{,-wrapper}.tsx`~~ — Parti 5.A'da silindi
- `apps/web/app/page.tsx` — Kök route artık `!user` dalında doğrudan `redirect("/login")` yapıyor (Parti 5.A)

### Kimlik Doğrulama (Agent 2 — Auth Agent) ✅
- `apps/web/middleware.ts` — Route koruması + membership cookie cache (8 saat, `aiq_uid` ile kullanıcıya bağlı — bayat rol miras etmez). **LOGOUT GUARD FIX (2026-07-01):** athlete rol guard'ına `/auth/*` muafiyeti eklendi — auth route'ları (`/auth/logout`, `/auth/confirm`, `/auth/callback`) rol redirect'inden muaf. Parti 1'in yan etkisi olarak athlete `/auth/logout`'a gidince `/programs`'a geri atılıyordu (çıkış yapamıyordu); artık logout çalışıyor.
- `apps/web/app/auth/logout/route.ts` — Server-side logout (signOut + httpOnly aiq_* cookie temizliği)
- `apps/web/lib/supabase/client.ts` — Client component Supabase client
- `apps/web/lib/supabase/server.ts` — Server component Supabase client
- `apps/web/lib/hooks/useUserContext.ts` — Role + org + team hook
- `apps/web/app/(auth)/login/page.tsx` + `login-form.tsx` — Giriş sayfası
- `apps/web/app/(auth)/invite/[token]/page.tsx` — Davet kabul sayfası
- `apps/web/app/api/auth/invite/route.ts` — Davet oluşturma API endpoint
- `apps/web/app/auth/callback/route.ts` — OAuth callback
- `packages/validators/auth.ts` — Login + davet Zod şemaları

### Web Paneli (Agent 3 — Web Agent) ✅
- `apps/web/app/(dashboard)/layout.tsx` — Sidebar + header layout
- `apps/web/app/(dashboard)/athletes/` — Sporcu listesi (arama, filtre) + detay sayfası
- `apps/web/app/(dashboard)/programs/` — Program listesi, yeni program oluşturma, program detay, program düzenleme (`[id]/edit/`). **PARTİ 4:** egzersiz satırlarına yük tipi seçici (kg / %1RM / RPE → `load_type`/`load_kg`/`load_percent_1rm`/`rpe_target`) eklendi; new + edit builder + detay görünümü eşitlendi (edit delete-reinsert yaptığından veriyi korur).
- `apps/web/app/(dashboard)/acwr/` — ACWR dashboard
- `apps/web/app/(dashboard)/competitions/` — Yarışma listesi
- `apps/web/app/(dashboard)/tests/` — Test sonuçları (server + `tests-client.tsx`, atletik performans CRUD: 7 kategori/31 test tipi, kademeli dropdown, trend kolonu, filtreler) ✅ gerçekten tamamlandı (2026-07-01, Bug Partİ 2)
- `apps/web/app/(dashboard)/wearables/` — Wearable bağlantı durumu (server + `wearables-client.tsx`, 3 özet kartı, durum tablosu, filtreler; "Bağla" disabled — entegrasyon yakında) ✅ gerçekten tamamlandı (2026-07-01, Bug Partİ 2)
- `apps/web/app/(dashboard)/settings/` — Org ayarları (admin only)
- `apps/web/app/(dashboard)/exercises/` — Egzersiz kütüphanesi (platform + org, tam CRUD)
- `apps/web/app/admin/` — Super admin paneli (org listesi). **PARTİ 5.B:** `organizations/new/` alt-sayfası eklendi (dahili org oluşturma formu, yalnızca super_admin).
- `apps/web/components/shared/header.tsx` + `sidebar.tsx` — Layout bileşenleri (Egzersizler linki eklendi)
- `apps/web/components/features/athletes/add-athlete-modal.tsx` — Sporcu ekleme
- `apps/web/components/features/exercises/` — create-exercise-modal, edit-exercise-modal, create-category-modal, fork-exercise-modal, exercise-picker-modal (bug fix: type="button"), delete-confirm-dialog
- `apps/web/components/ui/` — shadcn/ui bileşenleri (badge, button, card, dialog, input, label, select, separator, skeleton, table, textarea)

### Mobil Uygulama (Agent 4 — Mobile Agent) ✅
- `apps/mobile/app/_layout.tsx` — Root layout
- `apps/mobile/app/index.tsx` — Root redirect
- `apps/mobile/app/(auth)/login.tsx` — Giriş ekranı
- `apps/mobile/app/(tabs)/_layout.tsx` — Bottom tab navigator
- `apps/mobile/app/(tabs)/program/index.tsx` — Haftalık program görünümü
- `apps/mobile/app/(tabs)/program/[day].tsx` — Günlük egzersiz detayı
- `apps/mobile/app/(tabs)/recovery/index.tsx` — Recovery ekranı
- `apps/mobile/app/(tabs)/competitions/index.tsx` — Yarışmalar
- `apps/mobile/app/(tabs)/profile/index.tsx` — Profil
- `apps/mobile/app/(tabs)/profile/connect-whoop.tsx` — WHOOP bağlantı
- `apps/mobile/app/(tabs)/profile/connect-polar.tsx` — Polar bağlantı
- `apps/mobile/lib/supabase.ts` — Expo uyumlu Supabase client
- `apps/mobile/lib/notifications.ts` — Push notification
- `apps/mobile/lib/hooks/useAthleteProfile.ts` — Profil hook
- `apps/mobile/components/ExerciseCard.tsx` — Egzersiz kartı

### Wearable Altyapısı (Agent 5 — Integration Agent) ✅ (altyapı hazır, aktif sync yok)
- `packages/integrations/whoop/` — client, oauth, types, normalize, transaction
- `packages/integrations/polar/` — client, oauth, types, normalize
- `supabase/functions/whoop-webhook/index.ts` — WHOOP webhook receiver (deploy edilmedi)
- `supabase/functions/polar-sync/index.ts` — Polar sync (deploy edilmedi)
- `supabase/functions/invite-member/index.ts` — Davet email gönderici (deploy edilmedi)

### Paylaşılan Paketler ✅
- `packages/db/` — DB tip tanımları ve query fonksiyonları
- `packages/ui/` — Paylaşılan UI bileşenleri (button, card, badge, input, label, skeleton)
- `packages/validators/` — Zod şemaları (auth, athlete, program, acwr, team)

---

## Veritabanı Durumu

**Supabase Cloud:** `nlmwcygmbbxmfpsubvmh.supabase.co`

### Uygulanan Migration'lar
| Versiyon | Dosya | Durum |
|----------|-------|-------|
| 001 | schema | ✅ Uygulandı |
| 002 | rls | ✅ Uygulandı |
| 003 | functions | ✅ Uygulandı |
| 004 | wearables | ✅ Uygulandı |
| 005 | exercises | ✅ Uygulandı (superset_group/order kolonları burada) |
| 006 | exercise_seed | ✅ Uygulandı |
| 008 | rls_signup | ✅ Uygulandı |
| 009 | security_fixes | ✅ Uygulandı |
| 010 | trial | ✅ Uygulandı (eski `007_trial.sql`, PARTİ 3'te yeniden adlandırıldı) |
| 011 | realtime | ✅ Uygulandı (2026-07-15 — daha önce elle SQL ile yapılmıştı, migration olarak kayda geçmemişti; AŞAMA 2'de push edildi, idempotent do-block olduğu için etkisiz geçti) |
| 012 | wellness | ✅ Uygulandı (2026-07-15 — Readiness AŞAMA 2 Adım 1: `wellness_checkins` + RLS + realtime) |
| 013 | readiness_scores | ✅ Uygulandı (2026-07-15 — ŞEMA only, motor sonraki iterasyon) |
| 014 | exercise_sets | ✅ Uygulandı (2026-07-18 — Parti 2.1, set bazlı yoğunluk takibi, additive) |
| 015 | exercise_sets_fixes | ✅ Uygulandı (2026-07-18 — Parti 2.1 doğrulama düzeltmeleri: `notes` kolonu + `band_resistance` CHECK) |
| 016 | session_rpe | ✅ Uygulandı (2026-07-18 — Parti 2.2.B, `training_sessions.session_rpe`, atıl/additive) |
| 017 | program_blocks | ✅ Uygulandı (2026-07-21 — Parti 3.B, çok haftalı program grubu tablosu + `training_programs.block_id`/`week_index_in_block`, additive, henüz atıl/UI bağlantısı yok) |

> **PARTİ 3 not:** `007_superset_columns.sql` silindi (005 zaten kapsıyor). Local dosya adları cloud geçmişindeki timestamp-prefix'lerle sapmıştı — kullanıcı onayıyla `supabase migration repair` çalıştırıldı (6 timestamp `reverted`, local 005/006/008/009/010 `applied`). `migration list` artık tam hizalı (Local = Remote). Şema tarafında etki yok.

### Mevcut Tablolar (RLS aktif, tüm tablolarda)
| Tablo | Satır Sayısı |
|-------|-------------|
| organizations | 1 |
| teams | 4 |
| memberships | 1 |
| athletes | 5 |
| training_programs | 1 |
| training_sessions | 1 |
| exercises | 2 |
| acwr_logs | 1 |
| competitions | 2 |
| competition_results | 0 |
| test_results | 0 |
| platform_exercises | 135 |
| org_exercise_categories | 5 |
| org_exercises | 0 |
| athlete_1rm_records | 0 |
| wearable_connections | 0 |
| wearable_daily_metrics | 0 |
| whoop_cycles | 0 |
| polar_sync_state | 0 |
| athlete_push_tokens | 0 |

### Edge Functions (Cloud'da Deploy Durumu)
- **invite-member** → ✅ Deploy edildi — `https://nlmwcygmbbxmfpsubvmh.supabase.co/functions/v1/invite-member`
- **whoop-webhook** → ✅ Deploy edildi — `https://nlmwcygmbbxmfpsubvmh.supabase.co/functions/v1/whoop-webhook`
- **polar-sync** → ✅ Deploy edildi — `https://nlmwcygmbbxmfpsubvmh.supabase.co/functions/v1/polar-sync`
- **Secrets:** `NEXT_PUBLIC_APP_URL` set edildi. `RESEND_API_KEY` henüz placeholder — email göndermek için resend.com'dan key alınıp set edilmeli.

---

## Ortam Bilgisi

- **Node:** 24
- **pnpm:** 11.9 (global binary). `package.json` `packageManager` artık `pnpm@11.9.0` ile hizalı. **ÖNEMLİ:** pnpm 11'de `overrides`, `onlyBuiltDependencies` ve `peerDependencyRules` ayarları `pnpm-workspace.yaml`'a taşındı — `package.json`'daki `pnpm` alanı artık okunmuyor. `@types/react` 19.2.17 / `@types/react-dom` 19.2.3 override'ı yaml'da sabit (çift `@types/react` TS2322 çözüldü). `pnpm install` build-script onayı için `onlyBuiltDependencies` (esbuild/sharp/unrs-resolver) kullanır.
- **Supabase Cloud URL:** `https://nlmwcygmbbxmfpsubvmh.supabase.co`

### Başlatma Komutları
```bash
# Web (koç/admin paneli)
pnpm dev --filter="@athleteiq/web"
# → http://localhost:3000

# Mobile (sporcu uygulaması)
pnpm --filter="@athleteiq/mobile" exec expo start --clear
# → Expo Go veya emülatör

# Tüm uygulamalar
pnpm dev

# Lint (PARTİ 3'te kuruldu — ESLint flat config)
pnpm lint                              # turbo lint (tüm paketler)
pnpm --filter="@athleteiq/web" exec eslint .   # yalnızca web (0 error, 21 warning)
```

### Env Dosyaları
- **Web:** `apps/web/.env.local` — Supabase URL + keys, Resend, WHOOP, Polar
- **Mobile:** `apps/mobile/.env` — Expo Supabase URL + anon key

### Test Kullanıcısı
- **Email:** tosunbeytullah9@gmail.com
- **Şifre:** AthleteIQ2026

---

## Bilinen Sorunlar

1. ~~**RESEND_API_KEY eksik**~~ — **KAYIT YANLIŞTI, DÜZELTİLDİ** (2026-07-15, Readiness AŞAMA 2 Adım 0):
   - `RESEND_API_KEY` secret'ta **mevcut** (2026-06-27'de set edilmiş). Bu madde bayattı.
   - **Asıl bulgu: davet e-postasının Resend ile İLGİSİ YOK.** [invite-member/index.ts:81](supabase/functions/invite-member/index.ts#L81) `supabaseAdmin.auth.admin.inviteUserByEmail()` çağırıyor — e-postayı **Supabase Auth'un kendi SMTP'si** gönderiyor. Fonksiyon `RESEND_API_KEY`'e hiç dokunmuyor. Repo genelinde Resend'i kullanan tek yer [demo-request/route.ts](apps/web/app/api/demo-request/route.ts) ve o da `apps/web/.env.local`'den okuyor, Supabase secret'ından değil. Yani Supabase'deki `RESEND_API_KEY` secret'ını şu an **hiçbir kod tüketmiyor**.
   - **Davetin gerçek koşulu:** Supabase Auth → SMTP ayarı. Varsayılan Supabase SMTP yalnızca **proje ekibi üyelerine** gönderir ve saatte ~2 e-posta ile sınırlıdır → gerçek sporcu davetleri için **custom SMTP şart** (Resend burada SMTP sağlayıcısı olarak kullanılabilir, ama bu Dashboard ayarı, Edge Function secret'ı değil).
   - Ayrıca Dashboard → Auth → URL Configuration → Redirect URLs'e `/auth/confirm` eklenmiş olmalı.

2. **🔴 Davet edilen sporcu `athletes` kaydına BAĞLANMIYOR** (2026-07-15'te bulundu) — Davet akışı yalnızca `memberships` satırı oluşturuyor; `athletes.user_id`'yi **hiçbir yerde set etmiyor** (ne [invite-member](supabase/functions/invite-member/index.ts) ne [auth/confirm](apps/web/app/auth/confirm/route.ts)). Sonuç: davet e-postası çalışsa bile sporcu check-in yapamaz — wellness/ACWR RLS'i `athletes.user_id = auth.uid()` üzerinden çalışıyor. Canlı durum: 6 sporcunun 4'ünde `user_id` null; ayrıca İBRAHİM ÇOLAK'ın `user_id`'si var ama **membership'i yok** (ters yönde kopukluk). Readiness katmanının veri üretebilmesi için bu bağın kurulması gerekiyor (davet payload'ına `athlete_id` eklemek veya `/auth/confirm`'de e-posta ile eşleştirmek).

2b. **Admin /dashboard yönlendirme** — Coach rolüyle giriş yapan kullanıcı `/dashboard`'a gitmeye çalışırsa `/athletes`'e yönlendiriliyor (middleware'de tanımlı, beklenen davranış). Ancak `/dashboard` doğrudan admin-only olarak işaretli, bu confusion yaratabilir. → Readiness komuta merkezi bu yüzden `/dashboard`'a değil yeni `/readiness` route'una konacak (READINESS_PLAN.md §5.1).

3. ~~**Realtime aboneliği**~~ — **Tamamlandı** (2026-06-26): `athletes-client.tsx` ve `programs-client.tsx`'e Supabase Realtime eklendi. `is_published=eq.true` filter ile UPDATE event gelince `router.refresh()` + toast notification tetikleniyor.

4. ~~**🔴 Mobile NavigationContainer hatası**~~ — **ÇÖZÜLDÜ** (2026-06-29):
   - **Expo CLI `Body is unusable` bug:** `@expo/cli@54.0.25` cache layer'ı response body stream'ini iki kez tüketiyordu. Fix: `EXPO_NO_CACHE=1` + `cross-env` ile `package.json dev` script'ine eklendi.
   - **Navigation context hatası — GERÇEK kök neden (2026-07-13):** İlk "fix" (`router.replace` → `<Redirect>`) yeterli değildi; hata Adım 2 sonrası geri geldi. İzolasyon teşhisiyle gerçek suçlu bulundu: **`react-native-css-interop@0.2.6`** (NativeWind motoru) `render-component.js` dev-only `stringify` path'i, prop serialize ederken React Navigation'ın throwing getter'ına çarpıp çöküyordu ("navigation context" yan hata idi). **Fix:** `patches/react-native-css-interop@0.2.6.patch` (stringify `try/catch`) + `pnpm-workspace.yaml patchedDependencies`. Cihazda doğrulandı. Detay: MOBILE_STATUS.md + memory `mobile-nav-blocker`. App kodu (Slot + Redirect) orijinal haliyle çalışıyor.
   - **Bonus:** `(tabs)/_layout.tsx` Tabs.Screen name'leri `program/index` → `program` formatına düzeltildi. `program/` ve `profile/` klasörlerine nested `_layout.tsx` eklendi.
   - **🔴 İKİNCİ BUG — DONMA (2026-07-15) — ÇÖZÜLDÜ.** Crash fix'i çökmeyi durdurdu ama **donmayı değil**. Belirti: Program ekranı ilk frame'de donuk (bayat "Henüz program yok"), **tab'lara basınca hiçbir şey olmuyor** — ama JS çalışıyor (fetch `count=2`, React `programs=2` render ediyor). Yani React doğru, **native Fabric surface tek frame sonrası commit etmiyor**.
     - **Kök neden:** aynı dosya — `printUpgradeWarning` → `stringify(originalProps)`. `originalProps.children` = React element ağacı → `_owner`/context üzerinden **Fiber + React Navigation obje grafiğinin tamamı**. try/catch çökmeyi engelledi ama stringify bu devasa grafı **her re-render'da geziyor** → JS thread kilitleniyor → yüzey donuyor, dokunuş işlenmiyor. Sadece dev/Expo Go.
     - **Neden sadece Program?** Sadece haftalık görünüm (7 gün × iç içe dinamik className) css-interop "upgrade" uyarısını tetikleyecek yoğunlukta. Recovery/Yarışmalar/Profil (aynı hook + className + fetch) sorunsuz → navigator, react-native-screens, reanimated, gesture-handler **suçsuz**.
     - **Fix:** `printUpgradeWarning` artık props'u derin stringify etmiyor, sığ `Object.keys()` logluyor. Patch dosyası güncellendi + `pnpm install` ile doğrulandı.
     - **İzolasyon yöntemi:** Program ekranını inline-style minimal sayaç+buton'a indir (çalıştı → navigator sağlam), sonra `programs.length===0` dalını zorla (donma kalktı → suçlu karmaşık render). Ekranda 1sn sayaç + render log: **log'da artıyor ama ekranda artmıyorsa → native donma** (JS değil).

6. ~~**Realtime "Bağlanıyor"da takılı**~~ — **ÇÖZÜLDÜ** (2026-07-15): `supabase_realtime` publication'ı **tamamen boştu** → `postgres_changes` aboneliği asla `SUBSCRIBED` olmuyordu. `training_programs` + `training_sessions` publication'a eklendi.

7. ~~**Mobile 20 TS hatası**~~ — **Geçersiz** (2026-07-15): `@athleteiq/db` zaten `apps/mobile/package.json`'da bildirilmiş; `tsc --noEmit` → **0 hata**. MOBILE_STATUS.md'deki 20-hata iddiası bayattı.

8. **🟡 `acwr_logs` UPDATE politikası eksik** (READINESS_PLAN.md §8.1, kapsam dışı) — `acwr_logs`'ta yalnızca INSERT + SELECT politikası var, ama [packages/db/queries/acwr.ts](packages/db/queries/acwr.ts) `upsert(onConflict: "athlete_id,log_date")` kullanıyor. Upsert çakışınca UPDATE'e döner → politika olmadığı için RLS reddeder → **aynı güne ikinci ACWR logu sessizce başarısız oluyor**. Tabloda 1 satır olduğu için fark edilmemiş. `wellness_checkins` bu hatayı tekrarlamıyor (012'de UPDATE politikası var). Ayrı bir migration ile düzeltilmeli.

5. ~~**Seed verisi yetersiz**~~ — **Tamamlandı** (2026-06-26): 2 yeni takım (Ritmik Takım, Trampolin Takım) ve 4 yeni sporcu eklendi. Toplam: 4 takım, 5 sporcu.

---

## Sıradaki Görevler

### Öncelik 0 — Tamamlandı (2026-06-29)
- [x] Self-serve signup akışı (4 adım) ✅
- [x] Trial sistemi (007_trial.sql, org_trial_status view, TrialBanner) ✅
- [x] Landing page + marketing layout ✅
- [x] Demo talep formu ✅
- [x] Login sayfasına "Hesap oluştur" linki ✅

### Öncelik 1 — Kritik
- [x] Edge Functions cloud'a deploy et (`supabase functions deploy invite-member`) ✅ (2026-06-27)
- [ ] Davet sistemini uçtan uca test et (RESEND_API_KEY set edildikten sonra — email gidiyor mu?)
  - ✅ `/auth/confirm/route.ts` oluşturuldu — `token_hash` doğrulama + membership upsert + metadata temizleme
  - ✅ `invite-member` Edge Function güncellendi — `pending_*` metadata + `SITE_URL/auth/confirm` redirectTo
  - ✅ `SITE_URL=http://localhost:3001` secret set edildi
  - ✅ Edge Function yeniden deploy edildi
  - ⚠️ Supabase Dashboard → Auth → URL Configuration → Redirect URLs'e ekle: `http://localhost:3001/auth/confirm` ve `http://localhost:3000/auth/confirm`
- [x] Realtime aboneliğini web'e ekle (program publish → sporcu anlık görür) ✅
- [x] Seed verisini genişlet (5 sporcu, 3 koç, gerçek veriler) ✅ (5 sporcu, koç ekleme bekliyor)

### Öncelik 2 — Özellik
- [x] `005_exercises.sql` + `006_exercise_seed.sql` — Egzersiz kütüphanesi ✅ (2026-06-26)
- [x] Program builder — süperset sistemi (A/B/C... grup renkleri, max 10 egzersiz/grup) ✅ (2026-06-26)
- [x] Egzersiz kütüphanesi web UI — platform + org katmanı, tam CRUD ✅ (2026-06-26)
- [x] Egzersiz kütüphanesi — super-admin platform yönetim ekranı (`/admin/exercises`, `platform_exercises` artık yazılabilir) ✅ (2026-08-07, Parti 9)
- [x] Exercise picker modal — program builder'da kütüphaneden egzersiz seçme ✅ (2026-06-26)
- [x] 1RM takibi — `/tests` sayfasında "1RM Kayıtları" bölümü + program builder "Son max" rozeti ✅ (2026-07-20, Parti 2.2.E)
- [x] Tonaj özet metriği — program detay sayfasında seans/program bazlı toplam tonaj + 1RM eksikliği uyarısı ✅ (2026-07-21, Parti 2.2.F — **Parti 2 tamamen kapandı**)
- [x] Tonaj hesabı tamamlandı — vücut ağırlığı çözümlemesi (`athletes.weight_kg`), sebep kodlu döküm, "hesaplanamıyor" fallback'i ✅ (2026-08-10, Parti 12)
- [x] Program silme/arşivleme (blok-farkında, yayın durumuna göre sil/arşivle) ✅ (2026-08-10, Parti 12)
- [x] Yarışma düzenleme/silme ✅ (2026-08-10, Parti 12)
- [x] Sabah wellness check-in — mobil form + geçmiş, web koç görünümü (`/readiness`) ✅ (2026-08-11, Parti 14)
- [ ] ACWR grafiği — Recharts ile görsel trend (şu an tablo mu grafik mi kontrol et)
- [ ] Readiness skor motoru — bireysel taban çizgisi (`readiness_scores`, ≥14 gün veri birikince, READINESS_PLAN.md §7 Adım 6)

### Öncelik 3 — Gelecek Sprint
- [ ] WHOOP aktif sync (altyapı hazır, webhook deploy + token yönetimi aktif et)
- [ ] Polar aktif sync (transaction commit flow test et)
- [ ] Stripe abonelik sistemi
- [ ] RLS izolasyon testleri (Vitest)
- [ ] Playwright E2E testleri

---

## MVP Tamamlanma Durumu

```
✅ Org Admin kullanıcı oluşturabilir (web)
✅ Coach davet edilebilir (e-posta — altyapı var, deploy bekliyor)
✅ Athlete davet edilebilir (e-posta — altyapı var, deploy bekliyor)
✅ Coach sporcu ekleyebilir
✅ Coach antrenman programı oluşturabilir
✅ Coach programı publish edebilir
✅ Athlete mobilde programı görebilir (navigation çözüldü, realtime var)
✅ Athlete ACWR logu girebilir
✅ Coach ACWR dashboard'unu görebilir
✅ Yarışma eklenebilir
✅ Test sonucu eklenebilir
❌ RLS testleri (henüz yazılmadı)
```
