import { DeliveryRushRandom } from "./deliveryRushRandom";
import {
  deliveryRushGameRules,
  getDeliveryRushDifficultyLevel,
  getObstacleInterval,
  getTwoLaneBlockChancePercent,
} from "./deliveryRushRules";

export type DeliveryRushObstacleType = "barrier" | "car" | "pothole";

export interface DeliveryRushObstacle {
  tick: number;
  blockedLaneMask: number;
  type: DeliveryRushObstacleType;
}

export function generateDeliveryRushObstacles(
  seed: number,
): DeliveryRushObstacle[] {
  const random = new DeliveryRushRandom(seed);
  const obstacles: DeliveryRushObstacle[] = [];

  let obstacleTick: number = deliveryRushGameRules.firstObstacleTick;

  while (obstacleTick < deliveryRushGameRules.totalTicks) {
    obstacles.push(generateDeliveryRushObstacle(random, obstacleTick));

    obstacleTick += getObstacleInterval(obstacleTick);
  }

  return obstacles;
}

export function generateDeliveryRushObstacle(
  random: DeliveryRushRandom,
  tick: number,
): DeliveryRushObstacle {
  return {
    tick,
    blockedLaneMask: generateBlockedLaneMask(random, tick),
    type: generateObstacleType(random, tick),
  };
}

export function generateObstacleType(
  random: DeliveryRushRandom,
  tick: number,
): DeliveryRushObstacleType {
  const roll = random.nextInt(100);
  const difficulty = getDeliveryRushDifficultyLevel(tick);

  switch (difficulty) {
    case "easy":
      if (roll < 10) {
        return "car";
      }

      return roll < 35 ? "pothole" : "barrier";

    case "medium":
      if (roll < 20) {
        return "car";
      }

      return roll < 50 ? "pothole" : "barrier";

    case "hard":
      if (roll < 30) {
        return "car";
      }

      return roll < 62 ? "pothole" : "barrier";

    case "very-hard":
      if (roll < 38) {
        return "car";
      }

      return roll < 70 ? "pothole" : "barrier";

    case "extreme":
      if (roll < 45) {
        return "car";
      }

      return roll < 75 ? "pothole" : "barrier";

    case "rush-hour":
      if (roll < 52) {
        return "car";
      }

      return roll < 80 ? "pothole" : "barrier";
  }
}

export function canJumpOverObstacle(type: DeliveryRushObstacleType): boolean {
  return type !== "car";
}

export function generateBlockedLaneMask(
  random: DeliveryRushRandom,
  tick: number,
): number {
  const twoLaneBlockChance = getTwoLaneBlockChancePercent(tick);

  const shouldBlockTwoLanes = random.nextInt(100) < twoLaneBlockChance;

  if (shouldBlockTwoLanes) {
    const safeLane = random.nextInt(deliveryRushGameRules.laneCount);

    const allLanesMask = (1 << deliveryRushGameRules.laneCount) - 1;

    return allLanesMask & ~(1 << safeLane);
  }

  const blockedLane = random.nextInt(deliveryRushGameRules.laneCount);

  return 1 << blockedLane;
}

export function isLaneBlocked(blockedLaneMask: number, lane: number): boolean {
  const laneMask = 1 << lane;

  return (blockedLaneMask & laneMask) !== 0;
}
