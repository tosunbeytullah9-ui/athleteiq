#!/usr/bin/env node
// "Demo Kulübü" (slug: demo) organizasyonunu HAYALİ verilerle kurar. Landing
// görselleri yalnızca bu org'dan çekilir; gerçek sporcu adı/sağlık verisi
// herkese açık sayfaya girmez (KVKK).
//
//   LANDING_DEMO_PASSWORD=... pnpm landing:seed          # kur (tekrar çalıştırılabilir)
//   pnpm landing:seed --reset                            # demo org'u ve hesaplarını sil
//
// apps/web/.env.local'deki NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// kullanılır. Yalnızca mevcut tablolara yazar, migration yok.

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
if (!URL_ || !KEY) fail("apps/web/.env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");

const SLUG = "demo";
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

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

if (process.argv.includes("--reset")) {
  await reset();
  console.log("Demo org silindi.");
  process.exit(0);
}
if (!PASSWORD || PASSWORD.length < 8) fail("LANDING_DEMO_PASSWORD (en az 8 karakter) ortam değişkeni gerekli.");

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

// 3 haftalık blok, bu hafta 3. hafta
const block = await insert("program_blocks", {
  org_id: org.id, team_id: teams[0].id, title: "Hazırlık Bloğu", phase: "Özel Hazırlık", total_weeks: 3, created_by: coachUser.id,
});
const SESSIONS = [
  { dow: 1, title: "Kuvvet — Alt Ekstremite", type: "strength", dur: 70, ex: [["Back Squat", 5, [75, 80, 80]], ["Romanian Deadlift", 8, [65, 65, 70]], ["Bulgarian Split Squat", 8, null], ["Nordic Hamstring Curl", 5, null]] },
  { dow: 3, title: "Kuvvet — Üst / Halka", type: "strength", dur: 80, ex: [["Weighted Pull-up", 5, null], ["Ring Dip", 8, null], ["Bench Press", 5, null]] },
  { dow: 5, title: "Pliometrik + Hız", type: "conditioning", dur: 55, ex: [["Box Jump", 5, null], ["Depth Jump", 4, null], ["10 m Sprint", 1, null]] },
];
let thisWeekProgram = null;
for (let w = 1; w <= 3; w++) {
  const start = day(mondayOffset - (3 - w) * 7);
  const p = await insert("training_programs", {
    org_id: org.id, team_id: teams[0].id, block_id: block.id, week_index_in_block: w, title: "Hazırlık Bloğu",
    phase: "Özel Hazırlık", start_date: start, end_date: day(mondayOffset - (3 - w) * 7 + 6), is_published: true,
    is_archived: false, created_by: coachUser.id, discipline: "Artistik Cimnastik",
  });
  if (w === 3) thisWeekProgram = p;
  for (const [si, s] of SESSIONS.entries()) {
    const session = await insert("training_sessions", { program_id: p.id, day_of_week: s.dow, title: s.title, session_type: s.type, duration_min: s.dur, order_index: si });
    for (const [ei, [name, reps, pcts]] of s.ex.entries()) {
      const ex = await insert("exercises", { session_id: session.id, name, order_index: ei, sets: 3, reps });
      await insert("exercise_sets", [0, 1, 2].map((i) => ({
        exercise_id: ex.id, set_number: i + 1, reps, percent_1rm: pcts ? pcts[i] : null, rpe: 7 + (i > 0 ? 1 : 0),
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

// Wellness — son 7 gün
for (const a of athletes.slice(0, 8)) {
  await insert("wellness_checkins", Array.from({ length: 7 }, (_, k) => ({
    athlete_id: a.id, checkin_date: day(-6 + k), source: "athlete",
    sleep_quality: 3 + Math.round(rnd() * 2), soreness: 2 + Math.round(rnd() * 3), stress: 3 + Math.round(rnd() * 2),
    fatigue: 3 + Math.round(rnd() * 2), mood: 3 + Math.round(rnd() * 2), sleep_hours: 6.5 + Math.round(rnd() * 4) / 2,
  })));
}

// Bu haftanın pazartesi seansına geri bildirimler (biri ağrılı)
const { data: monday } = await db.from("training_sessions").select("id").eq("program_id", thisWeekProgram.id).eq("day_of_week", 1).single();
const FEEDBACK = [
  [1, { status: "completed", rpe: 8, duration_min: 95, has_pain: true, pain_area: "Omuz", note: "Kroslarda sağ omuzun önünde batma oldu, son iki seti hafif yaptım." }],
  [0, { status: "completed", rpe: 7, duration_min: 70, note: "Ön squat 4×5 rahat geçti, bir sonraki hafta yük artabilir." }],
  [2, { status: "partial", rpe: 6, duration_min: 50, note: "Okuldan geç çıktım, ısınmayı kısa tuttum." }],
  [3, { status: "completed", rpe: 9, duration_min: 80 }],
];
for (const [ai, fb] of FEEDBACK) {
  await insert("session_feedback", { athlete_id: athletes[ai].id, session_id: monday.id, source: "athlete", session_date: day(mondayOffset), ...fb });
}

// Demo sporcunun wearable metrikleri (bağlantı satırı sahte token'la, pasif değil)
await insert("wearable_connections", { athlete_id: athletes[0].id, provider: "whoop", access_token: "demo-not-a-token", is_active: true, last_synced_at: new Date().toISOString() });
await insert("wearable_daily_metrics", Array.from({ length: 14 }, (_, k) => ({
  athlete_id: athletes[0].id, provider: "whoop", metric_date: day(-13 + k),
  recovery_score: 40 + Math.round(rnd() * 50), hrv_rmssd: 55 + Math.round(rnd() * 25), resting_hr: 46 + Math.round(rnd() * 8),
  sleep_score: 70 + Math.round(rnd() * 25), total_sleep_min: 400 + Math.round(rnd() * 90), strain_score: Math.round((8 + rnd() * 10) * 10) / 10,
})));

// Yaklaşan yarışma
const comp = await insert("competitions", { org_id: org.id, team_id: teams[0].id, name: "Türkiye Şampiyonası (demo)", competition_date: day(45), location: "Ankara" });
await insert("competition_entries", athletes.slice(0, 4).map((a) => ({ competition_id: comp.id, athlete_id: a.id })));

console.log(`\nDemo Kulübü hazır.
  Koç    : ${COACH.username}@${SLUG}
  Sporcu : defne.arslan@${SLUG}
  Şifre  : LANDING_DEMO_PASSWORD değeri
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

async function reset() {
  const { data: existing } = await db.from("organizations").select("id").eq("slug", SLUG).maybeSingle();
  if (!existing) return;
  const { data: profiles } = await db.from("profiles").select("id").eq("org_id", existing.id);
  for (const p of profiles ?? []) await db.auth.admin.deleteUser(p.id);
  const { error } = await db.from("organizations").delete().eq("id", existing.id);
  if (error) fail(`Demo org silinemedi: ${error.message}`);
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
