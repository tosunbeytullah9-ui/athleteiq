"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BrowserFrame } from "./device-frames";
import { FeatureVideo } from "./feature-video";
import { LANDING_SHOTS, landingVideo } from "./assets";

type Media =
  | { kind: "video"; name: "program-builder" | "coach-feedback" }
  | { kind: "image"; shot: keyof typeof LANDING_SHOTS };

const STEPS: { title: string; body: string; meta: string; url: string; media: Media }[] = [
  {
    title: "Programı kur",
    body: "Haftayı gün gün kur. Egzersizi kütüphaneden seç, yükü %1RM ile yaz; her sporcunun kayıtlı max'ından kilogram ayrı ayrı hesaplanır. Yayınla'ya bastığın an program sporcunun telefonunda.",
    meta: "Program oluşturucu",
    url: "app.athleteiq.app/programs/hafta-3",
    media: { kind: "video", name: "program-builder" },
  },
  {
    title: "Geri bildirimi oku, yanıtla",
    body: "Antrenman biter, RPE ve gerçek süre gelir. Ağrı bildirimi kırmızı bir şeritle düşer ve sen okuyana kadar ekranda kalır. Yazdığın yanıtı sporcu seans kartının altında görür.",
    meta: "Geri bildirim akışı",
    url: "app.athleteiq.app/feedback",
    media: { kind: "video", name: "coach-feedback" },
  },
  {
    title: "Yükü izle",
    body: "Sporcunun bildirdiği sRPE (RPE × dakika) ACWR'ı her gün kendisi günceller. 0,8–1,3 arası optimal, 1,5 üstü kırmızı. Senin elle girdiğin bir gün, sonradan gelen bildirimle ezilmez.",
    meta: "ACWR · akut 7 g / kronik 28 g",
    url: "app.athleteiq.app/acwr",
    media: { kind: "image", shot: "acwr" },
  },
  {
    title: "Sezonu planla",
    body: "Yıllık plan ızgarası: haftalar × antrenman sistemleri, hücrede o hafta kaç seans. Yarışmalar takvimden kendiliğinden düşer; bireysel planda yalnızca o sporcunun yarışmaları görünür.",
    meta: "Yıllık periyodizasyon",
    url: "app.athleteiq.app/annual-plans/2026-2027",
    media: { kind: "image", shot: "annualPlan" },
  },
];

const IMAGE_STEP_MS = 7000;

export function CoachTour() {
  const [active, setActive] = useState(0);
  const step = STEPS[active]!;

  // Görsel adımlar sabit sürede, video adımları video bitince ilerler.
  useEffect(() => {
    if (step.media.kind !== "image") return;
    const t = setTimeout(() => setActive((i) => (i + 1) % STEPS.length), IMAGE_STEP_MS);
    return () => clearTimeout(t);
  }, [active, step.media.kind]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:gap-14">
      <ol className="space-y-1">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active ? "step" : undefined}
              className={cn(
                "group relative w-full border-l py-5 pl-6 pr-2 text-left transition-colors",
                i === active ? "border-primary" : "border-white/10 hover:border-white/25"
              )}
            >
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "font-display text-lg font-semibold transition-colors",
                    i === active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {s.title}
                </span>
              </span>
              <span
                className={cn(
                  "grid transition-all duration-500",
                  i === active ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <span className="overflow-hidden pl-8 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="lg:pt-3">
        <BrowserFrame url={step.url}>
          {step.media.kind === "video" ? (
            <FeatureVideo
              sources={landingVideo(step.media.name)}
              label={`${step.title} — ekran kaydı`}
              loop={false}
              onEnded={() => setActive((i) => (i + 1) % STEPS.length)}
              className="aspect-[16/10] object-cover"
            />
          ) : (
            <Image
              src={LANDING_SHOTS[step.media.shot].src}
              width={LANDING_SHOTS[step.media.shot].width}
              height={LANDING_SHOTS[step.media.shot].height}
              alt={`${step.title} ekranı`}
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="aspect-[16/10] h-auto w-full object-cover object-top"
            />
          )}
        </BrowserFrame>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {step.meta} · demo verisi
        </p>
      </div>
    </div>
  );
}
