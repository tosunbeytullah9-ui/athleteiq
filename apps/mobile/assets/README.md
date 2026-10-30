# apps/mobile/assets

Loadwell ikon ve splash görselleri (Parti 18E). PNG'ler elle düzenlenmez —
`brand/` altındaki SVG kaynaklarından üretilir.

## Kaynaklar (`brand/`)

Onaylı "1B · Eksen" tasarımı: beyaz L ekseni, yükselen yük çizgisi, yeşil uç noktası,
zemin `#1d4ed8` (`BRAND_COLOR`, `packages/validators/brand.ts`). Tasarım değişmedikçe
bu dosyalara dokunmayın.

| Dosya | Zemin | Kullanım |
|---|---|---|
| `brand/loadwell-mark.svg` | şeffaf | splash (zemin rengi `app.json`'dan gelir) |
| `brand/loadwell-icon.svg` | `#1d4ed8`, köşe yuvarlatma YOK | App Store / ana ekran ikonu, web `apple-icon.png` |
| `brand/loadwell-favicon.svg` | `#1d4ed8`, `rx=228` | web sekme ikonu (`apps/web/app/icon.svg`) — tarayıcı maskelemediği için yuvarlatılmış |

Uygulama içi işaret de aynı geometriyi kullanır: mobilde `components/BrandMark.tsx`,
web'de `apps/web/components/shared/brand-mark.tsx` — SVG değişirse onlar da değişir.

## Üretim

```
pnpm --filter @athleteiq/web exec node ../../scripts/brand/render-icons.mjs
```

`scripts/brand/render-icons.mjs` (sharp, `apps/web`'den çözülür) yalnızca şu dosyaları yazar
ve sonunda boyut + `hasAlpha` değerlerini yazdırır:

| Çıktı | Kaynak | Spesifikasyon |
|---|---|---|
| `icon.png` | `loadwell-icon.svg` | 1024×1024, **alfa kanalı YOK** (`flatten` + `removeAlpha`) — alfalı ikon App Store Connect'te reddedilir. iOS köşeleri kendisi maskeler. |
| `splash-icon.png` | `loadwell-mark.svg` | 1024×1024, şeffaf. `expo-splash-screen` bunu `imageWidth: 200` genişliğinde `#1d4ed8` zemin üzerinde ortalar. |
| `apps/web/app/apple-icon.png` | `loadwell-icon.svg` | 180×180, alfasız. |
| `apps/web/app/icon.svg` | `loadwell-favicon.svg` | birebir kopya. |

`icon.png` ve `apple-icon.png` için çıktıda `hasAlpha: false` görülmelidir.
