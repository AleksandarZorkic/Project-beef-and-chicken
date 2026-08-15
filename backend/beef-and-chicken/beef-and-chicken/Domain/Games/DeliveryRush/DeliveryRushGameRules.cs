namespace beef_and_chicken.Domain.Games.DeliveryRush
{
    public static class DeliveryRushGameRules
    {
        public const string GameVersion = "3.1.0";

        public const int DurationSeconds = 120;
        public const int TickRate = 30;
        public const int TotalTicks = DurationSeconds * TickRate;

        public const int LaneCount = 3;
        public const int StartingLane = 1;

        public const int FirstObstacleTick = 90;
        public const int MaximumCollisions = 3;
        public const int CollisionSlowdownTicks = 45;

        public const int JumpDurationTicks = 18;
        public const int JumpCooldownTicks = 12;

        public const int CollisionWindowBeforeTicks = 4;
        public const int CollisionWindowAfterTicks = 4;

        public const int MaximumInputEvents = 900;
        public const int MinimumTicksBetweenInputs = 2;

        public const int AvoidedObstaclePoints = 20;
        public const int MaxComboMultiplier = 10;
        public const int CollisionPenalty = 50;

        public const int ExpirationGraceSeconds = 15;
        public const int LeaderboardSize = 10;
        public const int FinishToleranceSeconds = 3;

        public static int GetObstacleInterval(int tick)
        {
            if (tick < 600)
            {
                return 42;
            }

            if (tick < 1200)
            {
                return 36;
            }

            if (tick < 1800)
            {
                return 30;
            }

            if (tick < 2400)
            {
                return 25;
            }

            if (tick < 3000)
            {
                return 21;
            }

            return 18;
        }

        public static int GetDistancePerTick(int tick)
        {
            if (tick < 600)
            {
                return 2;
            }

            if (tick < 1200)
            {
                return 3;
            }

            if (tick < 1800)
            {
                return 4;
            }

            if (tick < 2400)
            {
                return 5;
            }

            if (tick < 3000)
            {
                return 6;
            }

            return 7;
        }

        public static int GetTwoLaneBlockChancePercent(int tick)
        {
            if (tick < 600)
            {
                return 20;
            }

            if (tick < 1200)
            {
                return 32;
            }

            if (tick < 1800)
            {
                return 45;
            }

            if (tick < 2400)
            {
                return 58;
            }

            if (tick < 3000)
            {
                return 72;
            }

            return 85;
        }
    }
}