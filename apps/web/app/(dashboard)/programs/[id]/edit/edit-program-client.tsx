"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PlatformExercise,
  OrgExercise,
  OrgExerciseCategory,
  Athlete1RMRecord,
} from "@athleteiq/db/queries/exercises";
import { WeekEditorForm } from "@/components/features/program-builder/week-editor-form";
import type {
  ProgramRow,
  WeekEditorHandle,
} from "@/components/features/program-builder/week-editor-form";
import { WeekTabs } from "@/components/features/program-builder/week-tabs";
import { AthleteDataWarningDialog } from "@/components/features/program-builder/athlete-data-warning-dialog";

interface Props {
  /**
   * program.block_id yoksa tek elemanlı [program]; varsa aynı bloktaki TÜM
   * haftalar (week_index_in_block sırasına göre, tam ağaçlarıyla) — bkz.
   * getProgramsByBlockId (packages/db/queries/programs.ts).
   */
  blockWeeks: ProgramRow[];
  initialProgramId: string;
  orgId: string;
  teams: { id: string; name: string }[];
  athletes: { id: string; full_name: string; team_id: string }[];
  platformExercises?: PlatformExercise[];
  orgExercises?: OrgExercise[];
  categories?: OrgExerciseCategory[];
  athleteMaxes?: Athlete1RMRecord[];
}

export function EditProgramClient({
  blockWeeks,
  initialProgramId,
  orgId,
  teams,
  athletes,
  platformExercises,
  orgExercises,
  categories,
  athleteMaxes,
}: Props) {
  const router = useRouter();
  const formRef = useRef<WeekEditorHandle>(null);
  const [activeId, setActiveId] = useState(initialProgramId);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [isSwitching, setIsSwitching] = useState(false);
  const [isResolvingDialog, setIsResolvingDialog] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [pendingSwitchTarget, setPendingSwitchTarget] = useState<string | null>(null);

  // block_id IS NULL olan programlarda blockWeeks tek elemanlıdır — bu durumda
  // sekme şeridi hiç render edilmez (Görev 1 regresyon şartı).
  const isBlockMode = blockWeeks.length > 1;
  // blockWeeks her zaman en az bir eleman içerir (page.tsx block_id yoksa
  // [program] geçer) — bu yüzden fallback güvenle non-null.
  const activeProgram = (blockWeeks.find((w) => w.id === activeId) ?? blockWeeks[0])!;

  const futureWeeks = useMemo(
    () =>
      blockWeeks
        .filter((w) => (w.week_index_in_block ?? 0) > (activeProgram.week_index_in_block ?? 0))
        .map((w) => ({ id: w.id, week_index_in_block: w.week_index_in_block })),
    [blockWeeks, activeProgram.week_index_in_block]
  );

  const weekTabInfos = useMemo(
    () =>
      blockWeeks.map((w) => ({
        id: w.id,
        week_index_in_block: w.week_index_in_block,
        start_date: w.start_date,
        end_date: w.end_date,
        is_published: w.is_published,
      })),
    [blockWeeks]
  );

  // Kaydedilmemiş değişiklik varken sayfadan ayrılma uyarısı — repoda ilk kez
  // eklenen bir desen (mevcut bir beforeunload konvansiyonu yoktu).
  useEffect(() => {
    if (dirtyIds.size === 0) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyIds.size]);

  const handleDirtyChange = useCallback((programId: string, dirty: boolean) => {
    setDirtyIds((prev) => {
      const has = prev.has(programId);
      if (dirty === has) return prev;
      const next = new Set(prev);
      if (dirty) next.add(programId);
      else next.delete(programId);
      return next;
    });
  }, []);

  async function commitSwitch(nextId: string, force: boolean) {
    const result = await formRef.current!.save({ force });
    if (result.ok) {
      // Dirty temizliğini burada, EXPLICIT olarak yapıyoruz — WeekEditorForm'un
      // kendi isDirty-effect'ine güvenemeyiz: setActiveId hemen ardından aynı
      // tick'te çalıştığı için key değişimi eski instance'ı, reset()'in
      // tetiklediği pending re-render'ı hiç flush etmeden unmount ediyor
      // (React, key değişince eski ağacı reconcile etmeden atıyor). Bu yüzden
      // dirty dot hiç temizlenmiyordu — gerçek tarayıcı testinde yakalandı.
      setDirtyIds((prev) => {
        if (!prev.has(activeId)) return prev;
        const next = new Set(prev);
        next.delete(activeId);
        return next;
      });
      setActiveId(nextId);
      setSwitchError(null);
    } else if (!("needsConfirmation" in result)) {
      setSwitchError(result.error);
    }
    setIsSwitching(false);
  }

  async function requestSwitch(nextId: string) {
    if (nextId === activeId || isSwitching) return;
    setSwitchError(null);

    if (!dirtyIds.has(activeId)) {
      setActiveId(nextId);
      return;
    }

    setIsSwitching(true);
    const hasAthleteData = await formRef.current!.checkAthleteData();
    if (hasAthleteData) {
      // isSwitching true kalır — dialog kapanana kadar sekme şeridi kilitli.
      setPendingSwitchTarget(nextId);
      return;
    }
    await commitSwitch(nextId, false);
  }

  async function handleSwitchDialogConfirm() {
    const target = pendingSwitchTarget;
    if (!target) return;
    setIsResolvingDialog(true);
    await commitSwitch(target, true);
    setIsResolvingDialog(false);
    setPendingSwitchTarget(null);
  }

  // Koç onaylamazsa değişiklikleri geri al ve yine de geçişe izin ver —
  // kaydedilmemiş edit'ler kaybolur ama sporcu verisi korunur.
  function handleSwitchDialogCancel() {
    const target = pendingSwitchTarget;
    if (!target) return;
    setPendingSwitchTarget(null);
    formRef.current!.discardChanges();
    // Aynı remount-önce-flush yarışı burada da geçerli — bkz. commitSwitch.
    setDirtyIds((prev) => {
      if (!prev.has(activeId)) return prev;
      const next = new Set(prev);
      next.delete(activeId);
      return next;
    });
    setActiveId(target);
    setIsSwitching(false);
  }

  return (
    <div className="space-y-4">
      {isBlockMode && (
        <div className="max-w-3xl mx-auto">
          <WeekTabs
            weeks={weekTabInfos}
            activeId={activeId}
            dirtyIds={dirtyIds}
            disabled={isSwitching}
            onRequestSwitch={requestSwitch}
          />
        </div>
      )}

      {switchError && (
        <div className="max-w-3xl mx-auto rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {switchError}
        </div>
      )}

      <WeekEditorForm
        key={activeId}
        ref={formRef}
        program={activeProgram}
        orgId={orgId}
        teams={teams}
        athletes={athletes}
        platformExercises={platformExercises}
        orgExercises={orgExercises}
        categories={categories}
        athleteMaxes={athleteMaxes}
        futureWeeks={futureWeeks}
        onDirtyChange={handleDirtyChange}
        onManualSaveSuccess={isBlockMode ? () => {} : undefined}
        onPropagated={() => router.refresh()}
      />

      {pendingSwitchTarget && (
        <AthleteDataWarningDialog
          title="Bu haftada sporcu verisi var"
          description="Bu haftada sporcunun girdiği RPE ve not kayıtları var. Başka bir haftaya geçmeden önce kaydetmek bunları silecek. Devam edilsin mi?"
          isBusy={isResolvingDialog}
          onConfirm={handleSwitchDialogConfirm}
          onCancel={handleSwitchDialogCancel}
        />
      )}
    </div>
  );
}
