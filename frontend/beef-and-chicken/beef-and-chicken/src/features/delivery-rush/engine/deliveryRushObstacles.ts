import { DeliveryRushRandom } from "./deliveryRushRandom";
import {
  deliveryRushGameRules,
  getObstacleInterval,
  getTwoLaneBlockChancePercent,
} from "./deliveryRushRules";

export interface DeliveryRushObstacle {
  tick: number;
  blockedLaneMask: number;
}

export function generateDeliveryRushObstacles(
  seed: number,
): DeliveryRushObstacle[] {
  const random = new DeliveryRushRandom(seed);
  const obstacles: DeliveryRushObstacle[] = [];

  let obstacleTick: number = deliveryRushGameRules.firstObstacleTick;

  while (obstacleTick < deliveryRushGameRules.totalTicks) {
    obstacles.push({
      tick: obstacleTick,
      blockedLaneMask: generateBlockedLaneMask(random, obstacleTick),
    });

    obstacleTick += getObstacleInterval(obstacleTick);
  }

  return obstacles;
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
