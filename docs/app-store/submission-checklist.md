# App Review gönderim kontrol listesi

App Store Connect'te **"Submit for Review"a basmadan HEMEN ÖNCE** yapılır.
Demo hesaplar ve verisi: `scripts/landing/demo-seed.mjs` ("Demo Kulübü", slug
`demo`). İncelemeci için notlar: [`review-notes.md`](review-notes.md).

## 1. Demo veriyi yeniden seed et (veri tazeliği)

Tüm demo tarihleri seed anına göredir. Seed'den sonra **30 gün** boyunca her
iki rolün mobil ekranları doludur; script çıktısının sonunda "bu veri şu
tarihe kadar taze" tarihi yazar. **İstisna: Recovery (WHOOP) ekranı yalnızca
~7 gün** dolu kalır — mobil sorgu "son 7 gün"ü üst sınırsız okuduğu için
metrikler ileri tarihlenemiyor. Bu yüzden seed'i gönderimden en fazla birkaç
gün önce çalıştırın.

```bash
# kök dizinde — şifre koda/dokümana yazılmaz, yalnızca ortam değişkeni
LANDING_DEMO_PASSWORD='...' pnpm landing:seed
```

```powershell
# PowerShell
$env:LANDING_DEMO_PASSWORD = '...'; pnpm landing:seed
```

- [ ] Script `Demo Kulübü hazır` ile bitti, hata yok.
- [ ] Çıktıdaki "taze" tarihi, beklenen inceleme süresini rahatça kapsıyor.
- [ ] **Seed'i mümkünse Salı–Perşembe arası çalıştır.** Sporcu, koçun
      yanıtını mobilde yalnızca *içinde bulunulan haftanın* seanslarında görür
      (geçmiş haftalara gidilemiyor). Pazartesi seed'lenirse o hafta yalnızca
      bir seans geçmiş olur. İnceleme bir sonraki pazartesiye taşarsa yanıt
      mobilde görünmez; program, recovery ve yarışmalar etkilenmez.

> Seed çalıştırmak demo org'u tamamen siler ve yeniden kurar (incelemeci
> tarafından açılmış hesap silme talepleri ve kesilmiş WHOOP bağlantısı da
> temizlenir). Yalnızca `slug = 'demo'` org'una ve `@demo.athleteiq.app`
> hesaplarına dokunur.

## 2. İki hesapla mobilde giriş testi

Mağazaya gidecek build ile (TestFlight), **gerçek cihazda**:

- [ ] `defne.arslan@demo` + şifre → Program sekmesinde bu haftanın seansları,
      bugünün kartı vurgulu.
- [ ] Bir geçmiş seansın altında sporcunun geri bildirimi ve koçun yanıtı
      görünüyor.
- [ ] "Sabah Değerlendirmesi" kartı **"Bugün doldurulmadı"** gösteriyor
      (incelemeci kendisi doldurabilmeli).
- [ ] Recovery sekmesinde WHOOP metrikleri var (bugün ve son 7 gün).
- [ ] Yarışmalar sekmesinde yaklaşan ve geçmiş yarışmalar listeleniyor.
- [ ] Profil → "Hesabımı Sil" bölümü görünüyor.
- [ ] Çıkış → `koc.demo@demo` + şifre → Sporcularım listesi dolu → Defne
      Arslan → Program / Recovery / Yarışmalar dolu.
- [ ] Test sırasında "Bağlantıyı Kes" ya da "Hesabımı Sil"e basıldıysa
      **1. adımı tekrarla.**

## 3. Review Notes güncel mi

- [ ] App Store Connect → App Review Information → Notes alanı
      `review-notes.md`'nin güncel hali; `[APP_NAME]` doldurulmuş.
- [ ] Notlardaki ve "Sign-in required" alanındaki şifre, 1. adımda
      kullanılan `LANDING_DEMO_PASSWORD` ile **aynı**.
- [ ] Kullanıcı adları değişmedi: `defne.arslan@demo` (sporcu),
      `koc.demo@demo` (koç).

## 4. Landing görselleri

Aynı org landing görsellerinde de kullanılıyor. Seed sonrası
`pnpm landing:capture` gerekmez; çalıştırılırsa aynı şifreyle çalışır.
