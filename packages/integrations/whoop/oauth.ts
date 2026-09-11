import type { WHOOPTokens } from "./types";
import { WHOOPTokensSchema } from "./types";

const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const REVOKE_URL = "https://api.prod.whoop.com/developer/v2/user/access";

// offline → refresh_token döndürür (WHOOP access token'ları kısa ömürlü).
const SCOPES =
  "offline read:cycles read:sleep read:recovery read:workout read:body_measurement read:profile";

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
  return `${AUTH_URL}?${params}`;
}

export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<WHOOPTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`WHOOP token exchange failed: ${res.status} ${await res.text()}`);
  }

  return WHOOPTokensSchema.parse(await res.json());
}

export async function refreshToken(
  refreshTokenValue: string,
  clientId: string,
  clientSecret: string
): Promise<WHOOPTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
      client_id: clientId,
      client_secret: clientSecret,
      scope: SCOPES,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`WHOOP token refresh failed: ${res.status} ${await res.text()}`);
  }

  // Dönen yeni refresh_token DB'ye kaydedilmeli — eski geçersiz olur (rotasyon).
  return WHOOPTokensSchema.parse(await res.json());
}

// Kullanıcı bağlantıyı keserken WHOOP tarafındaki yetkiyi de iptal eder.
// Yalnızca kullanıcının kendi access token'ını ister, client secret gerekmez.
export async function revokeAccess(accessToken: string): Promise<void> {
  const res = await fetch(REVOKE_URL, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`WHOOP revoke failed: ${res.status}`);
  }
}

// ---- OAuth state imzalama ----
// WHOOP'un "state" parametresi opak bir string olarak geri döner; içeriğini
// biz belirleriz. Callback isteği (WHOOP'un redirect'i) mobil/web oturum
// bağlamı taşımadığı için, hangi sporcunun bağlandığını burada — HMAC ile
// imzalanmış, süresi dolan bir payload olarak — taşıyoruz. Ayrı bir "pending
// oauth state" tablosu gerektirmez (stateless).
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
