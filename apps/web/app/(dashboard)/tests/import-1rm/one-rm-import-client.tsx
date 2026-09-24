"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import { ImportSource } from "@/components/features/import/import-source";
import {
  oneRmImportTemplateCsv,
  parseOneRmImport,
  type ExerciseSource,
  type OneRmImportRow,
} from "@athleteiq/validators/one-rm-import";

interface Props {
  athletes: { id: string; full_name: string; team_id: string | null }[];
  teams: { id: string; name: string }[];
  exercises: { id: string; name: string; source: ExerciseSource }[];
  existingRecords: { athlete_id: string; exercise_name: string; test_date: string }[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OneRmImportClient({ athletes, teams, exercises, existingRecords }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [defaultTestDate, setDefaultTestDate] = useState(today());
  const [isImporting, setIsImporting] = useState(false);
  const [createdCount, setCreatedCount] = useState<number | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  const result = useMemo(
    () =>
      parseOneRmImport(text, {
        athletes,
        teams,
        exercises,
        defaultTestDate: defaultTestDate || today(),
        existingRecords,
      }),
    [text, athletes, teams, exercises, defaultTestDate, existingRecords]
  );

  const canImport =
    !isImporting && result.rows.length > 0 && result.errorCount === 0 && result.validCount > 0;

  async function handleImport() {
    setIsImporting(true);
    setFatal(null);
    try {
      const supabase = createClient();
      // Tek insert — tümü ya yazılır ya hiçbiri. `1rm_insert` RLS politikası
      // (031_1rm_team_scoped_rls.sql) her satıra ayrı uygulanır: koç yalnızca
      // kendi takımındaki sporcuya kayıt ekleyebilir.
      const { error } = await supabase.from("athlete_1rm_records").insert(
        result.rows.map((r) => ({
          athlete_id: r.athlete_id as string,
          exercise_id: r.exercise_id,
          exercise_source: r.exercise_source,
          exercise_name: r.exercise_name,
          weight_kg: r.weight_kg as number,
          test_date: r.test_date as string,
          notes: r.notes,
        }))
      );
      if (error) throw new Error(error.message);

      setCreatedCount(result.rows.length);
      setText("");
      router.refresh();
    } catch (err) {
      setFatal(
        err instanceof Error
          ? `1RM kayıtları eklenemedi: ${err.message}`
          : "1RM kayıtları eklenirken bilinmeyen bir hata oluştu."
      );
    } finally {
      setIsImporting(false);
    }
  }

  if (createdCount !== null) {
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
              <strong>{createdCount}</strong> 1RM kaydı eklendi. Her egzersiz için en güncel
              tarihli kayıt, program oluştururken <strong>%1RM</strong> yüklerinin
              hesaplanmasında kullanılır.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/tests">Test sonuçlarına dön</Link>
              </Button>
              <Button variant="outline" onClick={() => setCreatedCount(null)}>
                Yeni bir liste aktar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      <Card>
        <CardHeader>
          <CardTitle>1. Listeyi yükleyin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImportSource
            templateCsv={oneRmImportTemplateCsv()}
            templateFileName="athleteiq-1rm-sablonu.csv"
            value={text}
            onChange={setText}
            hint={
              <>
                Zorunlu sütunlar: <strong>Sporcu</strong>, <strong>Egzersiz</strong>,{" "}
                <strong>1RM (kg)</strong>. Opsiyonel: Takım (aynı isimli sporcuları ayırt etmek
                için), Tarih, Not. Egzersiz adı <strong>egzersiz kütüphanesinde</strong> bulunmalı —
                serbest metin bir ad %1RM hesaplarında eşleşmez, bu yüzden reddedilir ve yakın
                adlar önerilir.
              </>
            }
          />

          <div className="space-y-1.5 border-t pt-4">
            <Label htmlFor="default-date">Varsayılan test tarihi</Label>
            <Input
              id="default-date"
              type="date"
              value={defaultTestDate}
              onChange={(e) => setDefaultTestDate(e.target.value)}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Dosyadaki &quot;Tarih&quot; sütunu her zaman önceliklidir; bu tarih yalnızca o
              sütunun boş olduğu (veya hiç bulunmadığı) satırlara uygulanır.
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
                Dosyada bulunamayan zorunlu sütun: {result.missingColumns.join(", ")}. Örnek
                şablonu indirip sütun adlarını karşılaştırın.
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
                  <Badge variant="secondary">{result.validCount} kayıt eklenecek</Badge>
                  {result.errorCount > 0 && (
                    <Badge variant="destructive">{result.errorCount} hatalı satır</Badge>
                  )}
                </div>

                {result.errorCount > 0 && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    Hatalı satırlar düzeltilmeden içe aktarma yapılamaz — yarım bir liste
                    yüklenmesin diye tümü birlikte kontrol edilir. Dosyayı düzeltip yeniden
                    yükleyin.
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
          {isImporting ? "Aktarılıyor…" : `${result.validCount} kaydı içe aktar`}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tests">İptal</Link>
        </Button>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <Link
        href="/tests"
        className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Test Sonuçları
      </Link>
      <h1 className="text-2xl font-semibold">1RM Kayıtlarını İçe Aktar</h1>
      <p className="text-sm text-muted-foreground">
        Excel veya CSV&apos;deki maksimal kuvvet ölçümlerini tek seferde yükleyin.
      </p>
    </div>
  );
}

function PreviewTable({ rows }: { rows: OneRmImportRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Satır</th>
            <th className="px-3 py-2">Sporcu</th>
            <th className="px-3 py-2">Egzersiz</th>
            <th className="px-3 py-2">1RM</th>
            <th className="px-3 py-2">Tarih</th>
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
                <td className="px-3 py-2 font-medium">{row.athlete_label || "—"}</td>
                <td className="px-3 py-2">
                  {row.exercise_name || "—"}
                  {row.exercise_source === "org" && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(org)</span>
                  )}
                </td>
                <td className="px-3 py-2">{row.weight_kg != null ? `${row.weight_kg} kg` : "—"}</td>
                <td className="px-3 py-2">{row.test_date ?? "—"}</td>
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
