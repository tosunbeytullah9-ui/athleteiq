"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, Info, Moon, Watch, Zap } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { toast } from "@/components/ui/use-toast";
import type { Tables } from "@athleteiq/db/types";

type WearableConnection = Tables<"wearable_connections">;
type WearableMetric = Tables<"wearable_daily_metrics">;

interface Props {
  whoopConnection: WearableConnection | null;
  metrics: WearableMetric[];
  status: string | null;
}

const STATUS_MESSAGES: Record<string, { title: string; variant?: "destructive" }> = {
  success: { title: "WHOOP hesabınız başarıyla bağlandı." },
  denied: { title: "WHOOP bağlantısı iptal edildi.", variant: "destructive" },
  error: {
    title: "WHOOP bağlantısı sırasında bir hata oluştu, tekrar deneyin.",
    variant: "destructive",
  },
};

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Henüz veri senkronize edilmedi — ilk senkronizasyon birkaç saat sürebilir.";
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 60) return `Son senkron ${diffMin} dk önce`;
  if (diffMin < 60 * 24) return `Son senkron ${Math.round(diffMin / 60)} sa önce`;
  return `Son senkron: ${new Date(iso).toLocaleDateString("tr-TR")}`;
}

export function AthleteWearableClient({ whoopConnection, metrics, status }: Props) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const whoopConnected = Boolean(whoopConnection?.is_active);
  const today = metrics[metrics.length - 1] ?? null;

  useEffect(() => {
    if (!status) return;
    const message = STATUS_MESSAGES[status];
    if (message) {
      toast({ title: message.title, variant: message.variant });
    }
    router.replace("/wearables");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/wearables/whoop/disconnect", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Bağlantı kesilemedi");
      }
      toast({ title: "WHOOP bağlantısı kesildi." });
      router.refresh();
    } catch (err) {
      toast({
        title: "Bağlantı kesilemedi",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  }

  const maxRecovery = Math.max(1, ...metrics.map((m) => m.recovery_score ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wearable</h1>
        <p className="text-sm text-muted-foreground mt-1">
          WHOOP veya Polar hesabını bağla, toparlanma ve uyku verini otomatik senkronize et.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 items-start">
        {/* WHOOP */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white text-[10px] font-extrabold tracking-tight">
              WHOOP
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">WHOOP</CardTitle>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${whoopConnected ? "bg-green-500" : "bg-muted-foreground/40"}`}
                />
                {whoopConnected ? formatSyncTime(whoopConnection?.last_synced_at ?? null) : "Bağlı değil"}
              </p>
            </div>
            {whoopConnected ? (
              <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? "Kesiliyor..." : "Bağlantıyı Kes"}
              </Button>
            ) : (
              <Button size="sm" asChild>
                <a href="/api/wearables/whoop/connect">Bağlan</a>
              </Button>
            )}
          </CardHeader>
          {whoopConnected && (
            <CardContent>
              {today ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-3">
                    <HeartPulse className="h-4 w-4 mx-auto mb-1 text-green-600" />
                    <p className="text-sm font-bold">{today.recovery_score ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Toparlanma</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <Moon className="h-4 w-4 mx-auto mb-1 text-violet-600" />
                    <p className="text-sm font-bold">
                      {today.total_sleep_min != null
                        ? `${Math.floor(today.total_sleep_min / 60)}s ${today.total_sleep_min % 60}d`
                        : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Uyku</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <Zap className="h-4 w-4 mx-auto mb-1 text-amber-600" />
                    <p className="text-sm font-bold">{today.strain_score ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Strain</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {formatSyncTime(whoopConnection?.last_synced_at ?? null)}
                </p>
              )}
            </CardContent>
          )}
        </Card>

        {/* Polar */}
        <Card>
          <CardContent className="flex flex-col items-center text-center py-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-3">
              <Watch className="h-6 w-6" />
            </div>
            <p className="font-semibold text-sm">Polar</p>
            <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
              Nightly Recharge ve antrenman verilerini otomatik almak için Polar bağlantısı.
            </p>
            <Badge variant="secondary" className="mt-4 text-[10px]">
              Yakında
            </Badge>
          </CardContent>
        </Card>
      </div>

      {whoopConnected && metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Toparlanma Trendi</CardTitle>
            <p className="text-xs text-muted-foreground">Son {metrics.length} gün · WHOOP</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {metrics.map((m) => (
              <div key={m.id} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">
                  {new Date(m.metric_date + "T00:00:00").toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (m.recovery_score ?? 0) >= 67
                        ? "bg-green-500"
                        : (m.recovery_score ?? 0) >= 34
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${((m.recovery_score ?? 0) / maxRecovery) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-semibold">{m.recovery_score ?? "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 rounded-xl border bg-muted/40 p-4">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-xs font-semibold">Veriler koçunla paylaşılır</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Bağladığın wearable&apos;dan gelen toparlanma, uyku ve strain verileri koçun ve
            organizasyon yöneticin tarafından görülebilir — antrenman yükünü buna göre ayarlarlar.
          </p>
        </div>
      </div>
    </div>
  );
}
