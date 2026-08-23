using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Application.DTOs
{
    public class FeedbackMessageDto
    {
        public int Id { get; set; }

        public int? UserId { get; set; }

        public string? VisitorId { get; set; }

        public string? UserEmail { get; set; }

        public string? UserName { get; set; }

        public string? ContactEmail { get; set; }

        public FeedbackMessageType Type { get; set; }

        public string Message { get; set; } = string.Empty;

        public string? PageUrl { get; set; }

        public FeedbackMessageStatus Status { get; set; }

        public DateTimeOffset CreatedAtUtc { get; set; }

        public DateTimeOffset? ReadAtUtc { get; set; }

        public DateTimeOffset? ArchivedAtUtc { get; set; }
    }
}