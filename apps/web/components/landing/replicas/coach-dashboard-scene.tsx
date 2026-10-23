"use client";

import { CalendarDays, ClipboardList, MessageSquare, TrendingUp, Users, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReplicaShell } from "./replica-shell";
import {
  DEMO_COACH,
  DEMO_FEEDBACK,
  DEMO_LOADS,
  ZONE_CLASS,
  ZONE_LABEL,
  acwrZone,
  rpeClass,
} from "./demo-data";

function Spark({ values }: { values: number[] }) {
  const min = 0.6;
  const max = 1.7;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 80},${24 - ((v - min) / (max - min)) * 24}`)
    .join(" ");
  const last = values[values.length - 1] ?? 1;
  const zone = acwrZone(last);
  const stroke =
    zone === "high" ? "#dc2626" : zone === "caution" ? "#d97706" : zone === "low" ? "#0284c7" : "#16a34a";
  return (
    <svg viewBox="0 0 80 24" className="h-6 w-20" aria-hidden>
      <rect x="0" y={24 - ((1.3 - min) / (max - min)) * 24} width="80" height={((1.3 - 0.8) / (max - min)) * 24} fill="#16a34a" opacity="0.08" />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

const STATS = [
  { title: "Aktif Sporcu", value: "18", icon: Users, tint: "bg-primary/10 text-primary" },
  { title: "Bu Haftaki Seans", value: "14", sub: "11 tamamlandı", icon: ClipboardList, tint: "bg-violet/10 text-violet" },
  { title: "Takım ACWR (ort.)", value: "1.08", sub: "Optimal bölge", icon: TrendingUp, tint: "bg-good/10 text-good" },
  { title: "Okunmamış Bildirim", value: "3", sub: "1 ağrı", icon: MessageSquare, tint: "bg-critical/10 text-critical" },
];

const TODAY = [
  { time: "09:00", title: "Halka + Kuvvet", team: "Artistik · Erkek", dur: 90, type: "Kuvvet" },
  { time: "10:30", title: "Denge Aleti — Teknik", team: "Artistik · Kadın", dur: 75, type: "Teknik" },
  { time: "16:00", title: "Hızlanma 6×30 m", team: "Sprint", dur: 60, type: "Kondisyon" },
];

export function CoachDashboardScene() {
  return (
    <ReplicaShell role="coach" pathname="/dashboard" user={DEMO_COACH} painNames={["Kerem Yıldız"]}>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Günaydın, Selin</h1>
            <p className="mt-1 text-muted-foreground">Perşembe, 23 Ekim · Hazırlık Bloğu 3. hafta</p>
          </div>
          <span className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            20 – 26 Ekim
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {STATS.map((s) => (
            <Card key={s.title} className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.title}</CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.tint}`}>
                  <s.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{s.value}</p>
                {s.sub && <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-6">
          <Card className="col-span-3 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Yük durumu · ACWR (7/28 gün)</CardTitle>
              <span className="text-xs text-muted-foreground">sRPE × süre</span>
            </CardHeader>
            <CardContent className="space-y-1">
              {DEMO_LOADS.map((a) => {
                const zone = acwrZone(a.acwr);
                return (
                  <div key={a.name} className="flex items-center gap-4 rounded-lg px-2 py-2 hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.group}</p>
                    </div>
                    <Spark values={a.trend} />
                    <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                      {a.acute.toLocaleString("tr-TR")} AU
                    </span>
                    <span className="w-12 text-right text-sm font-semibold tabular-nums">{a.acwr.toFixed(2)}</span>
                    <span className={`w-24 rounded-full px-2.5 py-1 text-center text-xs font-medium ${ZONE_CLASS[zone]}`}>
                      {ZONE_LABEL[zone]}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="col-span-2 space-y-6">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Bugünün seansları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {TODAY.map((t) => (
                  <div key={t.title} className="flex items-center gap-3">
                    <span className="w-12 text-sm font-semibold tabular-nums">{t.time}</span>
                    <div className="min-w-0 flex-1 border-l-2 border-primary/60 pl-3">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.team} · {t.type}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {t.dur} dk
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Son geri bildirimler</CardTitle>
                <span className="text-xs font-medium text-primary">Tümü</span>
              </CardHeader>
              <CardContent className="space-y-3">
                {DEMO_FEEDBACK.slice(0, 3).map((f) => (
                  <div key={f.id} className="flex items-center gap-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${f.pain ? "bg-red-600" : f.unread ? "bg-primary" : "bg-muted"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.athlete}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {f.pain ? `Ağrı — ${f.pain}` : f.session}
                      </p>
                    </div>
                    {f.rpe != null && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rpeClass(f.rpe)}`}>
                        RPE {f.rpe}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ReplicaShell>
  );
}
