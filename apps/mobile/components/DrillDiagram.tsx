import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";
import type { DrillDiagramRecord } from "@athleteiq/db/queries/drills";
import {
  buildDrillRender,
  formatDrillDistance,
  routeDistance,
  usedMovements,
  DRILL_CONE_COLOR,
  DRILL_CONE_STROKE,
  DRILL_MOVEMENT_LABELS,
  DRILL_STROKES,
  type DrillMovement,
} from "@athleteiq/validators/drill";

// Drill (koni) diyagramı — web'deki drill-diagram-svg.tsx'in mobil ikizi. Geometri
// packages/validators/drill.ts'te ortak; burada yalnızca react-native-svg'ye
// dökülür. Yalnızca koç ekranlarında kullanılır (RLS sporcuya diyagram vermez).

function DrillSvg({ record, width }: { record: DrillDiagramRecord; width: number }) {
  const render = useMemo(() => buildDrillRender(record.diagram), [record.diagram]);
  const height = (width * render.vbHeight) / render.vbWidth;
  const { field } = render;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${render.vbWidth} ${render.vbHeight}`}>
      <Rect x={field.x} y={field.y} width={field.width} height={field.height} rx={6} fill="#ecfdf5" stroke="#a7f3d0" strokeWidth={1} />
      <G stroke="#064e3b" strokeWidth={1}>
        {render.minorGrid.map((l, i) => (
          <Line key={`n${i}`} {...l} strokeOpacity={0.07} />
        ))}
        {render.majorGrid.map((l, i) => (
          <Line key={`j${i}`} {...l} strokeOpacity={0.2} />
        ))}
      </G>
      <Line x1={field.x} y1={10} x2={field.x + render.scale * 5} y2={10} stroke="#6b7280" strokeWidth={2} />
      <SvgText x={field.x + render.scale * 5 + 6} y={14} fontSize={12} fill="#6b7280">
        {`5 ${record.unit}`}
      </SvgText>

      {render.routes.map((route) => (
        <G key={route.index}>
          {route.segments.map((seg, i) => {
            const st = DRILL_STROKES[seg.movement];
            return (
              <G key={i}>
                <Path
                  d={seg.d}
                  fill="none"
                  stroke={route.color}
                  strokeWidth={st.width}
                  strokeDasharray={st.dash}
                  strokeLinecap={st.cap}
                  strokeLinejoin="round"
                  strokeOpacity={st.opacity}
                />
                {seg.arrow && <Polygon points={seg.arrow} fill={route.color} />}
                {seg.label && (
                  <SvgText x={seg.label.x} y={seg.label.y + 4} fontSize={12} fontWeight="600" textAnchor="middle" fill={route.color}>
                    {seg.label.text}
                  </SvgText>
                )}
              </G>
            );
          })}
          {route.turns.map((t, i) => {
            const st = DRILL_STROKES[t.movement];
            return (
              <G key={`t${i}`}>
                <Path d={t.d} fill="none" stroke={route.color} strokeWidth={Math.min(st.width, 3)} strokeDasharray={st.dash} strokeOpacity={st.opacity} />
                <Polygon points={t.arrow} fill={route.color} />
              </G>
            );
          })}
          {route.endArrow && <Polygon points={route.endArrow} fill={route.color} />}
        </G>
      ))}

      {render.cones.map((c, i) => (
        <G key={i}>
          <Polygon points={c.points} fill={DRILL_CONE_COLOR} stroke={DRILL_CONE_STROKE} strokeWidth={1.2} strokeLinejoin="round" />
          {c.label && (
            <SvgText x={c.x} y={c.y + render.coneSize + 12} fontSize={13} fontWeight="700" textAnchor="middle" fill="#111827">
              {c.label}
            </SvgText>
          )}
        </G>
      ))}

      {render.routes.map((route) =>
        route.start ? (
          <G key={`s${route.index}`}>
            <Circle cx={route.start.x} cy={route.start.y} r={8} fill={route.color} stroke="#fff" strokeWidth={2} />
            {render.routes.length > 1 && (
              <SvgText x={route.start.x} y={route.start.y + 3.5} fontSize={10} fontWeight="700" fill="#fff" textAnchor="middle">
                {String(route.index + 1)}
              </SvgText>
            )}
          </G>
        ) : null
      )}

      {render.labels.map((l, i) => (
        <SvgText key={i} x={l.x} y={l.y + 5} fontSize={14} fontWeight="600" textAnchor="middle" fill="#111827">
          {l.text}
        </SvgText>
      ))}
    </Svg>
  );
}

function MovementSwatch({ movement }: { movement: DrillMovement }) {
  const st = DRILL_STROKES[movement];
  const d = movement === "crossover" ? "M2 8 Q6 2 10 8 T18 8 T26 8 T34 8" : "M2 8 L34 8";
  return (
    <Svg width={36} height={16} viewBox="0 0 36 16">
      <Path d={d} fill="none" stroke="#374151" strokeWidth={Math.min(st.width, 5)} strokeDasharray={st.dash} strokeLinecap={st.cap} strokeOpacity={st.opacity} />
    </Svg>
  );
}

/** "Drill diyagramı" düğmesi + açılır kart (koç gün ekranı). */
export function DrillDiagramToggle({ record }: { record: DrillDiagramRecord }) {
  const [open, setOpen] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  // ScrollView p-4 (2×16) + kart p-3 (2×12)
  const width = Math.max(200, screenWidth - 32 - 24);
  const movements = usedMovements(record.diagram);
  const routes = record.diagram.routes.filter((r) => r.steps.length > 1);

  return (
    <View className="mb-3">
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center self-start bg-orange-50 border border-orange-200 rounded-full px-3 py-1"
      >
        <Ionicons name="triangle-outline" size={14} color="#c2410c" />
        <Text className="text-orange-700 text-xs font-semibold ml-1.5">
          {record.exercise_name} — drill diyagramı
        </Text>
        <View className="ml-1">
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color="#c2410c" />
        </View>
      </TouchableOpacity>

      {open && (
        <View className="bg-white rounded-xl border border-gray-200 p-3 mt-2">
          <DrillSvg record={record} width={width} />
          <View className="flex-row flex-wrap mt-2">
            {movements.map((m) => (
              <View key={m} className="flex-row items-center mr-3 mb-1">
                <MovementSwatch movement={m} />
                <Text className="text-gray-600 text-xs ml-1">{DRILL_MOVEMENT_LABELS[m]}</Text>
              </View>
            ))}
          </View>
          {routes.length > 0 && (
            <Text className="text-gray-900 text-xs font-semibold mt-1">
              {routes.length > 1
                ? record.diagram.routes
                    .map((r, i) => (r.steps.length > 1 ? `Rota ${i + 1}: ${formatDrillDistance(routeDistance(r), record.unit)}` : null))
                    .filter(Boolean)
                    .join(" · ")
                : `Toplam: ${formatDrillDistance(routeDistance(routes[0]!), record.unit)}`}
            </Text>
          )}
          {record.setup_notes ? (
            <View className="bg-gray-50 rounded-lg p-2 mt-2">
              <Text className="text-gray-600 text-xs">
                <Text className="font-semibold text-gray-800">Kurulum: </Text>
                {record.setup_notes}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
