import { describe, expect, it } from "vitest";
import type { DeliveryRushInput } from "../types/deliveryRush.types";
import {
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
      score: 341,
      distance: 431,
      avoidedObstacles: 2,
      collisionCount: 3,
      maxCombo: 2,
    });
  });

  it("returns the same result for the same seed and inputs", () => {
    const inputs: DeliveryRushInput[] = [
      {
        tick: 100,
        direction: -1,
      },
      {
        tick: 200,
        direction: 1,
      },
      {
        tick: 400,
        direction: 1,
      },
    ];

    const firstResult = simulateDeliveryRush(987654, inputs);
    const secondResult = simulateDeliveryRush(987654, inputs);

    expect(secondResult).toEqual(firstResult);
  });

  it("rejects an invalid direction", () => {
    const invalidInputs = [
      {
        tick: 100,
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
        direction: -1,
      },
      {
        tick: 101,
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
      score: 341,
      distance: 431,
      avoidedObstacles: 2,
      collisionCount: 3,
      currentCombo: 0,
      maxCombo: 2,
    });
  });

  it("increases difficulty as the game progresses", () => {
    expect(deliveryRushGameRules.gameVersion).toBe("2.0.0");
    expect(deliveryRushGameRules.durationSeconds).toBe(120);
    expect(deliveryRushGameRules.totalTicks).toBe(3600);

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
