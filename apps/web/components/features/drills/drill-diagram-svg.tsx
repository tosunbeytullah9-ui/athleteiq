"use client";

import { forwardRef, useMemo, type PointerEvent, type ReactNode } from "react";
import {
  buildDrillRender,
  formatDrillDistance,
  routeDistance,
  usedMovements,
  DRILL_CONE_COLOR,
  DRILL_CONE_STROKE,
  DRILL_MOVEMENT_LABELS,
  DRILL_ROUTE_COLORS,
  DRILL_STROKES,
  type DrillDiagram,
  type DrillMovement,
  type DrillRender,
  type DrillUnit,
} from "@athleteiq/validators/drill";

// Drill diyagramının salt çizimi — geometri tamamen packages/validators/drill.ts'te
// (mobil ikiziyle ortak), burada yalnızca SVG elemanlarına dökülür. Editör aynı
// bileşeni kullanır ve tutamaçlarını `children` olarak üstüne bindirir.

interface Props {
  diagram: DrillDiagram;
  unit: DrillUnit;
  showGrid?: boolean;
  className?: string;
  /** Editör katmanı (tutamaçlar) — çizimin üstüne, aynı koordinat sisteminde. */
  children?: (render: DrillRender) => ReactNode;
  onPointerDown?: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (e: PointerEvent<SVGSVGElement>) => void;
}

export const DrillDiagramSvg = forwardRef<SVGSVGElement, Props>(function DrillDiagramSvg(
  { diagram, unit, showGrid = true, className, children, onPointerDown, onPointerMove, onPointerUp },
  ref
) {
  const render = useMemo(() => buildDrillRender(diagram), [diagram]);
  const { field } = render;
  const unitShort = unit === "yd" ? "yd" : "m";

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${render.vbWidth} ${render.vbHeight}`}
      className={className}
      role="img"
      aria-label="Drill diyagramı"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ touchAction: onPointerDown ? "none" : undefined }}
    >
      <rect
        x={field.x}
        y={field.y}
        width={field.width}
        height={field.height}
        rx={6}
        className="fill-emerald-50 stroke-emerald-200 dark:fill-emerald-950/40 dark:stroke-emerald-900"
        strokeWidth={1}
      />
      {showGrid && (
        <g className="stroke-emerald-900 dark:stroke-emerald-200" strokeWidth={1}>
          {render.minorGrid.map((l, i) => (
            <line key={`n${i}`} {...l} strokeOpacity={0.07} />
          ))}
          {render.majorGrid.map((l, i) => (
            <line key={`j${i}`} {...l} strokeOpacity={0.2} />
          ))}
        </g>
      )}
      {showGrid && (
        // Ölçek: sol üstte 5 birimlik çubuk
        <g className="fill-muted-foreground stroke-muted-foreground">
          <line x1={field.x} y1={10} x2={field.x + render.scale * 5} y2={10} strokeWidth={2} />
          <text
            x={field.x + render.scale * 5 + 6}
            y={14}
            fontSize={12}
            stroke="none"
          >
            5 {unitShort}
          </text>
        </g>
      )}

      {render.routes.map((route) => (
        <g key={route.index} fill="none" stroke={route.color}>
          {route.segments.map((seg, i) => {
            const st = DRILL_STROKES[seg.movement];
            return (
              <g key={i}>
                <path
                  d={seg.d}
                  strokeWidth={st.width}
                  strokeDasharray={st.dash}
                  strokeLinecap={st.cap}
                  strokeLinejoin="round"
                  strokeOpacity={st.opacity}
                />
                {seg.arrow && <polygon points={seg.arrow} fill={route.color} stroke="none" />}
                {seg.label && (
                  <text
                    x={seg.label.x}
                    y={seg.label.y}
                    fontSize={12}
                    fontWeight={600}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={route.color}
                    stroke="none"
                  >
                    {seg.label.text}
                  </text>
                )}
              </g>
            );
          })}
          {route.turns.map((t, i) => {
            const st = DRILL_STROKES[t.movement];
            return (
              <g key={`t${i}`}>
                <path d={t.d} strokeWidth={Math.min(st.width, 3)} strokeDasharray={st.dash} strokeOpacity={st.opacity} />
                <polygon points={t.arrow} fill={route.color} stroke="none" />
              </g>
            );
          })}
          {route.endArrow && <polygon points={route.endArrow} fill={route.color} stroke="none" />}
        </g>
      ))}

      {render.cones.map((c, i) => (
        <g key={i}>
          <polygon points={c.points} fill={DRILL_CONE_COLOR} stroke={DRILL_CONE_STROKE} strokeWidth={1.2} strokeLinejoin="round" />
          {c.label && (
            <text
              x={c.x}
              y={c.y + render.coneSize + 12}
              fontSize={13}
              fontWeight={700}
              textAnchor="middle"
              className="fill-foreground"
            >
              {c.label}
            </text>
          )}
        </g>
      ))}

      {/* Başlangıç noktaları konilerin üstünde kalsın */}
      {render.routes.map(
        (route) =>
          route.start && (
            <g key={`s${route.index}`}>
              <circle cx={route.start.x} cy={route.start.y} r={8} fill={route.color} className="stroke-background" strokeWidth={2} />
              {render.routes.length > 1 && (
                <text
                  x={route.start.x}
                  y={route.start.y}
                  fontSize={10}
                  fontWeight={700}
                  fill="#fff"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {route.index + 1}
                </text>
              )}
            </g>
          )
      )}

      {render.labels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={l.y}
          fontSize={14}
          fontWeight={600}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground"
        >
          {l.text}
        </text>
      ))}

      {children?.(render)}
    </svg>
  );
});

/** Lejantta hareket tipinin çizgi örneği. */
export function MovementSwatch({ movement, color = "currentColor" }: { movement: DrillMovement; color?: string }) {
  const st = DRILL_STROKES[movement];
  const d = movement === "crossover" ? "M2 8 Q6 2 10 8 T18 8 T26 8 T34 8" : "M2 8 L34 8";
  return (
    <svg width={36} height={16} viewBox="0 0 36 16" aria-hidden className="shrink-0">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={Math.min(st.width, 5)}
        strokeDasharray={st.dash}
        strokeLinecap={st.cap}
        strokeOpacity={st.opacity}
      />
    </svg>
  );
}

export function DrillLegend({ diagram, unit }: { diagram: DrillDiagram; unit: DrillUnit }) {
  const movements = usedMovements(diagram);
  const routes = diagram.routes.filter((r) => r.steps.length > 1);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: DRILL_ROUTE_COLORS[0] }} />
        Başlangıç
      </span>
      {movements.map((m) => (
        <span key={m} className="flex items-center gap-1.5 text-foreground/80">
          <MovementSwatch movement={m} />
          {DRILL_MOVEMENT_LABELS[m]}
        </span>
      ))}
      {routes.length > 0 && (
        <span className="ml-auto font-medium text-foreground">
          {diagram.routes.length > 1
            ? diagram.routes
                .map((r, i) => ({ i, steps: r.steps.length, text: formatDrillDistance(routeDistance(r), unit) }))
                .filter((r) => r.steps > 1)
                .map((r) => `Rota ${r.i + 1}: ${r.text}`)
                .join(" · ")
            : `Toplam: ${formatDrillDistance(routeDistance(routes[0]!), unit)}`}
        </span>
      )}
    </div>
  );
}

