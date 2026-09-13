import type { PolarTokens } from "./types";
import { PolarTokensSchema } from "./types";

const TOKEN_URL = "https://polarremote.com/v2/oauth2/token";

// Polar AccessLink OAuth'ta WHOOP tarzı granular "scope" string'i YOK — bir
// scope parametresi gönderilirse Polar "invalid_scope" ile reddeder (canlı
// test sırasında doğrulandı, 2026-09-13). Erişilebilir veri tipleri OAuth
// consent'i değil, admin.polaraccesslink.com panelindeki "Available data
// types" (Exercise/Daily activity/Physical information) seçimleriyle belirlenir.
// GERÇEK swagger.yaml (www.polar.com/accesslink-api/swagger.yaml, 2026-09-13'te
// indirilip doğrulandı) tek bir birleşik scope tanımlıyor: "accesslink.read_all"
// — sleep/nightly-recharge/exercise dahil TÜM AccessLink v3 endpoint'leri bunu
// kullanıyor. Önceki denemeler ("activity:read sleep:read nightly_recharge:read
// training_sessions:read continuous_samples:read" ve "sleep:read
// nightly_recharge:read") WHOOP tarzı granular scope isimleriydi ve İKİSİ DE
// "invalid_scope" ile reddedildi — gerçek scope adı farklıymış.
const SCOPES = "accesslink.read_all";

export function buildAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `https://flow.polar.com/oauth2/authorization?${params}`;
}

export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<PolarTokens> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Polar token exchange failed: ${res.status}`);
  }

  // Polar token'ları sona ermez — refresh token yoktur
  return PolarTokensSchema.parse(await res.json());
}

// Kullanıcı kayıt/kayıt-silme KLASİK "AccessLink" API'sindedir (v3) —
// nightly-recharge/sleep'in yaşadığı "Dynamic API v4"nün AKSİNE (bkz.
// client.ts'teki not). Önceki taslak yanlışlıkla v4 kullanıyordu, bu da canlı
// testte 401 (Tomcat seviyesinde, JSON hata gövdesi bile dönmeyen bir hata —
// path'in var olmadığının işareti) ile sonuçlandı; polar.com/accesslink-api/
// dokümantasyonuyla çapraz doğrulanıp v3'e düzeltildi (2026-09-13).
export async function registerUser(
  accessToken: string,
  memberId: string
): Promise<void> {
  const res = await fetch("https://www.polaraccesslink.com/v3/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ "member-id": memberId }),
  });

  // 409 = kullanıcı zaten kayıtlı — normal
  if (!res.ok && res.status !== 409) {
    const body = await res.text().catch(() => "");
    throw new Error(`Polar user registration failed: ${res.status} ${body}`);
  }
}

// Kullanıcı bağlantıyı keserken Polar tarafındaki kaydı da kaldırır
// (WHOOP'un revokeAccess'inin karşılığı). 404 = zaten kayıtlı değil — normal.
export async function deregisterUser(
  accessToken: string,
  polarUserId: string
): Promise<void> {
  const res = await fetch(
    `https://www.polaraccesslink.com/v3/users/${polarUserId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Polar user deregistration failed: ${res.status}`);
  }
}

// ---- OAuth state imzalama ----
// whoop/oauth.ts'teki createOAuthState/verifyOAuthState'in birebir kopyası —
// provider'lar arasında paylaşılan bir util yok, her biri kendi dosyasında
// taşıyor (bkz. whoop-webhook Edge Function'ının da kendi tiplerini taşıması).
interface StatePayload {
  athleteId: string;
  exp: number; // epoch ms
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmacSign(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

export async function createOAuthState(
  athleteId: string,
  secret: string,
  ttlMs = 10 * 60 * 1000
): Promise<string> {
  const payload: StatePayload = { athleteId, exp: Date.now() + ttlMs };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = toBase64Url(new TextEncoder().encode(payloadJson));
  const signature = await hmacSign(secret, payloadB64);
  return `${payloadB64}.${toBase64Url(signature)}`;
}

export async function verifyOAuthState(
  state: string,
  secret: string
): Promise<{ athleteId: string } | null> {
  const [payloadB64, sigB64] = state.split(".");
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = await hmacSign(secret, payloadB64);
  const actualSig = fromBase64Url(sigB64);
  if (expectedSig.length !== actualSig.length) return null;
  let diff = 0;
  for (let i = 0; i < expectedSig.length; i++) diff |= expectedSig[i]! ^ actualSig[i]!;
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payloadB64))
    ) as StatePayload;
    if (typeof payload.athleteId !== "string" || payload.exp < Date.now()) {
      return null;
    }
    return { athleteId: payload.athleteId };
  } catch {
    return null;
  }
}
