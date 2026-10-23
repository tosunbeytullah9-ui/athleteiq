"use client";

import { MobileHeader, MobileScreen } from "./mobile-screen";

const WEEK = [
  { d: "Cum", v: 74 },
  { d: "Cmt", v: 81 },
  { d: "Paz", v: 88 },
  { d: "Pzt", v: 52 },
  { d: "Sal", v: 41 },
  { d: "Çar", v: 59 },
  { d: "Per", v: 68 },
];

function color(v: number) {
  return v >= 67 ? "#22c55e" : v >= 34 ? "#eab308" : "#ef4444";
}

function Ring({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color(score)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-green-600">{score}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  );
}

export function AthleteRecoveryScene() {
  const rows: [string, string][] = [
    ["HRV (RMSSD)", "71 ms"],
    ["İstirahat Kalp Hızı", "48 bpm"],
    ["Uyku Skoru", "84 / 100"],
    ["Toplam Uyku", "7.6 saat"],
    ["Strain (dün)", "13.8 / 21"],
  ];
  return (
    <MobileScreen active="recovery">
      <MobileHeader title="Recovery" subtitle="WHOOP · bu sabah 07:12'de senkronize edildi" />
      <div className="space-y-4 p-4">
        <div className="flex gap-2 rounded-xl bg-white p-1 shadow-sm">
          <span className="flex-1 rounded-lg bg-gray-900 py-2 text-center text-sm font-semibold text-white">WHOOP</span>
          <span className="flex-1 rounded-lg py-2 text-center text-sm font-semibold text-gray-400">Polar</span>
        </div>
        <div className="flex items-center gap-5 rounded-2xl bg-white p-5 shadow-sm">
          <Ring score={68} />
          <div>
            <p className="text-lg font-bold">Recovery Skoru</p>
            <p className="text-sm text-gray-500">Yeşil bölge — planlanan yük uygun.</p>
            <p className="mt-2 text-xs font-medium text-green-700">↑ dünden +9</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white px-4 py-1 shadow-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-gray-50 py-3 last:border-0">
              <span className="text-sm text-gray-500">{k}</span>
              <span className="text-sm font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-base font-semibold">Son 7 Gün</p>
          <div className="flex h-24 items-end justify-between gap-2">
            {WEEK.map((w) => (
              <div key={w.d} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-gray-500">{w.v}</span>
                <div className="w-full rounded-md" style={{ height: `${w.v * 0.7}%`, background: color(w.v) }} />
                <span className="text-[10px] text-gray-400">{w.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileScreen>
  );
}
