namespace beef_and_chicken.Application.DTOs
{
    public class DeliveryRushLeaderboardEntryDto
    {
        public int Rank { get; set; }
        public string PlayerName { get; set; } = string.Empty;

        public int Score { get; set; }
        public int Distance { get; set; }
        public int AvoidedObstacles { get; set; }
        public int CollisionCount { get; set; }
        public int MaxCombo { get; set; }

        public bool IsCurrentUser { get; set; }
        public DateTimeOffset AchievedAtUtc { get; set; }
    }
}