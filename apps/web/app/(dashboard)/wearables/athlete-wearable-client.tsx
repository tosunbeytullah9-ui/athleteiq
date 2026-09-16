"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, Info, Moon, RefreshCw, Zap } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { toast } from "@/components/ui/use-toast";
import type { Tables } from "@athleteiq/db/types";

type WearableConnection = Tables<"wearable_connections">;
type WearableMetric = Tables<"wearable_daily_metrics">;

interface Props {
  whoopConnection: WearableConnection | null;
  whoopMetrics: WearableMetric[];
  polarConnection: WearableConnection | null;
  polarMetrics: WearableMetric[];
  fitbitConnection: WearableConnection | null;
  fitbitMetrics: WearableMetric[];
  status: string | null;
}

const STATUS_MESSAGES: Record<string, { title: string; variant?: "destructive" }> = {
  success: { title: "Bağlantı başarıyla kuruldu." },
  denied: { title: "Bağlantı iptal edildi.", variant: "destructive" },
  error: {
    title: "Bağlantı sırasında bir hata oluştu, tekrar deneyin.",
    variant: "destructive",
  },
};

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Henüz veri senkronize edilmedi.";
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 60) return `Son senkron ${diffMin} dk önce`;
  if (diffMin < 60 * 24) return `Son senkron ${Math.round(diffMin / 60)} sa önce`;
  return `Son senkron: ${new Date(iso).toLocaleDateString("tr-TR")}`;
}

interface ProviderCardProps {
  label: string;
  badgeClass: string;
  connection: WearableConnection | null;
  metrics: WearableMetric[];
  connectHref: string;
  disconnectHref: string;
  syncHref?: string;
}

function ProviderCard({
  label,
  badgeClass,
  connection,
  metrics,
  connectHref,
  disconnectHref,
  syncHref,
}: ProviderCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"disconnect" | "sync" | null>(null);
  const connected = Boolean(connection?.is_active);
  const today = metrics[metrics.length - 1] ?? null;
  const maxRecovery = Math.max(1, ...metrics.map((m) => m.recovery_score ?? 0));

  async function handleDisconnect() {
    setBusy("disconnect");
    try {
      const res = await fetch(disconnectHref, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Bağlantı kesilemedi");
      }
      toast({ title: `${label} bağlantısı kesildi.` });
      router.refresh();
    } catch (err) {
      toast({
        title: "Bağlantı kesilemedi",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleSync() {
    if (!connection || !syncHref) return;
    setBusy("sync");
    try {
      const res = await fetch(syncHref, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: connection.athlete_id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Senkronizasyon başarısız oldu");
      }
      if (body.metricsError || body.exercisesError) {
        toast({
          title: "Senkron kısmen tamamlandı",
          description: [body.metricsError, body.exercisesError].filter(Boolean).join(" · "),
          variant: "destructive",
        });
      } else {
        toast({ title: "Polar verisi senkronize edildi." });
      }
      router.refresh();
    } catch (err) {
      toast({
        title: "Senkronizasyon başarısız oldu",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 pb-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold tracking-tight ${badgeClass}`}>
          {label}
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">{label}</CardTitle>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500" : "bg-muted-foreground/40"}`}
            />
            {connected ? formatSyncTime(connection?.last_synced_at ?? null) : "Bağlı değil"}
          </p>
        </div>
        {connected ? (
          <div className="flex items-center gap-2">
            {syncHref && (
              <Button variant="outline" size="sm" onClick={handleSync} disabled={busy !== null}>
                <RefreshCw className="h-3.5 w-3.5" />
                {busy === "sync" ? "Senkronize ediliyor..." : "Senkronize Et"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={busy !== null}>
              {busy === "disconnect" ? "Kesiliyor..." : "Bağlantıyı Kes"}
            </Button>
          </div>
        ) : (
          <Button size="sm" asChild>
            <a href={connectHref}>Bağlan</a>
          </Button>
        )}
      </CardHeader>
      {connected && (
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
              {formatSyncTime(connection?.last_synced_at ?? null)}
            </p>
          )}

          {metrics.length > 0 && (
            <div className="mt-4 space-y-2.5">
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
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function AthleteWearableClient({
  whoopConnection,
  whoopMetrics,
  polarConnection,
  polarMetrics,
  fitbitConnection,
  fitbitMetrics,
  status,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!status) return;
    const message = STATUS_MESSAGES[status];
    if (message) {
      toast({ title: message.title, variant: message.variant });
    }
    router.replace("/wearables");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wearable</h1>
        <p className="text-sm text-muted-foreground mt-1">
          WHOOP, Polar veya Fitbit hesabını bağla, toparlanma ve uyku verini senkronize et.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
        <ProviderCard
          label="WHOOP"
          badgeClass="bg-black text-white"
          connection={whoopConnection}
          metrics={whoopMetrics}
          connectHref="/api/wearables/whoop/connect"
          disconnectHref="/api/wearables/whoop/disconnect"
        />
        <ProviderCard
          label="Polar"
          badgeClass="bg-blue-600 text-white"
          connection={polarConnection}
          metrics={polarMetrics}
          connectHref="/api/wearables/polar/connect"
          disconnectHref="/api/wearables/polar/disconnect"
          syncHref="/api/wearables/polar/sync"
        />
        <ProviderCard
          label="Fitbit"
          badgeClass="bg-teal-600 text-white"
          connection={fitbitConnection}
          metrics={fitbitMetrics}
          connectHref="/api/wearables/fitbit/connect"
          disconnectHref="/api/wearables/fitbit/disconnect"
          syncHref="/api/wearables/fitbit/sync"
        />
      </div>

      <div className="flex gap-3 rounded-xl border bg-muted/40 p-4">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-xs font-semibold">Veriler koçunla paylaşılır</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Bağladığın wearable&apos;dan gelen toparlanma, uyku ve strain verileri koçun ve
            organizasyon yöneticin tarafından görülebilir — antrenman yükünü buna göre ayarlarlar.
            Polar ve Fitbit otomatik senkronize olmaz, güncel veri için &quot;Senkronize Et&quot;e basman gerekir.
          </p>
        </div>
      </div>
    </div>
  );
}
