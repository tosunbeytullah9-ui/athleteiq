/** Sunucu tarafında doğrulanabilsin diye "use client" modülünün dışında. */
export const REPLICA_SCENE_NAMES = [
  "coach-dashboard",
  "acwr",
  "annual-plan",
  "program-builder",
  "coach-feedback",
  "athlete-recovery",
  "athlete-rpe",
  "athlete-wellness",
] as const;

export type ReplicaSceneName = (typeof REPLICA_SCENE_NAMES)[number];

export function isReplicaSceneName(value: string): value is ReplicaSceneName {
  return (REPLICA_SCENE_NAMES as readonly string[]).includes(value);
}
