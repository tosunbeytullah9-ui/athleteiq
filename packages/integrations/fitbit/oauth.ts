import type { FitbitTokens } from "./types";
import { FitbitTokensSchema } from "./types";

const AUTH_URL = "https://www.fitbit.com/oauth2/authorize";
const TOKEN_URL = "https://api.fitbit.com/oauth2/token";
const REVOKE_URL = "https://api.fitbit.com/oauth2/revoke";

// dev.fitbit.com'da doğrulandı (2026-09-13) — scope authorize isteğinde dinamik
// istenir, Polar'daki gibi uygulama panelinde önceden seçilen sabit bir
// "data type" YOK. Sadece kullandığımız üç scope istenir.
const SCOPES = "sleep heartrate activity";

export function buildAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_URL}?${params}`;
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<FitbitTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(clientId, clientSecret),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Fitbit token exchange failed: ${res.status} ${await res.text()}`);
  }

  return FitbitTokensSchema.parse(await res.json());
}

// Fitbit refresh token TEK KULLANIMLIK — WHOOP ile aynı rotasyon deseni,
// Polar'ın aksine (Polar'da token süresiz, refresh yok).
export async function refreshToken(
  refreshTokenValue: string,
  clientId: string,
  clientSecret: string
): Promise<FitbitTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(clientId, clientSecret),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Fitbit token refresh failed: ${res.status} ${await res.text()}`);
  }

  return FitbitTokensSchema.parse(await res.json());
}

export async function revokeAccess(
  accessToken: string,
  clientId: string,
  clientSecret: string
): Promise<void> {
  const res = await fetch(REVOKE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(clientId, clientSecret),
    },
    body: new URLSearchParams({ token: accessToken }).toString(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Fitbit revoke failed: ${res.status}`);
  }
}

// ---- OAuth state imzalama ----
// whoop/oauth.ts ve polar/oauth.ts'teki createOAuthState/verifyOAuthState'in
// birebir kopyası — provider'lar arasında paylaşılan bir util yok.
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
