# Loadwell — Wearable Entegrasyonları (CLAUDE.md §5)

> CLAUDE.md'den Parti 18J'de (2026-11-13) **birebir** taşındı — metin ve § numaraları değişmedi.
> Diğer bölümlerin yeri için CLAUDE.md'deki "Başvuru dokümanları" haritasına bakın: [CLAUDE.md](../../CLAUDE.md).
> Kapsam: §5 WEARABLE ENTEGRASYONLARI — 5.1 WHOOP, 5.2 Polar, 5.3 Fitbit, 5.4 Normalize şema.

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

