#!/usr/bin/env node
// Regresyon koruması: is_super_admin()'in user_metadata'yı yok saydığını doğrular.
// Bir kullanıcı auth.updateUser({ data: { platform_role: 'super_admin' } }) ile
// kendini yükseltmeye çalışırsa is_super_admin() hâlâ false dönmeli — yetki artık
// yalnızca app_metadata'dan (service role/admin API) okunuyor (bkz. CLAUDE.md §4.1,
// Parti 20-S). Bu script kendiliğinden çalıştırılmaz — çalıştırmadan önce test
// hesabının kimlik bilgilerini Beyto'dan al.
//
// Kullanım:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... TEST_USERNAME_EMAIL=... TEST_PASSWORD=... \
//     node scripts/security/check-metadata-escalation.mjs
//
// TEST_USERNAME_EMAIL demo org'daki bir TEST kullanıcısının giriş kimliği olmalı
// (ör. kullanici@slug.athleteiq.app) — asla gerçek bir sporcu/koç hesabı değil.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TEST_USERNAME_EMAIL = process.env.TEST_USERNAME_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_USERNAME_EMAIL || !TEST_PASSWORD) {
  fail(
    "Eksik ortam değişkeni. Gerekli: SUPABASE_URL, SUPABASE_ANON_KEY, TEST_USERNAME_EMAIL, TEST_PASSWORD."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function isSuperAdmin() {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) fail(`rpc('is_super_admin') hata verdi: ${error.message}`);
  return data === true;
}

async function main() {
  // 1) Giriş yap.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_USERNAME_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signInError) fail(`Giriş başarısız: ${signInError.message}`);

  try {
    // 2) rpc('is_super_admin') çağır; false bekle.
    if (await isSuperAdmin()) {
      fail("Test hesabı girişten ÖNCE zaten süper admin görünüyor — yanlış test hesabı kullanılıyor olabilir.");
    }

    // 3) updateUser({ data: { platform_role: 'super_admin' } }) çalıştır, ardından refreshSession().
    const { error: updateError } = await supabase.auth.updateUser({
      data: { platform_role: "super_admin" },
    });
    if (updateError) fail(`updateUser başarısız: ${updateError.message}`);

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) fail(`refreshSession başarısız: ${refreshError.message}`);

    // 4) rpc('is_super_admin') tekrar çağır; yine false bekle.
    const escalated = await isSuperAdmin();
    if (escalated) {
      fail(
        "user_metadata üzerinden yetki yükseltme MÜMKÜN — is_super_admin() app_metadata yerine hâlâ user_metadata okuyor olabilir."
      );
    }

    console.log("PASS: user_metadata.platform_role='super_admin' ayarlandıktan sonra is_super_admin() false döndü.");
  } finally {
    // 5) updateUser({ data: { platform_role: null } }) ile geri al.
    await supabase.auth.updateUser({ data: { platform_role: null } });
    await supabase.auth.signOut();
  }
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
