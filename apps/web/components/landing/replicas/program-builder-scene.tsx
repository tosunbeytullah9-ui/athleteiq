"use client";

import { useState } from "react";
import { BookOpen, Clock, Dumbbell, Eye, Plus, Search, Send, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReplicaShell } from "./replica-shell";
import { ReplicaToast } from "./replica-toast";
import { DEMO_COACH } from "./demo-data";

/**
 * Program oluşturucunun (week-editor-form + exercise-list) kayıt için
 * sadeleştirilmiş kopyası. data-demo öznitelikleri kayıt scriptinin hedefleri.
 */

interface SetRow {
  reps: string;
  pct: string;
  rpe: string;
}
interface Ex {
  name: string;
  max: number | null;
  loadType: "kg" | "pct";
  sets: SetRow[];
}

const LIBRARY = [
  { name: "Romanian Deadlift", pattern: "Kalça menteşe", max: 110 },
  { name: "Bulgarian Split Squat", pattern: "Tek bacak", max: null },
  { name: "Nordic Hamstring Curl", pattern: "Diz fleksiyonu", max: null },
  { name: "Hip Thrust", pattern: "Kalça ekstansiyonu", max: 140 },
  { name: "Back Squat", pattern: "Squat", max: 120 },
];

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function roundLoad(max: number, pct: number) {
  return Math.round((max * pct) / 100 / 2.5) * 2.5;
}

function ExerciseBlock({ ex, index, onChange }: { ex: Ex; index: number; onChange: (e: Ex) => void }) {
  const setField = (i: number, k: keyof SetRow, v: string) =>
    onChange({ ...ex, sets: ex.sets.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });
  return (
    <div className="space-y-3 rounded-md border p-3" data-demo={`exercise-${index}`}>
      <div className="flex items-center gap-2">
        <Input value={ex.name} readOnly className="flex-1 text-sm font-medium" />
        {ex.max != null && (
          <span className="shrink-0 rounded-full bg-violet/10 px-2.5 py-1 text-xs font-medium text-violet">
            Son max: {ex.max} kg
          </span>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
      <div className="space-y-2">
        {ex.sets.map((s, i) => {
          const pct = Number(s.pct);
          return (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded border bg-muted/20 p-2">
              <div className="flex h-8 w-7 shrink-0 items-center justify-center text-xs font-semibold text-muted-foreground">
                {i + 1}
              </div>
              <div className="w-20">
                <Label className="text-xs">Tekrar</Label>
                <Input
                  data-demo={`reps-${index}-${i}`}
                  value={s.reps}
                  onChange={(e) => setField(i, "reps", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-32">
                <Label className="text-xs">Yük Tipi</Label>
                <div className="flex h-8 w-full items-center rounded-md border border-input bg-background px-2 text-xs">
                  {ex.loadType === "pct" ? "%1RM" : "Kilogram"}
                </div>
              </div>
              <div className="w-24">
                <Label className="text-xs">{ex.loadType === "pct" ? "1RM %" : "Yük (kg)"}</Label>
                <Input
                  data-demo={`pct-${index}-${i}`}
                  value={s.pct}
                  onChange={(e) => setField(i, "pct", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-20">
                <Label className="text-xs">RPE</Label>
                <Input
                  data-demo={`rpe-${index}-${i}`}
                  value={s.rpe}
                  onChange={(e) => setField(i, "rpe", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              {ex.loadType === "pct" && ex.max != null && pct > 0 && (
                <span className="mb-1.5 ml-1 rounded bg-good/10 px-2 py-1 text-xs font-semibold tabular-nums text-good">
                  ≈ {roundLoad(ex.max, pct).toLocaleString("tr-TR")} kg
                </span>
              )}
            </div>
          );
        })}
      </div>
      <Button
        variant="outline"
        size="sm"
        data-demo={`add-set-${index}`}
        onClick={() => {
          const last = ex.sets[ex.sets.length - 1] ?? { reps: "", pct: "", rpe: "" };
          onChange({ ...ex, sets: [...ex.sets, { ...last }] });
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        Set ekle
      </Button>
    </div>
  );
}

export function ProgramBuilderScene() {
  const [exercises, setExercises] = useState<Ex[]>([
    {
      name: "Back Squat",
      max: 120,
      loadType: "pct",
      sets: [
        { reps: "5", pct: "75", rpe: "7" },
        { reps: "5", pct: "80", rpe: "8" },
        { reps: "5", pct: "80", rpe: "8" },
      ],
    },
  ]);
  const [libOpen, setLibOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [published, setPublished] = useState(false);

  const filtered = LIBRARY.filter((l) => l.name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));

  return (
    <ReplicaShell role="coach" pathname="/programs" user={DEMO_COACH}>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Hazırlık Bloğu · Artistik Cimnastik A</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Hafta 3 — 20–26 Ekim</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  published ? "bg-good/15 text-good" : "bg-muted text-muted-foreground"
                }`}
              >
                {published ? "Yayında" : "Taslak"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Eye className="h-4 w-4" />
              Sporcu görünümü
            </Button>
            <Button data-demo="publish" onClick={() => setPublished(true)} disabled={published}>
              <Send className="h-4 w-4" />
              {published ? "Yayınlandı" : "Yayınla"}
            </Button>
          </div>
        </div>

        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {DAYS.map((d, i) => (
            <span
              key={d}
              className={`flex-1 rounded-md py-2 text-center text-sm font-medium ${
                i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {d}
              {[0, 2, 4].includes(i) && <span className="ml-1 opacity-70">•</span>}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Dumbbell className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-base">Kuvvet — Alt Ekstremite</CardTitle>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> 70 dk · Kuvvet
                  </p>
                </div>
              </div>
              <div className="relative">
                <Button variant="outline" size="sm" data-demo="add-exercise" onClick={() => setLibOpen((v) => !v)}>
                  <BookOpen className="h-3.5 w-3.5" />
                  Kütüphaneden ekle
                </Button>
                {libOpen && (
                  <div className="absolute right-0 top-10 z-30 w-80 rounded-lg border bg-popover p-2 shadow-xl">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        data-demo="lib-search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Egzersiz ara…"
                        className="pl-8"
                      />
                    </div>
                    <ul className="max-h-64 space-y-0.5 overflow-auto">
                      {filtered.map((l) => (
                        <li key={l.name}>
                          <button
                            type="button"
                            data-demo={`lib-${l.name.toLowerCase().replace(/\s+/g, "-")}`}
                            onClick={() => {
                              setExercises((xs) => [
                                ...xs,
                                { name: l.name, max: l.max, loadType: l.max ? "pct" : "kg", sets: [{ reps: "", pct: "", rpe: "" }] },
                              ]);
                              setLibOpen(false);
                              setQuery("");
                            }}
                            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent"
                          >
                            <span className="font-medium">{l.name}</span>
                            <span className="text-xs text-muted-foreground">{l.pattern}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {exercises.map((ex, i) => (
                <ExerciseBlock
                  key={i}
                  ex={ex}
                  index={i}
                  onChange={(next) => setExercises((xs) => xs.map((x, j) => (j === i ? next : x)))}
                />
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kimler görecek</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Artistik Cimnastik A · 6 sporcu</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Defne A.", "Kerem Y.", "Ece K.", "Mert D.", "İpek K.", "Barış Ö."].map((n) => (
                    <span key={n} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                      {n}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Yük, her sporcunun kayıtlı 1RM&apos;inden ayrı ayrı hesaplanır.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Haftanın özeti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["Pzt", "Kuvvet — Alt Ekstremite", "70 dk"],
                  ["Çar", "Kuvvet — Üst / Halka", "80 dk"],
                  ["Cum", "Pliometrik + Hız", "55 dk"],
                ].map(([d, t, m]) => (
                  <div key={d} className="flex items-center gap-3">
                    <span className="w-8 font-semibold">{d}</span>
                    <span className="flex-1 truncate">{t}</span>
                    <span className="text-xs text-muted-foreground">{m}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {published && (
        <ReplicaToast title="Program yayınlandı" description="6 sporcunun takviminde — bildirim gönderildi." />
      )}
    </ReplicaShell>
  );
}
