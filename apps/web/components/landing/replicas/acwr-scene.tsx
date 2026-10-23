"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReplicaShell } from "./replica-shell";
import { DEMO_COACH, ZONE_CLASS, ZONE_LABEL, acwrZone } from "./demo-data";

// 28 günlük hayali seyir: 3. haftada yük artışı, ACWR 1.4'e tırmanıyor.
const LOADS = [
  420, 0, 510, 380, 600, 450, 0, 480, 0, 560, 420, 640, 500, 0, 560, 300, 680, 520, 720, 560, 0,
  640, 380, 760, 620, 810, 700, 0,
];

const CHART = LOADS.map((load, i) => {
  const acute = LOADS.slice(Math.max(0, i - 6), i + 1).reduce((a, b) => a + b, 0) / 7;
  const chronic = LOADS.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1);
  const day = new Date(2026, 8, 26 + i);
  return {
    date: day.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }),
    sessionLoad: load || null,
    acwr: i >= 6 && chronic > 0 ? Number((acute / chronic).toFixed(2)) : null,
  };
});

const lastAcwr = CHART[CHART.length - 1]?.acwr ?? 1.41;

export function AcwrScene() {
  const zone = acwrZone(lastAcwr);
  return (
    <ReplicaShell role="coach" pathname="/acwr" user={DEMO_COACH}>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">ACWR Takibi</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Akut (7 gün) / kronik (28 gün) yük oranı — sRPE yöntemi
            </p>
          </div>
          <span className="rounded-md border bg-card px-3 py-2 text-sm font-medium">Kerem Yıldız ▾</span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { k: "Güncel ACWR", v: lastAcwr.toFixed(2), extra: ZONE_LABEL[zone] },
            { k: "Akut yük (7 g)", v: "3.910 AU" },
            { k: "Kronik yük (28 g)", v: "2.770 AU" },
            { k: "Son seans", v: "RPE 8 · 95 dk" },
          ].map((s) => (
            <Card key={s.k} className="rounded-xl">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground">{s.k}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-2xl font-bold tabular-nums">{s.v}</p>
                  {s.extra && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ZONE_CLASS[zone]}`}>
                      {s.extra}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ACWR Trendi — son 28 gün</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={CHART} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="acwr" domain={[0, 2]} tick={{ fontSize: 11 }} tickCount={5} />
                <YAxis yAxisId="load" orientation="right" tick={{ fontSize: 11 }} />
                <Legend
                  formatter={(value) =>
                    ({ acwr: "ACWR", sessionLoad: "Seans Yükü" } as Record<string, string>)[value] ?? value
                  }
                />
                <ReferenceLine yAxisId="acwr" y={0.8} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: "0.8", position: "right", fontSize: 10, fill: "#3b82f6" }} />
                <ReferenceLine yAxisId="acwr" y={1.3} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "1.3", position: "right", fontSize: 10, fill: "#f59e0b" }} />
                <ReferenceLine yAxisId="acwr" y={1.5} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "1.5", position: "right", fontSize: 10, fill: "#ef4444" }} />
                <Line yAxisId="acwr" type="monotone" dataKey="acwr" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3.5, fill: "#6366f1" }} connectNulls isAnimationActive={false} />
                <Line yAxisId="load" type="monotone" dataKey="sessionLoad" stroke="#94a3b8" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </ReplicaShell>
  );
}
