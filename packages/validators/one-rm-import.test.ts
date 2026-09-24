import { describe, expect, it } from "vitest";
import {
  oneRmImportTemplateCsv,
  parseOneRmImport,
  type OneRmImportContext,
} from "./one-rm-import";

const TEAM_ACE = "11111111-1111-1111-1111-111111111111";
const TEAM_GYM = "22222222-2222-2222-2222-222222222222";

const TEAMS = [
  { id: TEAM_ACE, name: "ACE" },
  { id: TEAM_GYM, name: "ARTİSTİK CİMNASTİK" },
];

const ATHLETES = [
  { id: "a1", full_name: "Ahmet Yılmaz", team_id: TEAM_ACE },
  { id: "a2", full_name: "Elif Demir", team_id: TEAM_ACE },
  { id: "a3", full_name: "Ahmet Yılmaz", team_id: TEAM_GYM },
];

const EXERCISES = [
  { id: "e1", name: "Back Squat", source: "platform" as const },
  { id: "e2", name: "Bench Press", source: "platform" as const },
  { id: "e3", name: "Deadlift", source: "platform" as const },
];

function ctx(overrides: Partial<OneRmImportContext> = {}): OneRmImportContext {
  return {
    athletes: ATHLETES,
    teams: TEAMS,
    exercises: EXERCISES,
    defaultTestDate: "2026-09-24",
    ...overrides,
  };
}

const HEADER = "Sporcu;Takım;Egzersiz;1RM (kg);Tarih";

describe("parseOneRmImport — sütun eşleme", () => {
  it("zorunlu sütun yoksa hiçbir satır işlenmez", () => {
    const r = parseOneRmImport("Sporcu;Tarih\nAhmet Yılmaz;2026-01-01", ctx());
    expect(r.missingColumns).toEqual(["Egzersiz", "1RM (kg)"]);
    expect(r.rows).toHaveLength(0);
  });

  it("boş dosyada fatalError döner", () => {
    expect(parseOneRmImport("   ", ctx()).fatalError).toBeTruthy();
  });

  it("tanınmayan sütunu bildirir", () => {
    const r = parseOneRmImport("Sporcu;Egzersiz;kg;Video\nElif Demir;Deadlift;100;x", ctx());
    expect(r.unknownColumns).toEqual(["Video"]);
    expect(r.errorCount).toBe(0);
  });

  it("Excel'den yapıştırılan TSV'yi okur", () => {
    const r = parseOneRmImport("Sporcu\tEgzersiz\tkg\nElif Demir\tDeadlift\t100", ctx());
    expect(r.validCount).toBe(1);
    expect(r.rows[0]!.athlete_id).toBe("a2");
  });
});

describe("parseOneRmImport — sporcu çözümleme", () => {
  it("ismi Türkçe karakter duyarsız eşler", () => {
    const r = parseOneRmImport("Sporcu;Egzersiz;kg\nELİF DEMİR;Deadlift;100", ctx());
    expect(r.rows[0]!.athlete_id).toBe("a2");
    expect(r.rows[0]!.athlete_label).toBe("Elif Demir");
    expect(r.rows[0]!.errors).toEqual([]);
  });

  it("aynı isimli iki sporcu varsa takım sütunu ister", () => {
    const r = parseOneRmImport("Sporcu;Egzersiz;kg\nAhmet Yılmaz;Deadlift;100", ctx());
    expect(r.rows[0]!.errors[0]!).toContain("Takım");
    expect(r.errorCount).toBe(1);
  });

  it("takım sütunu belirsizliği çözer", () => {
    const r = parseOneRmImport(`${HEADER}\nAhmet Yılmaz;ACE;Deadlift;100;`, ctx());
    expect(r.rows[0]!.athlete_id).toBe("a1");
    expect(r.rows[0]!.errors).toEqual([]);
  });

  it("bilinmeyen takımı reddeder", () => {
    const r = parseOneRmImport(`${HEADER}\nAhmet Yılmaz;Yok;Deadlift;100;`, ctx());
    expect(r.rows[0]!.errors[0]!).toContain("adında bir takım yok");
  });

  it("bulunamayan sporcu için yakın isim önerir", () => {
    const r = parseOneRmImport("Sporcu;Egzersiz;kg\nElif Demirr;Deadlift;100", ctx());
    expect(r.rows[0]!.errors[0]!).toContain("Elif Demir");
  });

  it("boş sporcu adını reddeder", () => {
    const r = parseOneRmImport("Sporcu;Egzersiz;kg\n;Deadlift;100", ctx());
    expect(r.rows[0]!.errors[0]!).toContain("Sporcu adı boş");
  });
});

describe("parseOneRmImport — egzersiz çözümleme", () => {
  it("katalog adını normalize ederek eşler ve KANONİK adı kullanır", () => {
    const r = parseOneRmImport("Sporcu;Egzersiz;kg\nElif Demir;  back   SQUAT ;100", ctx());
    expect(r.rows[0]!.exercise_id).toBe("e1");
    expect(r.rows[0]!.exercise_name).toBe("Back Squat");
    expect(r.rows[0]!.exercise_source).toBe("platform");
  });

  it("katalogda olmayan egzersizi reddeder ve öneri sunar", () => {
    const r = parseOneRmImport("Sporcu;Egzersiz;kg\nElif Demir;Bak Squat;100", ctx());
    expect(r.rows[0]!.errors[0]!).toContain("kütüphanesinde yok");
    expect(r.rows[0]!.errors[0]!).toContain("Back Squat");
    expect(r.errorCount).toBe(1);
  });

  it("aynı ad hem org hem platformdaysa org kazanır", () => {
    const r = parseOneRmImport(
      "Sporcu;Egzersiz;kg\nElif Demir;Back Squat;100",
      ctx({
        exercises: [...EXERCISES, { id: "o1", name: "Back Squat", source: "org" as const }],
      })
    );
    expect(r.rows[0]!.exercise_id).toBe("o1");
    expect(r.rows[0]!.exercise_source).toBe("org");
  });
});

describe("parseOneRmImport — değer ve tarih", () => {
  it("Türkçe ondalık ayırıcıyı okur", () => {
    const r = parseOneRmImport("Sporcu;Egzersiz;kg\nElif Demir;Deadlift;142,5", ctx());
    expect(r.rows[0]!.weight_kg).toBe(142.5);
  });

  it("boş, sayı olmayan ve negatif değeri reddeder", () => {
    const r = parseOneRmImport(
      "Sporcu;Egzersiz;kg\nElif Demir;Deadlift;\nElif Demir;Deadlift;abc\nElif Demir;Deadlift;-5",
      ctx()
    );
    expect(r.errorCount).toBe(3);
  });

  it("çok yüksek değeri uyarı yapar, hata değil", () => {
    const r = parseOneRmImport("Sporcu;Egzersiz;kg\nElif Demir;Deadlift;900", ctx());
    expect(r.rows[0]!.errors).toEqual([]);
    expect(r.rows[0]!.warnings[0]!).toContain("alışılmadık");
  });

  it("tarih sütunu yoksa varsayılan tarihe düşer", () => {
    const r = parseOneRmImport("Sporcu;Egzersiz;kg\nElif Demir;Deadlift;100", ctx());
    expect(r.rows[0]!.test_date).toBe("2026-09-24");
  });

  it("boş tarih hücresi de varsayılana düşer", () => {
    const r = parseOneRmImport(`${HEADER}\nElif Demir;ACE;Deadlift;100;`, ctx());
    expect(r.rows[0]!.test_date).toBe("2026-09-24");
  });

  it("Türkçe tarih biçimini çevirir, geçersizi reddeder", () => {
    const r = parseOneRmImport(
      `${HEADER}\nElif Demir;ACE;Deadlift;100;12.04.2026\nElif Demir;ACE;Deadlift;100;dün`,
      ctx()
    );
    expect(r.rows[0]!.test_date).toBe("2026-04-12");
    expect(r.rows[1]!.errors[0]!).toContain("Tarih okunamadı");
  });

  it("gelecek tarihi uyarı yapar", () => {
    const r = parseOneRmImport(`${HEADER}\nElif Demir;ACE;Deadlift;100;2027-01-01`, ctx());
    expect(r.rows[0]!.errors).toEqual([]);
    expect(r.rows[0]!.warnings[0]!).toContain("gelecekte");
  });
});

describe("parseOneRmImport — tekrar ve eskimiş kayıt uyarıları", () => {
  it("aynı tarihli mevcut kaydı uyarır", () => {
    const r = parseOneRmImport(
      `${HEADER}\nElif Demir;ACE;Deadlift;100;12.04.2026`,
      ctx({
        existingRecords: [
          { athlete_id: "a2", exercise_name: "Deadlift", test_date: "2026-04-12" },
        ],
      })
    );
    expect(r.rows[0]!.errors).toEqual([]);
    expect(r.rows[0]!.warnings[0]!).toContain("zaten var");
  });

  it("daha güncel kayıt varsa %1RM'e yansımayacağını söyler", () => {
    const r = parseOneRmImport(
      `${HEADER}\nElif Demir;ACE;Deadlift;100;01.01.2026`,
      ctx({
        existingRecords: [
          { athlete_id: "a2", exercise_name: "deadlift", test_date: "2026-06-01" },
        ],
      })
    );
    expect(r.rows[0]!.warnings[0]!).toContain("2026-06-01");
    expect(r.validCount).toBe(1);
  });

  it("daha eski mevcut kayıt uyarı üretmez", () => {
    const r = parseOneRmImport(
      `${HEADER}\nElif Demir;ACE;Deadlift;100;01.09.2026`,
      ctx({
        existingRecords: [
          { athlete_id: "a2", exercise_name: "Deadlift", test_date: "2026-01-01" },
        ],
      })
    );
    expect(r.rows[0]!.warnings).toEqual([]);
  });

  it("dosya içindeki tekrarı uyarır", () => {
    const r = parseOneRmImport(
      `${HEADER}\nElif Demir;ACE;Deadlift;100;01.09.2026\nElif Demir;ACE;Deadlift;105;01.09.2026`,
      ctx()
    );
    expect(r.rows[1]!.warnings[0]!).toContain("tekrar ediyor");
    expect(r.errorCount).toBe(0);
  });
});

describe("oneRmImportTemplateCsv", () => {
  it("kendi ürettiği şablonu hatasız geri okur", () => {
    const r = parseOneRmImport(
      oneRmImportTemplateCsv(),
      ctx({ athletes: [...ATHLETES, { id: "a4", full_name: "Elif Demir", team_id: TEAM_GYM }] })
    );
    expect(r.errorCount).toBe(0);
    expect(r.rows).toHaveLength(3);
    expect(r.rows.map((x) => x.athlete_id)).toEqual(["a1", "a1", "a2"]);
  });
});
