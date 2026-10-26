# apps/mobile/assets

> **YER TUTUCU — gönderimden önce değiştirilecek.** Buradaki `icon.png` ve
> `splash-icon.png` yalnızca build kırılmasın diye üretilmiş düz renkli (#1d4ed8)
> karelerdir, tasarım değildir (Parti 18A). Marka/ikon kararı verildiğinde aynı
> dosya adlarıyla değiştirin — `app.json` bu yolları zaten gösteriyor.

| Dosya | Kullanıldığı yer | Spesifikasyon |
|---|---|---|
| `icon.png` | `expo.icon` (App Store + ana ekran ikonu) | 1024×1024 PNG, **alpha kanalı YOK**, şeffaflık yok, köşe yuvarlatma yok (iOS maskeyi kendisi uygular). Alpha kanalı olan ikon App Store Connect yüklemesinde reddedilir. |
| `splash-icon.png` | `expo-splash-screen` plugin'i (`image`) | 1024×1024 PNG, şeffaf arka plan olabilir. Ekranda `imageWidth: 200` genişliğinde, `#1d4ed8` arka plan üzerinde ortalanır — logo bu renk üzerinde okunur olmalı. |

Alpha kanalını kontrol etmek için (macOS): `sips -g hasAlpha icon.png`.
