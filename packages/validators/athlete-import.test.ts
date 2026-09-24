import { describe, expect, it } from "vitest";
import { ATHLETE_USERNAME_RE } from "./athlete";
import {
  athleteImportTemplateCsv,
  parseAthleteImport,
  type AthleteImportContext,
} from "./athlete-import";

const TEAMS = [
  { id: "11111111-1111-1111-1111-111111111111", name: "ACE" },
  { id: "22222222-2222-2222-2222-222222222222", name: "ARTİSTİK CİMNASTİK" },
];

function ctx(overrides: Partial<AthleteImportContext> = {}): AthleteImportContext {
  return { teams: TEAMS, defaultTeamId: null, ...overrides };
}

describe("parseAthleteImport — sütun eşleme", () => {
  it("zorunlu sütun yoksa hiçbir satır işlenmez", () => {
    const r = parseAthleteImport("Takım;Boy\nACE;180", ctx());
    expect(r.missingColumns).toEqual(["Ad Soyad"]);
    expect(r.rows).toHaveLength(0);
  });

  it("boş dosyada fatalError döner", () => {
    expect(parseAthleteImport("   ", ctx()).fatalError).toBeTruthy();
  });

  it("tanınmayan sütunu bildirir ama satırı işlemeye devam eder", () => {
    const r = parseAthleteImport("Ad Soyad;Takım;Forma No\nAli Veli;ACE;7", ctx());
    expect(r.unknownColumns).toEqual(["Forma No"]);
    expect(r.rows[0]!.errors).toEqual([]);
  });

  it("Excel'den yapıştırılan TSV'yi ayırıcı belirtmeden okur", () => {
    const r = parseAthleteImport("Ad Soyad\tTakım\nAli Veli\tACE", ctx());
    expect(r.validCount).toBe(1);
    expect(r.rows[0]!.team_id).toBe(TEAMS[0]!.id);
  });
});

describe("parseAthleteImport — takım çözümleme", () => {
  it("takım adını Türkçe karakter duyarsız eşler", () => {
    const r = parseAthleteImport("Ad Soyad;Takım\nAli Veli;artistik cimnastik", ctx());
    expect(r.rows[0]!.team_id).toBe(TEAMS[1]!.id);
  });

  it("takım sütunu yoksa hedef takıma düşer", () => {
    const r = parseAthleteImport("Ad Soyad\nAli Veli", ctx({ defaultTeamId: TEAMS[0]!.id }));
    expect(r.rows[0]!.team_id).toBe(TEAMS[0]!.id);
    expect(r.rows[0]!.errors).toEqual([]);
  });

  it("takım sütunu da hedef takım da yoksa hata verir", () => {
    const r = parseAthleteImport("Ad Soyad\nAli Veli", ctx());
    expect(r.rows[0]!.errors[0]!).toContain("Takım boş");
    expect(r.errorCount).toBe(1);
  });

  it("bilinmeyen takım adında mevcut takımları listeler", () => {
    const r = parseAthleteImport("Ad Soyad;Takım\nAli Veli;Yok Takım", ctx());
    expect(r.rows[0]!.errors[0]!).toContain("ACE");
  });
});

describe("parseAthleteImport — alan doğrulama", () => {
  it("tarih, cinsiyet ve ondalık kiloyu normalize eder", () => {
    const r = parseAthleteImport(
      "Ad Soyad;Takım;Doğum Tarihi;Cinsiyet;Boy;Kilo\nAli Veli;ACE;12.04.2004;Erkek;182;84,5",
      ctx()
    );
    const row = r.rows[0]!;
    expect(row.birth_date).toBe("2004-04-12");
    expect(row.gender).toBe("male");
    expect(row.weight_kg).toBe(84.5);
    expect(row.errors).toEqual([]);
  });

  it("okunamayan tarih ve cinsiyeti hata olarak işaretler", () => {
    const r = parseAthleteImport(
      "Ad Soyad;Takım;Doğum Tarihi;Cinsiyet\nAli Veli;ACE;dün;robot",
      ctx()
    );
    expect(r.rows[0]!.errors).toHaveLength(2);
    expect(r.validCount).toBe(0);
  });

  it("boş cinsiyet hata değildir", () => {
    const r = parseAthleteImport("Ad Soyad;Takım;Cinsiyet\nAli Veli;ACE;", ctx());
    expect(r.rows[0]!.gender).toBeNull();
    expect(r.rows[0]!.errors).toEqual([]);
  });

  it("alışılmadık boy/kiloyu uyarı yapar, hata değil", () => {
    const r = parseAthleteImport("Ad Soyad;Takım;Boy\nAli Veli;ACE;18", ctx());
    expect(r.rows[0]!.errors).toEqual([]);
    expect(r.rows[0]!.warnings[0]!).toContain("Boy");
  });

  it("çok kısa ismi reddeder", () => {
    const r = parseAthleteImport("Ad Soyad;Takım\nA;ACE", ctx());
    expect(r.rows[0]!.errors[0]!).toContain("Ad Soyad");
  });
});

describe("parseAthleteImport — giriş hesabı", () => {
  it("kullanıcı adı sütunu yoksa hiçbir satır giriş hesabı açmaz", () => {
    const r = parseAthleteImport("Ad Soyad;Takım\nAli Veli;ACE", ctx());
    expect(r.rows[0]!.create_login).toBe(false);
    expect(r.loginCount).toBe(0);
  });

  it("kullanıcı adı doluysa hesap açar ve şifre üretir", () => {
    const r = parseAthleteImport(
      "Ad Soyad;Takım;Kullanıcı Adı\nAli Veli;ACE;ali.veli",
      ctx()
    );
    const row = r.rows[0]!;
    expect(row.create_login).toBe(true);
    expect(row.password_generated).toBe(true);
    expect(row.password!.length).toBeGreaterThanOrEqual(10);
    expect(r.loginCount).toBe(1);
  });

  it("dosyadaki şifreyi olduğu gibi kullanır", () => {
    const r = parseAthleteImport(
      "Ad Soyad;Takım;Kullanıcı Adı;Şifre\nAli Veli;ACE;ali.veli;GizliSifre1",
      ctx()
    );
    expect(r.rows[0]!.password).toBe("GizliSifre1");
    expect(r.rows[0]!.password_generated).toBe(false);
  });

  it("kısa şifreyi reddeder", () => {
    const r = parseAthleteImport(
      "Ad Soyad;Takım;Kullanıcı Adı;Şifre\nAli Veli;ACE;ali.veli;123",
      ctx()
    );
    expect(r.rows[0]!.errors[0]!).toContain("Şifre");
  });

  it("geçersiz kullanıcı adında öneri sunar", () => {
    const r = parseAthleteImport(
      "Ad Soyad;Takım;Kullanıcı Adı\nAli Veli;ACE;Ali Veli!",
      ctx()
    );
    expect(r.rows[0]!.errors[0]!).toContain("Öneri: ali.veli");
  });

  it("zaten alınmış kullanıcı adını önceden yakalar", () => {
    const r = parseAthleteImport(
      "Ad Soyad;Takım;Kullanıcı Adı\nAli Veli;ACE;ali.veli",
      ctx({ existingUsernames: ["Ali.Veli"] })
    );
    expect(r.rows[0]!.errors[0]!).toContain("zaten alınmış");
  });

  it("dosya içinde tekrar eden kullanıcı adını hata yapar", () => {
    const r = parseAthleteImport(
      "Ad Soyad;Takım;Kullanıcı Adı\nAli Veli;ACE;ali.veli\nAli Veli 2;ACE;ali.veli",
      ctx()
    );
    expect(r.rows[1]!.errors[0]!).toContain("tekrar ediyor");
    expect(r.errorCount).toBe(1);
  });

  it("kullanıcı adı olmadan yazılmış şifre uyarı üretir", () => {
    const r = parseAthleteImport(
      "Ad Soyad;Takım;Kullanıcı Adı;Şifre\nAli Veli;ACE;;GizliSifre1",
      ctx()
    );
    expect(r.rows[0]!.create_login).toBe(false);
    expect(r.rows[0]!.warnings[0]!).toContain("kullanıcı adı boş");
  });
});

describe("parseAthleteImport — tekrar tespiti", () => {
  it("mevcut kadroda aynı isim varsa uyarır ama engellemez", () => {
    const r = parseAthleteImport(
      "Ad Soyad;Takım\nALİ VELİ;ACE",
      ctx({ existingAthletes: [{ full_name: "Ali Veli", team_id: TEAMS[0]!.id }] })
    );
    expect(r.rows[0]!.errors).toEqual([]);
    expect(r.rows[0]!.warnings[0]!).toContain("zaten var");
    expect(r.validCount).toBe(1);
  });

  it("farklı takımdaki aynı isim uyarı üretmez", () => {
    const r = parseAthleteImport(
      "Ad Soyad;Takım\nAli Veli;ACE",
      ctx({ existingAthletes: [{ full_name: "Ali Veli", team_id: TEAMS[1]!.id }] })
    );
    expect(r.rows[0]!.warnings).toEqual([]);
  });
});

describe("athleteImportTemplateCsv", () => {
  it("kendi ürettiği şablonu hatasız geri okur", () => {
    const r = parseAthleteImport(athleteImportTemplateCsv(), ctx());
    expect(r.errorCount).toBe(0);
    expect(r.rows).toHaveLength(2);
    expect(r.loginCount).toBe(1);
    expect(ATHLETE_USERNAME_RE.test(r.rows[0]!.username!)).toBe(true);
  });
});
