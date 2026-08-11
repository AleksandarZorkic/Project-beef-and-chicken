using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IDeliveryRushService
    {
        Task<StartDeliveryRushRunResponseDto> StartRunAsync(
            CancellationToken ct = default);

        Task<DeliveryRushRunResultDto> FinishRunAsync(
            int runId,
            FinishDeliveryRushRunRequestDto data,
            CancellationToken ct = default);

        Task<DeliveryRushLeaderboardDto> GetCurrentLeaderboardAsync(
            CancellationToken ct = default);

        Task CancelRunAsync(
            int runId,
            CancellationToken ct = default);
    }
}