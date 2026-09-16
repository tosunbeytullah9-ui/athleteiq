// Programlar listesinin iki seviyeli gruplaması — saf fonksiyonlar, React/DOM yok.
//
// Neden gerekli: training_programs'ta HER SATIR BİR HAFTADIR. Çok haftalı bir blok
// (program_blocks) tüm haftalarında AYNI başlığı taşıdığı için düz bir grid'de aynı
// kart N kez görünüyordu (canlıda 21 satır = yalnızca 6 hedef + 8 grup). Burada
// haftalar önce hedefe (takım/sporcu), sonra bloğa göre toplanır.
//
// week_number = yılın ISO hafta numarası (26, 38...), week_index_in_block = blok
// içindeki sıra (1..N). Listede blok içi sıra gösterilir — kullanıcıya "Hafta 38"
// yerine "1, 2, 3, 4" anlamlı geliyor.

export interface ProgramRow {
  id: string;
  title: string;
  team_id: string | null;
  athlete_id: string | null;
  block_id: string | null;
  week_index_in_block: number | null;
  week_number: number | null;
  phase: string | null;
  start_date: string | null;
  end_date: string | null;
  is_published: boolean | null;
  is_archived: boolean | null;
}

export interface BlockRow {
  id: string;
  title: string;
  phase: string | null;
  total_weeks: number;
}

export interface WeekItem {
  programId: string;
  /** Blok içi sıra (1..N); bloksuz haftalarda null. */
  indexInBlock: number | null;
  /** Yılın ISO hafta numarası — blok içi sıra yoksa etikette bu kullanılır. */
  weekNumber: number | null;
  title: string;
  startDate: string | null;
  endDate: string | null;
  isPublished: boolean;
  isArchived: boolean;
  /** Bugün bu haftanın tarih aralığındaysa true. */
  isCurrent: boolean;
}

export interface ProgramGroupItem {
  /** Blok ise block.id, tek haftalık program ise program.id. */
  key: string;
  kind: "block" | "single";
  title: string;
  phase: string | null;
  weeks: WeekItem[];
  startDate: string | null;
  endDate: string | null;
  publishedCount: number;
  archivedCount: number;
  /** Bloğun haftalarından biri bugünü kapsıyorsa true. */
  isCurrent: boolean;
  /** Blok tanımındaki toplam hafta — mevcut hafta sayısından farklıysa eksik hafta var. */
  totalWeeks: number | null;
}

export interface TargetGroup {
  /** "team:<id>" | "athlete:<id>" | "unassigned" */
  key: string;
  kind: "team" | "athlete" | "unknown";
  name: string;
  items: ProgramGroupItem[];
  weekCount: number;
  publishedCount: number;
  isCurrent: boolean;
}

function isWithin(dateISO: string, start: string | null, end: string | null): boolean {
  if (start && dateISO < start) return false;
  if (end && dateISO > end) return false;
  // Her iki uç da boşsa "şu an aktif" iddiasında bulunma.
  return !!(start || end);
}

/** En erken başlangıç / en geç bitiş — null'lar yok sayılır. */
function dateSpan(weeks: WeekItem[]): { startDate: string | null; endDate: string | null } {
  let startDate: string | null = null;
  let endDate: string | null = null;
  for (const w of weeks) {
    if (w.startDate && (startDate === null || w.startDate < startDate)) startDate = w.startDate;
    if (w.endDate && (endDate === null || w.endDate > endDate)) endDate = w.endDate;
  }
  return { startDate, endDate };
}

function sortWeeks(a: WeekItem, b: WeekItem): number {
  // Önce blok içi sıra, sonra tarih, son çare ISO hafta numarası.
  if (a.indexInBlock !== null && b.indexInBlock !== null) return a.indexInBlock - b.indexInBlock;
  if (a.startDate && b.startDate) return a.startDate.localeCompare(b.startDate);
  if (a.startDate) return -1;
  if (b.startDate) return 1;
  return (a.weekNumber ?? 0) - (b.weekNumber ?? 0);
}

function toWeekItem(p: ProgramRow, todayISO: string): WeekItem {
  return {
    programId: p.id,
    indexInBlock: p.week_index_in_block,
    weekNumber: p.week_number,
    title: p.title,
    startDate: p.start_date,
    endDate: p.end_date,
    isPublished: !!p.is_published,
    isArchived: !!p.is_archived,
    isCurrent: isWithin(todayISO, p.start_date, p.end_date),
  };
}

export interface GroupOptions {
  programs: ProgramRow[];
  blocks: BlockRow[];
  teamNames: Record<string, string>;
  athleteNames: Record<string, string>;
  todayISO: string;
}

/**
 * Hafta satırlarını hedef (takım/sporcu) → blok/tek-program ağacına dönüştürür.
 * Girdi sırası önemsizdir; çıktı deterministiktir:
 *   - Takımlar önce, sonra sporcular; her biri kendi içinde ada göre (tr-TR).
 *   - Hedef içinde: aktif (bugünü kapsayan) gruplar önce, sonra en yeni başlangıç.
 */
export function groupPrograms({
  programs,
  blocks,
  teamNames,
  athleteNames,
  todayISO,
}: GroupOptions): TargetGroup[] {
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  // 1) Hedefe göre topla.
  const byTarget = new Map<string, ProgramRow[]>();
  for (const p of programs) {
    const key = p.team_id
      ? `team:${p.team_id}`
      : p.athlete_id
        ? `athlete:${p.athlete_id}`
        : "unassigned";
    const bucket = byTarget.get(key);
    if (bucket) bucket.push(p);
    else byTarget.set(key, [p]);
  }

  const groups: TargetGroup[] = [];

  for (const [targetKey, rows] of byTarget) {
    // 2) Hedef içinde blok / tek program ayrımı.
    const byBlock = new Map<string, ProgramRow[]>();
    const singles: ProgramRow[] = [];
    for (const p of rows) {
      if (p.block_id) {
        const bucket = byBlock.get(p.block_id);
        if (bucket) bucket.push(p);
        else byBlock.set(p.block_id, [p]);
      } else {
        singles.push(p);
      }
    }

    const items: ProgramGroupItem[] = [];

    for (const [blockId, blockRows] of byBlock) {
      const weeks = blockRows.map((p) => toWeekItem(p, todayISO)).sort(sortWeeks);
      const meta = blockById.get(blockId);
      const span = dateSpan(weeks);
      items.push({
        key: blockId,
        kind: "block",
        // Blok kaydı silinmiş/okunamıyorsa haftaların ortak başlığına düş.
        title: meta?.title ?? weeks[0]?.title ?? "Adsız blok",
        phase: meta?.phase ?? blockRows.find((p) => p.phase)?.phase ?? null,
        weeks,
        ...span,
        publishedCount: weeks.filter((w) => w.isPublished).length,
        archivedCount: weeks.filter((w) => w.isArchived).length,
        isCurrent: weeks.some((w) => w.isCurrent),
        totalWeeks: meta?.total_weeks ?? null,
      });
    }

    for (const p of singles) {
      const week = toWeekItem(p, todayISO);
      items.push({
        key: p.id,
        kind: "single",
        title: p.title,
        phase: p.phase,
        weeks: [week],
        startDate: week.startDate,
        endDate: week.endDate,
        publishedCount: week.isPublished ? 1 : 0,
        archivedCount: week.isArchived ? 1 : 0,
        isCurrent: week.isCurrent,
        totalWeeks: null,
      });
    }

    // Aktif gruplar üstte, sonra en yeni başlangıç, son çare başlık.
    items.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      const as = a.startDate ?? "";
      const bs = b.startDate ?? "";
      if (as !== bs) return bs.localeCompare(as);
      return a.title.localeCompare(b.title, "tr-TR");
    });

    const kind: TargetGroup["kind"] = targetKey.startsWith("team:")
      ? "team"
      : targetKey.startsWith("athlete:")
        ? "athlete"
        : "unknown";
    const id = targetKey.slice(targetKey.indexOf(":") + 1);
    const name =
      kind === "team"
        ? (teamNames[id] ?? "Bilinmeyen takım")
        : kind === "athlete"
          ? (athleteNames[id] ?? "Bilinmeyen sporcu")
          : "Atanmamış";

    groups.push({
      key: targetKey,
      kind,
      name,
      items,
      weekCount: rows.length,
      publishedCount: rows.filter((p) => p.is_published).length,
      isCurrent: items.some((i) => i.isCurrent),
    });
  }

  // Takımlar önce, sonra sporcular; her biri kendi içinde ada göre.
  const KIND_ORDER: Record<TargetGroup["kind"], number> = { team: 0, athlete: 1, unknown: 2 };
  groups.sort((a, b) => {
    if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    return a.name.localeCompare(b.name, "tr-TR");
  });

  return groups;
}

/** Hedef adı veya içindeki herhangi bir grup/hafta başlığı arama terimini içeriyor mu. */
export function matchesQuery(group: TargetGroup, query: string): boolean {
  const q = query.trim().toLocaleLowerCase("tr-TR");
  if (q.length === 0) return true;
  if (group.name.toLocaleLowerCase("tr-TR").includes(q)) return true;
  return group.items.some(
    (i) =>
      i.title.toLocaleLowerCase("tr-TR").includes(q) ||
      i.weeks.some((w) => w.title.toLocaleLowerCase("tr-TR").includes(q))
  );
}

/** Hedef adı/başlık araması uygulanmış kopya — eşleşmeyen hedefler tamamen düşer. */
export function filterGroups(groups: TargetGroup[], query: string): TargetGroup[] {
  if (query.trim().length === 0) return groups;
  return groups.filter((g) => matchesQuery(g, query));
}
