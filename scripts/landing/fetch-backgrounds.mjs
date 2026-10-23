#!/usr/bin/env node
// Bölüm arka plan fotoğraflarını indirir/dönüştürür → apps/web/public/landing/bg/*.webp
// (1920 px genişlik, webp). Kaynaklar backgrounds.json'da: Unsplash fotoğraf
// sayfası adresi (https://unsplash.com/photos/<slug-veya-id>) ya da yerel dosya yolu.
// Unsplash lisansı ticari kullanıma izin verir; fotoğrafçılar bg/CREDITS.md'ye yazılır.
//
//   pnpm landing:backgrounds

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "apps/web/public/landing/bg");
const config = JSON.parse(readFileSync(path.join(here, "backgrounds.json"), "utf8"));
mkdirSync(outDir, { recursive: true });

const credits = ["# Arka plan fotoğrafları", "", "| Dosya | Kaynak | Fotoğrafçı |", "|---|---|---|"];
for (const [slot, entry] of Object.entries(config.slots)) {
  if (!entry.source) {
    console.log(`  – ${slot}: kaynak boş, atlandı (${entry.hint})`);
    continue;
  }
  const tmp = path.join(outDir, `.${slot}.src`);
  if (/^https?:\/\//.test(entry.source)) {
    const id = entry.source.replace(/\/$/, "").split("/").pop().split("-").pop();
    const url = `https://unsplash.com/photos/${id}/download?force=true&w=2400`;
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`${slot}: indirilemedi (${res.status}) ${url}`);
    writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  } else {
    const src = path.resolve(root, entry.source);
    if (!existsSync(src)) throw new Error(`${slot}: dosya yok ${src}`);
    execFileSync("cp", [src, tmp]);
  }
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", tmp, "-vf", "scale='min(1920,iw)':-2", "-quality", "72", path.join(outDir, `${slot}.webp`)]);
  rmSync(tmp);
  credits.push(`| ${slot}.webp | ${entry.source} | ${entry.credit ?? "—"} |`);
  console.log(`  ✓ bg/${slot}.webp`);
}
writeFileSync(path.join(outDir, "CREDITS.md"), credits.join("\n") + "\n");
