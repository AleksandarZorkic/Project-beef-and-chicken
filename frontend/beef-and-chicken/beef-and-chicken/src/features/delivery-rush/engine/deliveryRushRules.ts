export const deliveryRushGameRules = {
  gameVersion: "3.1.0",

  durationSeconds: 120,
  tickRate: 30,
  totalTicks: 120 * 30,

  laneCount: 3,
  startingLane: 1,

  firstObstacleTick: 90,
  maximumCollisions: 3,
  collisionSlowdownTicks: 45,
  collisionWindowBeforeTicks: 4,
  collisionWindowAfterTicks: 4,

  jumpDurationTicks: 18,
  jumpCooldownTicks: 12,

  maximumInputEvents: 900,
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
  | "very-hard"
  | "extreme"
  | "rush-hour";

export function getDeliveryRushDifficultyLevel(
  tick: number,
): DeliveryRushDifficultyLevel {
  if (tick < 600) {
    return "easy";
  }

  if (tick < 1200) {
    return "medium";
  }

  if (tick < 1800) {
    return "hard";
  }

  if (tick < 2400) {
    return "very-hard";
  }

  if (tick < 3000) {
    return "extreme";
  }

  return "rush-hour";
}

export function getObstacleInterval(tick: number): number {
  if (tick < 600) {
    return 42;
  }

  if (tick < 1200) {
    return 36;
  }

  if (tick < 1800) {
    return 30;
  }

  if (tick < 2400) {
    return 25;
  }

  if (tick < 3000) {
    return 21;
  }

  return 18;
}

export function getDistancePerTick(tick: number): number {
  if (tick < 600) {
    return 2;
  }

  if (tick < 1200) {
    return 3;
  }

  if (tick < 1800) {
    return 4;
  }

  if (tick < 2400) {
    return 5;
  }

  if (tick < 3000) {
    return 6;
  }

  return 7;
}

export function getTwoLaneBlockChancePercent(tick: number): number {
  const difficulty = getDeliveryRushDifficultyLevel(tick);

  switch (difficulty) {
    case "easy":
      return 20;

    case "medium":
      return 32;

    case "hard":
      return 45;

    case "very-hard":
      return 58;

    case "extreme":
      return 72;

    case "rush-hour":
      return 85;
  }
}
