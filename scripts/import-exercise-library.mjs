#!/usr/bin/env node
/**
 * Obsidian vault egzersiz veri setini (_Veri/exercises.json) platform_exercises
 * INSERT migration'ına dönüştürür.
 *
 * Kullanım:
 *   node scripts/import-exercise-library.mjs "<vault>/_Veri/exercises.json" > supabase/migrations/039_exercise_library_import.sql
 *
 * Bilinçli olarak ALINMAYAN alanlar (karar: Parti — egzersiz kütüphanesi importu):
 *   - steps_tr  → instructions'a yazılmaz (açıklama istenmiyor + lisans yüzeyini daraltır)
 *   - media_id  → demo_url'e yazılmaz (görsel dosyaları vault'ta yok, görsel istenmiyor)
 *   - name_tr   → hiç doldurulmaz (Türkçe isim istenmiyor)
 */

import { readFileSync } from "node:fs";

const src = process.argv[2];
if (!src) {
  console.error(
    "Kullanım: node scripts/import-exercise-library.mjs <exercises.json>"
  );
  process.exit(1);
}

const raw = JSON.parse(readFileSync(src, "utf8"));

// --- 1. Hareket kalıbı eşlemesi -------------------------------------------
// Vault 15 pattern → DB movement_pattern (16 + isolation + olympic_lift = 18)
const PATTERN_MAP = {
  "Yatay İtiş": "horizontal_push",
  "Dikey İtiş": "vertical_push",
  "Yatay Çekiş": "horizontal_pull",
  "Dikey Çekiş": "vertical_pull",
  "Gövde / Core": "core_stability",
  "Esneklik / Hareketlilik": "mobility_flexibility",
  "Pliometri / Sıçrama": "jump_land",
  "Taşıma (Carry)": "loaded_carry",
  "Kardiyo / Kondisyon": "locomotion",
  İzolasyon: "isolation",
  "Olimpik Halter Türevleri": "olympic_lift",
  // Aşağıdakiler tek bir vault pattern'inden iki DB değerine dallanır
  "Rotasyon / Antirotasyon": null, // → rotation | anti_rotation
  "Diz Baskın (Squat)": null, // → knee_dominant_bilateral | _unilateral
  "Kalça Baskın (Menteşe)": null, // → hip_hinge_bilateral | _unilateral
  "Tek Taraflı / Lunge": "knee_dominant_unilateral",
};

// Pallof press klasik anti-rotasyon hareketidir; veri setindeki diğer tüm
// "twist / side bend / russian twist" kayıtları gerçek rotasyondur.
const ANTI_ROTATION = /\bpallof\b/i;

// Tek taraflı yükleme işaretleri (veri setinde is_unilateral alanı yok)
const UNILATERAL =
  /\b(one arm|one-arm|one leg|one-leg|single arm|single-arm|single leg|single-leg|unilateral|lunge|split squat|bulgarian|step-up|step up|pistol|archer|side deadlift)\b/i;

function resolvePattern(ex, isUnilateral) {
  const mapped = PATTERN_MAP[ex.pattern];
  if (mapped) return mapped;
  switch (ex.pattern) {
    case "Rotasyon / Antirotasyon":
      return ANTI_ROTATION.test(ex.name) ? "anti_rotation" : "rotation";
    case "Diz Baskın (Squat)":
      return isUnilateral
        ? "knee_dominant_unilateral"
        : "knee_dominant_bilateral";
    case "Kalça Baskın (Menteşe)":
      return isUnilateral ? "hip_hinge_unilateral" : "hip_hinge_bilateral";
    default:
      throw new Error(`Eşlenmemiş pattern: ${ex.pattern} (${ex.name})`);
  }
}

// --- 2. Yük tipi -----------------------------------------------------------
function resolveLoadType(ex) {
  if (ex.pattern === "Esneklik / Hareketlilik") return "duration_sec";
  if (ex.equipment_family === "Kardiyo Makinesi") return "duration_sec";
  if (ex.equipment_family === "Vücut Ağırlığı") return "bodyweight";
  return "absolute_kg";
}

// --- 3. İsim normalizasyonu ------------------------------------------------
// Medya/cinsiyet artefaktları (görseller alınmadığı için anlamsız):
//   "(male)" "(female)" "(back pov)" "(side pov)"
// KORUNAN parantezler gerçek varyantlardır: "(on stability ball)", "(with rope)"
const MEDIA_ARTIFACT = /\s*\((male|female|back pov|side pov)\)/gi;
const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "up",
  "v.",
  "with",
  "w/",
]);

function titleCase(name) {
  const words = name.split(/\s+/);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower.replace(/^\(|\)$/g, ""))) return lower;
      // Tireli parçaların her bölümünü ayrı büyüt: "push-up" → "Push-Up"
      return lower.replace(
        /(^|[-(/])([a-zçğıöşü])/g,
        (m, p, c) => p + c.toUpperCase()
      );
    })
    .join(" ");
}

function normalizeName(name) {
  return titleCase(
    name.replace(MEDIA_ARTIFACT, "").replace(/\s+/g, " ").trim()
  );
}

// --- 4. Ekipman / kas sözlüğü ---------------------------------------------
const snake = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

// Veri setinin 28 ekipman değerinden, 006_exercise_seed.sql'deki mevcut
// sözlükten FARKLI yazılanlar. Kalanlar snake() ile zaten örtüşüyor.
const EQUIPMENT_ALIAS = {
  "body weight": "bodyweight",
  band: "resistance_band",
  "sled machine": "sled",
  roller: "foam_roller",
  "wheel roller": "ab_wheel",
  "olympic barbell": "barbell",
  "upper body ergometer": "ergometer",
  "skierg machine": "skierg",
  "elliptical machine": "elliptical",
  "stepmill machine": "stepmill",
};

const equipmentTerm = (s) =>
  EQUIPMENT_ALIAS[s.toLowerCase().trim()] ?? snake(s);

// Kas isimleri seed'in daha ayrıntılı sözlüğüne (pectoralis_major vb.) zorlanmaz —
// eşleme kayıplı olurdu. Yalnızca veri setindeki tek Türkçe sızıntı düzeltilir.
const MUSCLE_ALIAS = { kardiyovaskuler: "cardiovascular" };
const muscleTerm = (s) => MUSCLE_ALIAS[snake(s)] ?? snake(s);

// --- 5. Dönüştür + tekilleştir --------------------------------------------
const seen = new Map();
const stats = { toplam: raw.length, tekrar: 0, pattern: {}, unilateral: 0 };

for (const ex of raw) {
  const name = normalizeName(ex.name);
  const key = name.toLowerCase();
  if (seen.has(key)) {
    stats.tekrar++;
    continue; // aynı isimden yalnızca ilki
  }

  const isUnilateral = UNILATERAL.test(ex.name);
  const pattern = resolvePattern(ex, isUnilateral);
  if (isUnilateral) stats.unilateral++;
  stats.pattern[pattern] = (stats.pattern[pattern] ?? 0) + 1;

  const primary = ex.target ? [muscleTerm(ex.target)] : [];
  const secondary = [...new Set((ex.secondary ?? []).map(muscleTerm))].filter(
    (m) => !primary.includes(m)
  );

  seen.set(key, {
    name,
    pattern,
    primary,
    secondary,
    equipment: ex.equipment ? [equipmentTerm(ex.equipment)] : [],
    loadType: resolveLoadType(ex),
    isUnilateral,
  });
}

// --- 6. SQL üret -----------------------------------------------------------
const q = (s) => `'${s.replace(/'/g, "''")}'`;
const arr = (a) => (a.length ? `array[${a.map(q).join(",")}]` : `'{}'::text[]`);

const rows = [...seen.values()]
  .sort(
    (a, b) => a.pattern.localeCompare(b.pattern) || a.name.localeCompare(b.name)
  )
  .map(
    (r) =>
      `  (${q(r.name)}, ${q(r.pattern)}, ${arr(r.primary)}, ${arr(r.secondary)}, ` +
      `${arr(r.equipment)}, ${q(r.loadType)}, ${r.isUnilateral})`
  );

const out = `-- =============================================
-- 039_exercise_library_import.sql
-- Obsidian vault egzersiz veri setinin platform kütüphanesine aktarımı.
-- ÜRETİLDİ: scripts/import-exercise-library.mjs — ELLE DÜZENLEME.
--
-- Kaynak: ${stats.toplam} kayıt → ${seen.size} tekil egzersiz (${stats.tekrar} tekrarlı isim elendi)
-- Alınmayan alanlar: name_tr, instructions (steps_tr), demo_url (media_id), sport_tags
-- Mevcut 135 seed egzersiziyle isim çakışması 038'deki unique index üzerinden
-- ON CONFLICT DO NOTHING ile atlanır — seed kaydı korunur.
-- =============================================

insert into platform_exercises
  (name, movement_pattern, primary_muscles, secondary_muscles,
   equipment, load_type, is_unilateral)
values
${rows.join(",\n")}
on conflict ((lower(name))) do nothing;
`;

process.stdout.write(out);

console.error(
  `[import] ${stats.toplam} kayıt → ${seen.size} tekil (${stats.tekrar} elendi)`
);
console.error(`[import] tek taraflı: ${stats.unilateral}`);
console.error(
  `[import] pattern dağılımı:\n${Object.entries(stats.pattern)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `           ${k}: ${v}`)
    .join("\n")}`
);
