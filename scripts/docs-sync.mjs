#!/usr/bin/env node
// Dokümantasyon senkron script'i — CLAUDE.md'nin AUTO-GENERATED bloklarını
// canlı Supabase şeması + supabase/migrations/ + repo klasör ağacından üretir.
// Kullanım: pnpm docs:sync

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CLAUDE_MD_PATH = path.join(ROOT, "CLAUDE.md");
const TABLE_DESC_PATH = path.join(__dirname, "table-descriptions.json");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

const EXCLUDED_DIRS = new Set(["node_modules", ".git", "dist", ".next", ".turbo", ".expo"]);
const MAX_TREE_DEPTH = 3;

function loadRootEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) {
    throw new Error(
      `Root .env bulunamadı: ${envPath} — NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.`
    );
  }
  const env = {};
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      `Root .env'de NEXT_PUBLIC_SUPABASE_URL ve/veya SUPABASE_SERVICE_ROLE_KEY bulunamadı (${envPath}). ` +
        `Yeni bir credential icat etmiyoruz — mevcut .env doldurulmalı.`
    );
  }
  return { url, serviceRoleKey };
}

function getMigrationFiles() {
  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations klasörü bulunamadı: ${MIGRATIONS_DIR}`);
  }
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function getTableNamesFromMigrations(files) {
  const tableNames = new Set();
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?"?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi;
  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    let match;
    while ((match = re.exec(sql)) !== null) {
      tableNames.add(match[1].toLowerCase());
    }
  }
  return tableNames;
}

async function fetchExposedRelations(url, serviceRoleKey) {
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/`;
  let res;
  try {
    res = await fetch(endpoint, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/openapi+json",
      },
    });
  } catch (err) {
    throw new Error(`Şema introspection isteği başarısız (${endpoint}): ${err.message}`);
  }
  if (!res.ok) {
    throw new Error(`Şema introspection başarısız: ${res.status} ${res.statusText} (${endpoint})`);
  }
  const spec = await res.json();
  // Supabase Cloud Swagger 2.0 döner (definitions). components.schemas (OpenAPI 3)
  // yalnızca ileride format değişirse diye zararsız bir fallback.
  const defs = spec.definitions ?? spec.components?.schemas ?? null;
  if (!defs) {
    throw new Error(
      "OpenAPI yanıtında definitions/components.schemas bulunamadı — introspection formatı değişmiş olabilir."
    );
  }
  return new Set(Object.keys(defs));
}

// Canlı şemada görünen ama migration'larda "create table" ile bulunamayan isimler
// (örn. view'lar — bkz. org_trial_status) tablo listesine dahil edilmez, sadece uyarılır.
function resolveRealTables(liveRelations, migratedTables) {
  const real = [];
  const extras = [];
  for (const name of liveRelations) {
    if (migratedTables.has(name)) {
      real.push(name);
    } else {
      extras.push(name);
    }
  }
  if (extras.length > 0) {
    console.warn(
      `[docs-sync] Uyarı: canlı şemada olup migration'larda "create table" ile bulunamayan ${extras.length} ilişki ` +
        `(view/vb. olabilir), tablo listesine DAHİL EDİLMEDİ: ${extras.sort().join(", ")}`
    );
  }
  return real.sort();
}

function buildTree(dir, depth) {
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((e) => !EXCLUDED_DIRS.has(e.name))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const lines = [];
  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const suffix = entry.isDirectory() ? "/" : "";
    lines.push(`${connector}${entry.name}${suffix}`);
    if (entry.isDirectory() && depth < MAX_TREE_DEPTH) {
      const childPrefix = isLast ? "    " : "│   ";
      const childLines = buildTree(path.join(dir, entry.name), depth + 1);
      for (const childLine of childLines) {
        lines.push(childPrefix + childLine);
      }
    }
  });
  return lines;
}

function renderTreeBlock(rootDir) {
  const rootName = path.basename(rootDir);
  const lines = [`${rootName}/`, ...buildTree(rootDir, 1)];
  return ["```", ...lines, "```"].join("\n");
}

// scripts/table-descriptions.json'u okur, yeni tespit edilen tabloları boş
// description ile ekler (mevcut doldurulmuş açıklamalara asla dokunmaz).
function loadOrInitTableDescriptions(tableNames) {
  let data = {};
  const existed = existsSync(TABLE_DESC_PATH);
  if (existed) {
    data = JSON.parse(readFileSync(TABLE_DESC_PATH, "utf8"));
  }
  let changed = !existed;
  for (const name of tableNames) {
    if (!(name in data)) {
      data[name] = "";
      changed = true;
    }
  }
  if (changed) {
    const sorted = Object.fromEntries(Object.keys(data).sort().map((k) => [k, data[k]]));
    writeFileSync(TABLE_DESC_PATH, JSON.stringify(sorted, null, 2) + "\n");
    data = sorted;
  }
  return data;
}

function renderSchemaBlock(tableNames, descriptions) {
  return tableNames
    .map((name) => {
      const desc = descriptions[name];
      const text =
        desc && desc.trim().length > 0
          ? desc
          : "_(açıklama bekleniyor — scripts/table-descriptions.json doldurun)_";
      return `- **${name}** — ${text}`;
    })
    .join("\n");
}

function renderMigrationsBlock(files) {
  return files.map((f) => `- ${f}`).join("\n");
}

function replaceMarkerBlock(content, name, body) {
  const startTag = `<!-- AUTO-GENERATED:${name}:START -->`;
  const endTag = `<!-- AUTO-GENERATED:${name}:END -->`;
  const startIdx = content.indexOf(startTag);
  const endIdx = content.indexOf(endTag);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      `CLAUDE.md içinde "${name}" marker'ı bulunamadı (${startTag} ... ${endTag}). ` +
        `Marker'lar önce elle eklenmeli — script sessizce atlamaz.`
    );
  }
  const before = content.slice(0, startIdx + startTag.length);
  const after = content.slice(endIdx);
  return `${before}\n${body}\n${after}`;
}

async function main() {
  const { url, serviceRoleKey } = loadRootEnv();

  const migrationFiles = getMigrationFiles();
  const migratedTables = getTableNamesFromMigrations(migrationFiles);
  const liveRelations = await fetchExposedRelations(url, serviceRoleKey);
  const realTables = resolveRealTables(liveRelations, migratedTables);

  const descriptions = loadOrInitTableDescriptions(realTables);

  let claudeMd = readFileSync(CLAUDE_MD_PATH, "utf8");
  claudeMd = replaceMarkerBlock(claudeMd, "TREE", renderTreeBlock(ROOT));
  claudeMd = replaceMarkerBlock(claudeMd, "SCHEMA", renderSchemaBlock(realTables, descriptions));
  claudeMd = replaceMarkerBlock(claudeMd, "MIGRATIONS", renderMigrationsBlock(migrationFiles));
  claudeMd = replaceMarkerBlock(
    claudeMd,
    "SYNC_TIMESTAMP",
    `Son otomatik senkron: ${new Date().toISOString().slice(0, 10)}`
  );

  writeFileSync(CLAUDE_MD_PATH, claudeMd);

  console.log(
    `[docs-sync] Tamamlandı: ${realTables.length} tablo, ${migrationFiles.length} migration, CLAUDE.md güncellendi.`
  );
}

main().catch((err) => {
  console.error(`[docs-sync] HATA: ${err.message}`);
  process.exit(1);
});
