"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, KeyRound, XCircle } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import { ImportSource } from "@/components/features/import/import-source";
import {
  athleteImportTemplateCsv,
  parseAthleteImport,
  type AthleteImportRow,
} from "@athleteiq/validators/athlete-import";
import { toCsv } from "@athleteiq/validators/csv";

interface Props {
  orgId: string;
  teams: { id: string; name: string }[];
  existingAthletes: { full_name: string; team_id: string | null }[];
  existingUsernames: string[];
}

const GENDER_LABELS: Record<string, string> = {
  male: "Erkek",
  female: "Kadın",
  other: "Diğer",
};

interface ImportOutcome {
  createdRoster: number;
  createdWithLogin: number;
  /** Giriş hesabı açılan satırların tek seferlik kimlik bilgileri. */
  credentials: { full_name: string; username: string; password: string }[];
  failures: { line: number; full_name: string; message: string }[];
}

export function AthleteImportClient({
  orgId,
  teams,
  existingAthletes,
  existingUsernames,
}: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [defaultTeamId, setDefaultTeamId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  const result = useMemo(
    () =>
      parseAthleteImport(text, {
        teams,
        defaultTeamId: defaultTeamId || null,
        existingAthletes,
        existingUsernames,
      }),
    [text, teams, defaultTeamId, existingAthletes, existingUsernames]
  );

  const canImport =
    !isImporting && result.rows.length > 0 && result.errorCount === 0 && result.validCount > 0;

  async function handleImport() {
    setIsImporting(true);
    setFatal(null);

    const rosterRows = result.rows.filter((r) => !r.create_login);
    const loginRows = result.rows.filter((r) => r.create_login);
    const failures: ImportOutcome["failures"] = [];
    const credentials: ImportOutcome["credentials"] = [];
    let createdRoster = 0;
    let createdWithLogin = 0;

    setProgress({ done: 0, total: (rosterRows.length > 0 ? 1 : 0) + loginRows.length });

    try {
      const supabase = createClient();

      // 1) Kadro-only satırlar: tek bir insert — tümü ya yazılır ya hiçbiri.
      // athletes_insert RLS politikası her satıra ayrı ayrı uygulanır, yani
      // koç kendi takımı dışına satır ekleyemez (elle formla aynı kısıt).
      if (rosterRows.length > 0) {
        const { error } = await supabase.from("athletes").insert(
          rosterRows.map((r) => ({
            org_id: orgId,
            team_id: r.team_id,
            full_name: r.full_name,
            birth_date: r.birth_date,
            gender: r.gender,
            height_cm: r.height_cm,
            weight_kg: r.weight_kg,
            position: r.position,
            training_group: r.training_group,
            notes: r.notes,
          }))
        );
        if (error) throw new Error(error.message);
        createdRoster = rosterRows.length;
        setProgress({ done: 1, total: (rosterRows.length > 0 ? 1 : 0) + loginRows.length });
      }

      // 2) Giriş hesabı istenen satırlar: her biri create-athlete-account Edge
      // Function'ına gider (athletes satırı + auth kullanıcısı + profiles'ı tek
      // rollback zincirinde oluşturan tek yol). Biri başarısız olursa diğerleri
      // denenmeye devam eder; sonuç ekranı hangilerinin düştüğünü satır
      // numarasıyla söyler.
      for (const [i, row] of loginRows.entries()) {
        try {
          const res = await fetch("/api/athletes/create-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: row.username,
              password: row.password,
              full_name: row.full_name,
              org_id: orgId,
              team_id: row.team_id,
              birth_date: row.birth_date,
              gender: row.gender,
              height_cm: row.height_cm,
              weight_kg: row.weight_kg,
              position: row.position,
              training_group: row.training_group,
              notes: row.notes,
            }),
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            failures.push({
              line: row.line,
              full_name: row.full_name,
              message: payload.error ?? `Hesap oluşturulamadı (HTTP ${res.status})`,
            });
          } else {
            createdWithLogin++;
            credentials.push({
              full_name: row.full_name,
              username: row.username!,
              password: row.password!,
            });
          }
        } catch (err) {
          failures.push({
            line: row.line,
            full_name: row.full_name,
            message: err instanceof Error ? err.message : "Bilinmeyen hata",
          });
        }
        setProgress({
          done: (rosterRows.length > 0 ? 1 : 0) + i + 1,
          total: (rosterRows.length > 0 ? 1 : 0) + loginRows.length,
        });
      }

      setOutcome({ createdRoster, createdWithLogin, credentials, failures });
      router.refresh();
    } catch (err) {
      setFatal(
        err instanceof Error
          ? `Sporcular kaydedilemedi: ${err.message}`
          : "Sporcular kaydedilirken bilinmeyen bir hata oluştu."
      );
    } finally {
      setIsImporting(false);
      setProgress(null);
    }
  }

  function downloadCredentials(credentials: ImportOutcome["credentials"]) {
    const csv = toCsv(
      [["Ad Soyad", "Kullanıcı Adı", "Şifre"], ...credentials.map((c) => [c.full_name, c.username, c.password])],
      ";"
    );
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "athleteiq-giris-bilgileri.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Sonuç ekranı --------------------------------------------------------
  if (outcome) {
    return (
      <div className="space-y-6">
        <PageHeader />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              İçe aktarma tamamlandı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              <strong>{outcome.createdRoster + outcome.createdWithLogin}</strong> sporcu eklendi
              {outcome.createdWithLogin > 0 && (
                <> — bunlardan <strong>{outcome.createdWithLogin}</strong> tanesine giriş erişimi verildi</>
              )}
              .
            </p>

            {outcome.failures.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="mb-2 text-sm font-medium text-destructive">
                  {outcome.failures.length} satır eklenemedi:
                </p>
                <ul className="space-y-1 text-sm">
                  {outcome.failures.map((f) => (
                    <li key={f.line}>
                      Satır {f.line} — {f.full_name}: {f.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {outcome.credentials.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="h-4 w-4" />
                    Giriş bilgileri — bu liste bir daha gösterilmeyecek
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => downloadCredentials(outcome.credentials)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV indir
                  </Button>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Şifreler veritabanında geri okunamaz. Sporcular giriş yaparken kullanıcı adının
                  sonuna organizasyon kısaltmasını ekler (örn. <code>ali.veli@tgf</code>).
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="pb-2 pr-4">Ad Soyad</th>
                        <th className="pb-2 pr-4">Kullanıcı Adı</th>
                        <th className="pb-2">Şifre</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {outcome.credentials.map((c) => (
                        <tr key={c.username} className="border-t">
                          <td className="py-1.5 pr-4 font-sans">{c.full_name}</td>
                          <td className="py-1.5 pr-4">{c.username}</td>
                          <td className="py-1.5">{c.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button asChild>
                <Link href="/athletes">Sporcu listesine dön</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setOutcome(null);
                  setText("");
                }}
              >
                Yeni bir liste aktar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Giriş / önizleme ekranı ---------------------------------------------
  return (
    <div className="space-y-6">
      <PageHeader />

      <Card>
        <CardHeader>
          <CardTitle>1. Listeyi yükleyin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImportSource
            templateCsv={athleteImportTemplateCsv()}
            templateFileName="athleteiq-sporcu-sablonu.csv"
            value={text}
            onChange={setText}
            hint={
              <>
                Zorunlu sütun: <strong>Ad Soyad</strong>. Opsiyonel: Takım, Doğum Tarihi, Cinsiyet,
                Boy, Kilo, Mevki, Antrenman Grubu, Notlar, Kullanıcı Adı, Şifre. Sütun adları
                Türkçe/İngilizce ve büyük-küçük harf farkı gözetmeden tanınır.{" "}
                <strong>Kullanıcı Adı</strong> sütunu dolu olan satırlar için giriş hesabı da
                açılır; şifre boş bırakılırsa otomatik üretilir.
              </>
            }
          />

          <div className="space-y-1.5 border-t pt-4">
            <Label htmlFor="default-team">Hedef takım (dosyada &quot;Takım&quot; sütunu yoksa)</Label>
            <select
              id="default-team"
              value={defaultTeamId}
              onChange={(e) => setDefaultTeamId(e.target.value)}
              className="flex h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Seçilmedi</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Dosyadaki &quot;Takım&quot; sütunu her zaman önceliklidir; bu seçim yalnızca o sütunun
              boş olduğu satırlara uygulanır.
            </p>
          </div>
        </CardContent>
      </Card>

      {text.trim() !== "" && (
        <Card>
          <CardHeader>
            <CardTitle>2. Önizleme ve kontrol</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.fatalError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {result.fatalError}
              </p>
            )}

            {result.missingColumns.length > 0 && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Dosyada bulunamayan zorunlu sütun: {result.missingColumns.join(", ")}. Sütun
                başlığını ekleyip tekrar deneyin veya örnek şablonu indirin.
              </p>
            )}

            {result.unknownColumns.length > 0 && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Tanınmayan sütunlar yok sayılacak: {result.unknownColumns.join(", ")}
              </p>
            )}

            {result.rows.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{result.rows.length} satır okundu</Badge>
                  <Badge variant="secondary">{result.validCount} sporcu eklenecek</Badge>
                  {result.loginCount > 0 && (
                    <Badge variant="secondary">{result.loginCount} giriş hesabı açılacak</Badge>
                  )}
                  {result.errorCount > 0 && (
                    <Badge variant="destructive">{result.errorCount} hatalı satır</Badge>
                  )}
                </div>

                {result.errorCount > 0 && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    Hatalı satırlar düzeltilmeden içe aktarma yapılamaz — yarım bir kadro
                    yüklenmesin diye tümü birlikte kontrol edilir. Dosyayı düzeltip yeniden yükleyin.
                  </p>
                )}

                <PreviewTable rows={result.rows} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {fatal && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{fatal}</p>
      )}

      <div className="flex items-center gap-4">
        <Button onClick={handleImport} disabled={!canImport}>
          {isImporting
            ? progress
              ? `Aktarılıyor… (${progress.done}/${progress.total})`
              : "Aktarılıyor…"
            : `${result.validCount} sporcuyu içe aktar`}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/athletes">İptal</Link>
        </Button>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <Link
        href="/athletes"
        className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Sporcular
      </Link>
      <h1 className="text-2xl font-semibold">Sporcu Listesi İçe Aktar</h1>
      <p className="text-sm text-muted-foreground">
        Excel veya CSV&apos;deki sporcu listesini tek seferde kadroya ekleyin.
      </p>
    </div>
  );
}

function PreviewTable({ rows }: { rows: AthleteImportRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Satır</th>
            <th className="px-3 py-2">Ad Soyad</th>
            <th className="px-3 py-2">Takım</th>
            <th className="px-3 py-2">Doğum</th>
            <th className="px-3 py-2">Cinsiyet</th>
            <th className="px-3 py-2">Mevki</th>
            <th className="px-3 py-2">Grup</th>
            <th className="px-3 py-2">Giriş</th>
            <th className="px-3 py-2">Durum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hasError = row.errors.length > 0;
            return (
              <tr
                key={row.line}
                className={
                  hasError
                    ? "border-t bg-destructive/5"
                    : row.warnings.length > 0
                      ? "border-t bg-amber-500/5"
                      : "border-t"
                }
              >
                <td className="px-3 py-2 text-muted-foreground">{row.line}</td>
                <td className="px-3 py-2 font-medium">{row.full_name || "—"}</td>
                <td className="px-3 py-2">{row.team_label || "—"}</td>
                <td className="px-3 py-2">{row.birth_date ?? "—"}</td>
                <td className="px-3 py-2">{row.gender ? GENDER_LABELS[row.gender] : "—"}</td>
                <td className="px-3 py-2">{row.position ?? "—"}</td>
                <td className="px-3 py-2">{row.training_group ?? "—"}</td>
                <td className="px-3 py-2">
                  {row.create_login ? (
                    <span className="font-mono text-xs">{row.username}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {hasError ? (
                    <ul className="space-y-0.5 text-xs text-destructive">
                      {row.errors.map((e) => (
                        <li key={e} className="flex gap-1">
                          <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  ) : row.warnings.length > 0 ? (
                    <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-500">
                      {row.warnings.map((w) => (
                        <li key={w} className="flex gap-1">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
