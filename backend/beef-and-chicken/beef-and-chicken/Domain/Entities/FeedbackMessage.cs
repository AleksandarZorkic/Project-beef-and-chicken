using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Domain.Entities
{
    public class FeedbackMessage
    {
        public int Id { get; set; }

        public int? UserId { get; set; }
        public User? User { get; set; }

        public string? VisitorId { get; set; }

        public string? UserEmail { get; set; }
        public string? UserName { get; set; }

        public string? ContactEmail { get; set; }

        public FeedbackMessageType Type { get; set; }

        public string Message { get; set; } = string.Empty;

        public string? PageUrl { get; set; }

        public FeedbackMessageStatus Status { get; set; } =
            FeedbackMessageStatus.New;

        public DateTimeOffset CreatedAtUtc { get; set; }

        public DateTimeOffset? ReadAtUtc { get; set; }

        public DateTimeOffset? ArchivedAtUtc { get; set; }
    }
}