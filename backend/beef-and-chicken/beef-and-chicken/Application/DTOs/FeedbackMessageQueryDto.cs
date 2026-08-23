using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Application.DTOs
{
    public class FeedbackMessageQueryDto
    {
        public FeedbackMessageStatus? Status { get; set; }

        public FeedbackMessageType? Type { get; set; }

        public bool IncludeArchived { get; set; } = false;

        public int Take { get; set; } = 100;
    }
}