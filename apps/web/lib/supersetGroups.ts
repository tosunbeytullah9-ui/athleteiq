import type { Tables } from "@athleteiq/db/types";

export const SUPERSET_GROUPS = ["", "A", "B", "C", "D", "E", "F", "G"] as const;

export const SUPERSET_COLORS: Record<string, string> = {
  A: "border-l-violet-500",
  B: "border-l-emerald-500",
  C: "border-l-blue-500",
  D: "border-l-orange-500",
  E: "border-l-pink-500",
  F: "border-l-cyan-500",
  G: "border-l-yellow-500",
};

type ExerciseWithSets = Tables<"exercises"> & { exercise_sets: Tables<"exercise_sets">[] };

export type ExerciseRenderUnit =
  | { kind: "single"; exercise: ExerciseWithSets }
  | { kind: "group"; groupKey: string; label: string; members: ExerciseWithSets[] };

/**
 * Bir seansın (order_index'e göre artan sıralı) egzersiz listesini süperset
 * gruplarına ayırır. superset_group === null asla gruplanmaz. Tek üyeli
 * gruplar standalone render edilir. Birim sırası korunur — grup için o
 * grubun EN KÜÇÜK order_index'i kullanılır. apps/mobile/lib/supersetGroups.ts
 * ile aynı mantık, web'in düz (indexsiz) exercise listesine uyarlanmış hali.
 */
export function groupExercisesForRender(sortedExercises: ExerciseWithSets[]): ExerciseRenderUnit[] {
  const standalone: { exercise: ExerciseWithSets; pos: number }[] = [];
  const buckets = new Map<string, { exercise: ExerciseWithSets; pos: number }[]>();

  sortedExercises.forEach((exercise, pos) => {
    const g = exercise.superset_group;
    if (!g) {
      standalone.push({ exercise, pos });
      return;
    }
    if (!buckets.has(g)) buckets.set(g, []);
    buckets.get(g)!.push({ exercise, pos });
  });

  for (const members of buckets.values()) {
    members.sort((a, b) => (a.exercise.superset_order ?? 0) - (b.exercise.superset_order ?? 0));
  }

  const units: (ExerciseRenderUnit & { pos: number })[] = [];
  for (const item of standalone) {
    units.push({ kind: "single", exercise: item.exercise, pos: item.pos });
  }
  for (const [groupKey, members] of buckets) {
    if (members.length >= 2) {
      units.push({
        kind: "group",
        groupKey,
        label: `Grup ${groupKey} — Süperset (${members.length} egzersiz)`,
        members: members.map((m) => m.exercise),
        pos: Math.min(...members.map((m) => m.pos)),
      });
    } else {
      const only = members[0]!;
      units.push({ kind: "single", exercise: only.exercise, pos: only.pos });
    }
  }

  units.sort((a, b) => a.pos - b.pos);
  return units.map((unit): ExerciseRenderUnit => {
    if (unit.kind === "single") return { kind: "single", exercise: unit.exercise };
    return { kind: "group", groupKey: unit.groupKey, label: unit.label, members: unit.members };
  });
}
