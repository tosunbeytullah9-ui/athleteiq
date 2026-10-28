import type { Metadata } from "next";
import {
  PageTitle,
  PublicPageShell,
  TextLink,
  TextSection,
} from "@/components/legal/public-page-shell";
import { PRODUCT_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/brand";

// Parti 18C. Bu sayfanın URL'si App Store Connect'te destek URL'si olarak
// kayıtlı. Menü/düğme adları mobil uygulamadakiyle birebir aynı tutulmalı.

export const metadata: Metadata = {
  title: `Destek — ${PRODUCT_NAME}`,
  description: `${PRODUCT_NAME} hesabı, giriş, şifre, hesap silme ve WHOOP bağlantısı hakkında yardım.`,
  alternates: { canonical: `${SITE_URL}/support` },
};

const mailto = `mailto:${SUPPORT_EMAIL}`;

const FAQ = [
  {
    q: "Bireysel olarak kayıt olabilir miyim?",
    a: (
      <>
        Hayır. {PRODUCT_NAME} hesapları yalnızca kurumlar tarafından açılır. Kurumunuz{" "}
        {PRODUCT_NAME} kullanmıyorsa ve kullanmak istiyorsa ana sayfadaki{" "}
        <TextLink href="/#demo">demo talep formunu</TextLink> doldurabilir.
      </>
    ),
  },
  {
    q: "Antrenman programımı göremiyorum. Neden?",
    a: (
      <>
        Sporcular yalnızca antrenörün yayınladığı programları görür. Program henüz yayınlanmamış
        olabilir ya da takımınızda yalnızca belirli bir antrenman grubuna açılmış olabilir.
        Antrenörünüzle görüşün.
      </>
    ),
  },
  {
    q: "Kullanıcı adımı değiştirebilir miyim?",
    a: (
      <>
        Kullanıcı adını kurumunuzun yöneticisi değiştirebilir. Değişiklikten sonra yeni kullanıcı
        adınızla (<code className="rounded bg-muted px-1 py-0.5 text-[13px]">yeni-ad@kurum</code>)
        giriş yaparsınız; şifreniz değişmez.
      </>
    ),
  },
  {
    q: "Verilerimi kimler görebilir?",
    a: (
      <>
        Kendiniz, kendi takımınızın antrenörü ve kurumunuzun yöneticisi. Başka bir takım veya
        kurumdaki hiç kimse verilerinizi göremez. Ayrıntılar{" "}
        <TextLink href="/privacy">Gizlilik Politikası</TextLink>&apos;nda.
      </>
    ),
  },
  {
    q: "WHOOP bağlantısını kesersem verilerim silinir mi?",
    a: (
      <>
        Hayır. Bağlantıyı kesmek yeni veri alınmasını durdurur ve WHOOP yetkisini iptal eder; daha
        önce alınmış veriler kalır. Silinmelerini istiyorsanız kurumunuzla ya da bizimle iletişime
        geçin. Hesabınız silindiğinde cihaz verileriniz de silinir.
      </>
    ),
  },
] as const;

export default function SupportPage() {
  return (
    <PublicPageShell current="/support">
      <PageTitle
        title="Destek"
        subtitle={`${PRODUCT_NAME} hesabınız ve uygulamayla ilgili yardım`}
      />

      <div>
        <TextSection id="loadwell-nedir" title={`${PRODUCT_NAME} nedir?`}>
          <p>
            {PRODUCT_NAME}; federasyon, kulüp ve üniversite gibi spor kurumları için bir antrenman ve
            sporcu izleme platformudur. Antrenörler web panelinde antrenman programı hazırlar,
            antrenman yükünü ve toparlanmayı izler; sporcular programlarını mobil uygulamada görür,
            wellness anketini doldurur ve antrenmanlarını değerlendirir.
          </p>
        </TextSection>

        <TextSection id="hesap" title="Hesap nasıl alınır?">
          <p>
            Hesabınızı kurumunuz oluşturur; bireysel kayıt yoktur. Kurumunuzun yöneticisi veya
            antrenörünüz size bir kullanıcı adı ve şifre verir.
          </p>
        </TextSection>

        <TextSection id="giris" title="Giriş">
          <p>
            Giriş kimliğiniz{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[13px]">kullanici@kurum</code>{" "}
            biçimindedir; örneğin{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[13px]">ahmet.yilmaz@tgf</code>.
            Buradaki <strong>kurum</strong> kısmı kurumunuzun kısa kodudur; bu bir e-posta adresi
            değildir. Aynı kimlik ve şifreyle hem mobil uygulamaya hem web paneline giriş
            yapabilirsiniz.
          </p>
          <p>
            <strong>Şifrenizi unuttuysanız:</strong> uygulamada e-postayla şifre sıfırlama yoktur,
            çünkü hesaplar bir e-posta adresine bağlı değildir. Şifreniz şu sırayla sıfırlanır:
          </p>
          <ul>
            <li>Sporcuysanız antrenörünüze veya kurumunuzun yöneticisine başvurun.</li>
            <li>Antrenörseniz kurumunuzun yöneticisine başvurun.</li>
            <li>
              Kurum yöneticisiyseniz <TextLink href={mailto}>{SUPPORT_EMAIL}</TextLink> adresine
              yazın.
            </li>
          </ul>
          <p>Size yeni bir şifre verilir. Şifrenizi kimseyle, e-postayla bile paylaşmayın.</p>
        </TextSection>

        <TextSection id="hesap-silme" title="Hesap silme">
          <ol>
            <li>
              Mobil uygulamada <strong>Profil</strong> sekmesini açın.
            </li>
            <li>
              <strong>Hesap</strong> bölümündeki <strong>Hesabımı Sil</strong> düğmesine dokunun ve{" "}
              <strong>Talep Oluştur</strong> ile onaylayın.
            </li>
            <li>
              Talebiniz kurumunuzun yöneticisine iletilir ve <strong>en geç 30 gün</strong> içinde
              sonuçlandırılır. Bu sürede uygulamayı kullanmaya devam edebilir, aynı ekrandaki{" "}
              <strong>Talebi Geri Al</strong> ile vazgeçebilirsiniz.
            </li>
            <li>
              Onaylandığında hesabınız ve verileriniz kalıcı olarak silinir. Talep reddedilirse
              gerekçesi aynı ekranda görünür.
            </li>
          </ol>
          <p>
            Uygulamaya erişiminiz yoksa <TextLink href={mailto}>{SUPPORT_EMAIL}</TextLink> adresine
            kurumunuzun adını ve kullanıcı adınızı yazarak talepte bulunabilirsiniz. Neyin silindiği
            ve neyin kurumda kaldığı{" "}
            <TextLink href="/privacy#hesap-silme">Gizlilik Politikası</TextLink>&apos;nda
            açıklanır.
          </p>
        </TextSection>

        <TextSection id="whoop" title="WHOOP bağlantısı">
          <p>
            <strong>Bağlamak için:</strong> mobil uygulamada <strong>Profil</strong> →{" "}
            <strong>Cihaz Bağlantıları</strong> → WHOOP satırındaki <strong>Bağla</strong>{" "}
            düğmesine dokunun, açılan sayfada WHOOP hesabınızla giriş yapıp izin verin. Web
            panelinde aynı işlemi <strong>Wearable</strong> sayfasından yapabilirsiniz.
          </p>
          <p>
            <strong>Kaldırmak için:</strong> aynı yerdeki <strong>Bağlantıyı Kes</strong> düğmesini
            kullanın.
          </p>
          <p>Polar bağlantısı yalnızca web panelindeki Wearable sayfasından yapılır.</p>
        </TextSection>

        <TextSection id="iletisim" title="İletişim">
          <p>
            Sorularınız için <TextLink href={mailto}>{SUPPORT_EMAIL}</TextLink> adresine
            yazabilirsiniz. Mesajınızı en kısa sürede yanıtlamaya çalışırız. Hesabınızla ilgili
            sorularda kurumunuzun adını ve kullanıcı adınızı belirtmeniz işimizi kolaylaştırır;
            şifrenizi asla e-postayla göndermeyin.
          </p>
          <p>
            Antrenman programınız, yoklama veya takım kararlarıyla ilgili konularda önce
            antrenörünüze ya da kurumunuza başvurun.
          </p>
        </TextSection>

        <TextSection id="sss" title="Sık sorulan sorular">
          <dl className="space-y-6">
            {FAQ.map((item) => (
              <div key={item.q}>
                <dt className="font-medium text-foreground">{item.q}</dt>
                <dd className="mt-1.5">{item.a}</dd>
              </div>
            ))}
          </dl>
        </TextSection>
      </div>
    </PublicPageShell>
  );
}
