namespace beef_and_chicken.Domain.Games.DeliveryRush
{
    public static class DeliveryRushObstacleGenerator
    {
        public static DeliveryRushObstacle Generate(
            DeliveryRushRandom random,
            int tick)
        {
            ArgumentNullException.ThrowIfNull(random);

            return new DeliveryRushObstacle(
                Tick: tick,
                BlockedLaneMask: GenerateBlockedLaneMask(random, tick),
                Type: GenerateObstacleType(random, tick));
        }

        public static int GenerateBlockedLaneMask(
            DeliveryRushRandom random,
            int tick)
        {
            ArgumentNullException.ThrowIfNull(random);

            var twoLaneBlockChance =
                DeliveryRushGameRules
                    .GetTwoLaneBlockChancePercent(tick);

            var shouldBlockTwoLanes =
                random.NextInt(100) < twoLaneBlockChance;

            if (shouldBlockTwoLanes)
            {
                var safeLane = random.NextInt(
                    DeliveryRushGameRules.LaneCount);

                var allLanesMask =
                    (1 << DeliveryRushGameRules.LaneCount) - 1;

                return allLanesMask & ~(1 << safeLane);
            }

            var blockedLane = random.NextInt(
                DeliveryRushGameRules.LaneCount);

            return 1 << blockedLane;
        }

        public static DeliveryRushObstacleType GenerateObstacleType(
            DeliveryRushRandom random,
            int tick)
        {
            ArgumentNullException.ThrowIfNull(random);

            var roll = random.NextInt(100);

            if (tick < 600)
            {
                if (roll < 10)
                {
                    return DeliveryRushObstacleType.Car;
                }

                return roll < 35
                    ? DeliveryRushObstacleType.Pothole
                    : DeliveryRushObstacleType.Barrier;
            }

            if (tick < 1200)
            {
                if (roll < 20)
                {
                    return DeliveryRushObstacleType.Car;
                }

                return roll < 50
                    ? DeliveryRushObstacleType.Pothole
                    : DeliveryRushObstacleType.Barrier;
            }

            if (tick < 1800)
            {
                if (roll < 30)
                {
                    return DeliveryRushObstacleType.Car;
                }

                return roll < 62
                    ? DeliveryRushObstacleType.Pothole
                    : DeliveryRushObstacleType.Barrier;
            }

            if (tick < 2400)
            {
                if (roll < 38)
                {
                    return DeliveryRushObstacleType.Car;
                }

                return roll < 70
                    ? DeliveryRushObstacleType.Pothole
                    : DeliveryRushObstacleType.Barrier;
            }

            if (tick < 3000)
            {
                if (roll < 45)
                {
                    return DeliveryRushObstacleType.Car;
                }

                return roll < 75
                    ? DeliveryRushObstacleType.Pothole
                    : DeliveryRushObstacleType.Barrier;
            }

            if (roll < 52)
            {
                return DeliveryRushObstacleType.Car;
            }

            return roll < 80
                ? DeliveryRushObstacleType.Pothole
                : DeliveryRushObstacleType.Barrier;
        }

        public static bool CanJumpOver(
            DeliveryRushObstacleType type)
        {
            return type != DeliveryRushObstacleType.Car;
        }
    }
}