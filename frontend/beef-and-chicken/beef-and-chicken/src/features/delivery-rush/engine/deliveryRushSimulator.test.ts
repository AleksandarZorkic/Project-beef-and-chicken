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
      score: 3109,
      distance: 4029,
      avoidedObstacles: 22,
      collisionCount: 28,
      maxCombo: 4,
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

    expect(firstSchedule).toHaveLength(50);

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

    const finalLiveResult = simulateDeliveryRushUntilTick(123456, [], 1800);

    const { currentCombo: _currentCombo, ...finalResult } = finalLiveResult;

    expect(finalResult).toEqual(simulateDeliveryRush(123456, []));
  });

  it("increases difficulty as the game progresses", () => {
    expect(deliveryRushGameRules.gameVersion).toBe("1.1.0");

    expect(getTwoLaneBlockChancePercent(0)).toBe(20);
    expect(getTwoLaneBlockChancePercent(449)).toBe(20);

    expect(getTwoLaneBlockChancePercent(450)).toBe(30);
    expect(getTwoLaneBlockChancePercent(899)).toBe(30);

    expect(getTwoLaneBlockChancePercent(900)).toBe(40);
    expect(getTwoLaneBlockChancePercent(1349)).toBe(40);

    expect(getTwoLaneBlockChancePercent(1350)).toBe(50);
    expect(getTwoLaneBlockChancePercent(1799)).toBe(50);

    expect(getDeliveryRushDifficultyLevel(0)).toBe("easy");
    expect(getDeliveryRushDifficultyLevel(449)).toBe("easy");

    expect(getDeliveryRushDifficultyLevel(450)).toBe("medium");
    expect(getDeliveryRushDifficultyLevel(899)).toBe("medium");

    expect(getDeliveryRushDifficultyLevel(900)).toBe("hard");
    expect(getDeliveryRushDifficultyLevel(1349)).toBe("hard");

    expect(getDeliveryRushDifficultyLevel(1350)).toBe("extreme");
    expect(getDeliveryRushDifficultyLevel(1799)).toBe("extreme");
  });
});
