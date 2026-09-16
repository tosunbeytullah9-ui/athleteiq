// Parti 21-AI — OpenAI uyumlu chat/completions istemcisi. Payload, model
// çıktısı ve API anahtarı ASLA loglanmaz — yalnızca durum/süre/token sayısı.

import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.ts";
import type { Payload } from "./payload.ts";

const TIMEOUT_MS = 45_000;
const MAX_RETRY_AFTER_MS = 10_000;
const DEFAULT_RETRY_DELAY_MS = 2_000;

export type Confidence = "dusuk" | "orta" | "yuksek";

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface LLMFinding {
  baslik: string;
  detay: string;
  dayanak: string[];
}

export interface LLMRecommendation {
  oneri: string;
  gerekce: string;
}

export interface LLMOutput {
  ozet: string;
  bulgular: LLMFinding[];
  oneriler: LLMRecommendation[];
  sporcuya_sorulacaklar: string[];
  veri_uyarilari: string[];
  guven: Confidence;
}

export interface LLMSuccess {
  status: "ok";
  output: LLMOutput;
  confidence: Confidence;
  tokensIn: number | null;
  tokensOut: number | null;
  latencyMs: number;
}

export interface LLMFailure {
  status: "error";
  errorCode: string;
  latencyMs: number;
}

const CONFIDENCE_RANK: Record<Confidence, number> = { dusuk: 0, orta: 1, yuksek: 2 };

function lowerConfidence(a: Confidence, b: Confidence): Confidence {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function validateOutput(raw: unknown): raw is LLMOutput {
  if (typeof raw !== "object" || raw === null) return false;
  const o = raw as Record<string, unknown>;

  if (typeof o.ozet !== "string" || o.ozet.length === 0) return false;

  if (!Array.isArray(o.bulgular) || o.bulgular.length > 5) return false;
  for (const b of o.bulgular) {
    if (typeof b !== "object" || b === null) return false;
    const bb = b as Record<string, unknown>;
    if (typeof bb.baslik !== "string" || typeof bb.detay !== "string") return false;
    if (!isStringArray(bb.dayanak)) return false;
  }

  if (!Array.isArray(o.oneriler) || o.oneriler.length > 4) return false;
  for (const r of o.oneriler) {
    if (typeof r !== "object" || r === null) return false;
    const rr = r as Record<string, unknown>;
    if (typeof rr.oneri !== "string" || typeof rr.gerekce !== "string") return false;
  }

  if (!isStringArray(o.sporcuya_sorulacaklar) || o.sporcuya_sorulacaklar.length > 3) return false;
  if (!isStringArray(o.veri_uyarilari)) return false;

  if (o.guven !== "dusuk" && o.guven !== "orta" && o.guven !== "yuksek") return false;

  return true;
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

async function requestCompletion(
  config: LLMConfig,
  messages: ChatMessage[]
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; status: number; retryAfterMs: number | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader
        ? Math.min(Number(retryAfterHeader) * 1000, MAX_RETRY_AFTER_MS)
        : null;
      return { ok: false, status: res.status, retryAfterMs };
    }

    const body = (await res.json()) as Record<string, unknown>;
    return { ok: true, body };
  } finally {
    clearTimeout(timer);
  }
}

async function requestWithRetry(
  config: LLMConfig,
  messages: ChatMessage[]
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; errorCode: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await requestCompletion(config, messages);
      if (result.ok) return result;

      const retriable = result.status === 429 || result.status >= 500;
      if (!retriable || attempt === 1) {
        return { ok: false, errorCode: `llm_http_${result.status}` };
      }
      await sleep(result.retryAfterMs ?? DEFAULT_RETRY_DELAY_MS);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt === 1) return { ok: false, errorCode: "llm_timeout" };
        await sleep(DEFAULT_RETRY_DELAY_MS);
        continue;
      }
      if (attempt === 1) return { ok: false, errorCode: "llm_network_error" };
      await sleep(DEFAULT_RETRY_DELAY_MS);
    }
  }
  return { ok: false, errorCode: "llm_unknown_error" };
}

export async function callLLM(
  config: LLMConfig,
  payload: Payload,
  confidenceCap: Confidence
): Promise<LLMSuccess | LLMFailure> {
  const startedAt = Date.now();
  const baseMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage(payload) },
  ];

  const first = await requestWithRetry(config, baseMessages);
  if (!first.ok) {
    return { status: "error", errorCode: first.errorCode, latencyMs: Date.now() - startedAt };
  }

  const parseAttempt = (body: Record<string, unknown>) => {
    const choices = body.choices as Array<{ message?: { content?: string } }> | undefined;
    const content = choices?.[0]?.message?.content ?? "";
    try {
      return JSON.parse(stripCodeFences(content));
    } catch {
      return null;
    }
  };

  const usage = (body: Record<string, unknown>) => {
    const u = body.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
    return {
      tokensIn: typeof u?.prompt_tokens === "number" ? u.prompt_tokens : null,
      tokensOut: typeof u?.completion_tokens === "number" ? u.completion_tokens : null,
    };
  };

  let parsed = parseAttempt(first.body);
  let finalBody = first.body;

  if (!validateOutput(parsed)) {
    // Geçersiz çıktı — bir kez, ek kullanıcı mesajıyla tekrar dene.
    const retryMessages: ChatMessage[] = [
      ...baseMessages,
      { role: "user", content: "Yalnızca şemaya uygun geçerli JSON döndür." },
    ];
    const second = await requestWithRetry(config, retryMessages);
    if (!second.ok) {
      return { status: "error", errorCode: second.errorCode, latencyMs: Date.now() - startedAt };
    }
    parsed = parseAttempt(second.body);
    finalBody = second.body;

    if (!validateOutput(parsed)) {
      return { status: "error", errorCode: "invalid_output", latencyMs: Date.now() - startedAt };
    }
  }

  const { tokensIn, tokensOut } = usage(finalBody);
  const confidence = lowerConfidence(parsed.guven, confidenceCap);

  return {
    status: "ok",
    output: parsed,
    confidence,
    tokensIn,
    tokensOut,
    latencyMs: Date.now() - startedAt,
  };
}
