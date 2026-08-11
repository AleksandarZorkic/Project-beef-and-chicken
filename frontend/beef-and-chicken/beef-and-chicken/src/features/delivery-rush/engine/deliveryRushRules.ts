export const deliveryRushGameRules = {
  gameVersion: "1.1.0",

  durationSeconds: 60,
  tickRate: 30,
  totalTicks: 60 * 30,

  laneCount: 3,
  startingLane: 1,

  firstObstacleTick: 90,
  collisionSlowdownTicks: 45,

  maximumInputEvents: 600,
  minimumTicksBetweenInputs: 2,

  avoidedObstaclePoints: 20,
  maxComboMultiplier: 10,
  collisionPenalty: 50,

  expirationGraceSeconds: 15,
  leaderboardSize: 10,
  finishToleranceSeconds: 3,
} as const;

export type DeliveryRushDifficultyLevel =
  | "easy"
  | "medium"
  | "hard"
  | "extreme";

export function getDeliveryRushDifficultyLevel(
  tick: number,
): DeliveryRushDifficultyLevel {
  if (tick < 450) {
    return "easy";
  }

  if (tick < 900) {
    return "medium";
  }

  if (tick < 1350) {
    return "hard";
  }

  return "extreme";
}

export function getObstacleInterval(tick: number): number {
  if (tick < 450) {
    return 45;
  }

  if (tick < 900) {
    return 39;
  }

  if (tick < 1350) {
    return 33;
  }

  return 27;
}

export function getDistancePerTick(tick: number): number {
  if (tick < 450) {
    return 2;
  }

  if (tick < 900) {
    return 3;
  }

  if (tick < 1350) {
    return 4;
  }

  return 5;
}

export function getTwoLaneBlockChancePercent(tick: number): number {
  const difficulty = getDeliveryRushDifficultyLevel(tick);

  switch (difficulty) {
    case "easy":
      return 20;

    case "medium":
      return 30;

    case "hard":
      return 40;

    case "extreme":
      return 50;
  }
}
