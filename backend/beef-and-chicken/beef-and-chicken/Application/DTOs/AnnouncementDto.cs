using beef_and_chicken.Domain.Enums;

namespace beef_and_chicken.Application.DTOs
{
    public class AnnouncementDto
    {
        public int Id { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

        public AnnouncementType Type { get; set; }

        public bool IsActive { get; set; }

        public bool IsPinned { get; set; }

        public DateTime StartsAt { get; set; }

        public DateTime? EndsAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}