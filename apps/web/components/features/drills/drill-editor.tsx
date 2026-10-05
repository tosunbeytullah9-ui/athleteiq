"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Eraser, MousePointer2, Plus, Route, Trash2, TrafficCone, Type, Undo2 } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import {
  drillPxToUnits,
  drillScale,
  emptyDrillDiagram,
  snapToGrid,
  DRILL_LIMITS,
  DRILL_MOVEMENTS,
  DRILL_ROUTE_COLORS,
  DRILL_TEMPLATES,
  DRILL_UNITS,
  type DrillDiagram,
  type DrillMovement,
  type DrillUnit,
} from "@athleteiq/validators/drill";
import { DrillDiagramSvg, DrillLegend, MovementSwatch } from "./drill-diagram-svg";

type Mode = "cone" | "route" | "select" | "label" | "erase";

type Selection =
  | { kind: "cone"; index: number }
  | { kind: "step"; route: number; index: number }
  | { kind: "segment"; route: number; index: number }
  | { kind: "label"; index: number }
  | null;

type Pt = { x: number; y: number };

const MODES: { value: Mode; label: string; icon: typeof Route; help: string }[] = [
  { value: "cone", label: "Koni", icon: TrafficCone, help: "Sahaya tıklayınca koni konur. Var olan koniye tıklayınca etiket (A, B, 1…) verebilirsiniz." },
  {
    value: "route",
    label: "Rota",
    icon: Route,
    help: "Sırayla tıklayarak rotayı çizin; her bölüm seçili hareket tipiyle çizilir. Son noktaya tekrar tıklamak o koninin etrafında dönüş ekler (saat yönü → ters → kapalı).",
  },
  { value: "select", label: "Seç / Taşı", icon: MousePointer2, help: "Koni, nokta veya etiketi sürükleyin (koniyi taşımak üzerindeki rota noktalarını da taşır). Bir çizgiye tıklayınca hareket tipini değiştirebilirsiniz." },
  { value: "label", label: "Etiket", icon: Type, help: "Sahaya tıklayınca yazı eklenir (örn. \"Başla\", \"Maks. hız\")." },
  { value: "erase", label: "Sil", icon: Eraser, help: "Tıkladığınız noktayı, çizgiyi, etiketi veya koniyi siler." },
];

interface Props {
  value: DrillDiagram;
  onChange: (next: DrillDiagram) => void;
  unit: DrillUnit;
  onUnitChange: (unit: DrillUnit) => void;
}

function same(a: Pt, b: Pt): boolean {
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function clampDiagram(d: DrillDiagram, width: number, height: number): DrillDiagram {
  const c = <T extends Pt>(p: T): T => ({ ...p, x: Math.min(p.x, width), y: Math.min(p.y, height) });
  return {
    ...d,
    width,
    height,
    cones: d.cones.map(c),
    labels: d.labels.map(c),
    routes: d.routes.map((r) => ({ steps: r.steps.map(c) })),
  };
}

export function DrillEditor({ value, onChange, unit, onUnitChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mode, setMode] = useState<Mode>(value.cones.length === 0 ? "cone" : "route");
  const [movement, setMovement] = useState<DrillMovement>("sprint");
  const [activeRoute, setActiveRoute] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [history, setHistory] = useState<DrillDiagram[]>([]);
  const [hover, setHover] = useState<Pt | null>(null);
  const [templateKey, setTemplateKey] = useState("");
  const drag = useRef<{ sel: Selection; origin: Pt; pushed: boolean } | null>(null);

  const routeIdx = Math.max(0, Math.min(activeRoute, value.routes.length - 1));
  const hit = 16 / drillScale(value); // ~16 px, saha biriminde

  function commit(next: DrillDiagram, pushHistory = true) {
    if (pushHistory) setHistory((h) => [...h.slice(-49), value]);
    onChange(next);
  }

  function undo() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory(history.slice(0, -1));
    setSelection(null);
    onChange(prev);
  }

  function toUnits(e: PointerEvent<SVGSVGElement>): Pt | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return drillPxToUnits(value, pt.x, pt.y);
  }

  function snapped(u: Pt): Pt {
    return { x: snapToGrid(u.x, value.width), y: snapToGrid(u.y, value.height) };
  }

  // --- isabet testleri (saha biriminde) ------------------------------------
  function nearestCone(u: Pt): number {
    let best = -1;
    let bestD = hit;
    value.cones.forEach((c, i) => {
      const d = Math.hypot(c.x - u.x, c.y - u.y);
      if (d <= bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  }

  function nearestStep(u: Pt): { route: number; index: number } | null {
    const order = [routeIdx, ...value.routes.map((_, i) => i).filter((i) => i !== routeIdx)];
    for (const r of order) {
      const steps = value.routes[r]?.steps ?? [];
      for (let i = steps.length - 1; i >= 0; i--) {
        if (Math.hypot(steps[i]!.x - u.x, steps[i]!.y - u.y) <= hit) return { route: r, index: i };
      }
    }
    return null;
  }

  function nearestLabel(u: Pt): number {
    return value.labels.findIndex((l) => Math.abs(l.x - u.x) <= hit * 2.5 && Math.abs(l.y - u.y) <= hit);
  }

  function nearestSegment(u: Pt): { route: number; index: number } | null {
    const order = [routeIdx, ...value.routes.map((_, i) => i).filter((i) => i !== routeIdx)];
    for (const r of order) {
      const steps = value.routes[r]?.steps ?? [];
      for (let i = 1; i < steps.length; i++) {
        if (distToSegment(u, steps[i - 1]!, steps[i]!) <= hit * 0.8) return { route: r, index: i };
      }
    }
    return null;
  }

  // --- değişiklikler --------------------------------------------------------
  function updateRoutes(fn: (routes: DrillDiagram["routes"]) => DrillDiagram["routes"]) {
    commit({ ...value, routes: fn(value.routes.length ? value.routes : [{ steps: [] }]) });
  }

  function removeStep(route: number, index: number) {
    updateRoutes((routes) =>
      routes.map((r, ri) => {
        if (ri !== route) return r;
        const steps = r.steps.filter((_, i) => i !== index);
        // İlk nokta silindiyse yeni ilk noktanın "gelen hareketi" anlamsızlaşır.
        if (index === 0 && steps[0]) steps[0] = { x: steps[0].x, y: steps[0].y, turn: steps[0].turn };
        return { steps };
      })
    );
    setSelection(null);
  }

  function removeCone(index: number) {
    commit({ ...value, cones: value.cones.filter((_, i) => i !== index) });
    setSelection(null);
  }

  function removeLabel(index: number) {
    commit({ ...value, labels: value.labels.filter((_, i) => i !== index) });
    setSelection(null);
  }

  function setStep(route: number, index: number, patch: { move?: DrillMovement; turn?: "cw" | "ccw" | null }) {
    updateRoutes((routes) =>
      routes.map((r, ri) =>
        ri !== route
          ? r
          : {
              steps: r.steps.map((s, i) => {
                if (i !== index) return s;
                const next = { ...s };
                if (patch.move) next.move = patch.move;
                if (patch.turn !== undefined) {
                  if (patch.turn) next.turn = patch.turn;
                  else delete next.turn;
                }
                return next;
              }),
            }
      )
    );
  }

  function moveSelection(sel: Selection, to: Pt, pushHistory: boolean) {
    if (!sel) return;
    if (sel.kind === "cone") {
      const cone = value.cones[sel.index];
      if (!cone) return;
      commit(
        {
          ...value,
          cones: value.cones.map((c, i) => (i === sel.index ? { ...c, ...to } : c)),
          // Koninin üzerindeki rota noktaları koniyle birlikte gider.
          routes: value.routes.map((r) => ({ steps: r.steps.map((s) => (same(s, cone) ? { ...s, ...to } : s)) })),
        },
        pushHistory
      );
    } else if (sel.kind === "step") {
      commit(
        {
          ...value,
          routes: value.routes.map((r, ri) =>
            ri !== sel.route ? r : { steps: r.steps.map((s, i) => (i === sel.index ? { ...s, ...to } : s)) }
          ),
        },
        pushHistory
      );
    } else if (sel.kind === "label") {
      commit({ ...value, labels: value.labels.map((l, i) => (i === sel.index ? { ...l, ...to } : l)) }, pushHistory);
    }
  }

  // --- işaretçi olayları -------------------------------------------------------
  function handlePointerDown(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const raw = toUnits(e);
    if (!raw) return;
    const p = snapped(raw);

    if (mode === "cone") {
      const ci = nearestCone(raw);
      if (ci >= 0) {
        setSelection({ kind: "cone", index: ci });
        return;
      }
      if (value.cones.length >= DRILL_LIMITS.maxCones) return;
      commit({ ...value, cones: [...value.cones, p] });
      setSelection(null);
      return;
    }

    if (mode === "route") {
      const ci = nearestCone(raw);
      const target = ci >= 0 ? { x: value.cones[ci]!.x, y: value.cones[ci]!.y } : p;
      const route = value.routes[routeIdx] ?? { steps: [] };
      const last = route.steps[route.steps.length - 1];
      if (last && same(last, target)) {
        const nextTurn = !last.turn ? "cw" : last.turn === "cw" ? "ccw" : null;
        setStep(routeIdx, route.steps.length - 1, { turn: nextTurn });
        return;
      }
      if (route.steps.length >= DRILL_LIMITS.maxSteps) return;
      const step = route.steps.length === 0 ? target : { ...target, move: movement };
      updateRoutes((routes) => routes.map((r, i) => (i === routeIdx ? { steps: [...r.steps, step] } : r)));
      return;
    }

    if (mode === "label") {
      const li = nearestLabel(raw);
      if (li >= 0) {
        setSelection({ kind: "label", index: li });
        return;
      }
      if (value.labels.length >= DRILL_LIMITS.maxLabels) return;
      commit({ ...value, labels: [...value.labels, { ...p, text: "Not" }] });
      setSelection({ kind: "label", index: value.labels.length });
      return;
    }

    if (mode === "erase") {
      const step = nearestStep(raw);
      if (step) return removeStep(step.route, step.index);
      const li = nearestLabel(raw);
      if (li >= 0) return removeLabel(li);
      const ci = nearestCone(raw);
      if (ci >= 0) return removeCone(ci);
      const seg = nearestSegment(raw);
      if (seg) return removeStep(seg.route, seg.index);
      return;
    }

    // select
    let sel: Selection = null;
    const ci = nearestCone(raw);
    if (ci >= 0) sel = { kind: "cone", index: ci };
    if (!sel) {
      const step = nearestStep(raw);
      if (step) sel = { kind: "step", ...step };
    }
    if (!sel) {
      const li = nearestLabel(raw);
      if (li >= 0) sel = { kind: "label", index: li };
    }
    if (!sel) {
      const seg = nearestSegment(raw);
      if (seg) sel = { kind: "segment", ...seg };
    }
    setSelection(sel);
    if (sel && sel.kind !== "segment") {
      if (sel.kind === "step") setActiveRoute(sel.route);
      drag.current = { sel, origin: p, pushed: false };
      svgRef.current?.setPointerCapture(e.pointerId);
    } else if (sel?.kind === "segment") {
      setActiveRoute(sel.route);
    }
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    const raw = toUnits(e);
    if (!raw) return;
    const p = snapped(raw);
    const d = drag.current;
    if (d) {
      if (same(p, d.origin)) return;
      moveSelection(d.sel, p, !d.pushed);
      d.pushed = true;
      d.origin = p;
      return;
    }
    if (mode === "cone" || mode === "route" || mode === "label") {
      if (!hover || !same(hover, p)) setHover(p);
    } else if (hover) {
      setHover(null);
    }
  }

  function handlePointerUp(e: PointerEvent<SVGSVGElement>) {
    if (drag.current) {
      svgRef.current?.releasePointerCapture(e.pointerId);
      drag.current = null;
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selection) {
      e.preventDefault();
      deleteSelection();
    }
  }

  function deleteSelection() {
    if (!selection) return;
    if (selection.kind === "cone") removeCone(selection.index);
    else if (selection.kind === "label") removeLabel(selection.index);
    else removeStep(selection.route, selection.index);
  }

  // --- saha / rota yönetimi ---------------------------------------------------
  function setFieldSize(width: number, height: number) {
    const w = Math.round(Math.min(DRILL_LIMITS.maxField, Math.max(DRILL_LIMITS.minField, width || 0)));
    const h = Math.round(Math.min(DRILL_LIMITS.maxField, Math.max(DRILL_LIMITS.minField, height || 0)));
    if (w === value.width && h === value.height) return;
    commit(clampDiagram(value, w, h));
  }

  function addRoute() {
    if (value.routes.length >= DRILL_LIMITS.maxRoutes) return;
    commit({ ...value, routes: [...value.routes, { steps: [] }] });
    setActiveRoute(value.routes.length);
    setMode("route");
  }

  function deleteRoute(index: number) {
    const routes = value.routes.filter((_, i) => i !== index);
    commit({ ...value, routes: routes.length ? routes : [{ steps: [] }] });
    setActiveRoute(Math.max(0, Math.min(routeIdx, routes.length - 1)));
    setSelection(null);
  }

  function applyTemplate(key: string) {
    const t = DRILL_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    commit(structuredClone(t.diagram));
    onUnitChange(t.unit);
    setActiveRoute(0);
    setSelection(null);
    setMode("select");
    setTemplateKey("");
  }

  const modeInfo = MODES.find((m) => m.value === mode)!;
  const activeSteps = value.routes[routeIdx]?.steps ?? [];
  const unitShort = unit === "yd" ? "yd" : "m";

  return (
    <div className="space-y-3 outline-none" tabIndex={-1} onKeyDown={handleKeyDown}>
      {/* Üst çubuk: şablon + saha + birim */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label className="text-xs">Hazır şablon</Label>
          <select
            value={templateKey}
            onChange={(e) => applyTemplate(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Şablondan başla…</option>
            {DRILL_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-1.5">
          <div className="w-16">
            <Label className="text-xs">Genişlik</Label>
            <Input
              type="number"
              min={DRILL_LIMITS.minField}
              max={DRILL_LIMITS.maxField}
              defaultValue={value.width}
              key={`w${value.width}`}
              onBlur={(e) => setFieldSize(Number(e.target.value), value.height)}
              className="h-9 text-sm"
            />
          </div>
          <span className="pb-2 text-sm text-muted-foreground">×</span>
          <div className="w-16">
            <Label className="text-xs">Yükseklik</Label>
            <Input
              type="number"
              min={DRILL_LIMITS.minField}
              max={DRILL_LIMITS.maxField}
              defaultValue={value.height}
              key={`h${value.height}`}
              onBlur={(e) => setFieldSize(value.width, Number(e.target.value))}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Birim</Label>
          <div className="flex h-9 items-center gap-0.5 rounded-md border p-0.5 text-xs">
            {DRILL_UNITS.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => onUnitChange(u.value)}
                className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
                  unit === u.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mod seçici */}
      <div className="flex flex-wrap items-center gap-1.5">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                setMode(m.value);
                setHover(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                mode === m.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={undo} disabled={history.length === 0}>
            <Undo2 className="h-3.5 w-3.5" />
            Geri al
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              commit(emptyDrillDiagram(value.width, value.height));
              setSelection(null);
              setActiveRoute(0);
              setMode("cone");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Temizle
          </Button>
        </div>
      </div>

      {/* Hareket tipi + rotalar */}
      <div className="flex flex-wrap items-center gap-1.5">
        {DRILL_MOVEMENTS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => {
              setMovement(m.value);
              if (selection?.kind === "segment" || (selection?.kind === "step" && selection.index > 0)) {
                setStep(selection.route, selection.index, { move: m.value });
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
              movement === m.value ? "border-primary bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
            title={m.label}
          >
            <MovementSwatch movement={m.value} color={DRILL_ROUTE_COLORS[routeIdx % DRILL_ROUTE_COLORS.length]} />
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Rotalar:</span>
        {value.routes.map((r, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
              i === routeIdx ? "border-foreground/40 bg-accent font-medium" : ""
            }`}
          >
            <button type="button" className="inline-flex items-center gap-1" onClick={() => setActiveRoute(i)}>
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: DRILL_ROUTE_COLORS[i % DRILL_ROUTE_COLORS.length] }} />
              Rota {i + 1}
              <span className="text-muted-foreground">({Math.max(0, r.steps.length)} nokta)</span>
            </button>
            {value.routes.length > 1 && (
              <button type="button" title="Rotayı sil" onClick={() => deleteRoute(i)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {value.routes.length < DRILL_LIMITS.maxRoutes && (
          <button type="button" onClick={addRoute} className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-muted-foreground hover:text-foreground">
            <Plus className="h-3 w-3" />
            Yeni rota
          </button>
        )}
        <label className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
          <input
            type="checkbox"
            checked={value.showDistances}
            onChange={(e) => commit({ ...value, showDistances: e.target.checked })}
          />
          Bölüm mesafelerini göster
        </label>
      </div>

      <p className="text-xs text-muted-foreground">{modeInfo.help}</p>

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="overflow-hidden rounded-md border bg-background">
          <DrillDiagramSvg
            ref={svgRef}
            diagram={value}
            unit={unit}
            className={`block h-auto w-full max-h-[60vh] select-none ${mode === "select" ? "cursor-default" : "cursor-crosshair"}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {(render) => {
              const px = (p: Pt) => ({ x: render.pad + p.x * render.scale, y: render.pad + p.y * render.scale });
              const color = DRILL_ROUTE_COLORS[routeIdx % DRILL_ROUTE_COLORS.length];
              const last = activeSteps[activeSteps.length - 1];
              const selPoint: Pt | null =
                selection?.kind === "cone"
                  ? value.cones[selection.index] ?? null
                  : selection?.kind === "step"
                    ? value.routes[selection.route]?.steps[selection.index] ?? null
                    : selection?.kind === "label"
                      ? value.labels[selection.index] ?? null
                      : null;
              const selSeg =
                selection?.kind === "segment"
                  ? [value.routes[selection.route]?.steps[selection.index - 1], value.routes[selection.route]?.steps[selection.index]]
                  : null;
              return (
                <g pointerEvents="none">
                  {/* Etkin rotanın noktaları, sıra numaralı */}
                  {activeSteps.map((s, i) => {
                    const p = px(s);
                    return (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={4} className="fill-background" stroke={color} strokeWidth={2} />
                        <text x={p.x + 8} y={p.y - 8} fontSize={10} fontWeight={600} fill={color}>
                          {i + 1}
                        </text>
                      </g>
                    );
                  })}
                  {/* Rota modunda sonraki bölümün önizlemesi */}
                  {mode === "route" && hover && last && !same(hover, last) && (
                    <line
                      x1={px(last).x}
                      y1={px(last).y}
                      x2={px(hover).x}
                      y2={px(hover).y}
                      stroke={color}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                    />
                  )}
                  {(mode === "cone" || mode === "route" || mode === "label") && hover && (
                    <circle cx={px(hover).x} cy={px(hover).y} r={5} fill={mode === "cone" ? "#f97316" : color} fillOpacity={0.45} />
                  )}
                  {selPoint && (
                    <circle
                      cx={px(selPoint).x}
                      cy={px(selPoint).y}
                      r={16}
                      fill="none"
                      className="stroke-primary"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  )}
                  {selSeg?.[0] && selSeg[1] && (
                    <line
                      x1={px(selSeg[0]).x}
                      y1={px(selSeg[0]).y}
                      x2={px(selSeg[1]).x}
                      y2={px(selSeg[1]).y}
                      className="stroke-primary"
                      strokeWidth={12}
                      strokeOpacity={0.2}
                      strokeLinecap="round"
                    />
                  )}
                </g>
              );
            }}
          </DrillDiagramSvg>
        </div>

        <SelectionPanel
          value={value}
          selection={selection}
          onConeLabel={(i, label) =>
            commit(
              { ...value, cones: value.cones.map((c, ci) => (ci === i ? { x: c.x, y: c.y, ...(label ? { label } : {}) } : c)) },
              false
            )
          }
          onLabelText={(i, text) => commit({ ...value, labels: value.labels.map((l, li) => (li === i ? { ...l, text } : l)) }, false)}
          onStep={setStep}
          onDelete={deleteSelection}
          unitShort={unitShort}
        />
      </div>

      <DrillLegend diagram={value} unit={unit} />
    </div>
  );
}

function SelectionPanel({
  value,
  selection,
  onConeLabel,
  onLabelText,
  onStep,
  onDelete,
  unitShort,
}: {
  value: DrillDiagram;
  selection: Selection;
  onConeLabel: (index: number, label: string) => void;
  onLabelText: (index: number, text: string) => void;
  onStep: (route: number, index: number, patch: { move?: DrillMovement; turn?: "cw" | "ccw" | null }) => void;
  onDelete: () => void;
  unitShort: string;
}) {
  if (!selection) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Seçim yok</p>
        <p className="mt-1">
          &quot;Seç / Taşı&quot; modunda bir koniye, noktaya veya çizgiye tıklayarak ayrıntılarını düzenleyin. Delete tuşu seçimi
          siler, Ctrl+Z geri alır.
        </p>
        <p className="mt-2">
          Izgara: ince çizgiler 1 {unitShort}, kalın çizgiler 5 {unitShort}.
        </p>
      </div>
    );
  }

  const deleteButton = (
    <Button type="button" variant="outline" size="sm" className="w-full" onClick={onDelete}>
      <Trash2 className="h-3.5 w-3.5" />
      Sil
    </Button>
  );

  if (selection.kind === "cone") {
    const cone = value.cones[selection.index];
    if (!cone) return null;
    // Bu koninin üzerindeki rota noktaları — dönüş buradan da ayarlanabilsin.
    const onCone = value.routes.flatMap((r, ri) =>
      r.steps.map((s, si) => ({ s, ri, si })).filter(({ s }) => same(s, cone))
    );
    return (
      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">Koni</p>
        <div>
          <Label className="text-xs">Etiket (en fazla {DRILL_LIMITS.maxConeLabelLength} karakter)</Label>
          <Input
            value={cone.label ?? ""}
            maxLength={DRILL_LIMITS.maxConeLabelLength}
            placeholder="A, B, 1…"
            onChange={(e) => onConeLabel(selection.index, e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        {onCone.map(({ s, ri, si }) => (
          <TurnSelect
            key={`${ri}-${si}`}
            label={`Rota ${ri + 1}, ${si + 1}. nokta — dönüş`}
            value={s.turn ?? null}
            onChange={(turn) => onStep(ri, si, { turn })}
          />
        ))}
        {deleteButton}
      </div>
    );
  }

  if (selection.kind === "label") {
    const label = value.labels[selection.index];
    if (!label) return null;
    return (
      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">Etiket</p>
        <Input
          value={label.text}
          maxLength={DRILL_LIMITS.maxLabelLength}
          onChange={(e) => onLabelText(selection.index, e.target.value)}
          className="h-8 text-sm"
          autoFocus
        />
        {deleteButton}
      </div>
    );
  }

  const step = value.routes[selection.route]?.steps[selection.index];
  if (!step) return null;
  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">
        Rota {selection.route + 1} — {selection.kind === "segment" ? `${selection.index}→${selection.index + 1}. bölüm` : `${selection.index + 1}. nokta`}
      </p>
      {selection.index > 0 && (
        <div>
          <Label className="text-xs">{selection.kind === "segment" ? "Hareket" : "Bu noktaya gelen hareket"}</Label>
          <select
            value={step.move ?? "sprint"}
            onChange={(e) => onStep(selection.route, selection.index, { move: e.target.value as DrillMovement })}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {DRILL_MOVEMENTS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {selection.kind === "step" && (
        <TurnSelect label="Koni etrafında dönüş" value={step.turn ?? null} onChange={(turn) => onStep(selection.route, selection.index, { turn })} />
      )}
      {selection.kind === "segment" ? (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          Bitiş noktasını sil
        </Button>
      ) : (
        deleteButton
      )}
    </div>
  );
}

function TurnSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "cw" | "ccw" | null;
  onChange: (turn: "cw" | "ccw" | null) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || null) as "cw" | "ccw" | null)}
        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Yok</option>
        <option value="cw">Saat yönünde</option>
        <option value="ccw">Saat yönünün tersine</option>
      </select>
    </div>
  );
}
