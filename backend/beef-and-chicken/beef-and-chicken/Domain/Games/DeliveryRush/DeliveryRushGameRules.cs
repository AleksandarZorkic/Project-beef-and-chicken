namespace beef_and_chicken.Domain.Games.DeliveryRush
{
    public static class DeliveryRushGameRules
    {
        public const string GameVersion = "1.1.0";

        public const int DurationSeconds = 60;
        public const int TickRate = 30;
        public const int TotalTicks = DurationSeconds * TickRate;

        public const int LaneCount = 3;
        public const int StartingLane = 1;

        public const int FirstObstacleTick = 90;
        public const int CollisionSlowdownTicks = 45;

        public const int MaximumInputEvents = 600;
        public const int MinimumTicksBetweenInputs = 2;

        public const int AvoidedObstaclePoints = 20;
        public const int MaxComboMultiplier = 10;
        public const int CollisionPenalty = 50;

        public const int ExpirationGraceSeconds = 15;
        public const int LeaderboardSize = 10;

        public const int FinishToleranceSeconds = 3;

        public static int GetObstacleInterval(int tick)
        {
            if (tick < 450)
            {
                return 45;
            }

            if (tick < 900)
            {
                return 39;
            }

            if (tick < 1350)
            {
                return 33;
            }

            return 27;
        }

        public static int GetDistancePerTick(int tick)
        {
            if (tick < 450)
            {
                return 2;
            }

            if (tick < 900)
            {
                return 3;
            }

            if (tick < 1350)
            {
                return 4;
            }

            return 5;
        }

        public static int GetTwoLaneBlockChancePercent(int tick)
        {
            if (tick < 450)
            {
                return 20;
            }

            if (tick < 900)
            {
                return 30;
            }

            if (tick < 1350)
            {
                return 40;
            }

            return 50;
        }
    }
}