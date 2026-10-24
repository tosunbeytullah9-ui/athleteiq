// =============================================
// Yarışma aşamaları (cimnastik — FIG yarışma yapısı)
//
// Bir cimnastik yarışmasında sporcular önce Qualification'da yarışır; finale
// kalırlarsa aynı yarışmanın Apparatus / Team / All-Around finallerinde de
// yarışırlar. Aşamalar AYNI yarışmanın parçasıdır — ayrı yarışma kaydı açılmaz.
//
// DB ikizi: competition_stages.stage ve competition_entries.stages check
// constraint'leri (20261024082932_competition_stages.sql). Biri değişirse diğeri
// de değişmelidir.
// =============================================

export const COMPETITION_STAGES = [
  { value: "qualification", label: "Qualification", short: "Q" },
  { value: "apparatus_final", label: "Apparatus Final", short: "AF" },
  { value: "team_final", label: "Team Final", short: "TF" },
  { value: "all_around_final", label: "All-Around Final", short: "AA" },
] as const;

export type CompetitionStage = (typeof COMPETITION_STAGES)[number]["value"];

export const COMPETITION_STAGE_VALUES: CompetitionStage[] =
  COMPETITION_STAGES.map((s) => s.value);

const STAGE_META: Record<
  CompetitionStage,
  (typeof COMPETITION_STAGES)[number]
> = Object.fromEntries(COMPETITION_STAGES.map((s) => [s.value, s])) as Record<
  CompetitionStage,
  (typeof COMPETITION_STAGES)[number]
>;

export function isCompetitionStage(v: unknown): v is CompetitionStage {
  return (
    typeof v === "string" && (COMPETITION_STAGE_VALUES as string[]).includes(v)
  );
}

export function stageLabel(stage: CompetitionStage): string {
  return STAGE_META[stage].label;
}

export function stageShort(stage: CompetitionStage): string {
  return STAGE_META[stage].short;
}

export function isFinalStage(stage: CompetitionStage): boolean {
  return stage !== "qualification";
}

/**
 * Bilinmeyen değerleri atar, tekrarları kaldırır ve kanonik sıraya (Q → AF →
 * TF → AA) dizer. DB'den gelen ham text[] her zaman bundan geçirilir.
 */
export function normalizeStages(
  values: readonly unknown[] | null | undefined
): CompetitionStage[] {
  const set = new Set((values ?? []).filter(isCompetitionStage));
  return COMPETITION_STAGE_VALUES.filter((s) => set.has(s));
}

/**
 * Sporcunun aşama listesini yarışmada TANIMLI aşamalarla kesiştirir. Yarışmadan
 * bir aşama kaldırıldığında sporcu satırlarında kalan eski etiket görünmesin
 * (ve bir sonraki kayıtta silinsin) diye.
 */
export function stagesForEntry(
  entryStages: readonly unknown[] | null | undefined,
  competitionStages: readonly CompetitionStage[]
): CompetitionStage[] {
  const allowed = new Set(competitionStages);
  return normalizeStages(entryStages).filter((s) => allowed.has(s));
}

/**
 * Yarışmanın son günü — aşama tarihleri yarışma tarihinden sonra olabilir
 * (eleme 8 Temmuz, final 10 Temmuz). "Yaklaşan" ayrımı finali kaçırmasın diye
 * yarışma tarihi ile tüm aşama tarihlerinin en büyüğü kullanılır.
 */
export function competitionLastDate(
  competitionDate: string | null | undefined,
  stageDates: readonly (string | null | undefined)[]
): string | null {
  const all = [competitionDate, ...stageDates].filter(
    (d): d is string => typeof d === "string" && d.length > 0
  );
  if (all.length === 0) return null;
  return all.reduce((max, d) => (d > max ? d : max));
}
