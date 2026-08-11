using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IDeliveryRushRunRepository
    {
        Task AddAsync(
            DeliveryRushRun run,
            CancellationToken ct = default);

        Task<DeliveryRushRun?> GetByIdForUserAsync(
            int runId,
            int userId,
            CancellationToken ct = default);

        Task<DeliveryRushRun?> GetActiveForUserAsync(
            int userId,
            DateTimeOffset nowUtc,
            CancellationToken ct = default);

        Task<int?> GetPersonalBestScoreAsync(
            int userId,
            DateOnly weekStartDate,
            CancellationToken ct = default);

        Task<IReadOnlyList<DeliveryRushRun>> GetWeeklyBestRunsAsync(
            DateOnly weekStartDate,
            int limit,
            CancellationToken ct = default);

        Task<int?> GetWeeklyRankAsync(
            int userId,
            DateOnly weekStartDate,
            CancellationToken ct = default);

        Task<int> ExpireStartedRunsAsync(
            int userId,
            DateTimeOffset nowUtc,
            CancellationToken ct = default);
    }
}