import type {
  DeliveryRushInput,
  DeliveryRushLiveStats,
  DeliveryRushSimulationResult,
} from "../types/deliveryRush.types";
import { generateBlockedLaneMask } from "./deliveryRushObstacles";
import { DeliveryRushRandom } from "./deliveryRushRandom";
import {
  deliveryRushGameRules,
  getDistancePerTick,
  getObstacleInterval,
} from "./deliveryRushRules";

export function simulateDeliveryRush(
  seed: number,
  inputs: readonly DeliveryRushInput[],
): DeliveryRushSimulationResult {
  const liveResult = simulateDeliveryRushUntilTick(
    seed,
    inputs,
    deliveryRushGameRules.totalTicks,
  );

  return {
    score: liveResult.score,
    distance: liveResult.distance,
    avoidedObstacles: liveResult.avoidedObstacles,
    collisionCount: liveResult.collisionCount,
    maxCombo: liveResult.maxCombo,
  };
}

export function simulateDeliveryRushUntilTick(
  seed: number,
  inputs: readonly DeliveryRushInput[],
  completedTicks: number,
): DeliveryRushLiveStats {
  validateDeliveryRushInputs(inputs);
  validateCompletedTicks(completedTicks);

  const random = new DeliveryRushRandom(seed);

  let playerLane: number = deliveryRushGameRules.startingLane;
  let inputIndex = 0;
  let nextObstacleTick: number = deliveryRushGameRules.firstObstacleTick;

  let distance = 0;
  let avoidedObstacles = 0;
  let collisionCount = 0;
  let currentCombo = 0;
  let maxCombo = 0;
  let slowdownTicksRemaining = 0;

  for (let tick = 0; tick < completedTicks; tick++) {
    if (inputIndex < inputs.length && inputs[inputIndex].tick === tick) {
      const input = inputs[inputIndex];

      playerLane = clamp(
        playerLane + input.direction,
        0,
        deliveryRushGameRules.laneCount - 1,
      );

      inputIndex++;
    }

    const distancePerTick = getDistancePerTick(tick);

    if (slowdownTicksRemaining > 0) {
      distance += Math.max(1, Math.trunc(distancePerTick / 2));
      slowdownTicksRemaining--;
    } else {
      distance += distancePerTick;
    }

    if (tick !== nextObstacleTick) {
      continue;
    }

    const blockedLaneMask = generateBlockedLaneMask(random, tick);
    const playerLaneMask = 1 << playerLane;
    const collision = (blockedLaneMask & playerLaneMask) !== 0;

    if (collision) {
      collisionCount++;
      currentCombo = 0;
      slowdownTicksRemaining = deliveryRushGameRules.collisionSlowdownTicks;
    } else {
      avoidedObstacles++;
      currentCombo++;
      maxCombo = Math.max(maxCombo, currentCombo);
    }

    if (collisionCount >= deliveryRushGameRules.maximumCollisions) {
      break;
    }

    nextObstacleTick += getObstacleInterval(tick);
  }

  const score =
    distance +
    avoidedObstacles * deliveryRushGameRules.avoidedObstaclePoints +
    maxCombo * deliveryRushGameRules.maxComboMultiplier -
    collisionCount * deliveryRushGameRules.collisionPenalty;

  return {
    score: Math.max(0, score),
    distance,
    avoidedObstacles,
    collisionCount,
    currentCombo,
    maxCombo,
  };
}

export function validateDeliveryRushInputs(
  inputs: readonly DeliveryRushInput[],
): void {
  if (!Array.isArray(inputs)) {
    throw new TypeError("Inputs must be an array.");
  }

  if (inputs.length > deliveryRushGameRules.maximumInputEvents) {
    throw new Error("Too many input events.");
  }

  let previousTick = -1;

  for (const input of inputs) {
    if (
      !input ||
      !Number.isInteger(input.tick) ||
      input.tick < 0 ||
      input.tick >= deliveryRushGameRules.totalTicks
    ) {
      throw new Error("Input tick is outside the game duration.");
    }

    if (input.direction !== -1 && input.direction !== 1) {
      throw new Error("Input direction must be -1 or 1.");
    }

    if (input.tick <= previousTick) {
      throw new Error("Input ticks must be strictly increasing.");
    }

    if (
      previousTick >= 0 &&
      input.tick - previousTick <
        deliveryRushGameRules.minimumTicksBetweenInputs
    ) {
      throw new Error("Input events are too close together.");
    }

    previousTick = input.tick;
  }
}

function validateCompletedTicks(completedTicks: number): void {
  if (
    !Number.isInteger(completedTicks) ||
    completedTicks < 0 ||
    completedTicks > deliveryRushGameRules.totalTicks
  ) {
    throw new RangeError("Completed ticks are outside the game duration.");
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
