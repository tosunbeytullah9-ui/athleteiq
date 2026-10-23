"use client";

import { AcwrScene } from "./acwr-scene";
import { AnnualPlanScene } from "./annual-plan-scene";
import { AthleteRecoveryScene } from "./athlete-recovery-scene";
import { AthleteRpeScene } from "./athlete-rpe-scene";
import { AthleteWellnessScene } from "./athlete-wellness-scene";
import { CoachDashboardScene } from "./coach-dashboard-scene";
import { FeedbackScene } from "./feedback-scene";
import { ProgramBuilderScene } from "./program-builder-scene";
import type { ReplicaSceneName } from "./scene-names";

const REPLICA_SCENES: Record<ReplicaSceneName, () => React.JSX.Element> = {
  "coach-dashboard": CoachDashboardScene,
  acwr: AcwrScene,
  "annual-plan": AnnualPlanScene,
  "program-builder": ProgramBuilderScene,
  "coach-feedback": FeedbackScene,
  "athlete-recovery": AthleteRecoveryScene,
  "athlete-rpe": AthleteRpeScene,
  "athlete-wellness": AthleteWellnessScene,
};

export function ReplicaScene({ name }: { name: ReplicaSceneName }) {
  const Scene = REPLICA_SCENES[name];
  return <Scene />;
}
