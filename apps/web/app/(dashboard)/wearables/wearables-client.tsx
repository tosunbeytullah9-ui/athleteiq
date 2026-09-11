"use client";

import { useMemo, useState } from "react";
import { Activity, Watch, Users } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Label } from "@athleteiq/ui/components/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@athleteiq/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WearableConnectionRow } from "@athleteiq/db/queries/wearables";

type Athlete = { id: string; full_name: string };

interface Props {
  connections: WearableConnectionRow[];
  athletes: Athlete[];
}

type FilterMode = "all" | "connected" | "disconnected";

interface AthleteStatus {
  id: string;
  full_name: string;
  whoop: boolean;
  polar: boolean;
  lastSynced: string | null;
}

function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
      Bağlı
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      Bağlı Değil
    </span>
  );
}

export function WearablesClient({ connections, athletes }: Props) {
  const [filter, setFilter] = useState<FilterMode>("all");

  const statuses = useMemo<AthleteStatus[]>(() => {
    return athletes.map((a) => {
      const conns = connections.filter(
        (c) => c.athlete_id === a.id && c.is_active
      );
      const whoop = conns.some((c) => c.provider === "whoop");
      const polar = conns.some((c) => c.provider === "polar");
      const lastSynced = conns
        .map((c) => c.last_synced_at)
        .filter((d): d is string => !!d)
        .sort()
        .reverse()[0] ?? null;
      return { id: a.id, full_name: a.full_name, whoop, polar, lastSynced };
    });
  }, [athletes, connections]);

  const totalAthletes = athletes.length;
  const whoopConnected = statuses.filter((s) => s.whoop).length;
  const polarConnected = statuses.filter((s) => s.polar).length;

  const filtered = useMemo(() => {
    return statuses.filter((s) => {
      const anyConnected = s.whoop || s.polar;
      if (filter === "connected") return anyConnected;
      if (filter === "disconnected") return !anyConnected;
      return true;
    });
  }, [statuses, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wearable Bağlantıları</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sporcuların giyilebilir cihaz bağlantı durumu
        </p>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Sporcu
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAthletes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              WHOOP Bağlı
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {whoopConnected}{" "}
              <span className="text-base font-normal text-muted-foreground">
                / {totalAthletes}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Polar Bağlı
            </CardTitle>
            <Watch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {polarConnected}{" "}
              <span className="text-base font-normal text-muted-foreground">
                / {totalAthletes}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <div className="flex gap-2">
        {(["all", "connected", "disconnected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f === "all" ? "Tümü" : f === "connected" ? "Bağlı" : "Bağlı Değil"}
          </button>
        ))}
      </div>

      {/* Tablo */}
      {totalAthletes === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Watch className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Henüz sporcu eklenmemiş.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sporcu</TableHead>
                  <TableHead>WHOOP</TableHead>
                  <TableHead>Polar</TableHead>
                  <TableHead>Son Senkronizasyon</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>
                      <StatusBadge connected={s.whoop} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge connected={s.polar} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.lastSynced
                        ? new Date(s.lastSynced).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        title="Bağlantı sporcunun kendi mobil uygulamasından yapılır (Profil → Cihaz Bağlantıları)"
                      >
                        Bağla
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
