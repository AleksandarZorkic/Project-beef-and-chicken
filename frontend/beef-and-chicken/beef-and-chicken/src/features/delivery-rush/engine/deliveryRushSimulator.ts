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
  let activeObstacleTick: number | null = null;
  let activeBlockedLaneMask = 0;
  let activeObstacleCollided = false;
  let jumpStartTick: number | null = null;

  let distance = 0;
  let avoidedObstacles = 0;
  let collisionCount = 0;
  let currentCombo = 0;
  let maxCombo = 0;
  let slowdownTicksRemaining = 0;

  for (let tick = 0; tick < completedTicks; tick++) {
    if (inputIndex < inputs.length && inputs[inputIndex].tick === tick) {
      const input = inputs[inputIndex];

      if (input.action === "move") {
        playerLane = clamp(
          playerLane + input.direction,
          0,
          deliveryRushGameRules.laneCount - 1,
        );
      } else {
        jumpStartTick = tick;
      }

      inputIndex += 1;
    }

    const distancePerTick = getDistancePerTick(tick);

    if (slowdownTicksRemaining > 0) {
      distance += Math.max(1, Math.trunc(distancePerTick / 2));
      slowdownTicksRemaining--;
    } else {
      distance += distancePerTick;
    }

    const collisionWindowStartTick =
      nextObstacleTick - deliveryRushGameRules.collisionWindowBeforeTicks;

    if (activeObstacleTick === null && tick === collisionWindowStartTick) {
      activeObstacleTick = nextObstacleTick;

      activeBlockedLaneMask = generateBlockedLaneMask(random, nextObstacleTick);

      activeObstacleCollided = false;
    }

    if (activeObstacleTick === null) {
      continue;
    }

    const collisionWindowEndTick =
      activeObstacleTick + deliveryRushGameRules.collisionWindowAfterTicks;

    const playerLaneMask = 1 << playerLane;

    const isJumping = isDeliveryRushJumpActive(tick, jumpStartTick);

    const isPlayerTouchingObstacle =
      (activeBlockedLaneMask & playerLaneMask) !== 0;

    if (!activeObstacleCollided && isPlayerTouchingObstacle && !isJumping) {
      collisionCount++;
      currentCombo = 0;

      slowdownTicksRemaining = deliveryRushGameRules.collisionSlowdownTicks;

      activeObstacleCollided = true;

      if (collisionCount >= deliveryRushGameRules.maximumCollisions) {
        break;
      }
    }

    if (tick < collisionWindowEndTick) {
      continue;
    }

    if (!activeObstacleCollided) {
      avoidedObstacles++;
      currentCombo++;

      maxCombo = Math.max(maxCombo, currentCombo);
    }

    nextObstacleTick += getObstacleInterval(activeObstacleTick);

    activeObstacleTick = null;
    activeBlockedLaneMask = 0;
    activeObstacleCollided = false;
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

export function isDeliveryRushJumpActive(
  currentTick: number,
  jumpStartTick: number | null,
): boolean {
  if (jumpStartTick === null) {
    return false;
  }

  return (
    currentTick >= jumpStartTick &&
    currentTick < jumpStartTick + deliveryRushGameRules.jumpDurationTicks
  );
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
  let previousJumpTick: number | null = null;

  for (const input of inputs) {
    if (
      !input ||
      !Number.isInteger(input.tick) ||
      input.tick < 0 ||
      input.tick >= deliveryRushGameRules.totalTicks
    ) {
      throw new Error("Input tick is outside the game duration.");
    }

    if (input.action !== "move" && input.action !== "jump") {
      throw new Error("Input action must be move or jump.");
    }

    if (
      input.action === "move" &&
      input.direction !== -1 &&
      input.direction !== 1
    ) {
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

    if (input.action === "jump" && previousJumpTick !== null) {
      const nextAllowedJumpTick =
        previousJumpTick +
        deliveryRushGameRules.jumpDurationTicks +
        deliveryRushGameRules.jumpCooldownTicks;

      if (input.tick < nextAllowedJumpTick) {
        throw new Error("Jump is still on cooldown.");
      }
    }

    if (input.action === "jump") {
      previousJumpTick = input.tick;
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
