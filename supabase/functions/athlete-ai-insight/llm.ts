// Parti 21-AI — OpenAI uyumlu chat/completions istemcisi. Payload, model
// çıktısı ve API anahtarı ASLA loglanmaz — yalnızca durum/süre/token sayısı.

import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.ts";
import type { Payload } from "./payload.ts";

const TIMEOUT_MS = 45_000;
const MAX_RETRY_AFTER_MS = 10_000;
const DEFAULT_RETRY_DELAY_MS = 2_000;

// Akıl yürüten modellerde (örn. Groq openai/gpt-oss-120b) reasoning token'ları
// da bu bütçeden düşülür. 1200 ile gerçek kullanımda bütçe reasoning'e gidiyor,
// JSON şemanın ortasında kesiliyordu (bkz. PROGRESS.md § Parti 21-AI düzeltmesi).
const MAX_TOKENS = 4000;

const MAX_FINDINGS = 5;
const MAX_RECOMMENDATIONS = 4;
const MAX_QUESTIONS = 3;
const MAX_WARNINGS = 6;
const MAX_EVIDENCE = 10;

const TRUNCATION_WARNING = "Model yanıtı eksik döndü; bu değerlendirme kısmi olabilir.";

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

// ---------------------------------------------------------------------------
// JSON ayıklama — modelin metnini olabildiğince kurtar.
// ---------------------------------------------------------------------------

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

// Açık kalan { [ " yapılarını kapatarak metni geçerli JSON'a tamamlamayı dener.
// Metin bir string'in ortasında bitiyorsa null döner (çağıran daha geriden keser).
function closeOpenStructures(text: string): string | null {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.pop() === undefined) return null;
    }
  }

  if (inString) return null;
  if (stack.length === 0) return text;

  // Sondaki yarım kalan parçaları at: virgül, değeri olmayan "anahtar":
  let out = text.replace(/,\s*$/, "");
  out = out.replace(/,?\s*"(?:[^"\\]|\\.)*"\s*:\s*$/, "");
  while (stack.length) out += stack.pop();
  return out;
}

const REPAIR_MAX_ATTEMPTS = 500;

// Kesilmiş JSON'u kurtarır: giderek daha erken bir kesme noktasından yapıyı
// kapatıp parse etmeyi dener.
function repairTruncatedJson(text: string): unknown | null {
  let attempts = 0;
  for (let end = text.length; end > 0 && attempts < REPAIR_MAX_ATTEMPTS; end--) {
    const ch = text[end - 1];
    // Yalnızca bir token sınırında kesmeyi dene.
    if (ch !== '"' && ch !== "}" && ch !== "]" && !/[0-9A-Za-z]/.test(ch)) continue;
    attempts++;
    const candidate = closeOpenStructures(text.slice(0, end));
    if (candidate === null) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // daha geriden dene
    }
  }
  return null;
}

function parseModelContent(content: string): unknown | null {
  const stripped = stripCodeFences(content);
  if (stripped.length === 0) return null;

  try {
    return JSON.parse(stripped);
  } catch {
    // devam
  }

  // Etrafında düz metin olabilir — ilk { ile son } arasını dene.
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(stripped.slice(first, last + 1));
    } catch {
      // devam
    }
  }

  return repairTruncatedJson(first === -1 ? stripped : stripped.slice(first));
}

// ---------------------------------------------------------------------------
// Normalizasyon — şemadan küçük sapmalar tüm analizi çöpe atmasın.
// ---------------------------------------------------------------------------

const CONFIDENCE_ALIASES: Record<string, Confidence> = {
  dusuk: "dusuk",
  düşük: "dusuk",
  low: "dusuk",
  orta: "orta",
  medium: "orta",
  yuksek: "yuksek",
  yüksek: "yuksek",
  high: "yuksek",
};

function normalizeConfidence(value: unknown): Confidence | null {
  if (typeof value !== "string") return null;
  return CONFIDENCE_ALIASES[value.trim().toLocaleLowerCase("tr-TR")] ?? null;
}

function asText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalizeStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const text = asText(item);
    if (text) out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

function normalizeFindings(value: unknown): LLMFinding[] {
  if (!Array.isArray(value)) return [];
  const out: LLMFinding[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const baslik = asText(o.baslik);
    const detay = asText(o.detay);
    if (!baslik && !detay) continue;
    out.push({
      baslik: baslik ?? "Bulgu",
      detay: detay ?? baslik ?? "",
      dayanak: normalizeStringArray(o.dayanak, MAX_EVIDENCE),
    });
    if (out.length >= MAX_FINDINGS) break;
  }
  return out;
}

function normalizeRecommendations(value: unknown): LLMRecommendation[] {
  if (!Array.isArray(value)) return [];
  const out: LLMRecommendation[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const oneri = asText(o.oneri);
    if (!oneri) continue;
    out.push({ oneri, gerekce: asText(o.gerekce) ?? "" });
    if (out.length >= MAX_RECOMMENDATIONS) break;
  }
  return out;
}

interface Normalized {
  output: LLMOutput;
  /** Model şemanın tamamını döndürdü mü — false ise bir kez daha denenir. */
  complete: boolean;
}

function normalizeOutput(raw: unknown): Normalized | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  const bulgular = normalizeFindings(o.bulgular);
  const oneriler = normalizeRecommendations(o.oneriler);
  const guven = normalizeConfidence(o.guven);
  const ozet = asText(o.ozet) ?? bulgular[0]?.detay ?? null;

  // Özet de içerik de yoksa kurtarılacak bir analiz yok.
  if (!ozet) return null;
  if (bulgular.length === 0 && oneriler.length === 0) return null;

  const complete =
    asText(o.ozet) !== null && bulgular.length > 0 && oneriler.length > 0 && guven !== null;

  const veriUyarilari = normalizeStringArray(o.veri_uyarilari, MAX_WARNINGS);
  if (!complete && !veriUyarilari.includes(TRUNCATION_WARNING)) {
    veriUyarilari.unshift(TRUNCATION_WARNING);
  }

  return {
    complete,
    output: {
      ozet,
      bulgular,
      oneriler,
      sporcuya_sorulacaklar: normalizeStringArray(o.sporcuya_sorulacaklar, MAX_QUESTIONS),
      veri_uyarilari: veriUyarilari.slice(0, MAX_WARNINGS),
      // guven yoksa "dusuk" — çağıran zaten confidence_cap ile alt sınırlar.
      guven: guven ?? "dusuk",
    },
  };
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

interface CompletionOk {
  ok: true;
  content: string;
  finishReason: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
}

interface CompletionErr {
  ok: false;
  status: number;
  retryAfterMs: number | null;
}

// Sağlayıcı hata gövdesinden YALNIZCA teşhis alanlarını ayıklar. Gövdenin
// tamamı loglanmaz — bazı sağlayıcılar hata içinde modelin ürettiği metni
// (failed_generation) geri yollar, bu sağlık verisi sayılır.
function describeProviderError(bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as { error?: Record<string, unknown> };
    const err = parsed.error;
    if (err && typeof err === "object") {
      const code = asText(err.code) ?? "-";
      const type = asText(err.type) ?? "-";
      const message = (asText(err.message) ?? "-").slice(0, 200);
      return `code=${code} type=${type} message=${message}`;
    }
  } catch {
    // JSON değil
  }
  return "code=- type=- message=<ayrıştırılamadı>";
}

async function requestCompletion(
  config: LLMConfig,
  messages: ChatMessage[]
): Promise<CompletionOk | CompletionErr> {
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
        max_tokens: MAX_TOKENS,
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
      const bodyText = await res.text().catch(() => "");
      console.error(
        `athlete-ai-insight llm: http_error status=${res.status} ${describeProviderError(bodyText)}`
      );
      return { ok: false, status: res.status, retryAfterMs };
    }

    const body = (await res.json()) as Record<string, unknown>;
    const choices = body.choices as
      | Array<{ message?: { content?: unknown }; finish_reason?: unknown }>
      | undefined;
    const choice = choices?.[0];
    const content = typeof choice?.message?.content === "string" ? choice.message.content : "";
    const finishReason = asText(choice?.finish_reason);
    const usage = body.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;

    return {
      ok: true,
      content,
      finishReason,
      tokensIn: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : null,
      tokensOut: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : null,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function requestWithRetry(
  config: LLMConfig,
  messages: ChatMessage[]
): Promise<CompletionOk | { ok: false; errorCode: string }> {
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

const RETRY_INSTRUCTION =
  "Önceki yanıt eksikti. Şemadaki ozet, bulgular, oneriler, sporcuya_sorulacaklar, " +
  "veri_uyarilari ve guven alanlarının HEPSİNİ içeren tek bir geçerli JSON nesnesi " +
  "döndür. Kısa tut.";

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

  const attempts: Array<{ normalized: Normalized; call: CompletionOk }> = [];
  let lastFinishReason: string | null = null;

  for (let round = 0; round < 2; round++) {
    const messages: ChatMessage[] =
      round === 0
        ? baseMessages
        : [...baseMessages, { role: "user", content: RETRY_INSTRUCTION }];

    const call = await requestWithRetry(config, messages);
    if (!call.ok) {
      // İlk turda ağ/HTTP hatası kesin hatadır; ikinci turda elde kısmi bir
      // sonuç varsa onu kullan.
      if (attempts.length === 0) {
        return { status: "error", errorCode: call.errorCode, latencyMs: Date.now() - startedAt };
      }
      break;
    }

    lastFinishReason = call.finishReason;
    const normalized = normalizeOutput(parseModelContent(call.content));

    console.log(
      `athlete-ai-insight llm: round=${round} finish=${call.finishReason ?? "-"} ` +
        `content_len=${call.content.length} parsed=${normalized !== null} ` +
        `complete=${normalized?.complete ?? false} in=${call.tokensIn ?? "-"} out=${call.tokensOut ?? "-"}`
    );

    if (normalized) {
      attempts.push({ normalized, call });
      if (normalized.complete) break;
    }
  }

  // Tam olanı, yoksa kısmi olanı kullan — kullanılabilir bir analizi asla atma.
  const best = attempts.find((a) => a.normalized.complete) ?? attempts[attempts.length - 1] ?? null;

  if (!best) {
    const errorCode = lastFinishReason === "length" ? "llm_truncated" : "invalid_output";
    return { status: "error", errorCode, latencyMs: Date.now() - startedAt };
  }

  return {
    status: "ok",
    output: best.normalized.output,
    confidence: lowerConfidence(best.normalized.output.guven, confidenceCap),
    tokensIn: best.call.tokensIn,
    tokensOut: best.call.tokensOut,
    latencyMs: Date.now() - startedAt,
  };
}

// Testler için dışa aktarılır.
export const __internal = { parseModelContent, normalizeOutput, repairTruncatedJson };
