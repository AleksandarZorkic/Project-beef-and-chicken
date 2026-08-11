namespace beef_and_chicken.Application.DTOs
{
    public class DeliveryRushRunResultDto
    {
        public int RunId { get; set; }

        public int Score { get; set; }
        public int Distance { get; set; }
        public int AvoidedObstacles { get; set; }
        public int CollisionCount { get; set; }
        public int MaxCombo { get; set; }

        public bool IsPersonalBest { get; set; }
        public int? WeeklyRank { get; set; }

        public DateTimeOffset FinishedAtUtc { get; set; }
    }
}