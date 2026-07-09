namespace beef_and_chicken.Application.DTOs
{
    public class AdminUserDto
    {
        public int Id { get; set; }

        public string UserName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public bool IsBlocked { get; set; }

        public DateTimeOffset? BlockedAt { get; set; }

        public string? BlockReason { get; set; }

        public bool IsAnonymized { get; set; }

        public DateTimeOffset? AnonymizedAt { get; set; }

        public List<string> Roles { get; set; } = new();
    }
}