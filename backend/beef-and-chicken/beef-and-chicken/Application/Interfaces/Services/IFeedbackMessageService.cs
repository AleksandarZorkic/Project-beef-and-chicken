using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IFeedbackMessageService
    {
        Task<FeedbackMessageDto> CreateAsync(
            CreateFeedbackMessageDto data,
            CancellationToken ct = default
        );

        Task<IReadOnlyList<FeedbackMessageDto>> GetForAdminAsync(
            FeedbackMessageQueryDto query,
            CancellationToken ct = default
        );

        Task<FeedbackMessageDto> MarkAsReadAsync(
            int id,
            CancellationToken ct = default
        );

        Task<FeedbackMessageDto> ArchiveAsync(
            int id,
            CancellationToken ct = default
        );
    }
}