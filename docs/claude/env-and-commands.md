# Loadwell — Ortam Değişkenleri ve Geliştirme Komutları (CLAUDE.md §7, §8)

> CLAUDE.md'den Parti 18J'de (2026-11-13) **birebir** taşındı — metin ve § numaraları değişmedi.
> Diğer bölümlerin yeri için CLAUDE.md'deki "Başvuru dokümanları" haritasına bakın: [CLAUDE.md](../../CLAUDE.md).
> Kapsam: §7 ENVIRONMENT VARIABLES, §8 GELİŞTİRME KOMUTLARI.

---

## 7. ENVIRONMENT VARIABLES

```bash
# .env.example — Tüm değerleri doldur, asla commit etme

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ASLA client'a göndermef
SUPABASE_JWT_SECRET=xxx

# WHOOP (developer.whoop.com'dan al)
WHOOP_CLIENT_ID=xxx
WHOOP_CLIENT_SECRET=xxx
WHOOP_REDIRECT_URI=http://localhost:3000/api/wearables/whoop/callback
WHOOP_WEBHOOK_SECRET=xxx  # Webhook signature validation için

# Polar (admin.polaraccesslink.com'dan al)
POLAR_CLIENT_ID=xxx
POLAR_CLIENT_SECRET=xxx
POLAR_REDIRECT_URI=http://localhost:3000/api/wearables/polar/callback

# Email
RESEND_API_KEY=re_xxx

# Uygulama
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 8. GELİŞTİRME KOMUTLARI

```bash
# Kurulum (bir kez)
pnpm install
supabase start
supabase db reset  # migrations + seed çalıştırır

# Geliştirme
pnpm dev                    # Tüm uygulamalar (Turborepo)
pnpm dev --filter=web       # Sadece web
pnpm dev --filter=mobile    # Sadece mobile (Expo)

# Veritabanı
supabase db diff            # Şema değişikliklerini gör
supabase db push            # Migration'ları uygula
pnpm db:gen:types           # TypeScript tipleri üret

# Test
pnpm test                   # Tüm testler
pnpm test:rls               # Sadece RLS testleri
pnpm test:e2e               # Playwright E2E

# Build
pnpm build                  # Production build
eas build --platform all    # Mobile build (EAS)
```

> **EAS (Parti 18H):** `apps/mobile/eas.json` `node: 22.23.4` / `pnpm: 11.9.0` sabitlerini
> silmeyin — pnpm 11.9.0 `node >=22.13` ister, SDK 54 iOS imajının varsayılanı Node 20.19.4'tür.
> `submit.production.ios.ascAppId` girildi; `extra.eas.projectId` + `owner` kullanıcının
> `eas init`'iyle `app.json`'a yazılır. EAS env (`EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY`) build'den
> ÖNCE `production` ortamında olmalı — yoksa `lib/supabase.ts` açılışta çöker. Adımlar:
> `docs/app-store/eas-build-runbook.md`.

---

