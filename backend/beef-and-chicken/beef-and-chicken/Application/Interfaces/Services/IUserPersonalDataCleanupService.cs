using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IUserPersonalDataCleanupService
    {
        Task<UserPersonalDataCleanupResult> CleanupAsync(
            User user,
            CancellationToken ct = default
        );
    }
}