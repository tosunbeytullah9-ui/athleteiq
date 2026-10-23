"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Mail, MessageSquare, Phone } from "lucide-react";
import type { Database } from "@athleteiq/db/types";
import {
  DEMO_REQUEST_ROLE_LABELS,
  DEMO_REQUEST_STATUSES,
  DEMO_REQUEST_STATUS_LABELS,
  type DemoRequestRole,
  type DemoRequestStatus,
} from "@athleteiq/validators";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";

type Row = Database["public"]["Tables"]["demo_requests"]["Row"];
type FilterKey = "open" | "all" | DemoRequestStatus;

const STATUS_CLASS: Record<DemoRequestStatus, string> = {
  new: "bg-primary text-primary-foreground",
  contacted: "bg-amber-100 text-amber-800",
  onboarded: "bg-emerald-100 text-emerald-700",
  rejected: "bg-muted text-muted-foreground",
};

const isStatus = (s: string): s is DemoRequestStatus =>
  (DEMO_REQUEST_STATUSES as readonly string[]).includes(s);

export function DemoRequestsClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("open");
  const [drafts, setDrafts] = useState<Record<string, { status: string; note: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { open: 0, all: rows.length, new: 0, contacted: 0, onboarded: 0, rejected: 0 };
    for (const r of rows) {
      if (isStatus(r.status)) c[r.status] += 1;
      if (r.status === "new" || r.status === "contacted") c.open += 1;
    }
    return c;
  }, [rows]);

  const visible = rows.filter((r) =>
    filter === "all" ? true : filter === "open" ? r.status === "new" || r.status === "contacted" : r.status === filter
  );

  async function save(row: Row) {
    const draft = drafts[row.id];
    if (!draft) return;
    setBusyId(row.id);
    const { error } = await createClient()
      .from("demo_requests")
      .update({ status: draft.status, admin_note: draft.note.trim() || null })
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" });
      return;
    }
    setDrafts((d) => {
      const next = { ...d };
      delete next[row.id];
      return next;
    });
    toast({ title: "Talep güncellendi" });
    router.refresh();
  }

  const filters: [FilterKey, string][] = [
    ["open", "Açık"],
    ["new", DEMO_REQUEST_STATUS_LABELS.new],
    ["contacted", DEMO_REQUEST_STATUS_LABELS.contacted],
    ["onboarded", DEMO_REQUEST_STATUS_LABELS.onboarded],
    ["rejected", DEMO_REQUEST_STATUS_LABELS.rejected],
    ["all", "Tümü"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
            <span className="ml-1.5 opacity-70">{counts[key]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {rows.length === 0
              ? "Henüz demo talebi yok. Landing sayfasındaki form doldurulduğunda burada görünür."
              : "Bu filtreye uyan talep yok."}
          </CardContent>
        </Card>
      ) : (
        visible.map((r) => {
          const draft = drafts[r.id] ?? { status: r.status, note: r.admin_note ?? "" };
          const dirty = draft.status !== r.status || draft.note !== (r.admin_note ?? "");
          const status = isStatus(r.status) ? r.status : "new";
          return (
            <Card key={r.id} className={r.status === "new" ? "border-primary/40" : undefined}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.organization}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[status]}`}>
                        {DEMO_REQUEST_STATUS_LABELS[status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {r.full_name} · {DEMO_REQUEST_ROLE_LABELS[r.role as DemoRequestRole] ?? r.role}
                      {r.discipline ? ` · ${r.discipline}` : ""}
                      {r.athlete_count ? ` · ${r.athlete_count} sporcu` : ""}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(r.created_at).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <a
                    href={`mailto:${r.email}?subject=${encodeURIComponent("AthleteIQ demo talebiniz")}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" /> {r.email}
                  </a>
                  {r.phone && (
                    <a href={`tel:${r.phone.replace(/[^+0-9]/g, "")}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {r.phone}
                    </a>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {r.notified_at ? "E-posta bildirimi gönderildi" : "E-posta bildirimi gönderilmedi"}
                  </span>
                </div>

                {r.message && (
                  <p className="flex gap-2 whitespace-pre-wrap rounded-md bg-muted/60 px-3 py-2 text-sm">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    {r.message}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-start">
                  <select
                    value={draft.status}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: { ...draft, status: e.target.value } }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Durum"
                  >
                    {DEMO_REQUEST_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {DEMO_REQUEST_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <textarea
                    rows={1}
                    maxLength={2000}
                    value={draft.note}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: { ...draft, note: e.target.value } }))}
                    placeholder="Not (yalnızca siz görürsünüz): görüşme tarihi, kurulan org…"
                    className="flex min-h-9 w-full resize-y rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button size="sm" className="h-9" disabled={!dirty || busyId === r.id} onClick={() => save(r)}>
                    {busyId === r.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
