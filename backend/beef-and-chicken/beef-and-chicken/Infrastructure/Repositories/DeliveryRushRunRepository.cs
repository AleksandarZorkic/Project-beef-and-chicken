using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class DeliveryRushRunRepository : IDeliveryRushRunRepository
    {
        private readonly AppDbContext _context;

        public DeliveryRushRunRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(
            DeliveryRushRun run,
            CancellationToken ct = default)
        {
            await _context.DeliveryRushRuns.AddAsync(run, ct);
        }

        public async Task<DeliveryRushRun?> GetByIdForUserAsync(
            int runId,
            int userId,
            CancellationToken ct = default)
        {
            return await _context.DeliveryRushRuns
                .SingleOrDefaultAsync(
                    x => x.Id == runId && x.UserId == userId,
                    ct);
        }

        public async Task<DeliveryRushRun?> GetActiveForUserAsync(
            int userId,
            DateTimeOffset nowUtc,
            CancellationToken ct = default)
        {
            return await _context.DeliveryRushRuns
                .Where(x =>
                    x.UserId == userId &&
                    x.Status == DeliveryRushRunStatus.Started &&
                    x.ExpiresAtUtc > nowUtc)
                .OrderByDescending(x => x.StartedAtUtc)
                .FirstOrDefaultAsync(ct);
        }

        public async Task<int?> GetPersonalBestScoreAsync(
            int userId,
            DateOnly weekStartDate,
            CancellationToken ct = default)
        {
            return await GetEligibleCompletedRuns(weekStartDate)
                .Where(x => x.UserId == userId)
                .Select(x => x.Score)
                .MaxAsync(ct);
        }

        public async Task<IReadOnlyList<DeliveryRushRun>>
            GetWeeklyBestRunsAsync(
                DateOnly weekStartDate,
                int limit,
                CancellationToken ct = default)
        {
            var safeLimit = Math.Clamp(limit, 1, 100);
            var bestRunIds = GetWeeklyBestRunIds(weekStartDate);

            return await _context.DeliveryRushRuns
                .AsNoTracking()
                .Include(x => x.User)
                .Where(x => bestRunIds.Contains(x.Id))
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.FinishedAtUtc)
                .ThenBy(x => x.Id)
                .Take(safeLimit)
                .ToListAsync(ct);
        }

        public async Task<int?> GetWeeklyRankAsync(
            int userId,
            DateOnly weekStartDate,
            CancellationToken ct = default)
        {
            var bestRunIds = GetWeeklyBestRunIds(weekStartDate);

            var rankedUserIds = await _context.DeliveryRushRuns
                .AsNoTracking()
                .Where(x => bestRunIds.Contains(x.Id))
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.FinishedAtUtc)
                .ThenBy(x => x.Id)
                .Select(x => x.UserId)
                .ToListAsync(ct);

            var index = rankedUserIds.IndexOf(userId);

            return index < 0 ? null : index + 1;
        }

        public async Task<int> ExpireStartedRunsAsync(
            int userId,
            DateTimeOffset nowUtc,
            CancellationToken ct = default)
        {
            var expiredRuns = await _context.DeliveryRushRuns
                .Where(x =>
                    x.UserId == userId &&
                    x.Status == DeliveryRushRunStatus.Started &&
                    x.ExpiresAtUtc <= nowUtc)
                .ToListAsync(ct);

            foreach (var run in expiredRuns)
            {
                run.Status = DeliveryRushRunStatus.Expired;
                run.FinishedAtUtc ??= run.ExpiresAtUtc;
            }

            return expiredRuns.Count;
        }

        private IQueryable<int> GetWeeklyBestRunIds(
            DateOnly weekStartDate)
        {
            return GetEligibleCompletedRuns(weekStartDate)
                .GroupBy(x => x.UserId)
                .Select(group => group
                    .OrderByDescending(x => x.Score)
                    .ThenBy(x => x.FinishedAtUtc)
                    .ThenBy(x => x.Id)
                    .Select(x => x.Id)
                    .First());
        }

        private IQueryable<DeliveryRushRun> GetEligibleCompletedRuns(
            DateOnly weekStartDate)
        {
            var customerUserIds =
                from userRole in _context.UserRoles
                join role in _context.Roles
                    on userRole.RoleId equals role.Id
                where role.Name == AppRoles.Customer
                select userRole.UserId;

            var staffUserIds =
                from userRole in _context.UserRoles
                join role in _context.Roles
                    on userRole.RoleId equals role.Id
                where role.Name == AppRoles.Admin ||
                      role.Name == AppRoles.Employee ||
                      role.Name == AppRoles.Courier
                select userRole.UserId;

            return _context.DeliveryRushRuns
                .AsNoTracking()
                .Where(x =>
                    x.WeekStartDate == weekStartDate &&
                    x.Status == DeliveryRushRunStatus.Completed &&
                    x.Score.HasValue &&
                    x.FinishedAtUtc.HasValue &&
                    !x.User.IsAnonymized &&
                    !x.User.BlockedAt.HasValue &&
                    customerUserIds.Contains(x.UserId) &&
                    !staffUserIds.Contains(x.UserId));
        }
    }
}