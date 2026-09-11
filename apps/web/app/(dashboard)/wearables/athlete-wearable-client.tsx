"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Watch, CheckCircle2 } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { toast } from "@/components/ui/use-toast";
import type { Tables } from "@athleteiq/db/types";

type WearableConnection = Tables<"wearable_connections">;

interface Props {
  connection: WearableConnection | null;
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

export function AthleteWearableClient({ connection, status }: Props) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const connected = Boolean(connection?.is_active);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wearable Bağlantım</h1>
        <p className="text-sm text-muted-foreground mt-1">
          WHOOP hesabınızı bağlayarak recovery, uyku ve strain verilerinizin
          otomatik senkronize olmasını sağlayın.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Watch className="h-4 w-4" />
            WHOOP
          </CardTitle>
          {connected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Bağlı
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {connected ? (
            <>
              <p className="text-sm text-muted-foreground">
                {connection?.last_synced_at
                  ? `Son senkronizasyon: ${new Date(connection.last_synced_at).toLocaleString("tr-TR")}`
                  : "Henüz veri senkronize edilmedi — ilk senkronizasyon birkaç saat sürebilir."}
              </p>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? "Kesiliyor..." : "Bağlantıyı Kes"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Henüz bir WHOOP hesabı bağlı değil.
              </p>
              <Button asChild>
                <a href="/api/wearables/whoop/connect">WHOOP ile Bağlan</a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
