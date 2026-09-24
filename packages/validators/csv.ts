/**
 * Bağımlılıksız CSV/TSV ayrıştırıcı + başlık eşleme yardımcıları.
 *
 * Neden kendi ayrıştırıcımız: projede papaparse/xlsx gibi bir bağımlılık YOK ve
 * içe aktarma akışının ihtiyacı RFC 4180'in tamamı değil — tırnaklı alanlar,
 * alan içinde satır sonu, CRLF ve BOM. Bu dosya SAF (DOM/Node API'si yok), bu
 * yüzden hem web client'ında hem vitest'te aynı kod çalışır.
 *
 * Excel'den KOPYALA-YAPIŞTIR panoya TSV bırakır; bu yüzden ayırıcı otomatik
 * tespit edilir (tab, noktalı virgül, virgül) — kullanıcıdan "dosyanı şu
 * ayırıcıyla kaydet" istemek zorunda kalmayalım diye. (Türkçe Excel'in
 * "CSV olarak kaydet"i noktalı virgül üretir.)
 */

import { trFold } from "./athlete";

export type Delimiter = "," | ";" | "\t";

export interface DelimitedRow {
  /** 1 tabanlı dosya satır numarası — hata mesajları kullanıcıya bunu gösterir. */
  line: number;
  cells: string[];
}

export interface DelimitedTable {
  delimiter: Delimiter;
  headers: string[];
  rows: DelimitedRow[];
}

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * İlk satırdaki aday ayırıcıların sayısına bakar. Tırnak içindeki ayırıcılar
 * yanlış sayılabilir; pratikte başlık satırı tırnaksızdır, bu yüzden yeterli.
 */
export function detectDelimiter(text: string): Delimiter {
  const firstLine = stripBom(text).split(/\r?\n/, 1)[0] ?? "";
  const candidates: Delimiter[] = ["\t", ";", ","];
  let best: Delimiter = ",";
  let bestCount = 0;
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Tırnak farkındalıklı durum makinesi. İki ardışık tırnak, alan içindeki tek
 * bir tırnağa kaçış yapar (Excel'in ürettiği biçim). Tırnak içindeki satır
 * sonu alan içeriğidir, kayıt sonu değil.
 */
export function parseDelimited(text: string, delimiter?: Delimiter): DelimitedRow[] {
  const src = stripBom(text);
  const delim = delimiter ?? detectDelimiter(src);

  const rows: DelimitedRow[] = [];
  let cells: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let rowStartLine = 1;

  const pushField = () => {
    cells.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push({ line: rowStartLine, cells });
    cells = [];
    rowStartLine = line;
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
      continue;
    }

    if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === delim) {
      pushField();
    } else if (ch === "\r") {
      // CRLF'in CR'i yutulur; tek başına CR (eski Mac) da kayıt sonu sayılır.
      if (src[i + 1] !== "\n") {
        line++;
        pushRow();
      }
    } else if (ch === "\n") {
      line++;
      pushRow();
    } else {
      field += ch;
    }
  }

  // Son satır newline ile bitmiyorsa elde kalanı da al.
  if (field !== "" || cells.length > 0) pushRow();

  // Tamamen boş satırları at (Excel export'ları sona boş satır ekler).
  return rows.filter((r) => r.cells.some((c) => c.trim() !== ""));
}

/** İlk satırı başlık kabul eder. Hiç satır yoksa boş tablo döner. */
export function parseTable(text: string, delimiter?: Delimiter): DelimitedTable {
  const delim = delimiter ?? detectDelimiter(stripBom(text));
  const rows = parseDelimited(text, delim);
  const head = rows[0];
  if (!head) {
    return { delimiter: delim, headers: [], rows: [] };
  }
  return {
    delimiter: delim,
    headers: head.cells.map((c) => c.trim()),
    rows: rows.slice(1),
  };
}

/**
 * Başlığı eşleme anahtarına indirger: Türkçe karakter foldlama (trFold) +
 * harf/rakam dışındaki her şey atılır. "Doğum Tarihi", "dogum_tarihi" ve
 * "DOĞUM-TARİHİ" aynı anahtara düşer.
 */
export function normalizeHeaderKey(header: string): string {
  return (trFold(header) ?? "").replace(/[^a-z0-9]/g, "");
}

export interface ColumnMapping<K extends string> {
  /** Kanonik alan adı → sütun indeksi. Bulunamayan alan haritada YOKTUR. */
  index: Partial<Record<K, number>>;
  /** Hiçbir kanonik alana eşlenemeyen başlıklar — kullanıcıya uyarı olarak gösterilir. */
  unknown: string[];
}

/**
 * Başlık satırını kanonik alan adlarına eşler. aliases değerleri ham metin
 * olarak yazılır (örn. "Doğum Tarihi"); normalizeHeaderKey ikisine de uygulanır.
 * Aynı kanonik alana birden fazla sütun düşerse İLKİ kazanır.
 */
export function mapColumns<K extends string>(
  headers: string[],
  aliases: Record<K, readonly string[]>
): ColumnMapping<K> {
  const lookup = new Map<string, K>();
  for (const canonical of Object.keys(aliases) as K[]) {
    for (const alias of aliases[canonical]) {
      const key = normalizeHeaderKey(alias);
      if (key && !lookup.has(key)) lookup.set(key, canonical);
    }
  }

  const index: Partial<Record<K, number>> = {};
  const unknown: string[] = [];

  headers.forEach((header, i) => {
    const key = normalizeHeaderKey(header);
    if (!key) return;
    const canonical = lookup.get(key);
    if (!canonical) {
      unknown.push(header);
      return;
    }
    if (index[canonical] === undefined) index[canonical] = i;
  });

  return { index, unknown };
}

/** Bir satırdan kanonik alanı okur; sütun yoksa veya boşsa boş metin döner. */
export function cell<K extends string>(
  row: DelimitedRow,
  mapping: ColumnMapping<K>,
  field: K
): string {
  const i = mapping.index[field];
  if (i === undefined) return "";
  return (row.cells[i] ?? "").trim();
}

// --- Değer ayrıştırıcıları -------------------------------------------------

/**
 * "70,5" (Türkçe ondalık), "70.5", " 70 " ve "%70" kabul eder; geçersizse null.
 * Binlik ayırıcı DESTEKLENMEZ — "1.500" 1.5 olarak okunur ve bu bilinçli:
 * antrenman verisinde binlik değer yok, nokta neredeyse her zaman ondalıktır.
 */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/%/g, "").replace(/\s/g, "").replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseInteger(raw: string): number | null {
  const n = parseNumber(raw);
  if (n === null) return null;
  return Number.isInteger(n) ? n : Math.round(n);
}

/**
 * YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY ve DD-MM-YYYY kabul eder; her zaman
 * YYYY-MM-DD döndürür. Gün/ay sırası TÜRKÇE varsayılır (gün önce) — Excel'in
 * ürettiği yerel biçim bu. Geçersiz takvim tarihi (31.02.2026) null döner.
 */
export function parseDate(raw: string): string | null {
  const value = raw.trim();
  if (value === "") return null;

  let y: number;
  let m: number;
  let d: number;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const local = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(value);

  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else if (local) {
    d = Number(local[1]);
    m = Number(local[2]);
    y = Number(local[3]);
  } else {
    return null;
  }

  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** CSV metni üretir — şablon indirme için. Ayırıcı/tırnak/newline kaçışlanır. */
export function toCsv(rows: string[][], delimiter: Delimiter = ";"): string {
  const escape = (v: string) =>
    /["\n\r]/.test(v) || v.includes(delimiter) ? `"${v.replace(/"/g, '""')}"` : v;
  return rows.map((r) => r.map(escape).join(delimiter)).join("\r\n");
}
