"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  MessageSquare,
  Search,
  Send,
  Clock,
  Loader2,
} from "lucide-react";
import { Button, Card, CardContent, Input } from "@athleteiq/ui";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { usePainAlerts } from "@/lib/hooks/pain-alerts-provider";
import {
  markSessionFeedbackRead,
  replyToSessionFeedback,
  type FeedbackInboxRow,
} from "@athleteiq/db/queries/session-feedback";
import {
  SESSION_FEEDBACK_STATUS_LABELS,
  RPE_LABELS,
  type SessionFeedbackStatus,
} from "@athleteiq/validators/session-feedback";

type FilterKey = "all" | "unread" | "pain" | "missed";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Tümü",
  unread: "Okunmamış",
  pain: "Ağrı bildirenler",
  missed: "Yapılmayanlar",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  strength: "Kuvvet",
  conditioning: "Kondisyon",
  technical: "Teknik",
  recovery: "Recovery",
  competition: "Yarışma",
};

/** RPE rozeti rengi — mobil formdaki yoğunluk skalasıyla aynı eşikler. */
function rpeClass(rpe: number): string {
  if (rpe <= 3) return "bg-emerald-100 text-emerald-700";
  if (rpe <= 6) return "bg-amber-100 text-amber-700";
  if (rpe <= 8) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
}

export function FeedbackClient({
  rows,
  from,
  to,
}: {
  rows: FeedbackInboxRow[];
  from: string;
  to: string;
}) {
  const router = useRouter();
  // Okundu/yanıt sonrası sidebar rozeti ve uyarı şeridi beklemeden tazelensin.
  const { refresh: refreshPainAlerts } = usePainAlerts();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [openReply, setOpenReply] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Sporcu geri bildirimi girdiği anda koçun listesi canlı dolsun
  // (programs-client.tsx'teki postgres_changes + router.refresh() kalıbı).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("session-feedback-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_feedback" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      unread: rows.filter((r) => !r.coach_read_at).length,
      pain: rows.filter((r) => r.has_pain).length,
      missed: rows.filter((r) => r.status === "skipped").length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((r) => {
      if (filter === "unread" && r.coach_read_at) return false;
      if (filter === "pain" && !r.has_pain) return false;
      if (filter === "missed" && r.status !== "skipped") return false;
      if (q && !r.athlete_name.toLocaleLowerCase("tr-TR").includes(q)) return false;
      return true;
    });
  }, [rows, filter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, FeedbackInboxRow[]>();
    for (const r of visible) {
      const list = map.get(r.session_date) ?? [];
      list.push(r);
      map.set(r.session_date, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  async function handleMarkRead(id: string) {
    setBusyId(id);
    try {
      await markSessionFeedbackRead(createClient(), id);
      router.refresh();
      await refreshPainAlerts();
    } catch (e: unknown) {
      toast({
        title: "Okundu işaretlenemedi",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReply(id: string) {
    const text = (replyDrafts[id] ?? "").trim();
    if (!text) return;
    setBusyId(id);
    try {
      await replyToSessionFeedback(createClient(), id, text);
      setReplyDrafts((d) => ({ ...d, [id]: "" }));
      setOpenReply(null);
      toast({ title: "Yanıt gönderildi" });
      router.refresh();
      await refreshPainAlerts();
    } catch (e: unknown) {
      toast({
        title: "Yanıt gönderilemedi",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Geri Bildirimler</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sporcuların antrenman sonrası bildirimleri —{" "}
          {new Date(from + "T00:00:00").toLocaleDateString("tr-TR")} –{" "}
          {new Date(to + "T00:00:00").toLocaleDateString("tr-TR")}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {FILTER_LABELS[key]}
              <span className="ml-1.5 opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sporcu ara..."
            className="pl-8"
          />
        </div>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {rows.length === 0
                ? "Henüz geri bildirim yok. Sporcular mobil uygulamada antrenman kartının altındaki “Antrenmanı Değerlendir” ile gönderir."
                : "Bu filtreye uyan geri bildirim yok."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <div key={date} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {formatDate(date)}
              </h2>
              {items.map((r) => {
                const unread = !r.coach_read_at;
                const busy = busyId === r.id;
                return (
                  <Card
                    key={r.id}
                    className={
                      r.has_pain
                        ? "border-red-300"
                        : unread
                          ? "border-primary/40"
                          : undefined
                    }
                  >
                    <CardContent className="space-y-3 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/athletes/${r.athlete_id}`}
                              className="font-semibold hover:underline"
                            >
                              {r.athlete_name}
                            </Link>
                            {unread && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                                Yeni
                              </span>
                            )}
                            {r.source === "coach_proxy" && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                Koç girişi
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {r.session_title ||
                              SESSION_TYPE_LABELS[r.session_type ?? ""] ||
                              "Antrenman"}
                            {r.program_title ? ` · ${r.program_title}` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            {SESSION_FEEDBACK_STATUS_LABELS[r.status as SessionFeedbackStatus]}
                          </span>
                          {r.rpe != null && (
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rpeClass(r.rpe)}`}
                              title={RPE_LABELS[r.rpe]}
                            >
                              RPE {r.rpe}
                            </span>
                          )}
                          {r.duration_min != null && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {r.duration_min} dk
                            </span>
                          )}
                          {r.session_load != null && (
                            <span className="text-xs text-muted-foreground">
                              {Math.round(Number(r.session_load))} AU
                            </span>
                          )}
                        </div>
                      </div>

                      {r.has_pain && (
                        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span className="font-medium">
                            Ağrı bildirdi{r.pain_area ? ` — ${r.pain_area}` : ""}
                          </span>
                        </div>
                      )}

                      {r.note && (
                        <p className="whitespace-pre-wrap rounded-md bg-muted/60 px-3 py-2 text-sm">
                          {r.note}
                        </p>
                      )}

                      {r.coach_reply && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                          <p className="text-[11px] font-semibold text-blue-900">Yanıtınız</p>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm text-blue-800">
                            {r.coach_reply}
                          </p>
                        </div>
                      )}

                      {openReply === r.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            autoFocus
                            value={replyDrafts[r.id] ?? r.coach_reply ?? ""}
                            onChange={(e) =>
                              setReplyDrafts((d) => ({ ...d, [r.id]: e.target.value }))
                            }
                            maxLength={2000}
                            placeholder="Sporcuya kısa bir yanıt yazın — mobil uygulamada antrenman kartının altında görecek."
                            className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" disabled={busy} onClick={() => handleReply(r.id)}>
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Gönder
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setOpenReply(null)}
                            >
                              Vazgeç
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setOpenReply(r.id);
                              setReplyDrafts((d) => ({
                                ...d,
                                [r.id]: d[r.id] ?? r.coach_reply ?? "",
                              }));
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                            {r.coach_reply ? "Yanıtı düzenle" : "Yanıtla"}
                          </Button>
                          {unread && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => handleMarkRead(r.id)}
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Okundu
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
