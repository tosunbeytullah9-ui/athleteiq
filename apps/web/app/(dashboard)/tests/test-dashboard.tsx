"use client";

import { useState, type ComponentType } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Minus,
  Trophy,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@athleteiq/ui/components/card";
import { cn } from "@/lib/utils";
import { daysBetweenYmd, formatYmdTr, todayInIstanbul } from "@athleteiq/validators/date";

// =============================================
// Test sayfasının panel görünümü — saf gösterim bileşenleri.
// Veri hazırlığı (filtre, en güncel değer seçimi) tests-client.tsx'te yapılır;
// burada yalnızca sıralama ve çizim var.
// =============================================

export type Trend = "up" | "down" | "flat" | null;

export interface LeaderboardEntry {
  key: string;
  name: string;
  sub?: string | null;
  value: number;
  date: string;
  trend?: Trend;
}

const STALE_DAYS = 180;

export function formatNumber(n: number, digits = 2): string {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: digits });
}

export function formatDate(iso: string): string {
  // test_date saatsiz takvim günü — new Date(str) UTC gece yarısı olur (Parti 18T).
  return formatYmdTr(iso, { style: "short" });
}

export function daysSince(iso: string): number {
  return Math.max(0, daysBetweenYmd(iso, todayInIstanbul()));
}

export function relativeDays(iso: string): string {
  const d = daysSince(iso);
  if (d === 0) return "bugün";
  if (d === 1) return "dün";
  if (d < 30) return `${d} gün önce`;
  if (d < 365) return `${Math.floor(d / 30)} ay önce`;
  return `${Math.floor(d / 365)} yıl önce`;
}

// Sıralamada "daha iyi" olan önce gelir; sprint/çeviklikte düşük değer iyidir.
export function sortBest<T extends { value: number }>(
  rows: T[],
  lowerIsBetter: boolean
): T[] {
  return [...rows].sort((a, b) =>
    lowerIsBetter ? a.value - b.value : b.value - a.value
  );
}

// Çubuğun en iyiye oranı: yüksek-iyi testte value/best, düşük-iyi testte best/value.
function ratioToBest(
  value: number,
  best: number,
  lowerIsBetter: boolean
): number {
  if (value <= 0 || best <= 0) return 0;
  return Math.min(1, lowerIsBetter ? best / value : value / best);
}

// =============================================
// Özet kartı
// =============================================
export function StatTile({
  title,
  value,
  sub,
  icon: Icon,
  tint,
  progress,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: ComponentType<{ className?: string }>;
  tint: string;
  progress?: number; // 0–1
}) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            tint
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold sm:text-3xl tabular-nums">{value}</p>
        {progress != null && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
        {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// =============================================
// Sıralama listesi (test tipi / egzersiz kartlarının gövdesi)
// =============================================
function TrendIcon({ trend }: { trend: Trend | undefined }) {
  if (trend === "up")
    return (
      <ArrowUp
        className="h-3.5 w-3.5 shrink-0 text-good"
        aria-label="Gelişme"
      />
    );
  if (trend === "down")
    return (
      <ArrowDown
        className="h-3.5 w-3.5 shrink-0 text-critical"
        aria-label="Düşüş"
      />
    );
  if (trend === "flat")
    return (
      <Minus
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
        aria-label="Değişim yok"
      />
    );
  return <span className="w-3.5 shrink-0" />;
}

export function Leaderboard({
  entries,
  unit,
  lowerIsBetter = false,
  initialCount = 8,
}: {
  entries: LeaderboardEntry[];
  unit: string;
  lowerIsBetter?: boolean;
  initialCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = sortBest(entries, lowerIsBetter);
  const best = sorted[0]?.value ?? 0;
  const visible = expanded ? sorted : sorted.slice(0, initialCount);
  const hidden = sorted.length - visible.length;

  return (
    <div className="space-y-1">
      <ol className="space-y-1.5">
        {visible.map((e, i) => {
          const ratio = ratioToBest(e.value, best, lowerIsBetter);
          const stale = daysSince(e.date) > STALE_DAYS;
          return (
            <li
              key={e.key}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-2"
              title={`${e.name} — ${formatNumber(e.value)} ${unit} · ${formatDate(e.date)}${
                stale ? " (6 aydan eski)" : ""
              }`}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                  i === 0
                    ? "bg-warning/15 text-warning"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i === 0 ? <Trophy className="h-3 w-3" /> : i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {e.name}
                    {e.sub && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {e.sub}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      i === 0 ? "bg-primary" : "bg-primary/60",
                      stale && "bg-muted-foreground/40"
                    )}
                    style={{
                      width: `${Math.max(4, Math.round(ratio * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 pl-1">
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    stale && "text-muted-foreground"
                  )}
                >
                  {formatNumber(e.value)}
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                    {unit}
                  </span>
                </span>
                <TrendIcon trend={e.trend} />
              </div>
            </li>
          );
        })}
      </ol>
      {(hidden > 0 || expanded) && sorted.length > initialCount && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1 rounded-md pt-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Daralt
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Tümünü göster (
              {sorted.length})
            </>
          )}
        </button>
      )}
    </div>
  );
}

// =============================================
// Test tipi / egzersiz kartı
// =============================================
export function MetricCard({
  title,
  badge,
  badgeClass,
  unit,
  lowerIsBetter = false,
  entries,
}: {
  title: string;
  badge?: string;
  badgeClass?: string;
  unit: string;
  lowerIsBetter?: boolean;
  entries: LeaderboardEntry[];
}) {
  const avg = entries.reduce((s, e) => s + e.value, 0) / (entries.length || 1);
  const best = sortBest(entries, lowerIsBetter)[0];

  return (
    <Card className="flex flex-col rounded-xl">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {badge && (
              <span
                className={cn(
                  "mb-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                  badgeClass ?? "bg-muted text-muted-foreground"
                )}
              >
                {badge}
              </span>
            )}
            <h3 className="truncate text-base font-semibold leading-tight">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {entries.length} sporcu · {unit}
              {lowerIsBetter && " · düşük daha iyi"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Ortalama</p>
            <p className="text-lg font-bold tabular-nums">
              {formatNumber(avg, 1)}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                {unit}
              </span>
            </p>
          </div>
          <div className="rounded-lg bg-primary/10 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">En iyi</p>
            <p className="text-lg font-bold tabular-nums text-primary">
              {best ? formatNumber(best.value) : "—"}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                {unit}
              </span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <Leaderboard
          entries={entries}
          unit={unit}
          lowerIsBetter={lowerIsBetter}
        />
      </CardContent>
    </Card>
  );
}

// =============================================
// 1RM matrisi — sporcu × egzersiz, hücre rengi sütun içindeki sıraya göre
// =============================================
export interface MatrixCell {
  value: number;
  date: string;
}

export interface MatrixRow {
  key: string;
  name: string;
  sub?: string | null;
  cells: Record<string, MatrixCell | undefined>;
}

// Sınıflar Tailwind taraması için literal tutulur.
const HEAT_CLASSES = [
  "bg-primary/10",
  "bg-primary/20",
  "bg-primary/35",
  "bg-primary/55",
  "bg-primary/80 text-primary-foreground",
];

function heatClass(value: number, min: number, max: number): string {
  if (max <= min) return HEAT_CLASSES[2]!;
  const t = (value - min) / (max - min);
  const idx = Math.min(
    HEAT_CLASSES.length - 1,
    Math.floor(t * HEAT_CLASSES.length)
  );
  return HEAT_CLASSES[idx]!;
}

export function MaxMatrix({
  columns,
  rows,
}: {
  columns: string[];
  rows: MatrixRow[];
}) {
  const stats = columns.map((c) => {
    const vals = rows
      .map((r) => r.cells[c]?.value)
      .filter((v): v is number => v != null);
    return {
      min: vals.length ? Math.min(...vals) : 0,
      max: vals.length ? Math.max(...vals) : 0,
      avg: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null,
      count: vals.length,
    };
  });

  return (
    <Card className="overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[8.5rem] sm:min-w-[11rem] border-b bg-card px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Sporcu
              </th>
              {columns.map((c, i) => (
                <th
                  key={c}
                  className="min-w-[6.5rem] border-b px-2 py-3 text-center align-bottom text-xs font-medium"
                >
                  <span className="line-clamp-2 text-foreground">{c}</span>
                  <span className="mt-0.5 block font-normal text-muted-foreground tabular-nums">
                    ort.{" "}
                    {stats[i]!.avg != null
                      ? formatNumber(stats[i]!.avg!, 1)
                      : "—"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="sticky left-0 z-10 border-b bg-card px-4 py-2">
                  <p className="truncate font-medium">{r.name}</p>
                  {r.sub && (
                    <p className="truncate text-xs text-muted-foreground">
                      {r.sub}
                    </p>
                  )}
                </td>
                {columns.map((c, i) => {
                  const cell = r.cells[c];
                  if (!cell) {
                    return (
                      <td
                        key={c}
                        className="border-b px-1.5 py-1.5 text-center text-muted-foreground/60"
                      >
                        —
                      </td>
                    );
                  }
                  const stale = daysSince(cell.date) > STALE_DAYS;
                  return (
                    <td key={c} className="border-b px-1.5 py-1.5">
                      <div
                        className={cn(
                          "relative rounded-md px-2 py-1.5 text-center font-semibold tabular-nums",
                          heatClass(cell.value, stats[i]!.min, stats[i]!.max)
                        )}
                        title={`${r.name} — ${c}: ${formatNumber(cell.value)} kg · ${formatDate(
                          cell.date
                        )}${stale ? " (6 aydan eski)" : ""}`}
                      >
                        {formatNumber(cell.value)}
                        {stale && (
                          <span
                            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-warning"
                            aria-label="6 aydan eski"
                          />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          Düşük
          {HEAT_CLASSES.map((h) => (
            <span
              key={h}
              className={cn("h-3 w-5 rounded-sm", h.split(" ")[0])}
            />
          ))}
          Yüksek
          <span className="ml-1">(egzersiz içinde)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" /> 6 aydan eski
          kayıt
        </span>
        <span>Tüm değerler kg</span>
      </div>
    </Card>
  );
}

// =============================================
// Görünüm seçici (Panel / Matris / Liste)
// =============================================
export function ViewToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: {
    value: T;
    label: string;
    icon: ComponentType<{ className?: string }>;
  }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex h-9 items-center gap-1 rounded-md bg-muted p-1"
      role="tablist"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <o.icon className="h-3.5 w-3.5" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
