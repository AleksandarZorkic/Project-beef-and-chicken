using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Tests.TestDoubles
{
    internal sealed class TestDeliveryRushRunRepository
        : IDeliveryRushRunRepository
    {
        private int _nextId = 1;

        public List<DeliveryRushRun> Runs { get; } = new();

        public Task AddAsync(
            DeliveryRushRun run,
            CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();

            if (run.Id == 0)
            {
                run.Id = _nextId++;
            }

            Runs.Add(run);

            return Task.CompletedTask;
        }

        public Task<DeliveryRushRun?> GetByIdForUserAsync(
            int runId,
            int userId,
            CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();

            var run = Runs.SingleOrDefault(x =>
                x.Id == runId &&
                x.UserId == userId);

            return Task.FromResult(run);
        }

        public Task<DeliveryRushRun?> GetActiveForUserAsync(
            int userId,
            DateTimeOffset nowUtc,
            CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();

            var run = Runs
                .Where(x =>
                    x.UserId == userId &&
                    x.Status == DeliveryRushRunStatus.Started &&
                    x.ExpiresAtUtc > nowUtc)
                .OrderByDescending(x => x.StartedAtUtc)
                .FirstOrDefault();

            return Task.FromResult(run);
        }

        public Task<int?> GetPersonalBestScoreAsync(
            int userId,
            DateOnly weekStartDate,
            CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();

            var scores = Runs
                .Where(x =>
                    x.UserId == userId &&
                    x.WeekStartDate == weekStartDate &&
                    x.Status == DeliveryRushRunStatus.Completed &&
                    x.Score.HasValue)
                .Select(x => x.Score!.Value)
                .ToList();

            int? bestScore = scores.Count == 0
                ? null
                : scores.Max();

            return Task.FromResult(bestScore);
        }

        public Task<IReadOnlyList<DeliveryRushRun>>
            GetWeeklyBestRunsAsync(
                DateOnly weekStartDate,
                int limit,
                CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();

            var safeLimit = Math.Clamp(limit, 1, 100);

            var runs = GetBestRuns(weekStartDate)
                .Take(safeLimit)
                .ToList();

            return Task.FromResult<
                IReadOnlyList<DeliveryRushRun>>(runs);
        }

        public Task<int?> GetWeeklyRankAsync(
            int userId,
            DateOnly weekStartDate,
            CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();

            var rankedRuns = GetBestRuns(weekStartDate)
                .ToList();

            var index = rankedRuns.FindIndex(
                x => x.UserId == userId);

            int? rank = index < 0
                ? null
                : index + 1;

            return Task.FromResult(rank);
        }

        public Task<int> ExpireStartedRunsAsync(
            int userId,
            DateTimeOffset nowUtc,
            CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();

            var expiredRuns = Runs
                .Where(x =>
                    x.UserId == userId &&
                    x.Status == DeliveryRushRunStatus.Started &&
                    x.ExpiresAtUtc <= nowUtc)
                .ToList();

            foreach (var run in expiredRuns)
            {
                run.Status = DeliveryRushRunStatus.Expired;
                run.FinishedAtUtc ??= run.ExpiresAtUtc;
            }

            return Task.FromResult(expiredRuns.Count);
        }


        private IEnumerable<DeliveryRushRun> GetBestRuns(
            DateOnly weekStartDate)
        {
            return Runs
                .Where(x =>
                    x.WeekStartDate == weekStartDate &&
                    x.Status == DeliveryRushRunStatus.Completed &&
                    x.Score.HasValue &&
                    x.FinishedAtUtc.HasValue)
                .GroupBy(x => x.UserId)
                .Select(group => group
                    .OrderByDescending(x => x.Score)
                    .ThenBy(x => x.FinishedAtUtc)
                    .ThenBy(x => x.Id)
                    .First())
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.FinishedAtUtc)
                .ThenBy(x => x.Id);
        }
    }
}