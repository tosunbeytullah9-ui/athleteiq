import type { Tables } from "@athleteiq/db/types";

type ExerciseWithSets = Tables<"exercises"> & { exercise_sets: Tables<"exercise_sets">[] };

export type ExerciseRenderUnit =
  | { kind: "single"; exercise: ExerciseWithSets; index: number }
  | {
      kind: "group";
      groupKey: string;
      label: string;
      members: { exercise: ExerciseWithSets; index: number }[];
    };

/**
 * Bir seansın (zaten order_index'e göre artan sıralı) egzersiz listesini süperset
 * gruplarına ayırır. superset_group === null asla gruplanmaz. Tek üyeli gruplar
 * standalone render edilir. Birim sırası: her birim seansın order_index sırasını
 * korur — grup için o grubun EN KÜÇÜK index'i kullanılır.
 */
export function groupExercisesForRender(sortedExercises: ExerciseWithSets[]): ExerciseRenderUnit[] {
  const withIndex = sortedExercises.map((exercise, index) => ({ exercise, index }));

  const standalone: typeof withIndex = [];
  const buckets = new Map<string, typeof withIndex>();
  for (const item of withIndex) {
    const g = item.exercise.superset_group;
    if (!g) {
      standalone.push(item);
      continue;
    }
    if (!buckets.has(g)) buckets.set(g, []);
    buckets.get(g)!.push(item);
  }

  for (const members of buckets.values()) {
    members.sort((a, b) => (a.exercise.superset_order ?? 0) - (b.exercise.superset_order ?? 0));
  }

  const units: (ExerciseRenderUnit & { pos: number })[] = [];
  for (const item of standalone) {
    units.push({ kind: "single", exercise: item.exercise, index: item.index, pos: item.index });
  }
  for (const [groupKey, members] of buckets) {
    if (members.length >= 2) {
      units.push({
        kind: "group",
        groupKey,
        label: `${groupKey} Grubu — Süperset (${members.length} egzersiz)`,
        members: members.map((m) => ({ exercise: m.exercise, index: m.index })),
        pos: Math.min(...members.map((m) => m.index)),
      });
    } else {
      const only = members[0];
      units.push({ kind: "single", exercise: only.exercise, index: only.index, pos: only.index });
    }
  }

  units.sort((a, b) => a.pos - b.pos);
  return units.map((unit): ExerciseRenderUnit => {
    if (unit.kind === "single") {
      return { kind: "single", exercise: unit.exercise, index: unit.index };
    }
    return { kind: "group", groupKey: unit.groupKey, label: unit.label, members: unit.members };
  });
}
