namespace beef_and_chicken.Application.DTOs
{
    public class StartDeliveryRushRunResponseDto
    {
        public int RunId { get; set; }
        public int Seed { get; set; }
        public string GameVersion { get; set; } = string.Empty;

        public int DurationSeconds { get; set; }
        public int TickRate { get; set; }

        public DateTimeOffset StartedAtUtc { get; set; }
        public DateTimeOffset ExpiresAtUtc { get; set; }
    }
}