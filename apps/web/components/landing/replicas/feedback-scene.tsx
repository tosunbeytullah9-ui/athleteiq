"use client";

import { useState } from "react";
import { AlertTriangle, Check, Clock, MessageSquare, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReplicaShell } from "./replica-shell";
import { ReplicaToast } from "./replica-toast";
import { DEMO_COACH, DEMO_FEEDBACK, rpeClass, type DemoFeedback } from "./demo-data";

/** feedback-client.tsx'in kayıt için kopyası (aynı sınıflar, hayali veri). */

type FilterKey = "all" | "unread" | "pain" | "skipped";
const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Tümü",
  unread: "Okunmamış",
  pain: "Ağrı",
  skipped: "Yapılmayan",
};

interface Row extends DemoFeedback {
  reply?: string;
}

export function FeedbackScene() {
  const [rows, setRows] = useState<Row[]>(DEMO_FEEDBACK);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [openReply, setOpenReply] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const counts: Record<FilterKey, number> = {
    all: rows.length,
    unread: rows.filter((r) => r.unread).length,
    pain: rows.filter((r) => r.pain).length,
    skipped: 0,
  };
  const visible = rows.filter((r) =>
    filter === "unread" ? r.unread : filter === "pain" ? r.pain : filter === "skipped" ? false : true
  );
  const painNames = rows.filter((r) => r.pain && r.unread).map((r) => r.athlete);
  const groups: [string, Row[]][] = [
    ["Bugün · 23 Ekim Perşembe", visible.filter((r) => r.day === "today")],
    ["Dün · 22 Ekim Çarşamba", visible.filter((r) => r.day === "yesterday")],
  ].filter(([, items]) => (items as Row[]).length > 0) as [string, Row[]][];

  function markRead(id: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, unread: false } : r)));
  }

  return (
    <ReplicaShell role="coach" pathname="/feedback" user={DEMO_COACH} painNames={painNames}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Geri Bildirimler</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sporcuların antrenman sonrası bildirimleri — 17.10.2026 – 23.10.2026
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
              <button
                key={key}
                data-demo={`filter-${key}`}
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {FILTER_LABELS[key]}
                <span className="ml-1.5 opacity-70">{counts[key]}</span>
              </button>
            ))}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Sporcu ara..." className="pl-8" readOnly />
          </div>
        </div>

        <div className="space-y-6">
          {groups.map(([label, items]) => (
            <div key={label} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">{label}</h2>
              {items.map((r) => (
                <Card key={r.id} className={r.pain && r.unread ? "border-red-300" : r.unread ? "border-primary/40" : undefined}>
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{r.athlete}</span>
                          {r.unread && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                              Yeni
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {r.session} · {r.program}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{r.status}</span>
                        {r.rpe != null && (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rpeClass(r.rpe)}`}>
                            RPE {r.rpe}
                          </span>
                        )}
                        {r.duration != null && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {r.duration} dk
                          </span>
                        )}
                        {r.rpe != null && r.duration != null && (
                          <span className="text-xs text-muted-foreground">{r.rpe * r.duration} AU</span>
                        )}
                      </div>
                    </div>

                    {r.pain && (
                      <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="font-medium">Ağrı bildirdi — {r.pain}</span>
                      </div>
                    )}
                    {r.note && <p className="rounded-md bg-muted/60 px-3 py-2 text-sm">{r.note}</p>}
                    {r.reply && (
                      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                        <p className="text-[11px] font-semibold text-blue-900">Yanıtınız</p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-blue-800">{r.reply}</p>
                      </div>
                    )}

                    {openReply === r.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          autoFocus
                          data-demo={`reply-text-${r.id}`}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder="Sporcuya kısa bir yanıt yazın — mobil uygulamada antrenman kartının altında görecek."
                          className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            data-demo={`reply-send-${r.id}`}
                            onClick={() => {
                              setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, reply: draft, unread: false } : x)));
                              setOpenReply(null);
                              setDraft("");
                              setToast("Yanıt gönderildi");
                            }}
                          >
                            <Send className="h-4 w-4" />
                            Gönder
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setOpenReply(null)}>
                            Vazgeç
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          data-demo={`reply-${r.id}`}
                          onClick={() => {
                            setOpenReply(r.id);
                            setDraft(r.reply ?? "");
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                          {r.reply ? "Yanıtı düzenle" : "Yanıtla"}
                        </Button>
                        {r.unread && (
                          <Button size="sm" variant="ghost" data-demo={`read-${r.id}`} onClick={() => markRead(r.id)}>
                            <Check className="h-4 w-4" />
                            Okundu
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>
      {toast && <ReplicaToast title={toast} description="Kerem mobil uygulamada seansın altında görecek." />}
    </ReplicaShell>
  );
}
