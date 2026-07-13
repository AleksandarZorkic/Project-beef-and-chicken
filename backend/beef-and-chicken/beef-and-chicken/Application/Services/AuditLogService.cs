using System.Text.Json;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;

namespace beef_and_chicken.Application.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly ILogger<AuditLogService> _logger;

        public AuditLogService(
            AppDbContext context,
            ICurrentUserService currentUserService,
            ILogger<AuditLogService> logger)
        {
            _context = context;
            _currentUserService = currentUserService;
            _logger = logger;
        }

        public async Task LogAsync(
            string action,
            string entityName,
            string entityId,
            object? oldValues = null,
            object? newValues = null,
            CancellationToken ct = default)
        {
            try
            {
                var log = new AuditLog
                {
                    ActorUserId = _currentUserService.UserId,
                    ActorUserName = string.IsNullOrWhiteSpace(_currentUserService.UserName)
                        ? "System"
                        : _currentUserService.UserName,
                    Action = action,
                    EntityName = entityName,
                    EntityId = entityId,
                    OldValuesJson = SerializeValues(oldValues),
                    NewValuesJson = SerializeValues(newValues),
                    IpAddress = _currentUserService.IpAddress,
                    UserAgent = _currentUserService.UserAgent,
                    CreatedAt = DateTimeOffset.UtcNow
                };

                _context.AuditLogs.Add(log);
                await _context.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to write audit log. Action={Action}, EntityName={EntityName}, EntityId={EntityId}",
                    action,
                    entityName,
                    entityId
                );
            }
        }

        private static string? SerializeValues(object? values)
        {
            if (values == null)
                return null;

            return JsonSerializer.Serialize(values, new JsonSerializerOptions
            {
                WriteIndented = false
            });
        }
    }
}