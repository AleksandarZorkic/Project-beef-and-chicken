using beef_and_chicken.Domain.Enums;

namespace beef_and_chicken.Application.DTOs
{
    public class UpdateAnnouncementDto
    {
        public string Title { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

        public AnnouncementType Type { get; set; } = AnnouncementType.Info;

        public bool IsActive { get; set; } = true;

        public bool IsPinned { get; set; } = false;

        public DateTime StartsAt { get; set; }

        public DateTime? EndsAt { get; set; }
    }
}