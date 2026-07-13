namespace beef_and_chicken.Domain.Entities
{
    public class AuditLog
    {
        public int Id { get; set; }
        public int? ActorUserId { get; set; }
        public string ActorUserName { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string EntityName {  get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string? OldValuesJson { get; set; }
        public string? NewValuesJson { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
