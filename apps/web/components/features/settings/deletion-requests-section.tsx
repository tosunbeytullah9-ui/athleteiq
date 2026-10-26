"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, UserX } from "lucide-react";
import {
  getAccountDeletionImpact,
  rejectAccountDeletionRequest,
  type AccountDeletionImpactRow,
  type AccountDeletionRequest,
} from "@athleteiq/db/queries/account-deletion";
import {
  ACCOUNT_DELETION_NOTE_MAX,
  accountDeletionRejectNoteSchema,
  daysUntilDue,
  deletionConfirmationMatches,
  isDeletionUrgent,
} from "@athleteiq/validators/account-deletion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Uygulama içi hesap silme talepleri (Parti 18B — App Store 5.1.1(v) + KVKK m.11/13).
// "Etkiyi Gör ve Sil" → get_account_deletion_impact (CASCADE etkisi silmeden ÖNCE) →
// kullanıcı adı yazılarak onay → process-account-deletion. delete-org-user'dan farkı:
// o yalnızca giriş erişimini kaldırır, bu kişiyi ve bağlı TÜM verisini kalıcı siler.

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Koç",
  athlete: "Sporcu",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function rpcErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message);
    return message === "yetkisiz" ? "Bu işlem için yetkiniz yok." : message;
  }
  return fallback;
}

function RemainingDays({ dueAt }: { dueAt: string }) {
  const days = daysUntilDue(dueAt);
  return (
    <span
      className={cn(
        "text-sm font-medium",
        isDeletionUrgent(days) ? "text-red-600" : "text-muted-foreground"
      )}
    >
      {days > 0 ? `${days} gün` : days === 0 ? "Bugün" : `${-days} gün gecikti`}
    </span>
  );
}

function ImpactDialog({
  request,
  onClose,
  onDone,
}: {
  request: AccountDeletionRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const [impact, setImpact] = useState<AccountDeletionImpactRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAccountDeletionImpact(createClient(), request.id)
      .then((rows) => {
        if (!cancelled) setImpact(rows);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(rpcErrorMessage(err, "Etki bilgisi alınamadı."));
      });
    return () => {
      cancelled = true;
    };
  }, [request.id]);

  const blocks = impact?.filter((r) => r.kind === "block") ?? [];
  const deletes = impact?.filter((r) => r.kind === "delete") ?? [];
  const keeps = impact?.filter((r) => r.kind === "keep") ?? [];
  const confirmed = deletionConfirmationMatches(typed, request.username);
  const canDelete = impact != null && blocks.length === 0 && confirmed && !isDeleting;

  async function handleDelete() {
    setIsDeleting(true);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("process-account-deletion", {
      body: { request_id: request.id },
    });

    if (error) {
      let message = "Hesap silinemedi.";
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx) {
          const body = (await ctx.json()) as { error?: string };
          if (body?.error) message = body.error;
        }
      } catch {
        // gövde JSON değil — genel mesaj
      }
      toast({ title: "Silme başarısız", description: message, variant: "destructive" });
      setIsDeleting(false);
      return;
    }

    const warning = (data as { warning?: string } | null)?.warning;
    toast({
      title: "Hesap ve bağlı veriler kalıcı olarak silindi",
      description: warning,
    });
    onDone();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Hesabı kalıcı olarak sil</DialogTitle>
          <DialogDescription>
            {request.display_name ?? "Adsız kullanıcı"}
            {request.username ? ` (${request.username})` : ""} —{" "}
            {ROLE_LABELS[request.role] ?? request.role}. Bu işlem geri alınamaz.
          </DialogDescription>
        </DialogHeader>

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!impact && !loadError && (
          <p className="text-sm text-muted-foreground">Etki hesaplanıyor…</p>
        )}

        {impact && (
          <div className="space-y-4">
            {blocks.map((b) => (
              <div
                key={b.label}
                className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {b.label}
              </div>
            ))}

            <div>
              <p className="mb-2 text-sm font-medium">Kalıcı olarak silinecek</p>
              <table className="w-full text-sm">
                <tbody>
                  {deletes.map((r) => (
                    <tr key={`${r.table_name}-${r.label}`} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">{r.label}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums">{r.row_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {keeps.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">Kurumda korunacak</p>
                <p className="mb-2 text-xs text-muted-foreground">
                  Bu kişinin oluşturduğu içerik silinmez; yalnızca yazar alanı boşalır.
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {keeps.map((r) => (
                      <tr key={`${r.table_name}-${r.label}`} className="border-b last:border-0">
                        <td className="py-1.5 pr-3">{r.label}</td>
                        <td className="py-1.5 text-right font-medium tabular-nums">
                          {r.row_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {blocks.length === 0 && (
              <div className="space-y-2">
                <Label htmlFor="deletion-confirm">
                  Onaylamak için kullanıcı adını yazın:{" "}
                  <span className="font-mono font-semibold">{request.username ?? "—"}</span>
                </Label>
                <Input
                  id="deletion-confirm"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  disabled={isDeleting || !request.username}
                />
                {!request.username && (
                  <p className="text-xs text-red-600">
                    Bu talepte kullanıcı adı yok — onay yapılamaz, talebi reddedin.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            İptal
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!canDelete}>
            {isDeleting ? "Siliniyor…" : "Kalıcı Olarak Sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  request,
  onClose,
  onDone,
}: {
  request: AccountDeletionRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleReject() {
    const parsed = accountDeletionRejectNoteSchema.safeParse(note);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Geçersiz gerekçe");
      return;
    }
    setIsSaving(true);
    try {
      await rejectAccountDeletionRequest(createClient(), request.id, parsed.data);
      toast({ title: "Talep reddedildi" });
      onDone();
    } catch (err) {
      setError(rpcErrorMessage(err, "Talep reddedilemedi."));
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Silme talebini reddet</DialogTitle>
          <DialogDescription>
            {request.display_name ?? "Adsız kullanıcı"} gerekçeyi mobil uygulamada görür.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reject-note">Gerekçe</Label>
          <Textarea
            id="reject-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError(null);
            }}
            maxLength={ACCOUNT_DELETION_NOTE_MAX}
            rows={4}
            disabled={isSaving}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            İptal
          </Button>
          <Button onClick={handleReject} disabled={isSaving}>
            {isSaving ? "Kaydediliyor…" : "Reddet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeletionRequestsSection({ requests }: { requests: AccountDeletionRequest[] }) {
  const router = useRouter();
  const [impactTarget, setImpactTarget] = useState<AccountDeletionRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AccountDeletionRequest | null>(null);

  function done() {
    setImpactTarget(null);
    setRejectTarget(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserX className="h-4 w-4" />
          Silme Talepleri
          {requests.length > 0 && <Badge variant="destructive">{requests.length}</Badge>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Kullanıcıların uygulamadan gönderdiği hesap silme talepleri. KVKK gereği her talep en
          geç 30 gün içinde sonuçlandırılmalıdır.
        </p>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
            Bekleyen silme talebi yok.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Kullanıcı</th>
                  <th className="py-2 pr-3 font-medium">Rol</th>
                  <th className="py-2 pr-3 font-medium">Talep</th>
                  <th className="py-2 pr-3 font-medium">Son tarih</th>
                  <th className="py-2 pr-3 font-medium">Kalan</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-medium">{r.display_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.username ?? "—"}</p>
                      {r.reason && (
                        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                          “{r.reason}”
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-3">{ROLE_LABELS[r.role] ?? r.role}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{formatDate(r.requested_at)}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{formatDate(r.due_at)}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <RemainingDays dueAt={r.due_at} />
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setImpactTarget(r)}
                        >
                          Etkiyi Gör ve Sil
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectTarget(r)}>
                          Reddet
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {impactTarget && (
        <ImpactDialog request={impactTarget} onClose={() => setImpactTarget(null)} onDone={done} />
      )}
      {rejectTarget && (
        <RejectDialog request={rejectTarget} onClose={() => setRejectTarget(null)} onDone={done} />
      )}
    </Card>
  );
}
