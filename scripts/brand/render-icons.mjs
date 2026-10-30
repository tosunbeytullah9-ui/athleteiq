// Loadwell ikon/splash/favicon üretimi (Parti 18E).
//
// Kaynak: apps/mobile/assets/brand/*.svg (onaylı "1B · Eksen" tasarımı — elle
// değiştirmeyin). Çıktılar yalnızca aşağıdaki dört yoldur, başka dosyaya dokunulmaz.
//
//   pnpm --filter @athleteiq/web exec node ../../scripts/brand/render-icons.mjs
//   (ya da kökten: node scripts/brand/render-icons.mjs)
//
// sharp, Next.js'in bağımlılığı olarak apps/web'den çözülür.

import { copyFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(join(ROOT, "apps", "web", "package.json"));
const sharp = require("sharp");

const BRAND_COLOR = "#1d4ed8";
const SRC = join(ROOT, "apps", "mobile", "assets", "brand");
const svg = (name) => readFileSync(join(SRC, name));

const OUTPUTS = [
  {
    // App Store ikonu: alfa kanalı OLMAMALI (App Store Connect reddeder).
    out: join(ROOT, "apps", "mobile", "assets", "icon.png"),
    src: "loadwell-icon.svg",
    size: 1024,
    opaque: true,
  },
  {
    // Splash: #1d4ed8 zemin üzerinde ortalanır (app.json), şeffaf kalabilir.
    out: join(ROOT, "apps", "mobile", "assets", "splash-icon.png"),
    src: "loadwell-mark.svg",
    size: 1024,
    opaque: false,
  },
  {
    out: join(ROOT, "apps", "web", "app", "apple-icon.png"),
    src: "loadwell-icon.svg",
    size: 180,
    opaque: true,
  },
];

for (const { out, src, size, opaque } of OUTPUTS) {
  let img = sharp(svg(src), { density: (72 * size) / 1024 * 4 }).resize(size, size);
  if (opaque) img = img.flatten({ background: BRAND_COLOR }).removeAlpha();
  await img.png().toFile(out);
}

// Next.js file-convention favicon — tarayıcı sekmesi maskelemediği için yuvarlatılmış.
const faviconOut = join(ROOT, "apps", "web", "app", "icon.svg");
copyFileSync(join(SRC, "loadwell-favicon.svg"), faviconOut);

for (const { out } of OUTPUTS) {
  const meta = await sharp(out).metadata();
  console.log(
    `${relative(ROOT, out).replaceAll("\\", "/")}: ${meta.width}x${meta.height}, hasAlpha: ${meta.hasAlpha}`
  );
}
console.log(`${relative(ROOT, faviconOut).replaceAll("\\", "/")}: svg (loadwell-favicon.svg kopyası)`);
