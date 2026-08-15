import { describe, expect, it } from "vitest";
import type { DeliveryRushInput } from "../types/deliveryRush.types";
import {
  isDeliveryRushJumpActive,
  simulateDeliveryRush,
  simulateDeliveryRushUntilTick,
  validateDeliveryRushInputs,
} from "./deliveryRushSimulator";
import { generateDeliveryRushObstacles } from "./deliveryRushObstacles";
import {
  deliveryRushGameRules,
  getDeliveryRushDifficultyLevel,
  getTwoLaneBlockChancePercent,
} from "./deliveryRushRules";

describe("Delivery Rush simulator", () => {
  it("returns the same golden result as the backend", () => {
    const result = simulateDeliveryRush(123456, []);

    expect(result).toEqual({
      score: 333,
      distance: 423,
      avoidedObstacles: 2,
      collisionCount: 3,
      maxCombo: 2,
    });
  });

  it("returns the same result for the same seed and inputs", () => {
    const inputs: DeliveryRushInput[] = [
      {
        tick: 100,
        action: "move",
        direction: -1,
      },
      {
        tick: 200,
        action: "move",
        direction: 1,
      },
      {
        tick: 400,
        action: "move",
        direction: 1,
      },
    ];

    const firstResult = simulateDeliveryRush(987654, inputs);
    const secondResult = simulateDeliveryRush(987654, inputs);

    expect(secondResult).toEqual(firstResult);
  });

  it("keeps the jump active for exactly 18 ticks", () => {
    const jumpStartTick = 100;

    expect(isDeliveryRushJumpActive(99, jumpStartTick)).toBe(false);

    expect(isDeliveryRushJumpActive(100, jumpStartTick)).toBe(true);

    expect(isDeliveryRushJumpActive(117, jumpStartTick)).toBe(true);

    expect(isDeliveryRushJumpActive(118, jumpStartTick)).toBe(false);

    expect(isDeliveryRushJumpActive(100, null)).toBe(false);
  });

  it("rejects a new jump while cooldown is active", () => {
    const inputs: DeliveryRushInput[] = [
      {
        tick: 100,
        action: "jump",
      },
      {
        tick: 129,
        action: "jump",
      },
    ];

    expect(() => validateDeliveryRushInputs(inputs)).toThrow(
      "Jump is still on cooldown.",
    );
  });

  it("allows a new jump after the cooldown ends", () => {
    const inputs: DeliveryRushInput[] = [
      {
        tick: 100,
        action: "jump",
      },
      {
        tick: 130,
        action: "jump",
      },
    ];

    expect(() => validateDeliveryRushInputs(inputs)).not.toThrow();
  });

  it("registers a collision when the jump starts after contact", () => {
    const inputs: DeliveryRushInput[] = [
      {
        tick: 87,
        action: "jump",
      },
    ];

    const result = simulateDeliveryRushUntilTick(123456, inputs, 95);

    expect(result.collisionCount).toBe(1);
    expect(result.avoidedObstacles).toBe(0);
  });

  it("registers a collision when the jump ends during contact", () => {
    const inputs: DeliveryRushInput[] = [
      {
        tick: 76,
        action: "jump",
      },
    ];

    const result = simulateDeliveryRushUntilTick(123456, inputs, 95);

    expect(result.collisionCount).toBe(1);
    expect(result.avoidedObstacles).toBe(0);
  });

  it("avoids the obstacle when the jump covers the entire contact", () => {
    const inputs: DeliveryRushInput[] = [
      {
        tick: 80,
        action: "jump",
      },
    ];

    const result = simulateDeliveryRushUntilTick(123456, inputs, 95);

    expect(result.collisionCount).toBe(0);
    expect(result.avoidedObstacles).toBe(1);
  });

  it("rejects an invalid direction", () => {
    const invalidInputs = [
      {
        tick: 100,
        action: "move",
        direction: 0,
      },
    ] as unknown as DeliveryRushInput[];

    expect(() => validateDeliveryRushInputs(invalidInputs)).toThrow(
      "Input direction must be -1 or 1.",
    );
  });

  it("rejects inputs that are too close together", () => {
    const inputs: DeliveryRushInput[] = [
      {
        tick: 100,
        action: "move",
        direction: -1,
      },
      {
        tick: 101,
        action: "move",
        direction: 1,
      },
    ];

    expect(() => validateDeliveryRushInputs(inputs)).toThrow(
      "Input events are too close together.",
    );
  });

  it("generates a deterministic obstacle schedule", () => {
    const firstSchedule = generateDeliveryRushObstacles(123456);
    const secondSchedule = generateDeliveryRushObstacles(123456);

    expect(secondSchedule).toEqual(firstSchedule);
    expect(firstSchedule).toHaveLength(135);
    expect(firstSchedule[0].tick).toBe(90);

    for (const obstacle of firstSchedule) {
      expect(obstacle.tick).toBeGreaterThanOrEqual(0);

      expect([1, 2, 3, 4, 5, 6].includes(obstacle.blockedLaneMask)).toBe(true);
    }
  });

  it("returns live statistics for completed ticks", () => {
    const startResult = simulateDeliveryRushUntilTick(123456, [], 0);

    expect(startResult).toEqual({
      score: 0,
      distance: 0,
      avoidedObstacles: 0,
      collisionCount: 0,
      currentCombo: 0,
      maxCombo: 0,
    });

    const finalLiveResult = simulateDeliveryRushUntilTick(
      123456,
      [],
      deliveryRushGameRules.totalTicks,
    );

    expect(finalLiveResult).toEqual({
      score: 333,
      distance: 423,
      avoidedObstacles: 2,
      collisionCount: 3,
      currentCombo: 0,
      maxCombo: 2,
    });
  });

  it("increases difficulty as the game progresses", () => {
    expect(deliveryRushGameRules.gameVersion).toBe("3.1.0");
    expect(deliveryRushGameRules.durationSeconds).toBe(120);
    expect(deliveryRushGameRules.totalTicks).toBe(3600);

    expect(deliveryRushGameRules.jumpDurationTicks).toBe(18);
    expect(deliveryRushGameRules.jumpCooldownTicks).toBe(12);

    expect(deliveryRushGameRules.collisionWindowBeforeTicks).toBe(4);

    expect(deliveryRushGameRules.collisionWindowAfterTicks).toBe(4);

    expect(getTwoLaneBlockChancePercent(0)).toBe(20);
    expect(getTwoLaneBlockChancePercent(599)).toBe(20);

    expect(getTwoLaneBlockChancePercent(600)).toBe(32);
    expect(getTwoLaneBlockChancePercent(1199)).toBe(32);

    expect(getTwoLaneBlockChancePercent(1200)).toBe(45);
    expect(getTwoLaneBlockChancePercent(1799)).toBe(45);

    expect(getTwoLaneBlockChancePercent(1800)).toBe(58);
    expect(getTwoLaneBlockChancePercent(2399)).toBe(58);

    expect(getTwoLaneBlockChancePercent(2400)).toBe(72);
    expect(getTwoLaneBlockChancePercent(2999)).toBe(72);

    expect(getTwoLaneBlockChancePercent(3000)).toBe(85);
    expect(getTwoLaneBlockChancePercent(3599)).toBe(85);

    expect(getDeliveryRushDifficultyLevel(0)).toBe("easy");
    expect(getDeliveryRushDifficultyLevel(599)).toBe("easy");

    expect(getDeliveryRushDifficultyLevel(600)).toBe("medium");
    expect(getDeliveryRushDifficultyLevel(1199)).toBe("medium");

    expect(getDeliveryRushDifficultyLevel(1200)).toBe("hard");
    expect(getDeliveryRushDifficultyLevel(1799)).toBe("hard");

    expect(getDeliveryRushDifficultyLevel(1800)).toBe("very-hard");
    expect(getDeliveryRushDifficultyLevel(2399)).toBe("very-hard");

    expect(getDeliveryRushDifficultyLevel(2400)).toBe("extreme");
    expect(getDeliveryRushDifficultyLevel(2999)).toBe("extreme");

    expect(getDeliveryRushDifficultyLevel(3000)).toBe("rush-hour");
    expect(getDeliveryRushDifficultyLevel(3599)).toBe("rush-hour");
  });
});
