using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IFeedbackMessageRepository
    {
        Task AddAsync(
            FeedbackMessage message,
            CancellationToken ct = default
        );

        Task<FeedbackMessage?> GetByIdAsync(
            int id,
            CancellationToken ct = default
        );

        Task<IReadOnlyList<FeedbackMessage>> GetForAdminAsync(
            FeedbackMessageQueryDto query,
            CancellationToken ct = default
        );
    }
}