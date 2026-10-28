#!/usr/bin/env node
// RLS görünürlük + yazma matrisi snapshot'ı (Parti 18P). RLS'e dokunan HER parti bu
// script'i migration'dan ÖNCE ve SONRA çalıştırıp çıktıları --compare ile karşılaştırır;
// tek bir fark varsa migration geri alınır (bkz. CLAUDE.md §4.1).
//
// Her kullanıcı (auth.users'taki herkes + anon) için AYRI bir transaction açılır:
//   set_config('request.jwt.claims', ...) + set local role authenticated|anon
//   → okumalar (satır sayısı + md5 id listesi) + yazma matrisi (savepoint içinde)
//   → ROLLBACK. Script hiçbir koşulda COMMIT etmez (withRollback tek giriş noktasıdır).
//
// Kullanım:
//   node scripts/security/rls-visibility-snapshot.mjs --out <dosya.json>
//   node scripts/security/rls-visibility-snapshot.mjs --compare <önce.json> <sonra.json>
//
// Bağlantı: kökteki .env'deki SUPABASE_DB_URL (Session pooler). Bağlantı dizesi hiçbir
// çıktıya yazılmaz; hata mesajları redakte edilir. Çıktıda e-posta YOK — yalnızca
// kullanıcı id'si + rol.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Bu tablolar snapshot'a girer. Yeni bir RLS partisi kendi tablolarını buraya ekler.
const TABLES = ["training_programs", "training_sessions", "exercises", "exercise_sets"];
// Yalnızca OKUMA görünürlüğü ölçülen tablolar (Parti 18C-S) — yazma matrisi ve örnek
// bazlı probe'lar bu tablolara uygulanmaz (yazma politikalarına dokunan bir parti onları
// TABLES'a taşır). Okuma sonucu TABLES ile aynı biçimde reads[tablo] altına yazılır.
const READ_TABLES = [
  "whoop_cycles",
  "athlete_1rm_records",
  "polar_sync_state",
  "competitions",
  "competition_entries",
  "competition_results",
  "competition_stages",
];
const PARENT = {
  training_sessions: { col: "program_id", parent: "training_programs" },
  exercises: { col: "session_id", parent: "training_sessions" },
  exercise_sets: { col: "exercise_id", parent: "exercises" },
};

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const md5 = (s) => createHash("md5").update(s).digest("hex");
const idsHash = (ids) => ({ count: ids.length, md5: md5([...ids].sort().join(",")) });

let SECRET_PARTS = [];
function redact(msg) {
  let out = String(msg ?? "");
  for (const part of SECRET_PARTS) if (part) out = out.split(part).join("***");
  return out;
}

// ---------------------------------------------------------------------------
// Transaction disiplini — TEK giriş noktası. fn'e verilen q() COMMIT/END/PREPARE
// TRANSACTION/RELEASE ve çoklu ifade (;) içeren SQL'i reddeder; finally her zaman ROLLBACK.
// ---------------------------------------------------------------------------
const FORBIDDEN_FIRST_WORD = new Set(["commit", "end", "prepare", "release", "begin", "start"]);

async function withRollback(client, fn) {
  await client.query("begin");
  const q = (sql, params = []) => {
    const first = sql.trim().split(/\s+/)[0].toLowerCase();
    if (FORBIDDEN_FIRST_WORD.has(first) || sql.includes(";")) {
      throw new Error(`withRollback: izin verilmeyen ifade: ${first}`);
    }
    return client.query(sql, params);
  };
  try {
    return await fn(q);
  } finally {
    await client.query("rollback");
  }
}

// Savepoint içinde çalıştırır, sonucu ya da hata kodunu döndürür; her durumda geri alır.
async function probe(q, sql, params = []) {
  await q("savepoint p");
  try {
    const r = await q(sql, params);
    return { ok: true, rows: r.rowCount, ids: r.rows?.map((x) => x.id) ?? [] };
  } catch (e) {
    // Yalnızca SQLSTATE — mesaj kaydedilmez (aynı hata farklı fonksiyon adıyla gelebilir).
    return { ok: false, code: `ERR:${e.code ?? "unknown"}` };
  } finally {
    await q("rollback to savepoint p");
  }
}

// ---------------------------------------------------------------------------
// Örnekler: postgres olarak (RLS'siz), deterministik (id sırası). Her org için takım /
// bireysel / yayınlanmamış / antrenman gruplu program; her birinin ilk çocuğu.
// ---------------------------------------------------------------------------
async function pickSamples(client) {
  return withRollback(client, async (q) => {
    const programs = (
      await q(`
        select distinct on (org_id, kind) id, kind from (
          select id, org_id, case
            when training_group is not null then 'group'
            when not is_published then 'draft'
            when athlete_id is not null then 'athlete'
            else 'team' end kind
          from public.training_programs
        ) x order by org_id, kind, id`)
    ).rows.map((r) => r.id);
    const firstChild = async (table, col, parentIds) =>
      (
        await q(
          `select distinct on (${col}) id from public.${table} where ${col} = any($1::uuid[]) order by ${col}, id`,
          [parentIds]
        )
      ).rows.map((r) => r.id);
    const sessions = await firstChild("training_sessions", "program_id", programs);
    const exercises = await firstChild("exercises", "session_id", sessions);
    const sets = await firstChild("exercise_sets", "exercise_id", exercises);
    const ids = { training_programs: programs, training_sessions: sessions, exercises, exercise_sets: sets };
    // Klonlama için satırların tam JSON'u (INSERT matrisi).
    const rows = {};
    for (const t of TABLES) {
      rows[t] = (await q(`select to_jsonb(r) j from public.${t} r where id = any($1::uuid[]) order by id`, [ids[t]])).rows.map(
        (r) => r.j
      );
    }
    return { ids, rows };
  });
}

// Verinin kendisinin (RLS'siz, satır içeriğiyle) parmak izi — koşu başında ve sonunda.
// İki snapshot arasında canlı kullanım veriyi değiştirirse --compare farkları RLS'e değil
// veriye bağlayabilsin diye.
async function dataFingerprint(client) {
  return withRollback(client, async (q) => {
    const out = {};
    for (const t of [...TABLES, ...READ_TABLES]) {
      const r = await q(
        `select count(*)::int n, md5(coalesce(string_agg(md5(r::text), ',' order by r.id), '')) h from public.${t} r`
      );
      out[t] = { count: r.rows[0].n, md5: r.rows[0].h };
    }
    return out;
  });
}

async function listPrincipals(client) {
  return withRollback(client, async (q) => {
    const users = (
      await q(`
        select u.id, coalesce(u.raw_app_meta_data->>'platform_role', '') platform_role,
               m.role, a.id athlete_id
        from auth.users u
        left join public.memberships m on m.user_id = u.id
        left join public.athletes a on a.user_id = u.id
        order by u.id`)
    ).rows;
    return [{ id: null, role: "anon", platform_role: "", athlete_id: null }, ...users];
  });
}

async function snapshotPrincipal(client, p, samples) {
  return withRollback(client, async (q) => {
    await q("set local statement_timeout = '120s'");
    const claims = p.id ? { sub: p.id, role: "authenticated" } : { role: "anon" };
    await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await q(p.id ? "set local role authenticated" : "set local role anon");

    const out = { reads: {}, writes: {}, probes: {} };

    for (const t of TABLES) {
      const read = await probe(q, `select id from public.${t}`);
      out.reads[t] = read.ok ? idsHash(read.ids) : read.code;

      // Toplu yazma: etkisiz UPDATE (id = id) ve DELETE — düz rowCount (yalnızca UPDATE/DELETE
      // politikası) + RETURNING'li hash (SELECT politikası da devrede).
      const upd = await probe(q, `update public.${t} set id = id`);
      const updRet = await probe(q, `update public.${t} set id = id returning id`);
      const del = await probe(q, `delete from public.${t}`);
      const delRet = await probe(q, `delete from public.${t} returning id`);
      out.writes[t] = {
        update: upd.ok ? upd.rows : upd.code,
        update_returning: updRet.ok ? idsHash(updRet.ids) : updRet.code,
        delete: del.ok ? del.rows : del.code,
        delete_returning: delRet.ok ? idsHash(delRet.ids) : delRet.code,
      };

      // Örnek bazlı: tekil UPDATE / DELETE / INSERT (klon) / "taşıma" (WITH CHECK).
      const sampleIds = samples.ids[t];
      const per = {};
      for (let i = 0; i < sampleIds.length; i++) {
        const id = sampleIds[i];
        const row = samples.rows[t].find((r) => r.id === id);
        const next = samples.rows[t][(samples.rows[t].indexOf(row) + 1) % samples.rows[t].length];
        const r = {};
        r.update = await probe(q, `update public.${t} set id = id where id = $1`, [id]).then(fmt);
        r.delete = await probe(q, `delete from public.${t} where id = $1`, [id]).then(fmt);

        const clone = { ...row, id: undefined };
        delete clone.id;
        if (t === "exercise_sets") clone.set_number = 32000;
        r.insert = await probe(
          q,
          `insert into public.${t} select (jsonb_populate_record(null::public.${t}, $1::jsonb || jsonb_build_object('id', gen_random_uuid()))).*`,
          [JSON.stringify(clone)]
        ).then(fmt);

        if (t === "training_programs") {
          // Programı bir sonraki örneğin kapsamına (org/takım/sporcu) taşı.
          r.move = await probe(
            q,
            `update public.training_programs set org_id = $2, team_id = $3, athlete_id = $4, training_group = null where id = $1`,
            [id, next.org_id, next.team_id, next.athlete_id]
          ).then(fmt);
        } else {
          const { col } = PARENT[t];
          r.move = await probe(
            q,
            `update public.${t} set ${col} = $2${t === "exercise_sets" ? ", set_number = 32001" : ""} where id = $1`,
            [id, next[col]]
          ).then(fmt);
        }
        per[id] = r;
      }
      out.probes[t] = per;
    }

    for (const t of READ_TABLES) {
      const read = await probe(q, `select id from public.${t}`);
      out.reads[t] = read.ok ? idsHash(read.ids) : read.code;
    }

    // get_athlete_programs ↔ RLS eşdeğerliği (yalnızca rolü athlete olan kullanıcılar):
    // RPC kümesi == RLS ile görünen, arşivlenmemiş programlar.
    if (p.role === "athlete" && p.athlete_id) {
      const rpc = await probe(q, `select id from public.get_athlete_programs($1)`, [p.athlete_id]);
      const rlsRead = await probe(q, `select id from public.training_programs where is_archived = false`);
      const rls = rlsRead.ids;
      out.rpc_get_athlete_programs = !rlsRead.ok
        ? { error: rlsRead.code }
        : rpc.ok
        ? {
            rpc: idsHash(rpc.ids),
            rls_unarchived: idsHash(rls),
            equal: idsHash(rpc.ids).md5 === idsHash(rls).md5,
            only_in_rpc: rpc.ids.filter((x) => !rls.includes(x)).length,
            only_in_rls: rls.filter((x) => !rpc.ids.includes(x)).length,
          }
        : { error: rpc.code };
    }
    return out;
  });
}

const fmt = (r) => (r.ok ? r.rows : r.code);

// ---------------------------------------------------------------------------
async function runSnapshot(outFile) {
  loadEnv(path.join(root, ".env"));
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("SUPABASE_DB_URL kökteki .env'de yok.");
    process.exit(2);
  }
  try {
    const u = new URL(url);
    SECRET_PARTS = [url, decodeURIComponent(u.password), u.password].filter(Boolean);
  } catch {
    SECRET_PARTS = [url];
  }

  let client;
  try {
    client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    client.on("error", (e) => console.error("pg:", redact(e.message)));
    await client.connect();
  } catch (e) {
    console.error(
      e?.code === "ERR_INVALID_URL"
        ? "SUPABASE_DB_URL geçerli bir URL değil. Şifrede @ : / ? # % [ ] gibi karakterler varsa " +
            "URL-encode edilmeli (encodeURIComponent), [YOUR-PASSWORD] gibi yer tutucu kalmamalı."
        : `Bağlantı kurulamadı: ${redact(e?.message)}`
    );
    process.exit(2);
  }
  try {
    const fingerprintStart = await dataFingerprint(client);
    const samples = await pickSamples(client);
    const principals = await listPrincipals(client);
    const result = {
      generated_at: new Date().toISOString(),
      tables: TABLES,
      read_tables: READ_TABLES,
      data_fingerprint: fingerprintStart,
      samples: samples.ids,
      principals: [],
    };
    for (const p of principals) {
      const snap = await snapshotPrincipal(client, p, samples);
      result.principals.push({
        user_id: p.id,
        role: p.role ?? "(üyeliksiz)",
        platform_role: p.platform_role || undefined,
        ...snap,
      });
      process.stdout.write(".");
    }
    process.stdout.write("\n");
    result.data_fingerprint_end = await dataFingerprint(client);
    if (JSON.stringify(result.data_fingerprint_end) !== JSON.stringify(fingerprintStart)) {
      console.log("UYARI: koşu sırasında veri değişti (data_fingerprint ≠ data_fingerprint_end).");
    }
    writeFileSync(outFile, JSON.stringify(result, null, 2));
    // Oturum açmış bir kullanıcının okuma/RPC hatası almaması beklenir — varsa listele, exit 1.
    const loggedInErrors = result.principals
      .filter((p) => p.user_id)
      .flatMap((p) => [
        ...Object.entries(p.reads)
          .filter(([, v]) => typeof v === "string")
          .map(([t, v]) => `${p.user_id} [${p.role}] okuma ${t}: ${v}`),
        ...(p.rpc_get_athlete_programs?.error ? [`${p.user_id} [${p.role}] get_athlete_programs: ${p.rpc_get_athlete_programs.error}`] : []),
      ]);
    if (loggedInErrors.length) {
      console.log(`UYARI: oturum açmış kullanıcılarda ${loggedInErrors.length} okuma/RPC hatası:`);
      for (const e of loggedInErrors) console.log("  " + e);
      process.exitCode = 1;
    }
    const rpcRows = result.principals.filter((p) => p.rpc_get_athlete_programs);
    const rpcBad = rpcRows.filter((p) => !p.rpc_get_athlete_programs.equal);
    console.log(
      `${result.principals.length} kimlik (anon dahil) × ${TABLES.length} tablo (+${READ_TABLES.length} yalnızca okuma) yazıldı → ${path.relative(process.cwd(), outFile)}`
    );
    console.log(`get_athlete_programs == RLS: ${rpcRows.length - rpcBad.length}/${rpcRows.length} sporcu eşit`);
    for (const p of rpcBad) {
      const r = p.rpc_get_athlete_programs;
      console.log(`  ≠ ${p.user_id}: yalnızca RPC ${r.only_in_rpc}, yalnızca RLS ${r.only_in_rls}${r.error ? ` (hata ${r.error})` : ""}`);
    }
  } catch (e) {
    console.error("HATA:", redact(e.message));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

function runCompare(aFile, bFile) {
  const a = JSON.parse(readFileSync(aFile, "utf8"));
  const b = JSON.parse(readFileSync(bFile, "utf8"));
  const diffs = [];
  if (JSON.stringify(a.samples) !== JSON.stringify(b.samples)) diffs.push("örnek satırlar farklı (veri değişmiş olabilir)");
  const fpA = a.data_fingerprint_end ?? a.data_fingerprint;
  const fpB = b.data_fingerprint;
  if (fpA && fpB && JSON.stringify(fpA) !== JSON.stringify(fpB)) {
    console.log("UYARI: iki snapshot arasında VERİ değişti — farklar RLS'ten değil veriden kaynaklanıyor olabilir:");
    for (const t of [...a.tables, ...(a.read_tables ?? [])]) {
      if (JSON.stringify(fpA[t]) !== JSON.stringify(fpB[t])) console.log(`  ${t}: ${fpA[t]?.count} → ${fpB[t]?.count}`);
    }
  }
  const key = (p) => p.user_id ?? "anon";
  const bMap = new Map(b.principals.map((p) => [key(p), p]));
  for (const pa of a.principals) {
    const pb = bMap.get(key(pa));
    if (!pb) {
      diffs.push(`${key(pa)}: sonrakinde yok`);
      continue;
    }
    for (const section of ["reads", "writes", "probes"]) {
      for (const t of a.tables) {
        const x = JSON.stringify(pa[section]?.[t]);
        const y = JSON.stringify(pb[section]?.[t]);
        if (x !== y) diffs.push(`${key(pa)} [${pa.role}] ${section}.${t}: ${x?.slice(0, 160)} → ${y?.slice(0, 160)}`);
      }
    }
    // Yalnızca okuma ölçülen tablolar — iki dosyadan birinde listelenmişse karşılaştırılır.
    const readOnly = [...new Set([...(a.read_tables ?? []), ...(b.read_tables ?? [])])];
    for (const t of readOnly) {
      const x = JSON.stringify(pa.reads?.[t]);
      const y = JSON.stringify(pb.reads?.[t]);
      if (x !== y) diffs.push(`${key(pa)} [${pa.role}] reads.${t}: ${x?.slice(0, 160)} → ${y?.slice(0, 160)}`);
    }
  }
  for (const pb of b.principals) if (!a.principals.some((p) => key(p) === key(pb))) diffs.push(`${key(pb)}: öncekinde yok`);
  console.log(`${a.principals.length} kimlik karşılaştırıldı (reads + writes + probes).`);
  if (diffs.length === 0) {
    console.log("EŞDEĞER — fark yok.");
  } else {
    console.log(`${diffs.length} FARK:`);
    for (const d of diffs) console.log("  " + d);
    process.exitCode = 1;
  }
}

const args = process.argv.slice(2);
if (args[0] === "--compare" && args[1] && args[2]) {
  runCompare(args[1], args[2]);
} else if (args[0] === "--out" && args[1]) {
  await runSnapshot(path.resolve(args[1]));
} else {
  console.error("Kullanım: --out <dosya.json> | --compare <önce.json> <sonra.json>");
  process.exit(2);
}
