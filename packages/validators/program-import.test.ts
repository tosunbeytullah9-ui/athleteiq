import { describe, expect, it } from "vitest";
import {
  parseProgramImport,
  programImportTemplateCsv,
  sessionsEqual,
} from "./program-import";

const HEADER = "Hafta;Gün;Seans;Seans Tipi;Egzersiz;Set;Tekrar;Yük;Yük Tipi;RPE;Dinlenme (sn)";

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

describe("parseProgramImport — sütun eşleme", () => {
  it("zorunlu sütun yoksa hiçbir satır işlenmez", () => {
    const r = parseProgramImport("Hafta;Set;Tekrar\n1;1;8");
    expect(r.missingColumns).toEqual(["Gün", "Egzersiz"]);
    expect(r.weeks).toHaveLength(0);
  });

  it("boş dosyada fatalError döner", () => {
    expect(parseProgramImport("").fatalError).toBeTruthy();
  });

  it("tanınmayan sütunu bildirir", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar;Video\n1;Squat;8;http://x");
    expect(r.unknownColumns).toEqual(["Video"]);
    expect(r.errorCount).toBe(0);
  });
});

describe("parseProgramImport — set gruplama", () => {
  it("ardışık aynı egzersiz satırlarını tek egzersizin setlerine toplar", () => {
    const r = parseProgramImport(
      csv(
        "1;1;Alt Vücut;Kuvvet;Back Squat;1;8;60;%1RM;6;120",
        "1;1;Alt Vücut;Kuvvet;Back Squat;2;6;70;%1RM;7;120",
        "1;1;Alt Vücut;Kuvvet;Back Squat;3;4;80;%1RM;8,5;120"
      )
    );
    expect(r.errorCount).toBe(0);
    expect(r.totals).toEqual({ weeks: 1, sessions: 1, exercises: 1, sets: 3 });

    const ex = r.weeks[0]!.sessions[0]!.exercises[0]!;
    expect(ex.name).toBe("Back Squat");
    expect(ex.rest_sec).toBe(120);
    expect(ex.sets.map((s) => s.set_number)).toEqual([1, 2, 3]);
    expect(ex.sets.map((s) => s.percent_1rm)).toEqual([60, 70, 80]);
    expect(ex.sets[2]!.rpe).toBe(8.5);
  });

  it("set no sütunu yoksa sıralı numaralandırır", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar\n1;Squat;8\n1;Squat;8");
    expect(r.weeks[0]!.sessions[0]!.exercises[0]!.sets.map((s) => s.set_number)).toEqual([1, 2]);
  });

  it("tekrar eden set numarasını uyarıyla düzeltir", () => {
    const r = parseProgramImport(csv("1;1;A;Kuvvet;Squat;1;8;60;kg;;", "1;1;A;Kuvvet;Squat;1;8;60;kg;;"));
    expect(r.weeks[0]!.sessions[0]!.exercises[0]!.sets.map((s) => s.set_number)).toEqual([1, 2]);
    expect(r.warnings[0]!).toContain("tekrar ediyor");
  });

  it("aynı isim araya başka egzersiz girdikten sonra ayrı egzersiz olur", () => {
    const r = parseProgramImport(
      "Gün;Egzersiz;Tekrar\n1;Squat;8\n1;Bench;8\n1;Squat;8"
    );
    const names = r.weeks[0]!.sessions[0]!.exercises.map((e) => e.name);
    expect(names).toEqual(["Squat", "Bench", "Squat"]);
  });
});

describe("parseProgramImport — seans ve gün", () => {
  it("gün adlarını sayıya çevirir ve günlere göre sıralar", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar\nCuma;Squat;8\nPzt;Bench;8");
    expect(r.weeks[0]!.sessions.map((s) => s.day_of_week)).toEqual([1, 5]);
    expect(r.weeks[0]!.sessions.map((s) => s.order_index)).toEqual([0, 1]);
  });

  it("aynı günde farklı başlıklar iki ayrı seans olur", () => {
    const r = parseProgramImport(
      "Gün;Seans;Egzersiz;Tekrar\n1;Sabah;Squat;8\n1;Akşam;Bench;8"
    );
    expect(r.weeks[0]!.sessions).toHaveLength(2);
    expect(r.weeks[0]!.sessions.map((s) => s.title)).toEqual(["Sabah", "Akşam"]);
  });

  it("seans başlığı sütunu yoksa günde tek seans olur", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar\n1;Squat;8\n1;Bench;8");
    expect(r.weeks[0]!.sessions).toHaveLength(1);
    expect(r.weeks[0]!.sessions[0]!.exercises).toHaveLength(2);
  });

  it("seans tipini Türkçe etiketten çevirir", () => {
    const r = parseProgramImport("Gün;Seans Tipi;Egzersiz;Tekrar\n1;Toparlanma;Yürüyüş;1");
    expect(r.weeks[0]!.sessions[0]!.session_type).toBe("recovery");
  });

  it("tanınmayan seans tipini hata yapar", () => {
    const r = parseProgramImport("Gün;Seans Tipi;Egzersiz;Tekrar\n1;Uçuş;Squat;8");
    expect(r.rowIssues[0]!.errors[0]!).toContain("Seans tipi");
    expect(r.errorCount).toBe(1);
  });
});

describe("parseProgramImport — yük çözümleme", () => {
  it("yük tipine göre doğru kolona yazar", () => {
    const r = parseProgramImport(
      "Gün;Egzersiz;Tekrar;Yük;Yük Tipi\n" +
        "1;A;8;60;kg\n" +
        "1;B;8;70;%1RM\n" +
        "1;C;8;;Vücut Ağırlığı\n" +
        "1;D;8;Orta;Bant"
    );
    const sets = r.weeks[0]!.sessions[0]!.exercises.map((e) => e.sets[0]!);
    expect(sets[0]!).toMatchObject({ load_kg: 60, percent_1rm: null, is_bodyweight: false });
    expect(sets[1]!).toMatchObject({ percent_1rm: 70, load_kg: null });
    expect(sets[2]!).toMatchObject({ is_bodyweight: true });
    expect(sets[3]!).toMatchObject({ band_resistance: "medium" });
  });

  it("yük tipi yoksa değerin kendisinden çıkarır", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar;Yük\n1;A;8;%70\n1;B;8;60\n1;C;8;BW");
    const sets = r.weeks[0]!.sessions[0]!.exercises.map((e) => e.sets[0]!);
    expect(sets[0]!.percent_1rm).toBe(70);
    expect(sets[1]!.load_kg).toBe(60);
    expect(sets[2]!.is_bodyweight).toBe(true);
  });

  it("yük hiç yazılmamışsa tüm yük kolonları boş kalır", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar\n1;A;8");
    expect(r.weeks[0]!.sessions[0]!.exercises[0]!.sets[0]!).toMatchObject({
      load_kg: null,
      percent_1rm: null,
      is_bodyweight: false,
      band_resistance: null,
    });
  });

  it("sınır dışı yüzde ve tanınmayan tipi reddeder", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar;Yük;Yük Tipi\n1;A;8;120;%1RM\n1;B;8;5;newton");
    expect(r.errorCount).toBe(2);
  });
});

describe("parseProgramImport — tekrar/süre kuralı", () => {
  it("ikisi de boşsa reddeder (exerciseSchema ile aynı kural)", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar\n1;Plank;");
    expect(r.rowIssues[0]!.errors[0]!).toContain("Tekrar veya Süre");
  });

  it("süre bazlı seti duration_sec'e yazar", () => {
    const r = parseProgramImport("Gün;Egzersiz;Süre (sn)\n1;Plank;45");
    expect(r.weeks[0]!.sessions[0]!.exercises[0]!.sets[0]!).toMatchObject({
      reps: null,
      duration_sec: 45,
    });
  });

  it("hem tekrar hem süre varsa tekrarı kullanır ve uyarır", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar;Süre (sn)\n1;Plank;8;45");
    expect(r.weeks[0]!.sessions[0]!.exercises[0]!.sets[0]!).toMatchObject({
      reps: 8,
      duration_sec: null,
    });
    expect(r.rowIssues[0]!.warnings[0]!).toContain("tekrar kullanılacak");
    expect(r.errorCount).toBe(0);
  });

  it("RPE aralığını zorlar", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar;RPE\n1;A;8;12");
    expect(r.rowIssues[0]!.errors[0]!).toContain("RPE");
  });
});

describe("parseProgramImport — haftalar", () => {
  it("hafta sütunu yoksa tek hafta üretir", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar\n1;A;8");
    expect(r.weeks).toHaveLength(1);
    expect(r.weeks[0]!).toMatchObject({ week: 1, source_week: 1 });
  });

  it("birden fazla haftayı ayırır ve sıralar", () => {
    const r = parseProgramImport("Hafta;Gün;Egzersiz;Tekrar\n2;1;B;6\n1;1;A;8");
    expect(r.weeks.map((w) => w.week)).toEqual([1, 2]);
    expect(r.weeks[0]!.sessions[0]!.exercises[0]!.name).toBe("A");
    expect(r.totals.weeks).toBe(2);
  });

  it("atlanmış hafta numaralarını sıkıştırır ve uyarır", () => {
    const r = parseProgramImport("Hafta;Gün;Egzersiz;Tekrar\n1;1;A;8\n5;1;B;8");
    expect(r.weeks.map((w) => w.week)).toEqual([1, 2]);
    expect(r.weeks.map((w) => w.source_week)).toEqual([1, 5]);
    expect(r.warnings[0]!).toContain("ardışık değil");
  });

  it("hatalı satırlar ağaçtan çıkarılır, errorCount sayar", () => {
    const r = parseProgramImport("Gün;Egzersiz;Tekrar\n1;A;8\n99;B;8");
    expect(r.errorCount).toBe(1);
    expect(r.totals.exercises).toBe(1);
  });
});

describe("sessionsEqual", () => {
  it("özdeş haftaları eşit, farklıları farklı sayar", () => {
    const r = parseProgramImport(
      "Hafta;Gün;Egzersiz;Tekrar\n1;1;A;8\n2;1;A;8\n3;1;A;6"
    );
    expect(sessionsEqual(r.weeks[0]!.sessions, r.weeks[1]!.sessions)).toBe(true);
    expect(sessionsEqual(r.weeks[0]!.sessions, r.weeks[2]!.sessions)).toBe(false);
  });
});

describe("programImportTemplateCsv", () => {
  it("kendi ürettiği şablonu hatasız geri okur", () => {
    const r = parseProgramImport(programImportTemplateCsv());
    expect(r.errorCount).toBe(0);
    expect(r.fatalError).toBeNull();
    expect(r.totals).toEqual({ weeks: 2, sessions: 4, exercises: 5, sets: 7 });
  });
});
