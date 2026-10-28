import type { Metadata } from "next";
import {
  PageTitle,
  PublicPageShell,
  TextLink,
  TextSection,
} from "@/components/legal/public-page-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LEGAL_NAME, PRODUCT_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/brand";

// Parti 18C. Bu sayfanın URL'si App Store Connect'te gizlilik politikası
// olarak kayıtlı; "Toplanan veriler" bölümü App Store gizlilik etiketiyle
// birebir aynı kategorileri saymalıdır — biri değişirse diğeri de değişir.

const LAST_UPDATED = "28 Ekim 2026";

export const metadata: Metadata = {
  title: `Gizlilik Politikası — ${PRODUCT_NAME}`,
  description: `${PRODUCT_NAME} hangi kişisel verileri hangi amaçla işler, kimlerle paylaşır ve hesabınızı nasıl silebilirsiniz.`,
  alternates: { canonical: `${SITE_URL}/privacy` },
};

const SECTIONS = [
  { id: "biz-kimiz", title: "Biz kimiz" },
  { id: "roller", title: "Veri sorumlusu ve veri işleyen" },
  { id: "toplanan-veriler", title: "Toplanan veriler" },
  { id: "amaclar", title: "Verileri ne için kullanıyoruz" },
  { id: "erisim", title: "Verilere kimler erişebilir" },
  { id: "hukuki-sebep", title: "Hukuki sebep" },
  { id: "hizmet-saglayicilar", title: "Hizmet sağlayıcılar ve yurt dışına aktarım" },
  { id: "saklama", title: "Saklama süresi" },
  { id: "hesap-silme", title: "Hesap silme" },
  { id: "haklariniz", title: "Haklarınız" },
  { id: "cocuklar", title: "18 yaş altı kullanıcılar" },
  { id: "cihazlar", title: "WHOOP ve diğer cihaz entegrasyonları" },
  { id: "cerezler", title: "Çerezler ve güvenlik" },
  { id: "degisiklikler", title: "Değişiklikler" },
  { id: "iletisim", title: "İletişim" },
] as const;

const PROVIDERS = [
  {
    name: "Supabase",
    purpose: "Veritabanı, kimlik doğrulama, sunucu fonksiyonları",
    location: "AB (Frankfurt, Almanya)",
  },
  { name: "Vercel", purpose: "Web sitesinin ve web panelinin barındırılması", location: "ABD" },
  {
    name: "Resend",
    purpose: "Sistem e-postaları (ör. hesap silme ve demo talebi bildirimleri)",
    location: "ABD",
  },
  {
    name: "Groq",
    purpose:
      "Yalnızca platform yöneticisinin kullandığı yapay zekâ analiz aracı; WHOOP verileri analiz için işlenebilir",
    location: "ABD",
  },
  { name: "WHOOP", purpose: "Yalnızca sporcu kendi WHOOP hesabını bağlarsa", location: "ABD" },
  {
    name: "Polar",
    purpose: "Yalnızca sporcu kendi Polar hesabını web panelinden bağlarsa",
    location: "Finlandiya merkezli",
  },
  {
    name: "Fitbit (Google)",
    purpose: "Yalnızca sporcu kendi Fitbit hesabını web panelinden bağlarsa",
    location: "ABD",
  },
] as const;

const mailto = `mailto:${SUPPORT_EMAIL}`;

export default function PrivacyPolicyPage() {
  return (
    <PublicPageShell current="/privacy">
      <PageTitle title="Gizlilik Politikası" subtitle={`Son güncelleme: ${LAST_UPDATED}`} />

      <nav
        aria-label="İçindekiler"
        className="mb-10 rounded-lg border bg-muted/40 p-4 text-sm"
      >
        <p className="mb-2 font-medium">İçindekiler</p>
        <ol className="grid list-decimal gap-x-6 gap-y-1 pl-5 text-muted-foreground sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="hover:text-foreground">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div>
        <TextSection id="biz-kimiz" title="1. Biz kimiz">
          <p>
            {PRODUCT_NAME}; federasyon, kulüp ve üniversite gibi spor kurumları için geliştirilmiş
            bir antrenman ve sporcu izleme platformudur. Web paneli ve mobil uygulamadan oluşur.
            Platformun geliştiricisi ve işleteni <strong>{LEGAL_NAME}</strong>&apos;dur (bireysel
            geliştirici).
          </p>
          <p>
            Hesapları kurumlar açar; uygulama içinden bireysel kayıt yapılamaz. Bu politika{" "}
            {PRODUCT_NAME} web sitesi, web paneli ve mobil uygulaması için geçerlidir.
          </p>
        </TextSection>

        <TextSection id="roller" title="2. Veri sorumlusu ve veri işleyen">
          <ul>
            <li>
              Kurumların platformda işlediği sporcu, antrenör ve antrenman verileri için{" "}
              <strong>veri sorumlusu ilgili kurumdur</strong>. {LEGAL_NAME} bu verileri kurum adına
              ve kurumun talimatları doğrultusunda <strong>veri işleyen</strong> olarak işler.
            </li>
            <li>
              Web sitesindeki demo talep formu ve destek yazışmaları için{" "}
              <strong>veri sorumlusu {LEGAL_NAME}&apos;dur</strong>.
            </li>
          </ul>
          <p>
            Bir kurum hesabıyla platformu kullanıyorsanız, verilerinizin hangi amaçla ve hangi
            hukuki sebeple işlendiğini kurumunuzun aydınlatma metni ayrıca açıklar.
          </p>
        </TextSection>

        <TextSection id="toplanan-veriler" title="3. Toplanan veriler">
          <p>Platform, kullanım şeklinize bağlı olarak aşağıdaki verileri işler:</p>
          <ul>
            <li>
              <strong>Kimlik ve hesap:</strong> ad soyad, kullanıcı adı / hesap kimliği, kurum ve
              takım üyeliği, rol (yönetici, antrenör, sporcu). Giriş kimliği{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[13px]">kullanici@kurum</code>{" "}
              biçimindedir; uygulama hesapları için gerçek e-posta adresi toplanmaz.
            </li>
            <li>
              <strong>Demografik:</strong> doğum tarihi, cinsiyet, boy, kilo.
            </li>
            <li>
              <strong>Sağlık:</strong> sabah wellness anketi (uyku kalitesi ve süresi, kas ağrısı,
              stres, yorgunluk, ruh hali), antrenman sonrası ağrı bildirimi ve ağrının bölgesi.
              Sporcu WHOOP hesabını bağlarsa ayrıca HRV, dinlenik nabız, SpO₂, recovery skoru ve uyku
              verileri.
            </li>
            <li>
              <strong>Fitness / antrenman:</strong> antrenman programları, RPE (algılanan zorluk),
              seans süresi ve antrenman yükü, yoklama, 1RM kayıtları, test ve yarışma sonuçları.
              Sporcu WHOOP hesabını bağlarsa ayrıca strain ve antrenman kayıtları.
            </li>
            <li>
              <strong>Kullanıcı içeriği:</strong> seans geri bildirimi notları, wellness notları,
              antrenör yanıtları ve antrenörlerin sporcu profiline eklediği notlar.
            </li>
            <li>
              <strong>Web sitesi demo formu:</strong> ad soyad, kurum adı, rol, branş (isteğe bağlı),
              sporcu sayısı (isteğe bağlı), e-posta adresi, telefon (isteğe bağlı), mesaj (isteğe
              bağlı) ve aydınlatma metni onayı. IP adresiniz saklanmaz; kötüye kullanımı önlemek
              için yalnızca geri döndürülemez bir özeti tutulur.
            </li>
            <li>
              <strong>Destek yazışmaları:</strong> bize e-posta gönderdiğinizde e-posta adresiniz ve
              mesajınızın içeriği.
            </li>
          </ul>
          <p>
            <strong>Toplanmayanlar:</strong> konum, rehber/kişiler, fotoğraf ve medya, satın alma
            geçmişi, reklam kimliği. Web sitesinde ve mobil uygulamada analitik, izleme veya çökme
            raporu yazılımı (SDK) kullanılmaz.
          </p>
        </TextSection>

        <TextSection id="amaclar" title="4. Verileri ne için kullanıyoruz">
          <p>Veriler yalnızca hizmetin sunulması için kullanılır:</p>
          <ul>
            <li>antrenman programlarının hazırlanması, sporcuya iletilmesi ve takibi,</li>
            <li>antrenman yükü ve toparlanma durumunun izlenmesi,</li>
            <li>antrenör ile sporcu arasındaki iletişim (geri bildirim, yanıt, ağrı uyarısı),</li>
            <li>hesapların oluşturulması ve yönetimi,</li>
            <li>hesap silme taleplerinin işlenmesi ve bunlara ilişkin bildirimler,</li>
            <li>demo taleplerine ve destek isteklerine dönüş yapılması.</li>
          </ul>
          <p>
            <strong>Reklam gösterilmez, izleme (tracking) yapılmaz, veriler satılmaz.</strong>{" "}
            Verileriniz başka şirketlerin uygulama veya web siteleriyle birleştirilmez.
          </p>
        </TextSection>

        <TextSection id="erisim" title="5. Verilere kimler erişebilir">
          <p>
            Bir sporcunun verilerini yalnızca sporcunun kendisi, kendi takımının antrenörü ve
            kurumunun yöneticisi görebilir. Farklı bir takım veya kurumdaki hiç kimse erişemez; bu
            kural veritabanı seviyesinde (Row Level Security) teknik olarak uygulanır.
          </p>
          <ul>
            <li>
              Adınız ve kullanıcı adınız, kurumunuzdaki diğer kullanıcılar tarafından görülebilir.
            </li>
            <li>
              Yarışmalar: sporcu yalnızca kendi kayıtlı olduğu yarışmaları ve kendi sonuçlarını
              görür; antrenörler ve yöneticiler kurumdaki tüm yarışmaları ve sonuçları görür.
            </li>
          </ul>
          <p>
            Platform yöneticisi ({LEGAL_NAME}) hizmetin işletilmesi, teknik destek ve aşağıda
            açıklanan yapay zekâ analiz aracı için verilere erişebilir.
          </p>
        </TextSection>

        <TextSection id="hukuki-sebep" title="6. Hukuki sebep">
          <p>
            Kişisel veriler, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) m.5 kapsamında,
            kurumun kendi aydınlatma metninde belirttiği hukuki sebeplere dayanılarak işlenir.
          </p>
          <p>
            Wellness anketi, ağrı bildirimi ve cihaz verileri gibi sağlık verileri KVKK m.6
            kapsamında <strong>özel nitelikli kişisel veridir</strong>. Bu verilerin işlenme
            şartlarının sağlanması veri sorumlusu olan kurumun sorumluluğundadır.
          </p>
          <p>
            Demo talep formu ve destek yazışmalarındaki veriler, talebinize dönüş yapılması için
            işlenir.
          </p>
        </TextSection>

        <TextSection id="hizmet-saglayicilar" title="7. Hizmet sağlayıcılar ve yurt dışına aktarım">
          <p>
            Hizmeti sunabilmek için aşağıdaki sağlayıcılardan yararlanılır. Bu sağlayıcılar
            verileri yalnızca kendilerine verilen hizmet kapsamında işler.
          </p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sağlayıcı</TableHead>
                  <TableHead>Ne için</TableHead>
                  <TableHead>Konum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PROVIDERS.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="align-top font-medium text-foreground">{p.name}</TableCell>
                    <TableCell className="align-top">{p.purpose}</TableCell>
                    <TableCell className="align-top">{p.location}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p>
            Yapay zekâ analiz aracına ad, kullanıcı adı, doğum tarihi, kurum veya takım bilgisi
            gönderilmez; yalnızca yaş, cinsiyet, branş ve WHOOP ile wellness verilerinden türetilen
            göstergeler, tarihler göreli hâle getirilerek gönderilir.
          </p>
          <p>
            Türkiye dışındaki (özellikle ABD&apos;deki) sağlayıcılara yapılan aktarımlar KVKK m.9
            kapsamındadır.
          </p>
        </TextSection>

        <TextSection id="saklama" title="8. Saklama süresi">
          <ul>
            <li>
              Hesap verileri, hesap aktif olduğu sürece saklanır. Hesap silme talebi onaylandığında
              hesap ve hesaba bağlı veriler kalıcı olarak silinir. Talepler en geç 30 gün içinde
              sonuçlandırılır.
            </li>
            <li>
              Antrenörlerin ve yöneticilerin hazırladığı antrenman programları kuruma aittir; bu
              kişilerin hesabı silindiğinde programlar kurumda kalır, yalnızca yazar bilgisi
              kaldırılır.
            </li>
            <li>
              Demo talepleri ve destek yazışmaları, talebinize dönüş ve takip için gerekli olduğu
              sürece saklanır; silinmesini her zaman e-postayla isteyebilirsiniz.
            </li>
            <li>
              Silinen veriler, hizmet sağlayıcının teknik yedeklerinde sınırlı bir süre daha
              kalabilir ve yedekleme döngüsü tamamlandığında silinir.
            </li>
          </ul>
        </TextSection>

        <TextSection id="hesap-silme" title="9. Hesap silme">
          <ol>
            <li>
              Mobil uygulamada <strong>Profil</strong> sekmesini açın, <strong>Hesap</strong>{" "}
              bölümündeki <strong>Hesabımı Sil</strong> düğmesine dokunun ve{" "}
              <strong>Talep Oluştur</strong> ile onaylayın.
            </li>
            <li>
              Talebiniz kurumunuzun yöneticisine iletilir ve en geç 30 gün içinde incelenir. Talep
              işlenene kadar uygulamayı kullanmaya devam edebilir, aynı ekrandaki{" "}
              <strong>Talebi Geri Al</strong> ile vazgeçebilirsiniz.
            </li>
            <li>
              Yönetici talebi onaylarsa hesabınız ile antrenman, wellness, test, yarışma ve cihaz
              verileriniz kalıcı olarak silinir; bu işlem geri alınamaz. Talep reddedilirse ret
              gerekçesi aynı ekranda gösterilir.
            </li>
          </ol>
          <p>
            Uygulamaya erişiminiz yoksa silme talebinizi{" "}
            <TextLink href={mailto}>{SUPPORT_EMAIL}</TextLink> adresine e-postayla iletebilirsiniz;
            e-postanızda kurumunuzun adını ve kullanıcı adınızı belirtin.
          </p>
        </TextSection>

        <TextSection id="haklariniz" title="10. Haklarınız (KVKK m.11)">
          <p>KVKK m.11 uyarınca şu haklara sahipsiniz:</p>
          <ul>
            <li>kişisel verilerinizin işlenip işlenmediğini öğrenme ve buna ilişkin bilgi talep etme,</li>
            <li>işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
            <li>eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
            <li>silinmesini veya yok edilmesini isteme,</li>
            <li>düzeltme ve silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
            <li>
              münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonuç ortaya
              çıkmasına itiraz etme,
            </li>
            <li>kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme.</li>
          </ul>
          <p>
            Kurum hesabınızla işlenen verilere ilişkin başvurularınızı öncelikle{" "}
            <strong>kurumunuza</strong> yapmanızı öneririz. Başvurunuzu ayrıca{" "}
            <TextLink href={mailto}>{SUPPORT_EMAIL}</TextLink> adresine de gönderebilirsiniz; kurum
            adına işlenen verilere ilişkin başvuruları ilgili kuruma iletir ve yanıtlanmasına destek
            oluruz. Demo formu ve destek yazışmalarına ilişkin başvuruları doğrudan yanıtlarız.
          </p>
        </TextSection>

        <TextSection id="cocuklar" title="11. 18 yaş altı kullanıcılar">
          <p>
            Hesapları kurumlar açar. 18 yaş altı sporcular için veli veya vasi onayının alınması
            hesabı açan kurumun sorumluluğundadır.
          </p>
        </TextSection>

        <TextSection id="cihazlar" title="12. WHOOP ve diğer cihaz entegrasyonları">
          <p>
            Cihaz bağlantısı isteğe bağlıdır ve yalnızca sporcunun kendisi tarafından yapılabilir.
            Bir sporcu kendi WHOOP hesabını bağladığında, WHOOP API üzerinden yalnızca şu veriler
            alınır:
          </p>
          <ul>
            <li>recovery skoru, HRV (RMSSD), dinlenik nabız, SpO₂,</li>
            <li>uyku skoru, uyku evreleri (derin/REM), toplam uyku süresi ve uyku verimliliği,</li>
            <li>günlük strain skoru ve tahmini aktif kalori,</li>
            <li>antrenman kayıtları (spor türü, süre, strain, ortalama/maksimum nabız, kalori).</li>
          </ul>
          <p>
            Bu veriler, sporcunun antrenman yükü ile toparlanma durumunu birlikte
            değerlendirebilmesi ve antrenörünün programı buna göre uyarlayabilmesi için kullanılır.
            WHOOP hesabınızın şifresi platforma hiçbir zaman iletilmez.
          </p>
          <p>
            Bağlantıyı istediğiniz zaman mobil uygulamada <strong>Profil</strong> →{" "}
            <strong>Cihaz Bağlantıları</strong> → <strong>Bağlantıyı Kes</strong> ile ya da web
            panelindeki <strong>Wearable</strong> sayfasından kesebilirsiniz. Bu işlem hem
            platformdaki erişim yetkisini hem de WHOOP tarafındaki yetkiyi iptal eder ve yeni veri
            alınmasını durdurur; daha önce alınmış veriler silinmez. Bu verilerin silinmesini
            kurumunuzdan veya <TextLink href={mailto}>{SUPPORT_EMAIL}</TextLink> adresinden
            isteyebilirsiniz. Hesabınız silindiğinde tüm cihaz verileriniz de silinir.
          </p>
          <p>
            Polar ve Fitbit bağlantıları yalnızca web panelinden yapılır ve aynı kurallara tabidir:
            bağlantı kurulursa uyku, nabız, HRV ve antrenman kayıtları alınır.
          </p>
        </TextSection>

        <TextSection id="cerezler" title="13. Çerezler ve güvenlik">
          <p>
            Web panelinde yalnızca oturumunuzu sürdürmek için gerekli çerezler kullanılır; tema gibi
            görünüm tercihleri tarayıcınızda saklanır. Reklam veya analitik çerezi kullanılmaz.
          </p>
          <p>
            Tüm bağlantılar şifrelidir (HTTPS). Mobil uygulamada oturum bilgisi cihazın güvenli
            depolama alanında tutulur. Barındırma sağlayıcıları, güvenlik ve hata ayıklama amacıyla
            IP adresi gibi teknik kayıtları sınırlı bir süre tutabilir.
          </p>
        </TextSection>

        <TextSection id="degisiklikler" title="14. Değişiklikler">
          <p>
            Bu politika güncellenebilir. Güncel sürüm her zaman bu sayfada, sayfanın başındaki
            güncelleme tarihiyle yayımlanır.
          </p>
        </TextSection>

        <TextSection id="iletisim" title="15. İletişim">
          <p>
            {LEGAL_NAME}
            <br />
            E-posta: <TextLink href={mailto}>{SUPPORT_EMAIL}</TextLink>
          </p>
          <p>
            Sık sorulan sorular ve hesapla ilgili yardım için{" "}
            <TextLink href="/support">Destek</TextLink> sayfasına bakabilirsiniz.
          </p>
        </TextSection>
      </div>
    </PublicPageShell>
  );
}
