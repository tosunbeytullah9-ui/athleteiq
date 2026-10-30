# EAS iOS production build — runbook

Loadwell (`apps/mobile`, Expo SDK 54, bundle ID `app.loadwell`). Komutların hepsi
**PowerShell**, `apps/mobile` dizininde çalışır. Giriş (Expo + Apple) etkileşimlidir.
Gizli değerleri bu dosyaya, commit'e veya sohbete yazmayın.

```powershell
cd C:\Projects\AthleteIQ\apps\mobile
```

## 1. Expo hesabı + proje bağlantısı (bir kez)

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
```

`init`, `app.json`'a `expo.extra.eas.projectId` ve `expo.owner` yazar — bu değişikliği
commit'leyin (`git add app.json; git commit -m "EAS projectId"`).

## 2. Ortam değişkenleri — `production` (bir kez)

`.env` git'e girmez, EAS'a yüklenmez. `eas.json` production profili
`"environment": "production"` kullanır, değerler buradan gelir. **Supabase değerleri
eksikse uygulama açılışta çöker** (`lib/supabase.ts`).

```powershell
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://<proje-ref>.supabase.co" --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon-key>" --visibility sensitive
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_APP_URL --value "https://loadwell.app" --visibility plaintext

npx eas-cli@latest env:list --environment production   # üçü de görünmeli
```

`EXPO_PUBLIC_*` değerleri JS paketine gömülür (uygulamayı indiren herkes okuyabilir),
bu yüzden `secret` görünürlüğü bunlar için anlamsız — `plaintext` / `sensitive` kullanın.

## 3. Build

```powershell
npx eas-cli@latest build -p ios --profile production
```

İlk build'de EAS, Apple hesabına girip dağıtım sertifikası ve provisioning profile
oluşturmayı önerir — **Yes** deyin (EAS yönetir). `buildNumber` uzaktan tutulur
(`appVersionSource: remote` + `autoIncrement`), elle artırmayın.

Durum:

```powershell
npx eas-cli@latest build:list --platform ios --limit 5
npx eas-cli@latest build:view            # son build'in ayrıntısı + log bağlantısı
```

## 4. App Store Connect'e gönderim

`eas.json` → `submit.production.ios.ascAppId` girili. Apple girişi etkileşimli.

```powershell
npx eas-cli@latest submit -p ios --latest
```

Yükleme sonrası build App Store Connect → TestFlight'ta 5–30 dk "Processing" kalır.
Gönderimden önce `submission-checklist.md`'yi TestFlight build'iyle yürütün.

## 5. En sık 5 hata

| Belirti                                                                            | Neden                                                                                                      | Çözüm                                                                                                              |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Install dependencies` adımında `ERR_PNPM_UNSUPPORTED_ENGINE` / pnpm kurulamıyor   | `eas.json`'daki `node` sabiti silinmiş — imajın Node 20.19.4'ü pnpm 11.9.0'ı (`node >=22.13`) çalıştıramaz | `"node": "22.23.4"` ve `"pnpm": "11.9.0"` profilde kalmalı; kökteki `packageManager` ile aynı pnpm sürümü          |
| `ERR_PNPM_OUTDATED_LOCKFILE` / `--frozen-lockfile` hatası                          | `package.json` değişti, `pnpm-lock.yaml` commit'lenmedi (veya `patches/` yaması değişti)                   | Kökte `pnpm install`, lockfile'ı commit'le, yeniden build                                                          |
| Uygulama TestFlight'ta açılır açılmaz kapanıyor                                    | EAS `production` ortamında `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` yok (`supabaseUrl is required`)        | Adım 2, `env:list` ile doğrula, **yeniden build** (env build anında gömülür)                                       |
| `Provisioning profile ... doesn't include ...` / sertifika hatası                  | Apple tarafında `app.loadwell` kaydı veya yetki eksik, ya da eski elle oluşturulmuş profil                 | `npx eas-cli@latest credentials -p ios` → production → profili/sertifikayı EAS'a yeniden oluşturt                  |
| `submit`: "The bundle version must be higher than the previously uploaded version" | Aynı buildNumber ikinci kez yüklendi                                                                       | `autoIncrement` açık — yeni bir `build` alıp onu gönderin; gerekirse `npx eas-cli@latest build:version:set -p ios` |

Build logunda hata `Run fastlane` / `Pod install` adımındaysa logu olduğu gibi paylaşın;
yerelde iOS derlemesi (Mac) olmadığından bu adımlar ancak EAS'ta görülebilir.
