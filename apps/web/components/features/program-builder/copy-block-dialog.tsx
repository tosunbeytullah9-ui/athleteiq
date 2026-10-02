"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CopyPlus } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import { useUserContext } from "@/lib/hooks/useUserContext";
import { toast } from "@/components/ui/use-toast";
import { mapRpcError } from "@/lib/program-rpc";
import {
  dateRangesOverlap,
  defaultCopyStartDate,
  planBlockCopy,
} from "@athleteiq/validators/program-copy";

// "Bloğu Kopyala" — bir bloğun (veya bloksuz tek haftalık programın) tüm
// haftalarını seans/egzersiz/set/WOD/dayanıklılık ağacıyla birlikte yeni bir
// tarihe, istenirse başka bir takıma/sporcuya TASLAK olarak kopyalar.
// Asıl iş copy_program_block RPC'sinde (yetki + tek transaction); burası
// yalnızca hedef/tarih seçimi, önizleme ve çakışma uyarısı.
// Overlay deseni athlete-data-warning-dialog.tsx ile aynı (Radix yok).

interface SourceProgram {
  id: string;
  org_id: string;
  title: string;
  team_id: string | null;
  athlete_id: string | null;
  block_id: string | null;
  start_date: string | null;
}

interface Props {
  program: SourceProgram;
  /** Detay sayfasının zaten bildiği hedef adı ("ACE" / "Ayşe Yılmaz"). */
  sourceTargetLabel: string;
  onClose: () => void;
}

type TargetMode = "same" | "team" | "athlete";

interface ExistingProgram {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

function formatTrDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("tr-TR");
}

export function CopyBlockDialog({ program, sourceTargetLabel, onClose }: Props) {
  const router = useRouter();
  const { role, teamId: myTeamId } = useUserContext();
  const isCoach = role === "coach";

  const [sourceStarts, setSourceStarts] = useState<(string | null)[] | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [athletes, setAthletes] = useState<{ id: string; full_name: string; team_id: string | null }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [title, setTitle] = useState(program.title);
  const [mode, setMode] = useState<TargetMode>("same");
  const [targetTeamId, setTargetTeamId] = useState("");
  const [targetAthleteId, setTargetAthleteId] = useState("");

  const [overlaps, setOverlaps] = useState<ExistingProgram[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Kaynak haftalar + hedef seçenekleri (RLS altında — koç zaten yalnızca
  // kendi takımının sporcularını görür; takım listesi aşağıda daraltılır).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const weeksQuery = program.block_id
        ? supabase
            .from("training_programs")
            .select("start_date, week_index_in_block")
            .eq("block_id", program.block_id)
            .order("week_index_in_block", { ascending: true, nullsFirst: false })
        : null;
      const [weeksRes, teamsRes, athletesRes] = await Promise.all([
        weeksQuery,
        supabase.from("teams").select("id, name").eq("org_id", program.org_id).order("name"),
        supabase
          .from("athletes")
          .select("id, full_name, team_id")
          .eq("org_id", program.org_id)
          .eq("is_active", true)
          .order("full_name"),
      ]);
      if (cancelled) return;
      if (weeksRes?.error || teamsRes.error || athletesRes.error) {
        setLoadError("Blok bilgisi yüklenemedi. Sayfayı yenileyip tekrar deneyin.");
        return;
      }
      const starts = weeksRes ? (weeksRes.data ?? []).map((w) => w.start_date) : [program.start_date];
      setSourceStarts(starts);
      setStartDate((prev) => prev || defaultCopyStartDate(starts) || "");
      setTeams(teamsRes.data ?? []);
      setAthletes(athletesRes.data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [program.block_id, program.org_id, program.start_date]);

  // Koç yalnızca kendi takımına / takımındaki sporcuya kopyalayabilir (RPC de zorlar).
  const teamOptions = isCoach ? teams.filter((t) => t.id === myTeamId) : teams;
  const athleteOptions = isCoach ? athletes.filter((a) => a.team_id === myTeamId) : athletes;

  const target = useMemo((): { teamId: string | null; athleteId: string | null } | null => {
    if (mode === "same") return { teamId: program.team_id, athleteId: program.athlete_id };
    if (mode === "team") return targetTeamId ? { teamId: targetTeamId, athleteId: null } : null;
    return targetAthleteId ? { teamId: null, athleteId: targetAthleteId } : null;
  }, [mode, targetTeamId, targetAthleteId, program.team_id, program.athlete_id]);

  const plan = useMemo(
    () => (sourceStarts && startDate ? planBlockCopy(sourceStarts, startDate) : []),
    [sourceStarts, startDate]
  );
  const planStart = plan[0]?.start ?? null;
  const planEnd = plan.length > 0 ? plan[plan.length - 1]!.end : null;

  // Hedefin aynı tarihlerde zaten programı var mı — engellemez, uyarır
  // (koç bilinçli olarak üst üste iki blok planlıyor olabilir).
  useEffect(() => {
    if (!target || !planStart || !planEnd) {
      setOverlaps([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      let q = supabase
        .from("training_programs")
        .select("id, title, start_date, end_date")
        .eq("is_archived", false)
        .lte("start_date", planEnd)
        .gte("end_date", planStart);
      q = target.teamId ? q.eq("team_id", target.teamId) : q.eq("athlete_id", target.athleteId!);
      const { data } = await q;
      if (cancelled) return;
      setOverlaps(
        (data ?? []).filter(
          (p) =>
            p.start_date &&
            p.end_date &&
            plan.some((w) => dateRangesOverlap(w.start, w.end, p.start_date!, p.end_date!))
        )
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [target, planStart, planEnd, plan]);

  const canSubmit = !!target && !!startDate && plan.length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!target || !startDate) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const supabase = createClient();
      const trimmedTitle = title.trim();
      const { data, error } = await supabase.rpc("copy_program_block", {
        p_source_program_id: program.id,
        p_start_date: startDate,
        p_title: trimmedTitle && trimmedTitle !== program.title ? trimmedTitle : undefined,
        // "Aynı hedef"te ikisi de gönderilmez — RPC kaynağın hedefini kullanır.
        p_team_id: mode === "team" ? targetTeamId : undefined,
        p_athlete_id: mode === "athlete" ? targetAthleteId : undefined,
      });
      if (error) throw new Error(mapRpcError(error.message));

      const result = data as { block_id: string | null; program_ids: string[] } | null;
      const firstId = result?.program_ids[0];
      if (!firstId) throw new Error("Kopya oluşturulamadı.");

      toast({
        title: plan.length > 1 ? `${plan.length} haftalık blok kopyalandı` : "Program kopyalandı",
        description: "Kopya taslak olarak oluşturuldu — sporcuların görmesi için yayınlayın.",
      });
      router.push(`/programs/${firstId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Kopyalama sırasında bir hata oluştu.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => !isSubmitting && onClose()} />
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-start gap-3">
          <CopyPlus className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">
              {program.block_id ? "Bloğu Kopyala" : "Programı Kopyala"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Tüm seanslar, egzersizler ve setler aynen kopyalanır. Kopya taslak olarak oluşur.
            </p>
          </div>
        </div>

        {loadError ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {loadError}
          </div>
        ) : !sourceStarts ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="copy-start">Kopyanın başlangıç tarihi *</Label>
              <Input
                id="copy-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {plan.length > 0 && planStart && planEnd && (
                <p className="text-xs text-muted-foreground">
                  {plan.length > 1 ? `${plan.length} hafta` : "1 hafta"}: {formatTrDate(planStart)} —{" "}
                  {formatTrDate(planEnd)}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Kime?</Label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="accent-primary"
                    checked={mode === "same"}
                    onChange={() => setMode("same")}
                  />
                  Aynı hedef — {sourceTargetLabel}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="accent-primary"
                    checked={mode === "team"}
                    onChange={() => setMode("team")}
                  />
                  Başka bir takım
                </label>
                {mode === "team" && (
                  <select
                    value={targetTeamId}
                    onChange={(e) => setTargetTeamId(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">Takım seçin</option>
                    {teamOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="accent-primary"
                    checked={mode === "athlete"}
                    onChange={() => setMode("athlete")}
                  />
                  Bireysel bir sporcu
                </label>
                {mode === "athlete" && (
                  <select
                    value={targetAthleteId}
                    onChange={(e) => setTargetAthleteId(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">Sporcu seçin</option>
                    {athleteOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                      </option>
                    ))}
                  </select>
                )}
                {mode !== "same" && program.team_id && (
                  <p className="text-xs text-muted-foreground">
                    Antrenman grubu (alt grup) yalnızca aynı takıma kopyalanırken korunur.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="copy-title">Başlık</Label>
              <Input id="copy-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {overlaps.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="text-xs">
                  <p className="font-medium">Bu tarihlerde hedefin zaten programı var:</p>
                  <ul className="mt-1 space-y-0.5">
                    {overlaps.slice(0, 5).map((p) => (
                      <li key={p.id}>
                        {p.title} ({formatTrDate(p.start_date!)} — {formatTrDate(p.end_date!)})
                      </li>
                    ))}
                    {overlaps.length > 5 && <li>… ve {overlaps.length - 5} hafta daha</li>}
                  </ul>
                  <p className="mt-1">Kopyalamak yine de mümkün; iki program üst üste görünür.</p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            İptal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? "Kopyalanıyor..." : "Kopyala"}
          </Button>
        </div>
      </div>
    </div>
  );
}
