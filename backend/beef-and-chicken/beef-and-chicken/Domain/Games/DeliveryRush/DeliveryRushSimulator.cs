namespace beef_and_chicken.Domain.Games.DeliveryRush
{
    public sealed class DeliveryRushSimulator
    {
        public DeliveryRushSimulationResult Simulate(
            int seed,
            IReadOnlyList<DeliveryRushInput> inputs)
        {
            ValidateInputs(inputs);

            var random = new DeliveryRushRandom(seed);

            var playerLane = DeliveryRushGameRules.StartingLane;
            var inputIndex = 0;
            var nextObstacleTick =
                DeliveryRushGameRules.FirstObstacleTick;

            var distance = 0;
            var avoidedObstacles = 0;
            var collisionCount = 0;
            var currentCombo = 0;
            var maxCombo = 0;
            var slowdownTicksRemaining = 0;

            for (var tick = 0;
                 tick < DeliveryRushGameRules.TotalTicks;
                 tick++)
            {
                if (inputIndex < inputs.Count &&
                    inputs[inputIndex].Tick == tick)
                {
                    var input = inputs[inputIndex];

                    playerLane = Math.Clamp(
                        playerLane + input.Direction,
                        0,
                        DeliveryRushGameRules.LaneCount - 1);

                    inputIndex++;
                }

                var distancePerTick =
                    DeliveryRushGameRules.GetDistancePerTick(tick);

                if (slowdownTicksRemaining > 0)
                {
                    distance += Math.Max(1, distancePerTick / 2);
                    slowdownTicksRemaining--;
                }
                else
                {
                    distance += distancePerTick;
                }

                if (tick != nextObstacleTick)
                {
                    continue;
                }

                var blockedLaneMask = GenerateBlockedLaneMask(random, tick);

                var playerLaneMask = 1 << playerLane;
                var collision =
                    (blockedLaneMask & playerLaneMask) != 0;

                if (collision)
                {
                    collisionCount++;
                    currentCombo = 0;

                    slowdownTicksRemaining =
                        DeliveryRushGameRules
                            .CollisionSlowdownTicks;
                }
                else
                {
                    avoidedObstacles++;
                    currentCombo++;

                    maxCombo = Math.Max(
                        maxCombo,
                        currentCombo);
                }

                nextObstacleTick +=
                    DeliveryRushGameRules
                        .GetObstacleInterval(tick);
            }

            var score =
                distance +
                avoidedObstacles *
                DeliveryRushGameRules.AvoidedObstaclePoints +
                maxCombo *
                DeliveryRushGameRules.MaxComboMultiplier -
                collisionCount *
                DeliveryRushGameRules.CollisionPenalty;

            return new DeliveryRushSimulationResult(
                Score: Math.Max(0, score),
                Distance: distance,
                AvoidedObstacles: avoidedObstacles,
                CollisionCount: collisionCount,
                MaxCombo: maxCombo);
        }

        private static int GenerateBlockedLaneMask(
            DeliveryRushRandom random, int tick)
        {
            var twoLaneBlockChance =
                DeliveryRushGameRules
                    .GetTwoLaneBlockChancePercent(tick);

            var shouldBlockTwoLanes =
                random.NextInt(100) <
                twoLaneBlockChance;

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

        private static void ValidateInputs(
            IReadOnlyList<DeliveryRushInput> inputs)
        {
            ArgumentNullException.ThrowIfNull(inputs);

            if (inputs.Count >
                DeliveryRushGameRules.MaximumInputEvents)
            {
                throw new ArgumentException(
                    "Too many input events.",
                    nameof(inputs));
            }

            var previousTick = -1;

            foreach (var input in inputs)
            {
                if (input.Tick < 0 ||
                    input.Tick >= DeliveryRushGameRules.TotalTicks)
                {
                    throw new ArgumentException(
                        "Input tick is outside the game duration.",
                        nameof(inputs));
                }

                if (input.Direction is not (-1 or 1))
                {
                    throw new ArgumentException(
                        "Input direction must be -1 or 1.",
                        nameof(inputs));
                }

                if (input.Tick <= previousTick)
                {
                    throw new ArgumentException(
                        "Input ticks must be strictly increasing.",
                        nameof(inputs));
                }

                if (previousTick >= 0 &&
                    input.Tick - previousTick <
                    DeliveryRushGameRules.MinimumTicksBetweenInputs)
                {
                    throw new ArgumentException(
                        "Input events are too close together.",
                        nameof(inputs));
                }

                previousTick = input.Tick;
            }
        }
    }
}