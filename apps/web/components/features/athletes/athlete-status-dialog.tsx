"use client";

import { useEffect, useState } from "react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import {
  deleteAthlete,
  getAthleteImpact,
  updateAthlete,
  type AthleteImpact,
} from "@athleteiq/db/queries/athletes";
import { toast } from "@/components/ui/use-toast";
import type { Tables } from "@athleteiq/db/types";

type Athlete = Tables<"athletes">;

interface Props {
  athlete: Athlete;
  onSuccess: () => void;
  onCancel: () => void;
}

const IMPACT_LABELS: { key: keyof AthleteImpact; label: string }[] = [
  { key: "programs", label: "bireysel antrenman programı" },
  { key: "acwrLogs", label: "ACWR kaydı" },
  { key: "testResults", label: "test sonucu" },
  { key: "competitionResults", label: "yarışma sonucu" },
  { key: "oneRmRecords", label: "1RM kaydı" },
  { key: "wellnessCheckins", label: "wellness check-in" },
  { key: "attendanceRecords", label: "yoklama kaydı" },
];

/**
 * Sporcu için Pasife Al / Aktife Al / Kalıcı Sil — davranışı getAthleteImpact'e
 * göre değişir: hiç bağlı kayıt YOKSA ve giriş erişimi YOKSA hard-delete
 * sunulur (typed-name onayla, DeleteTeamDialog'daki desenle aynı), aksi halde
 * yalnızca is_active=false (geri alınabilir) sunulur — 044 migration'ındaki
 * athletes_delete notunda açıklanan güvenlik kararı.
 */
export function AthleteStatusDialog({ athlete, onSuccess, onCancel }: Props) {
  const [impact, setImpact] = useState<AthleteImpact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pasif sporcu için tek seçenek "tekrar aktif et" — impact hiç kullanılmaz, boşuna sorgulama.
    if (!athlete.is_active) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    getAthleteImpact(supabase, athlete.id)
      .then((result) => {
        if (!cancelled) setImpact(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Kayıtlar okunamadı.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [athlete.id, athlete.is_active]);

  const hasImpact =
    impact != null &&
    (IMPACT_LABELS.some(({ key }) => impact[key] as number > 0) || impact.hasLogin);
  const canHardDelete = impact != null && !hasImpact;

  async function handleDeactivate(nextActive: boolean) {
    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      await updateAthlete(supabase, athlete.id, { is_active: nextActive });
      toast({ title: nextActive ? "Sporcu tekrar aktif edildi" : "Sporcu pasife alındı" });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız oldu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleHardDelete() {
    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      await deleteAthlete(supabase, athlete.id);
      toast({ title: "Sporcu kalıcı olarak silindi" });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sporcu silinemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg mx-4">
        {!athlete.is_active ? (
          <>
            <h2 className="text-lg font-semibold mb-2">
              &quot;{athlete.full_name}&quot; şu anda pasif
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Sporcuyu tekrar sporcu listesinde aktif göstermek ister misiniz?
            </p>
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel}>
                Kapat
              </Button>
              <Button onClick={() => handleDeactivate(true)} disabled={isSubmitting}>
                {isSubmitting ? "İşleniyor..." : "Tekrar Aktif Et"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-2">
              &quot;{athlete.full_name}&quot; için işlem
            </h2>

            {isLoading ? (
              <p className="text-sm text-muted-foreground mb-6">Kayıtlar kontrol ediliyor...</p>
            ) : canHardDelete ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Bu sporcuya bağlı hiçbir program/test/ACWR/yarışma kaydı ve giriş erişimi yok —
                  kalıcı olarak silinebilir. Bu işlem geri alınamaz.
                </p>
                <div className="space-y-1.5 mb-4">
                  <Label htmlFor="delete-athlete-confirm">
                    Onaylamak için sporcunun adını yazın: <strong>{athlete.full_name}</strong>
                  </Label>
                  <Input
                    id="delete-athlete-confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                {error && <p className="text-sm text-destructive mb-4">{error}</p>}
                <div className="flex justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleDeactivate(false)}
                    disabled={isSubmitting}
                  >
                    Bunun yerine pasife al
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={onCancel}>
                      İptal
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleHardDelete}
                      disabled={isSubmitting || confirmText.trim() !== athlete.full_name}
                    >
                      {isSubmitting ? "Siliniyor..." : "Kalıcı Sil"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Bu sporcuya bağlı geçmiş kayıtlar ve/veya aktif bir giriş erişimi var, bu
                  yüzden kalıcı silme kapalı (geçmiş antrenman/test verisi kaybolmasın diye) —
                  bunun yerine pasife alabilirsiniz. Pasife alınan sporcu listede görünmez ama
                  tüm geçmişi korunur, istediğiniz an tekrar aktif edebilirsiniz.
                </p>
                {impact && (
                  <ul className="mb-4 list-disc list-inside space-y-1 text-sm">
                    {IMPACT_LABELS.filter(({ key }) => (impact[key] as number) > 0).map(
                      ({ key, label }) => (
                        <li key={key}>
                          <strong>{impact[key] as number}</strong> {label}
                        </li>
                      )
                    )}
                    {impact.hasLogin && <li>Giriş erişimi (kullanıcı adı/şifre) aktif</li>}
                  </ul>
                )}
                {error && <p className="text-sm text-destructive mb-4">{error}</p>}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onCancel}>
                    İptal
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeactivate(false)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "İşleniyor..." : "Pasife Al"}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
