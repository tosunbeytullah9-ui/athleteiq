#!/usr/bin/env node
// Landing görsellerini REPLİKA sahnelerden üretir (hayali "Demo Kulübü" verisi).
// Supabase bağlantısı gerektirmez. Gerçek uygulamadan çekim için capture.mjs.
//
//   LANDING_STUDIO=1 pnpm --filter @athleteiq/web start -p 3100   (ayrı terminal)
//   pnpm landing:replicas [--base http://127.0.0.1:3100] [--only coach-feedback]

import { cleanTmp, finishVideo, launch, openStage, screenshot } from "./lib/director.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const BASE = flag("base", "http://127.0.0.1:3100");
const ONLY = flag("only", null);

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

async function load(page, scene, scale = 1) {
  const q = scale !== 1 ? `?scale=${scale}` : "";
  await page.goto(`${BASE}/landing-studio/${scene}${q}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const t = Date.now();
  return t;
}

const SHOTS = [
  ["coach-dashboard", DESKTOP],
  ["acwr", DESKTOP],
  ["annual-plan", DESKTOP],
  ["athlete-recovery", PHONE],
  ["athlete-wellness", PHONE],
];

async function recordProgramBuilder(browser) {
  const s = await openStage(browser, { ...DESKTOP, video: true });
  const ready = await load(s.page, "program-builder");
  const { stage } = s;
  await stage.pause(700);
  await stage.click('[data-demo="add-exercise"]', { duration: 900 });
  await stage.pause(300);
  await stage.type("rom");
  await stage.pause(450);
  await stage.click('[data-demo="lib-romanian-deadlift"]', { duration: 600, after: 650 });
  await stage.clearAndType('[data-demo="reps-1-0"]', "8");
  await stage.clearAndType('[data-demo="pct-1-0"]', "65");
  await stage.pause(500);
  await stage.clearAndType('[data-demo="rpe-1-0"]', "7");
  await stage.pause(400);
  await stage.click('[data-demo="add-set-1"]', { after: 380 });
  await stage.click('[data-demo="add-set-1"]', { duration: 260, after: 600 });
  await stage.clearAndType('[data-demo="pct-1-2"]', "70");
  await stage.pause(700);
  await stage.click('[data-demo="publish"]', { duration: 1000, after: 2600 });
  await finishVideo(s, "program-builder", { trimStart: (ready - s.startedAt) / 1000 });
}

async function recordFeedback(browser) {
  const s = await openStage(browser, { ...DESKTOP, video: true });
  const ready = await load(s.page, "coach-feedback");
  const { stage } = s;
  await stage.pause(900);
  await stage.click('[data-demo="filter-pain"]', { duration: 900, after: 900 });
  await stage.click('[data-demo="reply-f1"]', { duration: 800, after: 400 });
  await stage.type("Halka kuvvetinde bu hafta krosu çıkarıyoruz. Yarın ısınmadan önce omzuna birlikte bakalım.");
  await stage.pause(600);
  await stage.click('[data-demo="reply-send-f1"]', { after: 1200 });
  await stage.click('[data-demo="filter-all"]', { duration: 800, after: 2200 });
  await finishVideo(s, "coach-feedback", { trimStart: (ready - s.startedAt) / 1000 });
}

async function recordAthleteRpe(browser) {
  const s = await openStage(browser, { ...PHONE, scale: 2, video: true });
  const ready = await load(s.page, "athlete-rpe", 2);
  const { stage } = s;
  await stage.pause(900);
  await stage.click('[data-demo="open-feedback"]', { duration: 800, after: 700 });
  await stage.click('[data-demo="rpe-7"]', { after: 700 });
  await stage.clearAndType('[data-demo="duration"]', "75");
  await stage.pause(500);
  await stage.click('[data-demo="pain"]', { after: 500 });
  await stage.click('[data-demo="area-Diz"]', { after: 700 });
  await stage.click('[data-demo="submit"]', { after: 2200 });
  await finishVideo(s, "athlete-rpe", { trimStart: (ready - s.startedAt) / 1000 });
}

const VIDEOS = {
  "program-builder": recordProgramBuilder,
  "coach-feedback": recordFeedback,
  "athlete-rpe": recordAthleteRpe,
};

const browser = await launch();
try {
  for (const [scene, size] of SHOTS) {
    if (ONLY && ONLY !== scene) continue;
    const s = await openStage(browser, size);
    await load(s.page, scene);
    // Kayıt imleci ekran görüntüsünde görünmesin
    await s.page.mouse.move(-50, -50);
    await screenshot(s.page, scene);
    await s.context.close();
  }
  for (const [name, fn] of Object.entries(VIDEOS)) {
    if (ONLY && ONLY !== name) continue;
    await fn(browser);
  }
} finally {
  await browser.close();
  cleanTmp();
}
