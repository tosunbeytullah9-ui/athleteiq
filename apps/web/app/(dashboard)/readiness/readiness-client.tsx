"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { Skeleton } from "@athleteiq/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { getLocalDateString } from "@athleteiq/validators/wellness";
import type { OrgWellnessCheckinRow } from "@athleteiq/db/queries/wellness";

type Athlete = { id: string; full_name: string };

interface Props {
  athletes: Athlete[];
  checkins: OrgWellnessCheckinRow[];
}

export function ReadinessClient({ athletes, checkins }: Props) {
  const router = useRouter();
  // "Bugün" tarayıcının yerel saatiyle hesaplanır, sunucunun (UTC'ye yakın)
  // saatiyle değil — aksi halde bu Parti'nin çözdüğü aynı UTC/TR kayması
  // burada, render katmanında yeniden ortaya çıkar. Bir Client Component da
  // hydration öncesi bir kez sunucuda render edilir, bu yüzden hesaplama
  // doğrudan render gövdesinde değil, yalnızca client'ta çalışan bir
  // useEffect içinde yapılır (server/client hydration uyuşmazlığını önler).
  const [todayLocal, setTodayLocal] = useState<string | null>(null);

  useEffect(() => {
    setTodayLocal(getLocalDateString());
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("wellness-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wellness_checkins" },
        () => {
          router.refresh();
          toast({ title: "Wellness verisi güncellendi" });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const { checkedIn, notCheckedIn } = useMemo(() => {
    if (!todayLocal) return { checkedIn: [], notCheckedIn: [] };
    const todays = new Map(
      checkins.filter((c) => c.checkin_date === todayLocal).map((c) => [c.athlete_id, c])
    );
    const checkedIn = athletes
      .filter((a) => todays.has(a.id))
      .map((a) => ({ ...a, checkin: todays.get(a.id)! }));
    const notCheckedIn = athletes.filter((a) => !todays.has(a.id));
    return { checkedIn, notCheckedIn };
  }, [athletes, checkins, todayLocal]);

  const totalAthletes = athletes.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sabah Wellness</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sporcuların günlük check-in durumu
        </p>
      </div>

      {todayLocal === null ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Toplam Sporcu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAthletes}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Doldurdu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {checkedIn.length}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    / {totalAthletes}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Doldurmadı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notCheckedIn.length}</div>
              </CardContent>
            </Card>
          </div>

          {notCheckedIn.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Bugün Check-in Yapmayanlar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {notCheckedIn.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => router.push(`/readiness/${a.id}`)}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      {a.full_name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {totalAthletes === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <p className="text-sm text-muted-foreground">Henüz sporcu eklenmemiş.</p>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Bugün Check-in Yapanlar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sporcu</TableHead>
                      <TableHead>Toplam</TableHead>
                      <TableHead>Uyku</TableHead>
                      <TableHead>Doldurma Saati</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkedIn.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Henüz kimse check-in yapmadı.
                        </TableCell>
                      </TableRow>
                    ) : (
                      checkedIn.map((a) => (
                        <TableRow
                          key={a.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/readiness/${a.id}`)}
                        >
                          <TableCell className="font-medium">{a.full_name}</TableCell>
                          <TableCell>{a.checkin.wellness_total ?? "—"}/25</TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.checkin.sleep_hours != null ? `${a.checkin.sleep_hours} sa` : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.checkin.submitted_at
                              ? new Date(a.checkin.submitted_at).toLocaleTimeString("tr-TR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
