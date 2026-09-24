"use client";

import { useRef, useState } from "react";
import { Download, FileUp, Trash2 } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Label } from "@athleteiq/ui/components/label";

interface Props {
  /** İndirilebilir örnek dosyanın içeriği (parser'ın kendi şablon üreticisinden). */
  templateCsv: string;
  templateFileName: string;
  value: string;
  onChange: (text: string) => void;
  /** Yapıştırma alanının altındaki kısa biçim açıklaması. */
  hint: React.ReactNode;
}

/**
 * Sporcu ve program içe aktarma sayfalarının ortak kaynak girişi: dosya seç,
 * Excel'den yapıştır, şablon indir. Ayrıştırma BURADA YAPILMAZ — bileşen
 * yalnızca ham metni yukarı verir, her sayfa kendi parser'ını çağırır.
 */
export function ImportSource({
  templateCsv,
  templateFileName,
  value,
  onChange,
  hint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  function downloadTemplate() {
    // BOM olmadan Excel, UTF-8 Türkçe karakterleri bozuk gösterir.
    const blob = new Blob(["﻿" + templateCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setReadError(null);
    try {
      const buffer = await file.arrayBuffer();
      let text: string;
      try {
        // Önce UTF-8 (fatal) — başarısızsa dosya büyük olasılıkla Türkçe
        // Windows Excel'in ürettiği windows-1254'tür, o kod sayfasıyla çözülür.
        text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      } catch {
        text = new TextDecoder("windows-1254").decode(buffer);
      }
      setFileName(file.name);
      onChange(text);
    } catch {
      setReadError("Dosya okunamadı.");
    }
  }

  function clear() {
    setFileName(null);
    setReadError(null);
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <FileUp className="mr-2 h-4 w-4" />
          Dosya Seç (CSV / TSV)
        </Button>
        <Button type="button" variant="ghost" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Örnek şablonu indir
        </Button>
        {value !== "" && (
          <Button type="button" variant="ghost" onClick={clear}>
            <Trash2 className="mr-2 h-4 w-4" />
            Temizle
          </Button>
        )}
        {fileName && (
          <span className="text-sm text-muted-foreground">Seçilen dosya: {fileName}</span>
        )}
      </div>

      {readError && <p className="text-sm text-destructive">{readError}</p>}

      <div className="space-y-1.5">
        <Label htmlFor="import-paste">…veya Excel&apos;den kopyalayıp buraya yapıştırın</Label>
        <textarea
          id="import-paste"
          value={value}
          onChange={(e) => {
            setFileName(null);
            onChange(e.target.value);
          }}
          rows={8}
          spellCheck={false}
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="İlk satır başlık satırı olmalı. Excel'de hücreleri seçip Ctrl+C, sonra buraya Ctrl+V."
        />
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}
