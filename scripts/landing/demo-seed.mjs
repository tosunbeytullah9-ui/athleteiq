#!/usr/bin/env node
// "Demo Kulübü" (slug: demo) organizasyonunu HAYALİ verilerle kurar. İki işi
// var: landing görselleri yalnızca bu org'dan çekilir (gerçek sporcu adı/sağlık
// verisi herkese açık sayfaya girmez — KVKK), ve Apple App Review'a verilen
// demo hesaplar (sporcu + koç) bu org'dadır (Parti 18D,
// docs/app-store/review-notes.md).
//
//   LANDING_DEMO_PASSWORD=... pnpm landing:seed          # kur (tekrar çalıştırılabilir)
//   pnpm landing:seed --reset                            # demo org'u ve hesaplarını sil
//
// Tüm tarihler seed anına göredir. Mobil ekranlar "bugünü kapsayan hafta" /
// "son 7 gün" pencereleriyle sorguladığı için veri, seed'den sonra en az
// FRESH_DAYS gün boyunca her iki rolün ekranlarını dolu tutacak şekilde
// ileriye de uzatılır (program haftaları, yarışmalar). WHOOP metrikleri ileri
// tarihlenemez (bkz. aşağıda); demo sporcunun wearable bağlantısı yok (Parti 18G).
// İnceleme gönderiminden HEMEN ÖNCE yeniden çalıştırın
// (docs/app-store/submission-checklist.md).
//
// apps/web/.env.local'deki NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// (+ koç yanıtı RPC'si için NEXT_PUBLIC_SUPABASE_ANON_KEY) kullanılır.
// Yalnızca mevcut tablolara yazar, migration yok.

import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "apps/web/package.json"));
const { createClient } = require("@supabase/supabase-js");

loadEnv(path.join(root, "apps/web/.env.local"));
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) fail("apps/web/.env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");

const SLUG = "demo";
// Seed'den sonra ekranların dolu kalacağı garanti edilen gün sayısı.
const FRESH_DAYS = 30;
// Program bloğu: geçmiş 3 hafta + bu hafta + gelecek 6 hafta.
const PAST_WEEKS = 3;
const FUTURE_WEEKS = 6;
const PASSWORD = process.env.LANDING_DEMO_PASSWORD;
const db = createClient(URL_, KEY, { auth: { persistSession: false } });

const COACH = { username: "koc.demo", full_name: "Selin Er" };
const ATHLETES = [
  { full_name: "Defne Arslan", team: 0, gender: "female", group: "Kadın", login: "defne.arslan" },
  { full_name: "Kerem Yıldız", team: 0, gender: "male", group: "Erkek" },
  { full_name: "Ece Kaya", team: 0, gender: "female", group: "Kadın" },
  { full_name: "Mert Demir", team: 0, gender: "male", group: "Erkek" },
  { full_name: "İpek Koç", team: 0, gender: "female", group: "Kadın" },
  { full_name: "Barış Öztürk", team: 0, gender: "male", group: "Erkek" },
  { full_name: "Zeynep Çelik", team: 1, gender: "female", group: "Sprint" },
  { full_name: "Arda Şahin", team: 1, gender: "male", group: "Sprint" },
  { full_name: "Elif Aydın", team: 1, gender: "female", group: "Sprint" },
  { full_name: "Can Aksoy", team: 1, gender: "male", group: "Sprint" },
];
const TEAMS = [
  { name: "Artistik Cimnastik A", discipline: "Artistik Cimnastik" },
  { name: "Atletizm Sprint", discipline: "Atletizm" },
];

const emailOf = (username) => `${username}@${SLUG}.athleteiq.app`;
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
// Pazartesi = bu haftanın başı
const mondayOffset = -((new Date().getDay() + 6) % 7);
// ISO hafta numarası — create_program_with_weeks'in to_char(…, 'IW') ile aynısı
// (mobil "Hafta N" bunu gösterir).
const isoWeek = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
};

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

if (process.argv.includes("--reset")) {
  await reset();
  process.exit(0);
}
if (!PASSWORD || PASSWORD.length < 8) fail("LANDING_DEMO_PASSWORD (en az 8 karakter) ortam değişkeni gerekli.");
if (!ANON_KEY) fail("apps/web/.env.local içinde NEXT_PUBLIC_SUPABASE_ANON_KEY gerekli (koç yanıtı demo koçun oturumuyla yazılır).");

await reset();
const org = await insert("organizations", { name: "Demo Kulübü", slug: SLUG, plan: "pro" });
const teams = [];
for (const t of TEAMS) teams.push(await insert("teams", { ...t, org_id: org.id }));

const coachUser = await createUser(COACH.username, COACH.full_name);
await insert("memberships", { user_id: coachUser.id, org_id: org.id, team_id: teams[0].id, role: "coach" });

const athletes = [];
for (const a of ATHLETES) {
  let userId = null;
  if (a.login) {
    const u = await createUser(a.login, a.full_name);
    userId = u.id;
    await insert("memberships", { user_id: u.id, org_id: org.id, team_id: teams[a.team].id, role: "athlete" });
  }
  athletes.push(
    await insert("athletes", {
      org_id: org.id,
      team_id: teams[a.team].id,
      full_name: a.full_name,
      gender: a.gender,
      training_group: a.group,
      user_id: userId,
      username: a.login ?? null,
      birth_date: `${2003 + Math.floor(rnd() * 5)}-0${1 + Math.floor(rnd() * 9)}-1${Math.floor(rnd() * 9)}`,
      height_cm: 155 + Math.round(rnd() * 25),
      weight_kg: 50 + Math.round(rnd() * 25),
      is_active: true,
    })
  );
}

// 1RM kayıtları — %1RM yüklerinin hesaplanması için
for (const a of athletes) {
  await insert("athlete_1rm_records", [
    { athlete_id: a.id, exercise_name: "Back Squat", weight_kg: 90 + Math.round(rnd() * 40), test_date: day(-30), exercise_source: "platform" },
    { athlete_id: a.id, exercise_name: "Romanian Deadlift", weight_kg: 80 + Math.round(rnd() * 40), test_date: day(-30), exercise_source: "platform" },
  ]);
}

// 10 haftalık blok: geçmiş 3 hafta + bu hafta + gelecek 6 hafta, hepsi yayında.
// Sporcunun mobil Program ekranı yalnızca BUGÜNÜ kapsayan haftayı gösterir
// (isDateActive) — gelecek haftalar seed'den sonra FRESH_DAYS boyunca ekranı
// dolu tutar. Koç tarafı kısıtı: mobil koç ekranları tarih filtresi olmadan en
// büyük start_date'li haftayı "Aktif Program" sayar (getActiveProgramId), bu
// yüzden koç bloğun SON haftasını görür — uygulama sorunu, PROGRESS.md Parti 18D.
// Takım 1 (Atletizm Sprint) için program YOK: demo koçun üyeliği yalnızca
// takım 0'da, RLS o takımı koça hiç göstermez.
const TOTAL_WEEKS = PAST_WEEKS + 1 + FUTURE_WEEKS;
const THIS_WEEK = PAST_WEEKS + 1;
const weekStart = (w) => mondayOffset + (w - THIS_WEEK) * 7;
const block = await insert("program_blocks", {
  org_id: org.id, team_id: teams[0].id, title: "Hazırlık Bloğu", phase: "Özel Hazırlık", total_weeks: TOTAL_WEEKS, created_by: coachUser.id,
});
const SESSIONS = [
  { dow: 1, title: "Kuvvet — Alt Ekstremite", type: "strength", dur: 70, ex: [["Back Squat", 5, [75, 80, 80]], ["Romanian Deadlift", 8, [65, 65, 70]], ["Bulgarian Split Squat", 8, null], ["Nordic Hamstring Curl", 5, null]] },
  { dow: 3, title: "Kuvvet — Üst / Halka", type: "strength", dur: 80, ex: [["Weighted Pull-up", 5, null], ["Ring Dip", 8, null], ["Bench Press", 5, null]] },
  { dow: 5, title: "Pliometrik + Hız", type: "conditioning", dur: 55, ex: [["Box Jump", 5, null], ["Depth Jump", 4, null], ["10 m Sprint", 1, null]] },
];
// Hafta içeriği tekrar eder; %1RM'ler 3 haftalık dalgayla +2,5 artar
// (+0 / +2,5 / +5 → başa döner) — 10 hafta doğrusal artış %100'ü aşardı.
const allSessions = []; // { week, offset (bugüne göre gün), id, dow, dur }
for (let w = 1; w <= TOTAL_WEEKS; w++) {
  const start = weekStart(w);
  const bump = 2.5 * ((w - 1) % 3);
  const p = await insert("training_programs", {
    org_id: org.id, team_id: teams[0].id, block_id: block.id, week_index_in_block: w, title: "Hazırlık Bloğu",
    phase: "Özel Hazırlık", start_date: day(start), end_date: day(start + 6), week_number: isoWeek(start), is_published: true,
    is_archived: false, created_by: coachUser.id, discipline: "Artistik Cimnastik",
  });
  for (const [si, s] of SESSIONS.entries()) {
    const session = await insert("training_sessions", { program_id: p.id, day_of_week: s.dow, title: s.title, session_type: s.type, duration_min: s.dur, order_index: si });
    allSessions.push({ week: w, offset: start + s.dow - 1, id: session.id, dow: s.dow, dur: s.dur });
    for (const [ei, [name, reps, pcts]] of s.ex.entries()) {
      const ex = await insert("exercises", { session_id: session.id, name, order_index: ei, sets: 3, reps });
      await insert("exercise_sets", [0, 1, 2].map((i) => ({
        exercise_id: ex.id, set_number: i + 1, reps, percent_1rm: pcts ? pcts[i] + bump : null, rpe: 7 + (i > 0 ? 1 : 0),
      })));
    }
  }
}

// 28 günlük ACWR geçmişi (koç girişi), bugün hariç
for (const [i, a] of athletes.entries()) {
  const ramp = i === 1 || i === 3 ? 1.35 : i === 7 ? 0.7 : 1;
  const rows = [];
  for (let d = -28; d <= -1; d++) {
    if ((d + 28) % 7 === 6 || rnd() < 0.15) continue;
    const late = d > -8 ? ramp : 1;
    const rpe = Math.min(10, Math.round((5 + rnd() * 3) * (late > 1 ? 1.1 : 1)));
    const dur = Math.round((50 + rnd() * 40) * late);
    rows.push({ athlete_id: a.id, log_date: day(d), session_rpe: rpe, duration_min: dur, source: "manual" });
  }
  await insert("acwr_logs", rows);
}
await refreshRolling(athletes);

// Wellness — demo sporcu (giriş hesabı olan) son 14 gün, BUGÜN HARİÇ: App
// Review incelemecisi bugünkü check-in'i kendisi doldurabilsin. Diğerleri son
// 7 gün (bugün dahil — koç panelindeki "bugün dolduranlar" görünümü için).
const wellnessRows = (a, from, to) => Array.from({ length: to - from + 1 }, (_, k) => ({
  athlete_id: a.id, checkin_date: day(from + k), source: "athlete",
  sleep_quality: 3 + Math.round(rnd() * 2), soreness: 2 + Math.round(rnd() * 3), stress: 3 + Math.round(rnd() * 2),
  fatigue: 3 + Math.round(rnd() * 2), mood: 3 + Math.round(rnd() * 2), sleep_hours: 6.5 + Math.round(rnd() * 4) / 2,
}));
await insert("wellness_checkins", wellnessRows(athletes[0], -14, -1));
for (const a of athletes.slice(1, 8)) await insert("wellness_checkins", wellnessRows(a, -6, 0));

// Bu haftanın pazartesi seansına diğer sporculardan geri bildirimler (biri
// ağrılı — koçun web /feedback akışında ve ağrı uyarısında görünür).
const monday = allSessions.find((s) => s.week === THIS_WEEK && s.dow === 1);
const FEEDBACK = [
  [1, { status: "completed", rpe: 8, duration_min: 95, has_pain: true, pain_area: "Omuz", note: "Kroslarda sağ omuzun önünde batma oldu, son iki seti hafif yaptım." }],
  [2, { status: "partial", rpe: 6, duration_min: 50, note: "Okuldan geç çıktım, ısınmayı kısa tuttum." }],
  [3, { status: "completed", rpe: 9, duration_min: 80 }],
];
for (const [ai, fb] of FEEDBACK) {
  await insert("session_feedback", { athlete_id: athletes[ai].id, session_id: monday.id, source: "athlete", ...fb });
}

// Demo sporcunun (Defne) son 14 gündeki — bugün dahil — tüm seanslarına geri
// bildirim. session_date'i set_session_feedback_date trigger'ı programdan
// hesaplar, gönderilmez.
const DEFNE_NOTES = [
  "Ön squat 4×5 rahat geçti, bir sonraki hafta yük artabilir.",
  "Halka dip'lerde son sette form bozuldu, tekrarı 6'da bıraktım.",
  "Box jump'ta iniş çok iyiydi, depth jump yorucuydu.",
  "Uykum azdı, ilk setler ağır geldi ama toparladım.",
  "Pull-up'ta ek ağırlığı 2,5 kg artırdım.",
  null,
];
const defneSessions = allSessions
  .filter((s) => s.offset >= -14 && s.offset <= 0)
  .sort((a, b) => b.offset - a.offset); // en yeni önce
const defneFeedback = [];
for (const [i, s] of defneSessions.entries()) {
  const partial = i === 2;
  defneFeedback.push({
    ...(await insert("session_feedback", {
      athlete_id: athletes[0].id, session_id: s.id, source: "athlete",
      status: partial ? "partial" : "completed",
      rpe: partial ? 6 : 7 + Math.round(rnd()),
      duration_min: partial ? s.dur - 20 : s.dur + Math.round((rnd() - 0.5) * 10),
      note: partial ? "Sınav haftası, seansın son bölümünü yapamadım." : DEFNE_NOTES[i % DEFNE_NOTES.length],
    })),
    offset: s.offset,
  });
}

// Koç yanıtı + okundu: coach_* kolonlarını yalnızca bu RPC'ler yazabilir —
// session_feedback_guard_coach_columns trigger'ı service role dahil normal
// UPDATE'i geri alır. Bu yüzden demo koçun GERÇEK oturumuyla çağrılır.
// Sporcu koç yanıtını mobilde yalnızca İÇİNDE BULUNULAN haftanın seanslarında
// görür (geçmiş haftaya gidilemiyor) — bu haftanın tüm geri bildirimleri
// yanıtlanır; geçmiş haftalarda biri yanıtlı, biri yalnızca okundu, kalanlar
// okunmamış (koçun web akışında "okunmamış" filtresi dolu kalsın).
const COACH_REPLIES = [
  "Harika iş! Önümüzdeki hafta ilk sette %2,5 artıralım.",
  "Formu korumak tekrardan önemli, doğru karar. Perşembe dip'leri birlikte izleyelim.",
  "Uyku düzenine dikkat — bu hafta yüklenmeyi sabit tutuyoruz.",
  "Tamamdır, eksik kalan bölümü cumartesi kısa bir seansla telafi ederiz.",
];
const coachDb = createClient(URL_, ANON_KEY, { auth: { persistSession: false } });
const { error: signInErr } = await coachDb.auth.signInWithPassword({ email: emailOf(COACH.username), password: PASSWORD });
if (signInErr) fail(`Demo koç oturumu açılamadı: ${signInErr.message}`);
let replyCount = 0;
let pastReplied = false;
let pastRead = false;
for (const fb of defneFeedback) {
  const thisWeek = fb.offset >= mondayOffset;
  if (thisWeek || !pastReplied) {
    await rpcAsCoach("reply_to_session_feedback", { p_feedback_id: fb.id, p_reply: COACH_REPLIES[replyCount++ % COACH_REPLIES.length] });
    if (!thisWeek) pastReplied = true;
  } else if (!pastRead) {
    await rpcAsCoach("mark_session_feedback_read", { p_feedback_id: fb.id });
    pastRead = true;
  }
}
await coachDb.auth.signOut();

// Demo sporcunun WHOOP metrikleri — bağlantı satırı YOK (Parti 18G): mobilde
// wearable akışı "Yakında" (WEARABLES_ENABLED=false, Parti 18F); App Review
// incelemecisi Profil'de "Bağlantıyı Kes" yerine "Yakında" ve Recovery'de
// "Recovery verileri yakında" görür. Metrikler web panelindeki koç görünümleri
// için korunur. reset() demo org'u sildiği için (athletes → wearable_connections
// CASCADE) eski bir seed'in bağlantı satırı yeniden seed'de kendiliğinden gider.
// Son 28 gün + bugün. İleri tarihli satır YAZILMAZ: mobil Recovery sorgusunun
// üst sınırı yok (metric_date >= bugün-7, en yeni önce), gelecekteki bir gün
// "son ölçüm" olarak görünürdü (bayrak yeniden açılıp bağlantı eklenirse
// mobil Recovery seed'den sonra ~7 gün dolu kalır — PROGRESS.md Parti 18D).
await insert("wearable_daily_metrics", Array.from({ length: 29 }, (_, k) => ({
  athlete_id: athletes[0].id, provider: "whoop", metric_date: day(-28 + k),
  recovery_score: 40 + Math.round(rnd() * 50), hrv_rmssd: 55 + Math.round(rnd() * 25), resting_hr: 46 + Math.round(rnd() * 8),
  sleep_score: 70 + Math.round(rnd() * 25), total_sleep_min: 400 + Math.round(rnd() * 90), strain_score: Math.round((8 + rnd() * 10) * 10) / 10,
})));

// Yarışmalar: biri geçmiş (sonuçlu), biri yakın, biri uzak. Mobil Yarışmalar
// ekranı org'un tüm yarışmalarını yaklaşan/geçmiş diye listeler; kayıt (roster)
// ve sonuçlar web'de görünür.
const COMPETITIONS = [
  { name: "İstanbul Kupası (demo)", offset: -30, location: "İstanbul", entrants: [0, 1, 2, 3] },
  { name: "Türkiye Şampiyonası (demo)", offset: 20, location: "Ankara", entrants: [0, 1, 2, 3] },
  { name: "Balkan Şampiyonası (demo)", offset: 60, location: "İzmir", entrants: [0, 2] },
];
for (const c of COMPETITIONS) {
  const comp = await insert("competitions", { org_id: org.id, team_id: teams[0].id, name: c.name, competition_date: day(c.offset), location: c.location });
  await insert("competition_entries", c.entrants.map((ai) => ({ competition_id: comp.id, athlete_id: athletes[ai].id })));
  if (c.offset < 0) {
    const scores = c.entrants.map(() => Math.round((47 + rnd() * 6) * 1000) / 1000);
    const ranked = [...scores].sort((a, b) => b - a);
    await insert("competition_results", c.entrants.map((ai, i) => ({
      competition_id: comp.id, athlete_id: athletes[ai].id, event: "Bireysel Genel Tasnif", score: scores[i], rank: ranked.indexOf(scores[i]) + 1,
    })));
  }
}

const freshUntil = day(FRESH_DAYS);
console.log(`\nDemo Kulübü hazır (seed: ${day(0)}).
  Koç    : ${COACH.username}@${SLUG}   (${COACH.full_name}, ${TEAMS[0].name})
  Sporcu : defne.arslan@${SLUG}   (${ATHLETES[0].full_name})
  Şifre  : LANDING_DEMO_PASSWORD değeri
  Program: ${TOTAL_WEEKS} hafta, ${day(weekStart(1))} – ${day(weekStart(TOTAL_WEEKS) + 6)}
  Geri bildirim: Defne ${defneFeedback.length} seans, koç yanıtı ${replyCount}

⚠ Bu veri ${freshUntil} tarihine kadar taze (mobil Recovery "Yakında" — wearable bağlantısı yok).
  App Review gönderiminden hemen önce yeniden seed edin
  (docs/app-store/submission-checklist.md).
Yıllık plan ızgarası bu scriptle doldurulmaz; capture.mjs plan yoksa o kareyi atlar.`);

/* ───────────────────────────── yardımcılar */

async function createUser(username, full_name) {
  const { data, error } = await db.auth.admin.createUser({
    email: emailOf(username), password: PASSWORD, email_confirm: true, user_metadata: { full_name },
  });
  if (error) fail(`Kullanıcı oluşturulamadı (${username}): ${error.message}`);
  await insert("profiles", { id: data.user.id, org_id: org.id, username, full_name });
  return data.user;
}

async function insert(table, values) {
  const { data, error } = await db.from(table).insert(values).select();
  if (error) fail(`${table}: ${error.message}`);
  return Array.isArray(values) ? data : data[0];
}

async function refreshRolling(list) {
  // acute/chronic türetilmiş alanlar — RPC varsa onunla tazele
  for (const a of list) {
    const { error } = await db.rpc("refresh_acwr_rolling_loads", { p_athlete_id: a.id, p_from: day(-28), p_to: day(0) });
    if (error) {
      console.warn(`  ! ACWR pencereleri tazelenemedi (${error.message}) — grafikler yalnızca seans yükünü gösterebilir.`);
      return;
    }
  }
}

async function rpcAsCoach(fn, args) {
  const { error } = await coachDb.rpc(fn, args);
  if (error) fail(`${fn} (demo koç oturumu): ${error.message}`);
}

// Önce org (cascade ile takım, sporcu, program, üyelik, profil, geri bildirim),
// sonra auth kullanıcıları. created_by / coach_replied_by gibi audit FK'leri
// Parti 18B'den beri ON DELETE SET NULL (20261026185415) — ters sıra da artık
// reddedilmez, ama org önce silinince auth silmesi boşaltılacak satır bulmaz.
// Sınır: yalnızca slug = 'demo' org'u ve @demo.athleteiq.app hesapları.
async function reset() {
  const { data: existing, error: orgErr } = await db
    .from("organizations")
    .select("id")
    .eq("slug", SLUG)
    .maybeSingle();
  if (orgErr) fail(`Demo org okunamadı: ${orgErr.message}`);

  const userIds = new Set();
  if (existing) {
    const { data: profiles, error } = await db.from("profiles").select("id").eq("org_id", existing.id);
    if (error) fail(`Demo profilleri okunamadı: ${error.message}`);
    for (const p of profiles ?? []) userIds.add(p.id);
    const { error: delErr } = await db.from("organizations").delete().eq("id", existing.id);
    if (delErr) fail(`Demo org silinemedi: ${delErr.message}`);
  }

  // Yarıda kalmış bir sıfırlamadan kalan yetim hesaplar: yalnızca demo alan adı.
  const suffix = `@${SLUG}.athleteiq.app`;
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Auth kullanıcıları listelenemedi: ${error.message}`);
    for (const u of data.users) if (u.email?.endsWith(suffix)) userIds.add(u.id);
    if (data.users.length < 200) break;
  }

  for (const id of userIds) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) fail(`Auth kullanıcısı silinemedi (${id}): ${error.message}`);
  }
  console.log(`✓ Demo verisi silindi (org: ${existing ? "1" : "0"}, hesap: ${userIds.size})`);
}

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
