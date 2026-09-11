export const metadata = {
  title: "Gizlilik Politikası — AthleteIQ",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed text-gray-700">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        AthleteIQ — Gizlilik Politikası
      </h1>
      <p className="mb-8 text-xs text-gray-400">Son güncelleme: 11 Eylül 2026</p>

      <p className="mb-6">
        AthleteIQ, sporcuların antrenman yükünü, toparlanma durumunu ve
        performans testlerini takip etmek amacıyla kullanılan, kapalı/dahili
        bir sporcu izleme platformudur. Bu sayfa, WHOOP wearable cihaz
        entegrasyonu üzerinden hangi verilerin toplandığını ve nasıl
        kullanıldığını açıklar.
      </p>

      <h2 className="mb-2 mt-6 text-base font-semibold text-gray-900">
        Hangi veriler toplanıyor?
      </h2>
      <p className="mb-2">
        Bir sporcu kendi WHOOP hesabını AthleteIQ&apos;ya bağladığında, WHOOP
        API üzerinden yalnızca şu veriler çekilir:
      </p>
      <ul className="mb-6 list-disc space-y-1 pl-5">
        <li>Recovery skoru, HRV (RMSSD), istirahat kalp hızı, SpO₂</li>
        <li>Uyku skoru, uyku evreleri (derin/REM), toplam uyku süresi</li>
        <li>Günlük strain skoru ve tahmini aktif kalori</li>
      </ul>

      <h2 className="mb-2 mt-6 text-base font-semibold text-gray-900">
        Bu veriler ne için kullanılıyor?
      </h2>
      <p className="mb-6">
        Veriler, sporcunun kendi antrenman yükü ile toparlanma durumunu
        birlikte değerlendirebilmesi ve koçunun buna göre programı
        uyarlayabilmesi için kullanılır. AthleteIQ dışında hiçbir üçüncü
        tarafla paylaşılmaz, satılmaz veya reklam amacıyla kullanılmaz.
      </p>

      <h2 className="mb-2 mt-6 text-base font-semibold text-gray-900">
        Kim erişebilir?
      </h2>
      <p className="mb-6">
        Bir sporcunun WHOOP verisine yalnızca kendisi, kendi takımının koçu
        ve organizasyonunun admin&apos;i erişebilir — bu, veritabanı
        seviyesinde (Row Level Security) teknik olarak uygulanır. Farklı bir
        takım veya organizasyondaki hiç kimse erişemez.
      </p>

      <h2 className="mb-2 mt-6 text-base font-semibold text-gray-900">
        Saklama ve silme
      </h2>
      <p className="mb-6">
        Veriler Supabase (yönetilen PostgreSQL) üzerinde, şifreli bağlantı
        üzerinden saklanır. Sporcu, mobil uygulamadaki Profil ekranından
        istediği zaman WHOOP bağlantısını kesebilir — bu işlem hem
        AthleteIQ&apos;daki erişim yetkisini hem de WHOOP tarafındaki OAuth
        yetkisini iptal eder. Sporcunun hesabı platformdan tamamen
        silinirse, ona ait tüm WHOOP verileri de otomatik olarak silinir.
      </p>

      <h2 className="mb-2 mt-6 text-base font-semibold text-gray-900">
        İletişim
      </h2>
      <p>
        Sorularınız için:{" "}
        <a
          href="mailto:tosunbeytullah9@gmail.com"
          className="text-blue-700 underline"
        >
          tosunbeytullah9@gmail.com
        </a>
      </p>
    </div>
  );
}
