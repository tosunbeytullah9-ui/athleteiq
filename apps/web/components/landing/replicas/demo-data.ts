/**
 * Landing replika sahneleri için HAYALİ veri. Gerçek bir sporcuya ait hiçbir ad,
 * ölçüm veya not içermez — kayıtlar herkese açık sayfada yayınlanır (KVKK).
 * scripts/landing/demo-seed.mjs aynı adları "Demo Kulübü" org'una yazar, böylece
 * replika ile gerçek kayıt birbirinin yerine geçebilir.
 */

export const DEMO_COACH = { name: "Selin Er", initials: "SE", role: "Koç" };
export const DEMO_ATHLETE = { name: "Defne Arslan", initials: "DA", role: "Sporcu" };

export type Zone = "low" | "optimal" | "caution" | "high";

export interface DemoAthleteLoad {
  name: string;
  group: string;
  acwr: number;
  acute: number;
  chronic: number;
  trend: number[];
}

export function acwrZone(v: number): Zone {
  if (v < 0.8) return "low";
  if (v <= 1.3) return "optimal";
  if (v <= 1.5) return "caution";
  return "high";
}

export const ZONE_LABEL: Record<Zone, string> = {
  low: "Düşük",
  optimal: "Optimal",
  caution: "Dikkat",
  high: "Yüksek risk",
};

export const ZONE_CLASS: Record<Zone, string> = {
  low: "bg-sky-100 text-sky-800",
  optimal: "bg-green-100 text-green-800",
  caution: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

export const DEMO_LOADS: DemoAthleteLoad[] = [
  { name: "Defne Arslan", group: "Artistik · Kadın", acwr: 1.12, acute: 2410, chronic: 2152, trend: [0.96, 1.01, 1.04, 0.99, 1.06, 1.1, 1.12] },
  { name: "Kerem Yıldız", group: "Artistik · Erkek", acwr: 1.41, acute: 3020, chronic: 2142, trend: [1.05, 1.12, 1.18, 1.25, 1.3, 1.36, 1.41] },
  { name: "Ece Kaya", group: "Artistik · Kadın", acwr: 0.94, acute: 1880, chronic: 2000, trend: [1.02, 0.99, 0.97, 0.95, 0.96, 0.93, 0.94] },
  { name: "Mert Demir", group: "Artistik · Erkek", acwr: 1.58, acute: 3310, chronic: 2095, trend: [1.1, 1.18, 1.27, 1.33, 1.42, 1.5, 1.58] },
  { name: "Zeynep Çelik", group: "Sprint", acwr: 1.05, acute: 1720, chronic: 1638, trend: [1.0, 1.02, 1.0, 1.03, 1.04, 1.06, 1.05] },
  { name: "Arda Şahin", group: "Sprint", acwr: 0.72, acute: 1130, chronic: 1569, trend: [0.95, 0.9, 0.85, 0.81, 0.78, 0.74, 0.72] },
];

export interface DemoFeedback {
  id: string;
  athlete: string;
  session: string;
  program: string;
  status: string;
  rpe: number | null;
  duration: number | null;
  pain?: string;
  note?: string;
  unread: boolean;
  day: "today" | "yesterday";
}

export const DEMO_FEEDBACK: DemoFeedback[] = [
  {
    id: "f1",
    athlete: "Kerem Yıldız",
    session: "Halka + Kuvvet",
    program: "Hazırlık Bloğu · Hafta 3",
    status: "Yaptım",
    rpe: 8,
    duration: 95,
    pain: "Omuz (sağ)",
    note: "Kroslarda sağ omuzun önünde batma oldu, son iki seti hafif yaptım.",
    unread: true,
    day: "today",
  },
  {
    id: "f2",
    athlete: "Defne Arslan",
    session: "Kuvvet — Alt Ekstremite",
    program: "Hazırlık Bloğu · Hafta 3",
    status: "Yaptım",
    rpe: 7,
    duration: 70,
    note: "Ön squat 4×5 rahat geçti, bir sonraki hafta yük artabilir.",
    unread: true,
    day: "today",
  },
  {
    id: "f3",
    athlete: "Ece Kaya",
    session: "Denge Aleti — Teknik",
    program: "Hazırlık Bloğu · Hafta 3",
    status: "Eksik",
    rpe: 6,
    duration: 50,
    note: "Okuldan geç çıktım, ısınmayı kısa tuttum.",
    unread: true,
    day: "today",
  },
  {
    id: "f4",
    athlete: "Zeynep Çelik",
    session: "Hızlanma 6×30 m",
    program: "Sprint · Hafta 2",
    status: "Yaptım",
    rpe: 9,
    duration: 60,
    unread: false,
    day: "yesterday",
  },
];

export function rpeClass(rpe: number): string {
  if (rpe <= 3) return "bg-emerald-100 text-emerald-700";
  if (rpe <= 6) return "bg-amber-100 text-amber-700";
  if (rpe <= 8) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}
