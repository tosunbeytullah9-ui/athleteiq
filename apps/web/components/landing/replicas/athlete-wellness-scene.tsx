"use client";

import { MobileHeader, MobileScreen } from "./mobile-screen";

const ITEMS: [string, string, string, number][] = [
  ["Uyku Kalitesi", "Çok kötü uyudum", "Çok iyi uyudum", 4],
  ["Kas Ağrısı", "Çok ağrılıyım", "Hiç ağrım yok", 3],
  ["Yorgunluk", "Çok yorgunum", "Çok dinçim", 4],
  ["Stres", "Çok stresliyim", "Hiç stresli değilim", 4],
  ["Ruh Hali", "Çok kötü", "Çok iyi", 5],
];

export function AthleteWellnessScene() {
  return (
    <MobileScreen active="program">
      <MobileHeader title="Günlük Check-in" subtitle="Perşembe, 23 Ekim · 6 gündür aralıksız" />
      <div className="space-y-3 p-4">
        {ITEMS.map(([title, low, high, value]) => (
          <div key={title} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-semibold">{title}</p>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-bold ${
                    n === value ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-gray-400">
              <span>{low}</span>
              <span>{high}</span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
          <span className="text-sm text-gray-500">Toplam</span>
          <span className="text-lg font-bold">20 / 25</span>
        </div>
      </div>
    </MobileScreen>
  );
}
