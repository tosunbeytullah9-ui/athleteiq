/**
 * Landing medya dosyaları — public/landing/ altında. İsimler sabittir:
 * scripts/landing/record-replicas.mjs (replika) ve scripts/landing/capture.mjs
 * (gerçek uygulama) aynı dosyaların üzerine yazar, kodda değişiklik gerekmez.
 */
const SHOTS = "/landing/shots";
const VIDEO = "/landing/video";
const BG = "/landing/bg";

export const LANDING_SHOTS = {
  coachDashboard: { src: `${SHOTS}/coach-dashboard.webp`, width: 2880, height: 1800 },
  acwr: { src: `${SHOTS}/acwr.webp`, width: 2880, height: 1800 },
  annualPlan: { src: `${SHOTS}/annual-plan.webp`, width: 2880, height: 1800 },
  athleteRecovery: { src: `${SHOTS}/athlete-recovery.webp`, width: 780, height: 1688 },
  athleteWellness: { src: `${SHOTS}/athlete-wellness.webp`, width: 780, height: 1688 },
} as const;

export function landingVideo(name: "program-builder" | "coach-feedback" | "athlete-rpe") {
  return {
    mp4: `${VIDEO}/${name}.mp4`,
    webm: `${VIDEO}/${name}.webm`,
    poster: `${VIDEO}/${name}-poster.webp`,
  };
}

export const LANDING_BG = {
  hero: `${BG}/gym.webp`,
  athlete: `${BG}/track.webp`,
  flow: `${BG}/weights.webp`,
  closing: `${BG}/arena.webp`,
} as const;

/** Demo/hesap talepleri için iletişim adresi. */
export const CONTACT_EMAIL = "iletisim@athleteiq.app";
