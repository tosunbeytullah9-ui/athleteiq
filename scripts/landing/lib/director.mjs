// Landing kayıtları için ortak "yönetmen": görünür imleç, insan gibi fare
// hareketi ve yazma, ekran görüntüsü/video dönüştürme. record-replicas.mjs
// (replika sahneler) ve capture.mjs (gerçek uygulama) birlikte kullanır.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../..");
export const OUT_DIR = path.join(REPO_ROOT, "apps/web/public/landing");

/** Sayfaya enjekte edilen imleç: macOS tarzı ok + tıklamada halka. */
const CURSOR_SCRIPT = `
(() => {
  if (window.__aiqCursor) return;
  window.__aiqCursor = true;
  const install = () => {
    const k = Number(new URL(location.href).searchParams.get('scale')) || 1;
    const c = document.createElement('div');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:none;will-change:transform';
    c.innerHTML = '<svg width="' + 22 * k + '" height="' + 22 * k + '" viewBox="0 0 24 24" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))"><path d="M4 2.5 L4 19.5 L8.6 15.3 L11.6 21.6 L14.4 20.3 L11.4 14.1 L17.6 14.1 Z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    const ring = document.createElement('div');
    ring.style.cssText = 'position:fixed;left:0;top:0;width:' + 34 * k + 'px;height:' + 34 * k + 'px;margin:-' + 17 * k + 'px 0 0 -' + 17 * k + 'px;border-radius:999px;border:2px solid hsl(221 83% 53%);background:hsl(221 83% 53% / .15);z-index:2147483646;pointer-events:none;opacity:0;transform:scale(.4)';
    document.documentElement.append(ring, c);
    let x = -100, y = -100;
    addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; c.style.transform = 'translate(' + (x - 4 * k) + 'px,' + (y - 2 * k) + 'px)'; }, true);
    addEventListener('mousedown', () => {
      ring.style.left = x + 'px'; ring.style.top = y + 'px';
      ring.animate([{ opacity: .9, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1.25)' }], { duration: 480, easing: 'ease-out' });
      c.animate([{ transform: c.style.transform + ' scale(1)' }, { transform: c.style.transform + ' scale(.86)' }, { transform: c.style.transform + ' scale(1)' }], { duration: 180 });
    }, true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install); else install();
})();
`;

// Tekrarlanabilir "rastgelelik" — aynı script iki kez aynı videoyu üretsin.
let seed = 7;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  return chromium.launch({ executablePath });
}

/**
 * Kayıt bağlamı. Ekran kaydı deviceScaleFactor'ı yok saydığı için video,
 * viewport çözünürlüğünde alınır. Sabit boyutlu (telefon) sahneler için
 * `scale` ile sahne ?scale=N parametresiyle N kat büyütülmüş render edilir;
 * viewport ve video da N katıdır, imleç de aynı oranda büyür.
 */
export async function openStage(browser, { width, height, scale = 1, video = false, dpr = 2 }) {
  const viewport = { width: width * scale, height: height * scale };
  const tmpVideo = path.join(OUT_DIR, ".tmp-video");
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: video ? 1 : dpr,
    colorScheme: "light",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    reducedMotion: "no-preference",
    ...(video ? { recordVideo: { dir: tmpVideo, size: viewport } } : {}),
  });
  await context.addInitScript(CURSOR_SCRIPT);
  const page = await context.newPage();
  const startedAt = Date.now();
  const stage = new Stage(page);
  return { context, page, stage, startedAt, tmpVideo, scale };
}

export class Stage {
  constructor(page) {
    this.page = page;
    this.x = page.viewportSize().width * 0.62;
    this.y = page.viewportSize().height * 0.72;
  }

  pause(ms) {
    return sleep(ms);
  }

  /** Hafif kavisli, yavaşlayarak duran fare hareketi. */
  async moveTo(x, y, duration = 650) {
    const sx = this.x;
    const sy = this.y;
    const steps = Math.max(12, Math.round(duration / 16));
    const bend = (rand() - 0.5) * 0.25;
    const cx = (sx + x) / 2 + (y - sy) * bend;
    const cy = (sy + y) / 2 - (x - sx) * bend;
    for (let i = 1; i <= steps; i++) {
      const t0 = i / steps;
      const t = t0 < 0.5 ? 4 * t0 * t0 * t0 : 1 - Math.pow(-2 * t0 + 2, 3) / 2;
      const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * x;
      const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * y;
      await this.page.mouse.move(px, py);
      await sleep(duration / steps);
    }
    this.x = x;
    this.y = y;
  }

  async point(selector, { offsetX = 0.5, offsetY = 0.5 } = {}) {
    const el = this.page.locator(selector).first();
    await el.waitFor({ state: "visible", timeout: 15000 });
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    if (!box) throw new Error(`Görünmeyen hedef: ${selector}`);
    const jitter = () => (rand() - 0.5) * 0.18;
    return {
      x: box.x + box.width * Math.min(0.9, Math.max(0.1, offsetX + jitter())),
      y: box.y + box.height * Math.min(0.85, Math.max(0.15, offsetY + jitter())),
    };
  }

  async hover(selector, duration) {
    const p = await this.point(selector);
    await this.moveTo(p.x, p.y, duration);
  }

  async click(selector, { duration = 700, hold = 90, after = 450, ...opts } = {}) {
    const p = await this.point(selector, opts);
    await this.moveTo(p.x, p.y, duration);
    await sleep(140 + rand() * 120);
    await this.page.mouse.down();
    await sleep(hold);
    await this.page.mouse.up();
    await sleep(after);
  }

  /** İnsan hızında yazma (60–110 ms/karakter, kelime aralarında kısa duraksama). */
  async type(text) {
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      await sleep(ch === " " ? 120 + rand() * 90 : 60 + rand() * 50);
    }
  }

  async clearAndType(selector, text, clickOpts) {
    await this.click(selector, { after: 200, ...clickOpts });
    await this.page.keyboard.press("ControlOrMeta+A");
    await sleep(80);
    await this.type(text);
  }
}

/** PNG ekran görüntüsünü webp'ye çevirip public/landing/shots altına yazar. */
export async function screenshot(page, name, { maxWidth = 2880 } = {}) {
  const dir = path.join(OUT_DIR, "shots");
  mkdirSync(dir, { recursive: true });
  const png = path.join(dir, `${name}.png`);
  await page.screenshot({ path: png });
  ffmpeg(["-i", png, "-vf", `scale='min(${maxWidth},iw)':-2`, "-quality", "82", "-compression_level", "6", path.join(dir, `${name}.webp`)]);
  rmSync(png);
  console.log(`  ✓ shots/${name}.webp`);
}

/**
 * Bağlamı kapatır, kaydı baştan `trimStart` saniye kırpar, mp4 (H.264) + webm
 * (VP9) + poster üretir.
 */
export async function finishVideo({ context, page, tmpVideo }, name, { trimStart = 0, width } = {}) {
  const raw = await page.video()?.path();
  await context.close();
  if (!raw) throw new Error("Video kaydı bulunamadı");
  const dir = path.join(OUT_DIR, "video");
  mkdirSync(dir, { recursive: true });
  const scale = width ? ["-vf", `scale=${width}:-2:flags=lanczos`] : [];
  const ss = ["-ss", trimStart.toFixed(2)];
  ffmpeg([...ss, "-i", raw, ...scale, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(dir, `${name}.mp4`)]);
  ffmpeg([...ss, "-i", raw, ...scale, "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-deadline", "good", path.join(dir, `${name}.webm`)]);
  ffmpeg(["-ss", (trimStart + 0.4).toFixed(2), "-i", raw, ...scale, "-frames:v", "1", "-quality", "80", path.join(dir, `${name}-poster.webp`)]);
  rmSync(tmpVideo, { recursive: true, force: true });
  const kb = (f) => Math.round(statSync(path.join(dir, f)).size / 1024);
  console.log(`  ✓ video/${name}.mp4 (${kb(`${name}.mp4`)} KB) · .webm (${kb(`${name}.webm`)} KB)`);
}

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
}

export function cleanTmp() {
  rmSync(path.join(OUT_DIR, ".tmp-video"), { recursive: true, force: true });
}

