import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

export type WearableConnectResult =
  | { status: "success" }
  | { status: "denied" }
  | { status: "error"; message: string };

// WHOOP'un OAuth authorize sayfasını sistem tarayıcısında açar ve
// apps/web/app/api/wearables/whoop/callback yönlendirmesini yakalar.
// Akış: authorize route'undan (sporcu kimliğini imzalı state'e gömen)
// bir WHOOP authorize URL'si alınır → WebBrowser bunu açar → WHOOP,
// kullanıcı onayından sonra web callback'e yönlendirir → callback token'ları
// DB'ye kaydedip "athleteiq://wearables/callback" deep link'ine döner →
// WebBrowser bu redirect'i yakalayıp kapanır (bkz. CLAUDE.md §5.1, §6 Agent 5).
export async function connectWhoop(): Promise<WearableConnectResult> {
  const appUrl = process.env.EXPO_PUBLIC_APP_URL;
  if (!appUrl) {
    return { status: "error", message: "EXPO_PUBLIC_APP_URL tanımlı değil" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { status: "error", message: "Oturum bulunamadı" };
  }

  const authorizeRes = await fetch(`${appUrl}/api/wearables/whoop/authorize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!authorizeRes.ok) {
    const body = await authorizeRes.json().catch(() => ({}));
    return {
      status: "error",
      message: body.error ?? `Yetkilendirme başlatılamadı (${authorizeRes.status})`,
    };
  }

  const { url } = (await authorizeRes.json()) as { url: string };
  const redirectUrl = Linking.createURL("wearables/callback");

  const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

  if (result.type !== "success") {
    return { status: "denied" };
  }

  const { queryParams } = Linking.parse(result.url);
  const status = queryParams?.status;

  if (status === "success") return { status: "success" };
  if (status === "denied") return { status: "denied" };
  return { status: "error", message: "WHOOP bağlantısı tamamlanamadı" };
}

// Sporcunun kendi access token'ı yeterli — client secret gerekmez
// (bkz. developer.whoop.com DELETE /v2/user/access, "revokeUserOauthAccess").
export async function revokeWhoopAccess(accessToken: string): Promise<void> {
  try {
    await fetch("https://api.prod.whoop.com/developer/v2/user/access", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    console.warn("WHOOP revoke failed (bağlantı yine de yerelde kesilecek):", err);
  }
}
