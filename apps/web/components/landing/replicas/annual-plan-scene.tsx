"use client";

import { ReplicaShell } from "./replica-shell";
import { DEMO_COACH } from "./demo-data";

const METHODS = [
  "Genel Kuvvet",
  "Hipertrofi",
  "Max",
  "Contrast Training",
  "Pliometrik",
  "Hız / Hızlanma / Çeviklik",
  "Aerobik Dayanıklılık",
  "Anaerobik Dayanıklılık",
  "Kuvvette Devamlılık",
  "Deload",
];

const WEEKS = 20;
// Hafta → (yoğunluk %, faz)
const INTENSITY = [55, 60, 65, 70, 60, 70, 75, 80, 65, 80, 85, 90, 70, 85, 90, 95, 60, 100, 95, 60];
const PHASES: [number, number, string][] = [
  [1, 5, "Genel Hazırlık"],
  [6, 12, "Özel Hazırlık"],
  [13, 17, "Müsabaka Öncesi"],
  [18, 20, "Müsabaka"],
];
const COMPETITIONS: Record<number, string> = { 12: "Türkiye Şamp.", 18: "Dünya Kupası", 19: "Dünya Kupası" };

function sessions(m: number, w: number): number {
  const phase = w <= 5 ? 0 : w <= 12 ? 1 : w <= 17 ? 2 : 3;
  const deload = INTENSITY[w - 1]! <= 60 && w > 2;
  if (m === 9) return deload ? 3 : 0;
  if (deload) return m === 0 || m === 6 ? 1 : 0;
  const table = [
    [3, 2, 1, 1],
    [2, 1, 0, 0],
    [0, 1, 2, 1],
    [0, 1, 2, 2],
    [1, 2, 2, 1],
    [1, 2, 3, 2],
    [2, 1, 1, 0],
    [0, 1, 2, 1],
    [0, 0, 1, 2],
  ];
  return table[m]![phase]!;
}

const CELL = ["", "bg-primary/15 text-primary", "bg-primary/35 text-primary", "bg-primary/60 text-white", "bg-primary text-white"];

export function AnnualPlanScene() {
  return (
    <ReplicaShell role="coach" pathname="/annual-plans" user={DEMO_COACH}>
      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">Artistik Cimnastik · A Takımı</p>
          <h1 className="text-2xl font-bold">2026–2027 Sezon Planı</h1>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-48" />
              {Array.from({ length: WEEKS }, (_, i) => (
                <col key={i} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Faz</th>
                {PHASES.map(([a, b, label]) => (
                  <th key={label} colSpan={b - a + 1} className="border-l px-1 py-2 text-center font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Hafta</th>
                {Array.from({ length: WEEKS }, (_, i) => (
                  <th key={i} className={`border-l py-2 text-center font-semibold tabular-nums ${i === 2 ? "bg-primary/10 text-primary" : ""}`}>
                    {i + 1}
                  </th>
                ))}
              </tr>
              <tr className="border-b">
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Yarışmalar</th>
                {Array.from({ length: WEEKS }, (_, i) => (
                  <th key={i} className="border-l py-1.5 text-center">
                    {COMPETITIONS[i + 1] && (
                      <span className="block truncate rounded bg-amber-100 px-0.5 text-[10px] font-semibold text-amber-800" title={COMPETITIONS[i + 1]}>
                        ★
                      </span>
                    )}
                  </th>
                ))}
              </tr>
              <tr className="border-b">
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Yoğunluk</th>
                {INTENSITY.map((v, i) => (
                  <th key={i} className="border-l px-0.5 py-1.5 align-bottom">
                    <div className="mx-auto flex h-10 w-full items-end justify-center">
                      <div className="w-3 rounded-t bg-violet/70" style={{ height: `${v}%` }} />
                    </div>
                    <span className="block text-center text-[10px] font-normal tabular-nums text-muted-foreground">{v}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METHODS.map((m, mi) => (
                <tr key={m} className="border-b last:border-0">
                  <td className="truncate px-3 py-2 font-medium">{m}</td>
                  {Array.from({ length: WEEKS }, (_, w) => {
                    const n = sessions(mi, w + 1);
                    return (
                      <td key={w} className="border-l p-0.5">
                        <div className={`flex h-7 items-center justify-center rounded font-semibold tabular-nums ${CELL[Math.min(n, 4)]} ${mi === 4 && w === 8 ? "ring-2 ring-primary ring-offset-1" : ""}`}>
                          {n || ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Hücreye tıkla: +1 seans · Shift+tık: −1 · Hafta başlığı: yoğunluk, faz ve not
        </p>
      </div>
    </ReplicaShell>
  );
}
