namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IAuditLogService
    {
        Task LogAsync(
            string action,
            string entityName,
            string entityId,
            object? oldValues = null,
            object? newValues = null,
            CancellationToken ct = default
        );
    }
}