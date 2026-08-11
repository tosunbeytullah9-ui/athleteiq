"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Tables } from "@athleteiq/db/types";

type Athlete = Tables<"athletes">;
type WellnessCheckin = Tables<"wellness_checkins">;

interface Props {
  athlete: Athlete;
  history: WellnessCheckin[];
}

export function ReadinessDetailClient({ athlete, history }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/readiness">
            <ArrowLeft className="h-4 w-4" />
            Wellness
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{athlete.full_name}</h1>
        <p className="text-sm text-muted-foreground mt-1">Son 14 gün wellness geçmişi</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Geçmiş</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Bu sporcu için henüz check-in yok.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Toplam</TableHead>
                  <TableHead>Uyku</TableHead>
                  <TableHead>Not</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">
                      {new Date(`${h.checkin_date}T00:00:00`).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        weekday: "short",
                      })}
                    </TableCell>
                    <TableCell>{h.wellness_total ?? "—"}/25</TableCell>
                    <TableCell className="text-muted-foreground">
                      {h.sleep_hours != null ? `${h.sleep_hours} sa` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {h.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
