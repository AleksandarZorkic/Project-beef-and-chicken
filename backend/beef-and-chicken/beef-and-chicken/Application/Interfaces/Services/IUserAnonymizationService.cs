using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IUserAnonymizationService
    {
        Task<AdminUserDto> AnonymizeAsync(int userId, CancellationToken ct = default);
        Task<int> AnonymizeBlockedUsersOlderThanAsync(
            DateTimeOffset cutoffDate, 
            CancellationToken ct = default
        );
    }
}
