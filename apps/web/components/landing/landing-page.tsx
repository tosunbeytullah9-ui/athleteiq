import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Inter, Inter_Tight } from "next/font/google";
import { ArrowDown, ArrowRight, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { SiteNav } from "./site-nav";
import { SectionBg } from "./section-bg";
import { ParallaxController, Reveal } from "./landing-effects";
import { BrowserFrame, PhoneFrame } from "./device-frames";
import { FeatureVideo } from "./feature-video";
import { CoachTour } from "./coach-tour";
import { LANDING_BG, LANDING_SHOTS, landingVideo } from "./assets";
import { DemoRequestForm } from "./demo-request-form";

const display = Inter_Tight({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-landing-display",
});
const body = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-landing-body" });

/**
 * Oturumsuz ziyaretçinin gördüğü tanıtım sayfası. Giriş formu (#giris) sayfanın
 * parçasıdır — "/" ve "/login" aynı sayfayı render eder, böylece middleware'in
 * /login?next=... yönlendirmeleri çalışmaya devam eder.
 */
export function LandingPage() {
  return (
    <div
      id="top"
      className={cn(
        "landing dark relative min-h-screen overflow-x-clip bg-background text-foreground antialiased",
        display.variable,
        body.variable
      )}
    >
      <ParallaxController />
      <SiteNav />
      <main>
        <Hero />
        <PanelStrip />
        <CoachSection />
        <AthleteSection />
        <FlowSection />
        <AudienceSection />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── Ortak */

function Eyebrow({ index, children }: { index?: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {index && <span className="text-primary">{index}</span>}
      <span className="h-px w-8 bg-white/15" aria-hidden />
      {children}
    </p>
  );
}

function SectionShell({
  id,
  bg,
  bgPosition,
  className,
  children,
}: {
  id?: string;
  bg?: string;
  bgPosition?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("relative isolate scroll-mt-16", className)}>
      <SectionBg src={bg} position={bgPosition} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── Hero + giriş */

const READOUTS = [
  { label: "ACWR · 7/28 gün", value: "1,12", note: "optimal", tone: "bg-good" },
  { label: "Recovery · WHOOP", value: "68%", note: "bu sabah", tone: "bg-good" },
  { label: "Geri bildirim", value: "3 yeni", note: "1 ağrı", tone: "bg-critical" },
];

function Hero() {
  return (
    <SectionShell bg={LANDING_BG.hero} bgPosition="center 40%" className="pb-20 pt-28 sm:pt-32 lg:pb-28 lg:pt-40">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-16">
        <div>
          <Eyebrow>Kuvvet & Kondisyon · sporcu izleme</Eyebrow>
          <h1 className="font-display mt-6 text-[2.6rem] font-semibold leading-[1.02] sm:text-6xl lg:text-[4.6rem]">
            Programı yaz.
            <br />
            Yükü gör.
            <br />
            <span className="text-primary">Sporcunu dinle.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            AthleteIQ, koçun hazırladığı haftalık programı sporcunun telefonuna taşır. Antrenman
            sonrası RPE&apos;yi, sabah check-in&apos;ini ve WHOOP / Polar verisini geri getirir.
            Aradaki hesabı (yük, ACWR, risk) sistem yapar; karar sende kalır.
          </p>

          <dl className="mt-10 grid max-w-xl grid-cols-3 divide-x divide-white/10 border-y border-white/10">
            {READOUTS.map((r) => (
              <div key={r.label} className="px-3 py-4 first:pl-0 sm:px-5">
                <dt className="text-[11px] leading-tight text-muted-foreground">{r.label}</dt>
                <dd className="mt-1.5 font-display text-xl font-semibold tabular-nums sm:text-2xl">{r.value}</dd>
                <dd className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("h-1.5 w-1.5 rounded-full", r.tone)} aria-hidden />
                  {r.note}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <a href="#koc" className="inline-flex items-center gap-1.5 font-medium hover:text-primary">
              Koç gözünden <ArrowDown className="h-3.5 w-3.5" />
            </a>
            <a href="#sporcu" className="inline-flex items-center gap-1.5 font-medium hover:text-primary">
              Sporcu gözünden <ArrowDown className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div id="giris" className="scroll-mt-24 lg:pt-4">
          <div className="rounded-2xl border border-white/10 bg-card/70 p-6 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:p-8">
            <Suspense fallback={<div className="h-[22rem] animate-pulse rounded-lg bg-muted/40" />}>
              <LoginForm />
            </Suspense>
          </div>
          <p className="mt-4 px-1 text-xs leading-relaxed text-muted-foreground">
            Sporcu musun? Mobil uygulamada aynı kullanıcı adıyla giriş yaparsın; programın
            orada seni bekler.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────── Panel şeridi */

const PANEL_NOTES = [
  { n: "1", title: "Ağrı şeridi", body: "Sporcu ağrı bildirince her sayfanın üstünde durur; sen okuyana kadar kaybolmaz." },
  { n: "2", title: "Yük durumu", body: "Her sporcunun 7/28 günlük ACWR'ı ve son bir haftalık seyri; risk bölgesi renkle." },
  { n: "3", title: "Bugünün seansları", body: "Hangi grup hangi saatte, ne kadar süreyle; programdan kendiliğinden gelir." },
  { n: "4", title: "Son geri bildirimler", body: "RPE, süre ve not. Okunmamışlar mavi, ağrı bildirenler kırmızı nokta." },
];

/** Ekran görüntüsü üzerindeki numaralı işaretlerin konumu (yüzde). */
const PANEL_PINS = [
  { n: "1", left: "17.6%", top: "13.3%" },
  { n: "2", left: "41%", top: "49.8%" },
  { n: "3", left: "80%", top: "49.8%" },
  { n: "4", left: "81%", top: "76.9%" },
];

function PanelStrip() {
  return (
    <SectionShell className="pb-24 lg:pb-32">
      <Reveal>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Eyebrow>Koç paneli · perşembe 09:12</Eyebrow>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
              Haftanın durumu, antrenman başlamadan önünde.
            </h2>
          </div>
          <p className="text-muted-foreground lg:pb-1">
            Kim yüklendi, kim ağrı bildirdi, bugün hangi seanslar var; tek ekranda. RPE&apos;yi
            mesajlardan toplamak, Excel&apos;de ACWR hesaplamak yok.
          </p>
        </div>
      </Reveal>

      <Reveal className="mt-12" delay={120}>
        <div className="relative">
          <BrowserFrame url="app.athleteiq.app/dashboard">
            <Image
              src={LANDING_SHOTS.coachDashboard.src}
              width={LANDING_SHOTS.coachDashboard.width}
              height={LANDING_SHOTS.coachDashboard.height}
              alt="Koç paneli: ağrı uyarısı, sporcuların ACWR durumu, bugünün seansları ve son geri bildirimler"
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="h-auto w-full"
            />
          </BrowserFrame>
          {PANEL_PINS.map((p) => (
            <span
              key={p.n}
              aria-hidden
              className="absolute hidden h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-[0_0_0_6px_hsl(217_91%_60%/0.18)] md:flex"
              style={{ left: p.left, top: p.top }}
            >
              {p.n}
            </span>
          ))}
        </div>
      </Reveal>

      <ol className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {PANEL_NOTES.map((note, i) => (
          <Reveal as="li" key={note.n} delay={i * 80} className="border-t border-white/10 pt-4">
            <p className="flex items-center gap-2.5 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                {note.n}
              </span>
              {note.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{note.body}</p>
          </Reveal>
        ))}
      </ol>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────── 01 / Koç */

function CoachSection() {
  return (
    <SectionShell id="koc" className="border-t border-white/5 py-24 lg:py-32">
      <Reveal className="max-w-3xl">
        <Eyebrow index="01">Koç gözünden</Eyebrow>
        <h2 className="font-display mt-5 text-3xl font-semibold leading-tight sm:text-5xl">
          Bir haftanın işi, dört ekranda.
        </h2>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          Aşağıdaki kayıtlar uygulamanın kendisinden; adlar ve değerler demo kulübüne ait.
          Bir adımı seçersen o ekrana geçer.
        </p>
      </Reveal>
      <Reveal className="mt-14" delay={100}>
        <CoachTour />
      </Reveal>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────── 02 / Sporcu */

function AthleteSection() {
  const phones = [
    {
      when: "Sabah",
      title: "Recovery",
      body: "WHOOP ya da Polar bağlıysa uyku, HRV ve recovery her sabah kendiliğinden gelir. Koç da aynı veriyi görür.",
      media: (
        <Image
          src={LANDING_SHOTS.athleteRecovery.src}
          width={LANDING_SHOTS.athleteRecovery.width}
          height={LANDING_SHOTS.athleteRecovery.height}
          alt="Sporcunun telefonunda WHOOP recovery ekranı: recovery skoru 68, HRV, dinlenik nabız ve uyku"
          sizes="300px"
          className="h-full w-full object-cover"
        />
      ),
    },
    {
      when: "Antrenman sonrası",
      title: "10 saniyelik değerlendirme",
      body: "Durum, RPE, gerçek süre, gerekiyorsa ağrı bölgesi. Gönder'e bastığında koçun ekranında, yükü ACWR'da.",
      media: (
        <FeatureVideo
          sources={landingVideo("athlete-rpe")}
          label="Sporcu antrenmanı değerlendiriyor: RPE, süre ve ağrı bildirimi"
          className="h-full object-cover"
        />
      ),
      raised: true,
    },
    {
      when: "Her gün",
      title: "Check-in",
      body: "Uyku, kas ağrısı, yorgunluk, stres, ruh hali. Beş soru, 1–5 arası. Düşük puanlar koçun panelinde öne çıkar.",
      media: (
        <Image
          src={LANDING_SHOTS.athleteWellness.src}
          width={LANDING_SHOTS.athleteWellness.width}
          height={LANDING_SHOTS.athleteWellness.height}
          alt="Sporcunun günlük wellness check-in ekranı: beş madde, 1–5 ölçek"
          sizes="300px"
          className="h-full w-full object-cover"
        />
      ),
    },
  ];

  return (
    <SectionShell id="sporcu" bg={LANDING_BG.athlete} bgPosition="center 60%" className="border-t border-white/5 py-24 lg:py-32">
      <Reveal className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-end">
        <div>
          <Eyebrow index="02">Sporcu gözünden</Eyebrow>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight sm:text-5xl">
            Sporcunun telefonunda üç şey var.
          </h2>
        </div>
        <p className="text-muted-foreground lg:pb-2">
          Programı, sabahı ve değerlendirmesi. Uygulamayı açtığında bugünün seansı ve yükleri
          kendi max&apos;ına göre hesaplanmış olarak karşısında.
        </p>
      </Reveal>

      <div className="mt-16 grid gap-14 md:grid-cols-3 md:gap-8 lg:gap-12">
        {phones.map((p, i) => (
          <Reveal key={p.title} delay={i * 120} className={cn(p.raised && "md:-mt-8")}>
            <PhoneFrame>{p.media}</PhoneFrame>
            <div className="mx-auto mt-8 max-w-[300px]">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{p.when}</p>
              <p className="font-display mt-2 text-xl font-semibold">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────── 03 / Döngü */

const FLOW = [
  { who: "Koç", what: "Programı yayınlar", tag: "program · realtime" },
  { who: "Sporcu", what: "Telefonunda görür", tag: "< 2 sn" },
  { who: "Sporcu", what: "RPE ve süreyi bildirir", tag: "RPE × dk = AU" },
  { who: "Sistem", what: "Yükü ve ACWR'ı günceller", tag: "akut 7 g · kronik 28 g" },
  { who: "Koç", what: "Uyarıyı görür, yanıtlar", tag: "ağrı → anlık uyarı" },
];

function FlowSection() {
  return (
    <SectionShell id="nasil" bg={LANDING_BG.flow} className="border-t border-white/5 py-24 lg:py-32">
      <Reveal className="max-w-3xl">
        <Eyebrow index="03">Nasıl çalışır</Eyebrow>
        <h2 className="font-display mt-5 text-3xl font-semibold leading-tight sm:text-5xl">
          Döngü kapalı: veri koçtan çıkar, sporcudan geri döner.
        </h2>
      </Reveal>

      <Reveal className="mt-16" delay={100}>
        <ol className="relative grid gap-0 lg:grid-cols-5">
          {/* Masaüstünde düğümleri bağlayan çizgi */}
          <span aria-hidden className="absolute left-0 right-0 top-[18px] hidden h-px bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 lg:block" />
          {FLOW.map((step, i) => (
            <li key={step.what} className="relative flex gap-5 pb-10 lg:block lg:pb-0 lg:pr-6">
              {/* Mobilde dikey çizgi */}
              {i < FLOW.length - 1 && (
                <span aria-hidden className="absolute bottom-0 left-[17px] top-9 w-px bg-white/10 lg:hidden" />
              )}
              <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-background font-mono text-xs font-semibold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="lg:mt-6">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{step.who}</p>
                <p className="font-display mt-1 text-lg font-semibold leading-snug">{step.what}</p>
                <p className="mt-3 inline-block rounded border border-white/10 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {step.tag}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal className="mt-16 grid gap-8 border-t border-white/10 pt-10 md:grid-cols-3" delay={160}>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Wearable verisi aynı döngüye girer.</span>{" "}
          WHOOP webhook ile kendiliğinden, Polar ve Fitbit tek tuşla senkronize olur; hepsi tek
          bir günlük metrik şemasında birleşir.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Günde iki seans varsa</span> yük
          ağırlıklı RPE ile tek satırda toplanır; ACWR&apos;ı izleyen 28 gün geriye dönük olarak
          tazelenir.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Koçun düzeltmesi önceliklidir.</span>{" "}
          Elle girilmiş bir gün, sporcudan sonradan gelen bildirimle değişmez; tabloda ayrı
          rozetle görünür.
        </p>
      </Reveal>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────── Kimler için */

type Cell = boolean | string;
const ACCESS: { role: string; cells: Cell[] }[] = [
  { role: "Org yöneticisi", cells: [true, true, true, true, "—"] },
  { role: "Koç", cells: ["Kendi takımı", true, true, true, "—"] },
  { role: "Sporcu", cells: [false, false, "Yalnızca okur", "Kendi seansı", true] },
];
const ACCESS_COLS = ["Takımlar", "Sporcu ekleme", "Program", "Geri bildirim", "Kendi verisi"];

function AccessCell({ value }: { value: Cell }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-good" aria-label="Var" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="Yok" />;
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

const AUDIENCES = [
  {
    title: "Federasyon & milli takım",
    body: "Branşlar ayrı takım, her takımın kendi koçu. Yönetici tüm takımları görür; koç yalnızca kendi sporcusunu. Kamp ve yarışma takvimi yıllık plana kendiliğinden işlenir.",
  },
  {
    title: "Kulüp",
    body: "Alt yapıdan A takımına aynı sistem. Kadroyu ve 1RM'leri Excel'den yapıştırarak içe aktarırsın; mevki ve antrenman grubuna göre program görünürlüğü daralır.",
  },
  {
    title: "K&K koçu",
    body: "Kuvvet, WOD ve dayanıklılık seansları aynı oluşturucuda. Bir bloğu tüm haftalarıyla yeni sezona ya da başka bir sporcuya tek tuşla kopyalarsın.",
  },
];

function AudienceSection() {
  return (
    <SectionShell id="kimler" className="border-t border-white/5 py-24 lg:py-32">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Reveal>
          <Eyebrow>Kimler için</Eyebrow>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
            Sahada, bir K&K koçunun ihtiyacından doğdu.
          </h2>
          <p className="mt-5 text-muted-foreground">
            Milli takım düzeyinde artistik cimnastik kuvvet ve kondisyon çalışmalarında, her
            gün kullanılarak geliştirildi. Özellik listesi bir toplantıdan değil, antrenman
            salonundan çıktı.
          </p>
          <div className="mt-10 space-y-8">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="border-l border-white/10 pl-5">
                <p className="font-display text-lg font-semibold">{a.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120} className="lg:pt-16">
          <p className="text-sm font-semibold">Kim neyi görür</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ayrım arayüzde değil veritabanında yapılır (satır düzeyinde güvenlik): koç başka
            takımın sporcusunu sorgulasa bile boş döner.
          </p>
          <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rol</th>
                  {ACCESS_COLS.map((c) => (
                    <th key={c} className="px-2 py-3 text-center text-xs font-medium text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ACCESS.map((row) => (
                  <tr key={row.role} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3.5 font-medium">{row.role}</td>
                    {row.cells.map((cell, i) => (
                      <td key={i} className="px-2 py-3.5 text-center">
                        <AccessCell value={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sporcunun wearable bağlantısı ve token&apos;ları yalnızca kendisine aittir; koç
            metrikleri görür, hesabı göremez.
          </p>
        </Reveal>
      </div>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────── Kapanış */

const NEXT_STEPS = [
  "Talebinizi okuyup 1–2 iş günü içinde e-postayla dönüyoruz.",
  "Kısa bir görüşmede branşınızı, takımlarınızı ve şu an nasıl çalıştığınızı konuşuyoruz.",
  "Organizasyonunuzu ve yönetici hesabınızı açıyoruz; kadro ve 1RM'ler Excel'den aktarılır.",
  "İlk haftalık programınızı birlikte yazıp sporcularınızın telefonuna gönderiyoruz.",
];

function Closing() {
  return (
    <SectionShell id="demo" bg={LANDING_BG.closing} className="border-t border-white/5 py-24 lg:py-32">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <Reveal>
          <Eyebrow>Demo talebi</Eyebrow>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight sm:text-5xl">
            Kulübünüz için hesap açalım.
          </h2>
          <p className="mt-5 max-w-xl text-muted-foreground">
            AthleteIQ&apos;da hesaplar kendi kendine açılmaz. Organizasyonunuzu biz kurarız,
            koç ve sporcularınızı yöneticiniz ekler; ilk programınızı birlikte yazarız.
          </p>
          <ol className="mt-10 space-y-5">
            {NEXT_STEPS.map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/40 font-mono text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed text-muted-foreground">{step}</p>
              </li>
            ))}
          </ol>
          <a
            href="#giris"
            className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary"
          >
            Hesabınız var mı? Giriş yapın <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-2xl border border-white/10 bg-card/70 p-6 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:p-8">
            <DemoRequestForm />
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} AthleteIQ · Türkiye&apos;de, sahada geliştirildi.</p>
        <div className="flex gap-5">
          <Link href="/privacy" className="hover:text-foreground">
            Gizlilik
          </Link>
          <a href="#demo" className="hover:text-foreground">
            Demo talebi
          </a>
        </div>
      </div>
    </footer>
  );
}
