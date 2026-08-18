namespace beef_and_chicken.Domain.Games.DeliveryRush
{
    public sealed class DeliveryRushSimulator
    {
        public DeliveryRushSimulationResult Simulate(
            int seed,
            IReadOnlyList<DeliveryRushInput> inputs)
        {
            return SimulateUntilTick(
                seed,
                inputs,
                DeliveryRushGameRules.TotalTicks);
        }

        public DeliveryRushSimulationResult SimulateUntilTick(
            int seed,
            IReadOnlyList<DeliveryRushInput> inputs,
            int completedTicks)
        {
            ValidateInputs(inputs);
            ValidateCompletedTicks(completedTicks);

            var random = new DeliveryRushRandom(seed);

            var playerLane =
                DeliveryRushGameRules.StartingLane;

            var inputIndex = 0;

            var nextObstacleTick =
                DeliveryRushGameRules.FirstObstacleTick;

            DeliveryRushObstacle? activeObstacle = null;
            var activeObstacleCollided = false;

            int? jumpStartTick = null;

            var distance = 0;
            var avoidedObstacles = 0;
            var collisionCount = 0;
            var currentCombo = 0;
            var maxCombo = 0;
            var slowdownTicksRemaining = 0;

            var processedTicks = 0;

            for (var tick = 0; tick < completedTicks; tick++)
            {
                processedTicks = tick + 1;

                if (inputIndex < inputs.Count &&
                    inputs[inputIndex].Tick == tick)
                {
                    var input = inputs[inputIndex];

                    switch (input.Action)
                    {
                        case DeliveryRushInput.MoveAction:
                            playerLane = Math.Clamp(
                                playerLane +
                                input.Direction!.Value,
                                0,
                                DeliveryRushGameRules.LaneCount - 1);
                            break;

                        case DeliveryRushInput.JumpAction:
                            jumpStartTick = tick;
                            break;
                    }

                    inputIndex++;
                }

                var distancePerTick =
                    DeliveryRushGameRules
                        .GetDistancePerTick(tick);

                if (slowdownTicksRemaining > 0)
                {
                    distance += Math.Max(
                        1,
                        distancePerTick / 2);

                    slowdownTicksRemaining--;
                }
                else
                {
                    distance += distancePerTick;
                }

                var collisionWindowStartTick =
                    nextObstacleTick -
                    DeliveryRushGameRules.CollisionWindowBeforeTicks;

                if (activeObstacle is null &&
                    tick == collisionWindowStartTick)
                {
                    activeObstacle =
                        DeliveryRushObstacleGenerator.Generate(
                            random,
                            nextObstacleTick);

                    activeObstacleCollided = false;
                }

                var obstacle = activeObstacle;

                if (obstacle is null)
                {
                    continue;
                }

                var collisionWindowEndTick =
                    obstacle.Tick +
                    DeliveryRushGameRules.CollisionWindowAfterTicks;

                var playerLaneMask = 1 << playerLane;

                var isJumping = IsJumpActive(
                    tick,
                    jumpStartTick);

                var isPlayerTouchingObstacle =
                    (obstacle.BlockedLaneMask & playerLaneMask) != 0;

                var jumpAvoidsCollision =
                    isJumping &&
                    DeliveryRushObstacleGenerator.CanJumpOver(
                        obstacle.Type);

                if (!activeObstacleCollided &&
                    isPlayerTouchingObstacle &&
                    !jumpAvoidsCollision)
                {
                    collisionCount++;
                    currentCombo = 0;

                    slowdownTicksRemaining =
                        DeliveryRushGameRules.CollisionSlowdownTicks;

                    activeObstacleCollided = true;

                    if (collisionCount >=
                        DeliveryRushGameRules.MaximumCollisions)
                    {
                        break;
                    }
                }

                if (tick < collisionWindowEndTick)
                {
                    continue;
                }

                if (!activeObstacleCollided)
                {
                    avoidedObstacles++;
                    currentCombo++;

                    maxCombo = Math.Max(
                        maxCombo,
                        currentCombo);
                }

                nextObstacleTick +=
                    DeliveryRushGameRules.GetObstacleInterval(
                        obstacle.Tick);

                activeObstacle = null;
                activeObstacleCollided = false;
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
                MaxCombo: maxCombo,
                CompletedTicks: processedTicks);
        }

        public static bool IsJumpActive(
            int currentTick,
            int? jumpStartTick)
        {
            if (!jumpStartTick.HasValue)
            {
                return false;
            }

            return
                currentTick >= jumpStartTick.Value &&
                currentTick <
                jumpStartTick.Value +
                DeliveryRushGameRules.JumpDurationTicks;
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
            int? previousJumpTick = null;

            foreach (var input in inputs)
            {
                if (input is null)
                {
                    throw new ArgumentException(
                        "Input cannot be null.",
                        nameof(inputs));
                }

                if (input.Tick < 0 ||
                    input.Tick >=
                    DeliveryRushGameRules.TotalTicks)
                {
                    throw new ArgumentException(
                        "Input tick is outside the game duration.",
                        nameof(inputs));
                }

                if (input.Action is not (
                    DeliveryRushInput.MoveAction or
                    DeliveryRushInput.JumpAction))
                {
                    throw new ArgumentException(
                        "Input action must be move or jump.",
                        nameof(inputs));
                }

                if (input.Action ==
                        DeliveryRushInput.MoveAction &&
                    input.Direction is not (-1 or 1))
                {
                    throw new ArgumentException(
                        "Move direction must be -1 or 1.",
                        nameof(inputs));
                }

                if (input.Action ==
                        DeliveryRushInput.JumpAction &&
                    input.Direction is not null)
                {
                    throw new ArgumentException(
                        "Jump input cannot contain a direction.",
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

                if (input.Action ==
                        DeliveryRushInput.JumpAction &&
                    previousJumpTick.HasValue)
                {
                    var nextAllowedJumpTick =
                        previousJumpTick.Value +
                        DeliveryRushGameRules.JumpDurationTicks +
                        DeliveryRushGameRules.JumpCooldownTicks;

                    if (input.Tick < nextAllowedJumpTick)
                    {
                        throw new ArgumentException(
                            "Jump is still on cooldown.",
                            nameof(inputs));
                    }
                }

                if (input.Action ==
                    DeliveryRushInput.JumpAction)
                {
                    previousJumpTick = input.Tick;
                }

                previousTick = input.Tick;
            }
        }

        private static void ValidateCompletedTicks(
            int completedTicks)
        {
            if (completedTicks < 0 ||
                completedTicks >
                DeliveryRushGameRules.TotalTicks)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(completedTicks),
                    "Completed ticks are outside the game duration.");
            }
        }
    }
}