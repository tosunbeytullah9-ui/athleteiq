import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildPayload } from "./payload.ts";
import { computeFeatures } from "./features.ts";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const FORBIDDEN_KEYS = [
  "full_name",
  "username",
  "athlete_id",
  "id",
  "birth_date",
  "email",
  "notes",
  "org_id",
  "team_id",
];

// Gerçek bir DB satırı gibi fazladan (yasak) alanlar içeren fixture —
// buildPayload'a yalnızca izin verilen alanları okuyup okumadığını sınar.
const fixtureAthlete = {
  id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  athlete_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  org_id: "11111111-1111-1111-1111-111111111111",
  team_id: "22222222-2222-2222-2222-222222222222",
  full_name: "Elif Yılmaz",
  username: "elif.yilmaz",
  email: "elif.yilmaz@example.com",
  notes: "Dizinde eski bir sakatlık geçmişi var.",
  birth_date: "2008-05-01",
  gender: "female",
  position: "ARTİSTİK Cimnastik",
};

const insightDate = "2026-09-20";
const features = computeFeatures({
  insightDate,
  dailyMetrics: [
    {
      metric_date: insightDate,
      recovery_score: 70,
      hrv_rmssd: 40,
      resting_hr: 60,
      spo2: null,
      total_sleep_min: 420,
      sleep_score: 80,
      sleep_efficiency: 90,
      deep_sleep_min: 90,
      rem_sleep_min: 100,
      strain_score: 10,
      raw_data: null,
    },
  ],
  workouts: [],
  wellness: [],
  athlete: { birth_date: fixtureAthlete.birth_date, gender: fixtureAthlete.gender, position: fixtureAthlete.position },
});

Deno.test("payload: UUID regex'i eşleşmemeli", () => {
  const payload = buildPayload(fixtureAthlete, insightDate, features);
  const serialized = JSON.stringify(payload);
  assert(!UUID_RE.test(serialized));
});

Deno.test("payload: yasak anahtarlar bulunmamalı", () => {
  const payload = buildPayload(fixtureAthlete, insightDate, features);
  const serialized = JSON.stringify(payload);
  for (const key of FORBIDDEN_KEYS) {
    assert(
      !serialized.includes(`"${key}"`),
      `Yasak anahtar payload'da bulundu: ${key}`
    );
  }
});

Deno.test("payload: sporcu adı metin içinde geçmemeli", () => {
  const payload = buildPayload(fixtureAthlete, insightDate, features);
  const serialized = JSON.stringify(payload);
  assert(!serialized.includes("Elif"));
  assert(!serialized.includes("Yılmaz"));
});

Deno.test("payload: allowlist alanları doğru hesaplanır", () => {
  const payload = buildPayload(fixtureAthlete, insightDate, features);
  assertEquals(payload.yas, 18); // 2008-05-01 -> 2026-09-20 arası 18 yaş
  assertEquals(payload.cinsiyet, "kadin");
  assertEquals(payload.brans, "artistik cimnastik");
  assert(payload.features);
});
