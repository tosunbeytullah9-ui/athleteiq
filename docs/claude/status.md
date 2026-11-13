# Loadwell — MVP Kriterleri ve Mevcut Durum (CLAUDE.md §10, §11)

> CLAUDE.md'den Parti 18J'de (2026-11-13) **birebir** taşındı — metin ve § numaraları değişmedi.
> Diğer bölümlerin yeri için CLAUDE.md'deki "Başvuru dokümanları" haritasına bakın: [CLAUDE.md](../../CLAUDE.md).
> Kapsam: §10 MVP TAMAMLANMA KRİTERLERİ, §11 MEVCUT DURUM (Supabase Cloud, migration listesi, Edge Functions, env dosyaları, test hesapları, çalışan/bekleyen özellikler, AI Katmanı Kuralları).
> `AUTO-GENERATED:MIGRATIONS` bloğu `pnpm docs:sync` ile üretilir — elle düzenlemeyin.
> §11'in son alt bölümü "Her Yeni Session Başında" CLAUDE.md'de kaldı.

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
- 20261002113316_endurance_sessions_and_block_copy.sql
- 20261002113426_endurance_recovery_target.sql
- 20261002113543_week_number_allow_53.sql
- 20261005122102_drill_diagrams.sql
- 20261023115038_exercise_1rm_ratios_isportsi.sql
- 20261023144302_demo_requests.sql
- 20261023152441_org_slug_lock.sql
- 20261024082932_competition_stages.sql
- 20261026185415_auth_user_fk_set_null.sql
- 20261026185610_account_deletion_requests.sql
- 20261026201410_function_default_privileges_hardening.sql
- 20261026201424_account_deletion_requests_notified_at.sql
- 20261027091923_program_tree_rls_performance.sql
- 20261027110705_istanbul_calendar_defaults.sql
- 20261028113032_athlete_scoped_reads_and_competition_visibility.sql
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
  - `delete-org-user` — yeni (2026-09-09), ACTIVE — kullanıcı silme, `auth.users` cascade'iyle memberships/profiles otomatik temizlenir (Parti 18B'den beri audit FK'leri SET NULL olduğu için aktif kullanıcılarda da çalışır)
  - `process-account-deletion` — yeni (Parti 18B, 2026-10-26), ACTIVE, `verify_jwt: true` — hesap silme talebini tamamlar: athletes satırı (21 tablo CASCADE) + auth.users, bkz. §4.3
  - `notify-account-deletion` — yeni (Parti 18B-ek, 2026-10-26), `verify_jwt: true` — yeni silme talebini platform sahibine e-postayla bildirir (`notified_at`), bkz. §4.3
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
- ✅ Uygulama içi hesap silme talebi (Parti 18B, 2026-10-26 — App Store 5.1.1(v) + KVKK): sporcu/koç/admin mobil profilden "Hesabımı Sil" ile talep oluşturur veya geri alır (en geç 30 gün), admin `/settings/users` → "Silme Talepleri"nde etkiyi görüp kullanıcı adını yazarak kalıcı siler ya da gerekçeyle reddeder; sidebar'da "Kullanıcılar" rozeti, `/admin`'de org bazında açık talep sayısı. Bkz. §4.3
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
- ✅ Dayanıklılık programı (2026-10-02) — `/programs/new/endurance` (+ her seansın "Format"
  seçicisinde "Dayanıklılık"): koşu/bisiklet/kürek/yüzme/SkiErg/yürüyüş seansları; seans
  ısınma / sürekli / interval / toparlanma / soğuma bölümlerinden oluşur (mesafe ve/veya
  süre, tekrar, 5 bölgeli yoğunluk + serbest hedef "%80 tempo", interval toparlanması).
  Toplam mesafe/süre, bölge dağılımı ve türetilen tempo canlı hesaplanır; koç detayı, sporcu
  web görünümü ve mobil gün ekranları aynı kartı gösterir. Bkz. §6 Agent 3.
- ✅ Drill (koni) diyagramları (2026-10-05) — `/exercises`'te "Yeni Drill": koni yerleşimi + rota
  (sprint / geri koşu / shuffle / carioca / çapraz adım / hafif koşu çizgi stilleri, koni etrafı
  dönüş, etiket), drill bazında metre/yarda, 11 hazır şablon (Pro Agility, 3 Koni, T-Test, Illinois,
  Box, Uçan Sprint…). Programa aynı adla eklenen egzersizde diyagram otomatik görünür (program
  oluşturucu, program detayı, mobil koç ekranı). **Yalnızca koç ve admin görür** — sporcuya RLS
  düzeyinde kapalı. Bkz. §6 Agent 3.
- ✅ Blok kopyalama (2026-10-02) — program detayında "Bloğu Kopyala": bir bloğun tüm haftaları
  (seans/egzersiz/set/WOD/dayanıklılık ağacıyla) yeni bir tarihe, aynı ya da başka takıma /
  sporcuya taslak olarak kopyalanır; hedefte çakışan program varsa uyarır. Bkz. §6 Agent 3.
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
- ✅ Yarışma: ekleme + listeleme + sporcu bazlı katılımcı (roster) seçimi — `competition_entries` tablosu, her yarışmaya yalnızca seçilen sporcular kayıtlı (2026-09-09). Sporcu web'de `/competitions`'ta kendi kayıtlı olduğu yarışmaları salt-okunur görür (2026-09-11). **Cimnastik yarışma aşamaları (2026-10-24):** aynı yarışmanın Qualification / Apparatus Final / Team Final / All-Around Final aşamaları tek kayıtta tutulur — her aşamanın kendi günü olabilir (`competition_stages`), finale kalan sporcu yarışma formundaki "Aşama Kadrosu"ndan işaretlenir (`competition_entries.stages`). Yarışma kartı, sporcunun Müsabakalar ekranı ve sporcu detayı aşama rozetlerini gösterir; yarışma son final gününe kadar "yaklaşan" sayılır. Aşama seçilmeyen yarışmalar (Amerikan futbolu vb.) eskisi gibi çalışır. Kapsam dışı: hangi alet finali olduğu (yer, atlama…), aşama bazlı sonuç girişi, mobil görünüm.
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
  (yalnızca web — mobil stub `connect-polar.tsx` Parti 18A'da kaldırıldı) canlı testte çalıştı.
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
  `expo-notifications` kurulu değil, EAS `projectId` yok (`eas.json` Parti 18A'dan beri var,
  `projectId` kullanıcının `eas init`'iyle gelecek — Parti 18H; token için development build
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

