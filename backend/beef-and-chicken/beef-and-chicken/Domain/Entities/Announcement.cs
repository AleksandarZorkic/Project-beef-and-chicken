using beef_and_chicken.Domain.Enums;

namespace beef_and_chicken.Domain.Entities
{
    public class Announcement
    {
        public int Id { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

        public AnnouncementType Type { get; set; } = AnnouncementType.Info;

        public bool IsActive { get; set; } = true;

        public bool IsPinned { get; set; } = false;

        public DateTime StartsAt { get; set; } = DateTime.UtcNow;

        public DateTime? EndsAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}