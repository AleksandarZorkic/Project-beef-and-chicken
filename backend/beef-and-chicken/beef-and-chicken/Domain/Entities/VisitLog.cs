namespace beef_and_chicken.Domain.Entities
{
    public class VisitLog
    {
        public int Id { get; set; }

        public string VisitorId { get; set; } = string.Empty;

        public int? UserId { get; set; }

        public User? User { get; set; }

        public string VisitorType { get; set; } = string.Empty;

        public string Path { get; set; } = string.Empty;

        public DateTime VisitedAtUtc { get; set; } = DateTime.UtcNow;
    }
}