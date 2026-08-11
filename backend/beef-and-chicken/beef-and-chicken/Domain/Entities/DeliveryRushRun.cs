using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Domain.Entities
{
    public class DeliveryRushRun
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public int Seed { get; set; }
        public string GameVersion { get; set; } = string.Empty;

        public DeliveryRushRunStatus Status { get; set; }
            = DeliveryRushRunStatus.Started;

        public DateTimeOffset StartedAtUtc { get; set; }
        public DateTimeOffset ExpiresAtUtc { get; set; }
        public DateTimeOffset? FinishedAtUtc { get; set; }

        public DateOnly WeekStartDate { get; set; }

        public int? Score { get; set; }
        public int? Distance { get; set; }
        public int? AvoidedObstacles { get; set; }
        public int? CollisionCount { get; set; }
        public int? MaxCombo { get; set; }
    }
}