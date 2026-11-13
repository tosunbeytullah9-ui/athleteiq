// Mobil özellik bayrakları (Parti 18F).

/**
 * Giyilebilir cihaz (WHOOP) yüzeyleri. false iken mobilde hiçbir "yakında" yüzeyi
 * yoktur (Parti 18K, App Store 2.1): sporcunun Recovery sekmesi ve koçun sporcu
 * merkezindeki Recovery kartı gizlenir, iki Recovery ekranı ve connect-whoop derin
 * link ile açılırsa geri yönlenir, Profil'deki "Cihaz Bağlantıları" bölümü yalnızca
 * zaten bağlı kullanıcıya ("Bağlantıyı Kes" — KVKK) görünür. Arka uç ve web paneli
 * bu bayraktan etkilenmez.
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
