// Mobil özellik bayrakları (Parti 18F).

/**
 * Giyilebilir cihaz (WHOOP) bağlantı akışı. false iken mobilde yeni bağlantı
 * başlatılamaz: profil satırı ve Recovery boş durumu "Yakında" gösterir,
 * connect-whoop ekranı profile döner. Zaten bağlı olan kullanıcı bağlantısını
 * kesebilir ve mevcut veri gösterimi değişmez. Arka uç ve web paneli bu bayraktan
 * etkilenmez.
 *
 * Yeniden açmak için true yapın — ÖNCE WHOOP callback'i (loadwell:// şeması) ve
 * WHOOP / Polar geliştirici portallarındaki redirect URI'leri güncellenmeli.
 */
export const WEARABLES_ENABLED = false;

export type WhoopRowMode = "disconnect" | "connect" | "soon";

/** Profildeki WHOOP satırının durumu: bağlıysa kesme her zaman açık. */
export function whoopRowMode(isConnected: boolean, enabled: boolean = WEARABLES_ENABLED): WhoopRowMode {
  if (isConnected) return "disconnect";
  return enabled ? "connect" : "soon";
}
