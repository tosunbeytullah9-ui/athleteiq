"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@athleteiq/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import type { Tables } from "@athleteiq/db/types";

type AthleteAiInsightRow = Tables<"athlete_ai_insights">;

interface AiOutput {
  ozet: string;
  bulgular: { baslik: string; detay: string; dayanak: string[] }[];
  oneriler: { oneri: string; gerekce: string }[];
  sporcuya_sorulacaklar: string[];
  veri_uyarilari: string[];
  guven: "dusuk" | "orta" | "yuksek";
}

interface Props {
  athleteId: string;
  initialHistory: AthleteAiInsightRow[]; // son 10, en yeni ilk
}

// ai_disabled/rate_limited: doc'taki eşleme. insufficient_data 200 ile döner
// (status alanından ayrı ele alınır), diğer her şey "Genel hata" varsayılanına düşer.
// Sağlayıcı kaynaklı kodlar (llm_*) ayrıca eşlenir: canlı testte yanlış model adı
// "Analiz oluşturulamadı" olarak görünüp teşhisi geciktirmişti.
const ERROR_MESSAGES: Record<string, string> = {
  ai_disabled: "AI analizi şu an kapalı.",
  rate_limited: "Bu sporcu için günlük analiz limiti doldu.",
  athlete_not_found: "Sporcu bulunamadı veya pasif.",
  llm_http_401: "AI sağlayıcı anahtarı geçersiz (401). AI_API_KEY secret'ını kontrol edin.",
  llm_http_403: "AI sağlayıcı erişimi reddetti (403). Anahtarın yetkilerini kontrol edin.",
  llm_http_404: "AI modeli bulunamadı (404). AI_MODEL secret'ını kontrol edin.",
  llm_http_429: "AI sağlayıcı kotası doldu (429). Bir süre sonra tekrar deneyin.",
  llm_timeout: "AI sağlayıcı zaman aşımına uğradı.",
  llm_network_error: "AI sağlayıcıya ulaşılamadı.",
  llm_truncated: "Model yanıtı token sınırına takıldı.",
  invalid_output: "Model geçerli bir değerlendirme üretemedi.",
};
const DEFAULT_ERROR_MESSAGE = "Analiz oluşturulamadı, daha sonra tekrar deneyin.";

function todayIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

function confidenceVariant(confidence: string | null): "default" | "secondary" | "outline" {
  if (confidence === "yuksek") return "default";
  if (confidence === "orta") return "secondary";
  return "outline";
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AiInsightPanel({ athleteId, initialHistory }: Props) {
  const [history, setHistory] = useState<AthleteAiInsightRow[]>(initialHistory);
  const [selectedDate, setSelectedDate] = useState(() => todayIstanbul());
  const [loading, setLoading] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  const selectedRecord = history.find((h) => h.insight_date === selectedDate) ?? null;
  const buttonLabel = selectedRecord ? "Yeniden Oluştur" : "Analiz Oluştur";

  async function handleGenerate() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("athlete-ai-insight", {
        body: { athlete_id: athleteId, date: selectedDate },
      });

      if (error) {
        let errorCode: string | undefined;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) {
            const errBody = (await ctx.json()) as { error?: string };
            errorCode = errBody?.error;
          }
        } catch {
          // context JSON olarak okunamadı — genel hataya düşülür
        }
        toast({
          title: (errorCode && ERROR_MESSAGES[errorCode]) ?? DEFAULT_ERROR_MESSAGE,
          // Ham kod yalnızca süper admin'in gördüğü bu panelde gösterilir —
          // eşlenmemiş bir hata da teşhis edilebilir kalsın.
          description: errorCode ? `Hata kodu: ${errorCode}` : undefined,
          variant: "destructive",
        });
        return;
      }

      const record = data as AthleteAiInsightRow;
      setHistory((prev) => [record, ...prev.filter((h) => h.id !== record.id)].slice(0, 10));

      if (record.status === "insufficient_data") {
        toast({ title: "Bu tarih için WHOOP verisi yok." });
      } else {
        toast({ title: "Analiz oluşturuldu." });
      }
    } catch {
      toast({ title: DEFAULT_ERROR_MESSAGE, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const output = selectedRecord?.output as unknown as AiOutput | null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Değerlendirme
        </h2>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tarih</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "Oluşturuluyor..." : buttonLabel}
            </Button>
          </div>

          {!selectedRecord && (
            <p className="text-sm text-muted-foreground">
              Bu tarih için henüz bir analiz oluşturulmadı.
            </p>
          )}

          {selectedRecord?.status === "insufficient_data" && (
            <p className="text-sm text-muted-foreground">Bu tarih için WHOOP verisi yok.</p>
          )}

          {selectedRecord?.status === "error" && (
            <p className="text-sm text-destructive">
              Bu tarih için analiz başarısız oldu{selectedRecord.error_code ? ` (${selectedRecord.error_code})` : ""}.
            </p>
          )}

          {selectedRecord?.status === "ok" && output && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={confidenceVariant(selectedRecord.confidence)}>
                  Güven: {selectedRecord.confidence ?? "—"}
                </Badge>
              </div>

              <p className="text-sm leading-relaxed">{output.ozet}</p>

              {output.bulgular.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Bulgular</h3>
                  {output.bulgular.map((b, i) => (
                    <div key={i} className="rounded-md border p-3 space-y-1">
                      <p className="text-sm font-medium">{b.baslik}</p>
                      <p className="text-sm text-muted-foreground">{b.detay}</p>
                      {b.dayanak.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {b.dayanak.map((d, j) => (
                            <Badge key={j} variant="outline" className="text-[10px]">
                              {d}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {output.oneriler.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Öneriler</h3>
                  <ul className="space-y-1">
                    {output.oneriler.map((o, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium">{o.oneri}</span>
                        <span className="text-muted-foreground"> — {o.gerekce}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {output.sporcuya_sorulacaklar.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Sporcuya Sorulacaklar</h3>
                  <ul className="list-disc list-inside space-y-0.5">
                    {output.sporcuya_sorulacaklar.map((q, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {output.veri_uyarilari.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Veri Uyarıları</h3>
                  <ul className="list-disc list-inside space-y-0.5">
                    {output.veri_uyarilari.map((w, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-2 border-t">
                {selectedRecord.model ?? "—"} · {selectedRecord.prompt_version} ·{" "}
                {selectedRecord.algorithm_version} · {formatCreatedAt(selectedRecord.created_at)}
              </p>

              {selectedRecord.payload_sent !== null && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPayload((v) => !v)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showPayload ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    Modele gönderilen veri
                  </button>
                  {showPayload && (
                    <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-muted p-3 text-[11px]">
                      {JSON.stringify(selectedRecord.payload_sent, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Geçmiş</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {history.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedDate(h.insight_date)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted ${
                  h.insight_date === selectedDate ? "bg-muted" : ""
                }`}
              >
                <span>{h.insight_date}</span>
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {h.status}
                  </Badge>
                  {h.confidence && (
                    <Badge variant={confidenceVariant(h.confidence)} className="text-[10px]">
                      {h.confidence}
                    </Badge>
                  )}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Bu analiz karar destek amaçlıdır; tıbbi teşhis değildir. Nihai karar koça aittir.
      </p>
    </div>
  );
}
