import { describe, expect, it } from "vitest";
import {
  detectDelimiter,
  mapColumns,
  normalizeHeaderKey,
  parseDate,
  parseDelimited,
  parseNumber,
  parseTable,
  stripBom,
  toCsv,
} from "./csv";

describe("detectDelimiter", () => {
  it("Excel'den yapıştırılan TSV'yi tanır", () => {
    expect(detectDelimiter("ad\tsoyad\tyas\nA\tB\t1")).toBe("\t");
  });

  it("Türkçe Excel'in noktalı virgülünü tanır", () => {
    expect(detectDelimiter("ad;soyad;yas")).toBe(";");
  });

  it("virgülü varsayılan olarak kullanır", () => {
    expect(detectDelimiter("ad,soyad,yas")).toBe(",");
    expect(detectDelimiter("tekbaslik")).toBe(",");
  });
});

describe("parseDelimited", () => {
  it("BOM'u atar", () => {
    expect(stripBom("﻿ad")).toBe("ad");
    expect(parseDelimited("﻿a,b")[0]!.cells).toEqual(["a", "b"]);
  });

  it("tırnaklı alandaki ayırıcıyı ve satır sonunu alan içeriği sayar", () => {
    const rows = parseDelimited('ad,not\n"Ali, Veli","iki\nsatır"');
    expect(rows).toHaveLength(2);
    expect(rows[1]!.cells).toEqual(["Ali, Veli", "iki\nsatır"]);
  });

  it("çift tırnağı kaçış olarak çözer", () => {
    expect(parseDelimited('a,"de ""bu"" dedi"')[0]!.cells[1]!).toBe('de "bu" dedi');
  });

  it("CRLF ile boş satırları atar ve satır numarasını korur", () => {
    const rows = parseDelimited("a,b\r\n\r\n1,2\r\n");
    expect(rows).toHaveLength(2);
    expect(rows[1]!.line).toBe(3);
  });

  it("son satır newline ile bitmese de okur", () => {
    expect(parseDelimited("a,b\n1,2").at(-1)?.cells).toEqual(["1", "2"]);
  });
});

describe("parseTable", () => {
  it("ilk satırı başlık kabul eder", () => {
    const t = parseTable("Ad;Takım\nAli;ACE");
    expect(t.headers).toEqual(["Ad", "Takım"]);
    expect(t.rows).toHaveLength(1);
  });

  it("boş metinde boş tablo döner", () => {
    expect(parseTable("").headers).toEqual([]);
  });
});

describe("normalizeHeaderKey / mapColumns", () => {
  it("Türkçe karakter ve ayırıcıları önemsemez", () => {
    expect(normalizeHeaderKey("DOĞUM-TARİHİ")).toBe(normalizeHeaderKey("dogum tarihi"));
  });

  it("eşanlamlıları kanonik alana bağlar, tanınmayanı bildirir", () => {
    const m = mapColumns(["Ad Soyad", "Boy (cm)", "Favori Renk"], {
      full_name: ["ad soyad", "isim"],
      height_cm: ["boy", "boy cm"],
    } as const);
    expect(m.index.full_name).toBe(0);
    expect(m.index.height_cm).toBe(1);
    expect(m.unknown).toEqual(["Favori Renk"]);
  });

  it("aynı alana düşen iki sütunda ilkini kullanır", () => {
    const m = mapColumns(["isim", "ad soyad"], { full_name: ["ad soyad", "isim"] } as const);
    expect(m.index.full_name).toBe(0);
  });
});

describe("parseNumber", () => {
  it("Türkçe ondalık ayırıcıyı kabul eder", () => {
    expect(parseNumber("84,5")).toBe(84.5);
    expect(parseNumber(" 70 ")).toBe(70);
    expect(parseNumber("%70")).toBe(70);
  });

  it("sayı olmayanı ve boşu null döndürür", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
  });
});

describe("parseDate", () => {
  it("ISO ve Türkçe biçimi aynı sonuca çevirir", () => {
    expect(parseDate("2004-04-12")).toBe("2004-04-12");
    expect(parseDate("12.04.2004")).toBe("2004-04-12");
    expect(parseDate("12/04/2004")).toBe("2004-04-12");
    expect(parseDate("1.9.2006")).toBe("2006-09-01");
  });

  it("geçersiz takvim tarihini reddeder", () => {
    expect(parseDate("31.02.2026")).toBeNull();
    expect(parseDate("12.13.2004")).toBeNull();
    expect(parseDate("dün")).toBeNull();
  });
});

describe("toCsv", () => {
  it("ayırıcı ve tırnak içeren hücreyi kaçışlar", () => {
    expect(toCsv([["a;b", 'de "bu"']], ";")).toBe('"a;b";"de ""bu"""');
  });
});
