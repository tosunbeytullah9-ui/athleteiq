// Ürün kimliğinin tek kaynağı (Parti 18C'de apps/web/lib/brand.ts olarak başladı,
// Parti 18E'de web + mobilin ortak paketine taşındı). apps/web/lib/brand.ts buradan
// yeniden export eder. Mobil şema / bundle ID apps/mobile/app.json'da da yazılıdır —
// brand.test.ts ikisinin ayrışmadığını doğrular.
//
// Sentetik giriş e-postalarının alan adı ({kullanici}@{slug}.athleteiq.app) bilinçli
// olarak marka değildir ve burada TUTULMAZ — dahili kimliktir, bkz. auth.ts.

export const PRODUCT_NAME = "Loadwell";

/** Birincil alan adı — App Store Connect'teki gizlilik/destek URL'leri bunun altında. */
export const PRIMARY_DOMAIN = "loadwell.app";

export const SITE_URL = `https://${PRIMARY_DOMAIN}`;

export const PRIVACY_URL = `${SITE_URL}/privacy`;

export const SUPPORT_URL = `${SITE_URL}/support`;

/** Destek ve KVKK başvuruları için iletişim adresi. */
export const SUPPORT_EMAIL = "tosunbeytullah9@gmail.com";

/** Yasal ad — bireysel geliştirici, demo formu ve destek yazışmalarında veri sorumlusu. */
export const LEGAL_NAME = "Beytullah Tosun";

/** iOS bundle ID ve Android paket adı — App Store gönderiminden sonra değişmez. */
export const IOS_BUNDLE_ID = "app.loadwell";

/** Mobil deep link şeması (app.json `scheme`) — örn. loadwell://wearables/callback. */
export const MOBILE_SCHEME = "loadwell";

/** İkon zemini ve splash arka planı. */
export const BRAND_COLOR = "#1d4ed8";
