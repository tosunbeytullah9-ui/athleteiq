// Parti 21-AI — anonimleştirilmiş payload. features.ts zaten TÜM tarihleri
// göreli (bugun, gun_-N) üretir — burada ayrıca bir tarih dönüşümü yapılmaz.
// Yalnızca allowlist'teki 4 alan (yas, cinsiyet, brans, features) LLM'e gider.

import type { Features } from "./features.ts";

export interface AthletePayloadInfo {
  birth_date: string | null;
  gender: string | null;
  // Branş = teams.discipline. 044_position_vs_training_group.sql'e kadar bu
  // athletes.position'dan okunuyordu; o alan artık MEVKİ tutuyor (Tight End,
  // RB) ve branşı hiç içermiyor, bu yüzden kaynak takıma taşındı.
  discipline: string | null;
}

export interface Payload {
  yas: number | null;
  cinsiyet: "kadin" | "erkek";
  brans: "artistik cimnastik" | "cimnastik";
  features: Features;
}

function calculateAge(birthDate: string, insightDate: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [iy, im, id] = insightDate.split("-").map(Number);
  let age = iy - by;
  if (im < bm || (im === bm && id < bd)) age -= 1;
  return age;
}

// Yalnızca 'female' -> 'kadin' eşleşir. 'male', 'other' ve null için 'erkek'
// varsayılır (doc yalnızca iki değer tanımlıyor) — menstrüel döngü hatırlatması
// (prompt.ts kural 6) yanlışlıkla tetiklenmesin diye emin olunmayan durumda
// güvenli taraf tercih edildi.
function mapGender(gender: string | null): "kadin" | "erkek" {
  return gender === "female" ? "kadin" : "erkek";
}

function mapBrans(discipline: string | null): "artistik cimnastik" | "cimnastik" {
  const upper = (discipline ?? "").toLocaleUpperCase("tr-TR");
  return upper.includes("ARTİSTİK") ? "artistik cimnastik" : "cimnastik";
}

export function buildPayload(
  athlete: AthletePayloadInfo,
  insightDate: string,
  features: Features
): Payload {
  return {
    yas: athlete.birth_date ? calculateAge(athlete.birth_date, insightDate) : null,
    cinsiyet: mapGender(athlete.gender),
    brans: mapBrans(athlete.discipline),
    features,
  };
}
