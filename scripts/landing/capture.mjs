#!/usr/bin/env node
// Landing görsellerini GERÇEK uygulamadan, "Demo Kulübü" hesabıyla çeker ve
// replika dosyalarının üzerine aynı adlarla yazar (kodda değişiklik gerekmez).
//
//   1) pnpm landing:seed                        (bir kez — demo org + hesaplar)
//   2) pnpm --filter @athleteiq/web dev         (ayrı terminal)
//   3) LANDING_DEMO_PASSWORD=... pnpm landing:capture [--base http://localhost:3000]
//
// Gizlilik: çekimden önce /athletes listesindeki her ad demo listesiyle
// karşılaştırılır; tek bir yabancı ad görülürse script durur.
//
// Telefon görselleri (recovery, wellness, RPE videosu) Expo uygulamasına aittir;
// tarayıcıdan çekilemez, replika olarak kalır.
// Program oluşturma videosu da replikadan gelir — gerçek sihirbazın adımları
// hesap verisine göre değiştiği için güvenilir biçimde otomatikleştirilemez.

import { finishVideo, launch, openStage, screenshot, cleanTmp } from "./lib/director.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const BASE = flag("base", "http://localhost:3000");
const PASSWORD = process.env.LANDING_DEMO_PASSWORD;
if (!PASSWORD) {
  console.error("✗ LANDING_DEMO_PASSWORD gerekli (demo-seed.mjs ile aynı değer).");
  process.exit(1);
}

const COACH = "koc.demo@demo";
const DEMO_NAMES = new Set([
  "Defne Arslan", "Kerem Yıldız", "Ece Kaya", "Mert Demir", "İpek Koç",
  "Barış Öztürk", "Zeynep Çelik", "Arda Şahin", "Elif Aydın", "Can Aksoy",
]);
const DESKTOP = { width: 1440, height: 900 };

async function login(page, stage) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await stage.click("#login-identifier", { after: 150 });
  await stage.type(COACH);
  await stage.click("#login-password", { after: 150 });
  await page.keyboard.type(PASSWORD, { delay: 40 });
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }), page.keyboard.press("Enter")]);
  await page.waitForLoadState("networkidle");
}

async function assertDemoOnly(page) {
  await page.goto(`${BASE}/athletes`, { waitUntil: "networkidle" });
  await page.locator("table tbody tr").first().waitFor({ timeout: 15000 }).catch(() => {});
  const names = await page.locator("table tbody tr td:first-child span.font-medium").allInnerTexts();
  const foreign = names.map((n) => n.trim()).filter((n) => n && !DEMO_NAMES.has(n));
  if (names.length === 0 || foreign.length > 0) {
    throw new Error(
      `Gizlilik kontrolü başarısız: ${foreign.length ? `demo dışı ad(lar) görüldü (${foreign.length})` : "sporcu listesi okunamadı"}. Çekim yapılmadı.`
    );
  }
}

async function shot(page, route, name, prepare) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  if (prepare) await prepare(page);
  await page.waitForTimeout(600);
  await page.mouse.move(-50, -50);
  await screenshot(page, name);
}

const browser = await launch();
try {
  // Ekran görüntüleri
  {
    const s = await openStage(browser, DESKTOP);
    await login(s.page, s.stage);
    await assertDemoOnly(s.page);
    await shot(s.page, "/dashboard", "coach-dashboard");
    await shot(s.page, "/acwr", "acwr");
    await s.page.goto(`${BASE}/annual-plans`, { waitUntil: "networkidle" });
    const plan = s.page.locator('a[href^="/annual-plans/"]').first();
    if (await plan.count()) {
      await plan.click();
      await s.page.waitForLoadState("networkidle");
      await s.page.mouse.move(-50, -50);
      await screenshot(s.page, "annual-plan");
    } else {
      console.log("  – yıllık plan yok, annual-plan replikası korunuyor");
    }
    await s.context.close();
  }

  // Geri bildirim videosu
  {
    const s = await openStage(browser, { ...DESKTOP, video: true });
    await login(s.page, s.stage);
    await s.page.goto(`${BASE}/feedback`, { waitUntil: "networkidle" });
    const ready = Date.now();
    const { stage, page } = s;
    await stage.pause(900);
    await stage.click('button:has-text("Ağrı")', { duration: 900, after: 900 });
    await stage.click('button:has-text("Yanıtla")', { duration: 800, after: 400 });
    await stage.type("Halka kuvvetinde bu hafta krosu çıkarıyoruz. Yarın ısınmadan önce omzuna birlikte bakalım.");
    await stage.pause(600);
    await stage.click('button:has-text("Gönder")', { after: 1800 });
    await stage.click('button:has-text("Tümü")', { duration: 800, after: 2000 });
    await page.mouse.move(-50, -50);
    await finishVideo(s, "coach-feedback", { trimStart: (ready - s.startedAt) / 1000 });
  }
} finally {
  await browser.close();
  cleanTmp();
}

console.log("\nBitti. Not: geri bildirim videosu demo veride bir yanıt yazdı; tekrar çekmek için önce `pnpm landing:seed` çalıştırın.");
