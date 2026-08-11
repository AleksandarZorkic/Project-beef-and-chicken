using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class VisitLogRepository : IVisitLogRepository
    {
        private readonly AppDbContext _context;

        public VisitLogRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(
            VisitLog visitLog,
            CancellationToken ct = default)
        {
            await _context.VisitLogs.AddAsync(visitLog, ct);
        }

        public async Task<VisitStatsDto> GetStatsAsync(CancellationToken ct = default)
        {
            var nowUtc = DateTime.UtcNow;
            var todayUtc = nowUtc.Date;
            var last7DaysUtc = todayUtc.AddDays(-6);

            var visitsLast7Days = _context.VisitLogs
                .AsNoTracking()
                .Where(x => x.VisitedAtUtc >= last7DaysUtc);

            var totalVisitsToday = await _context.VisitLogs
                .AsNoTracking()
                .CountAsync(x => x.VisitedAtUtc >= todayUtc, ct);

            var totalVisitsLast7Days = await visitsLast7Days.CountAsync(ct);

            var uniqueVisitorsLast7Days = await visitsLast7Days
                .Select(x => x.VisitorId)
                .Distinct()
                .CountAsync(ct);

            var anonymousVisitsLast7Days = await visitsLast7Days
                .CountAsync(x => x.VisitorType == "Anonymous", ct);

            var customerVisitsLast7Days = await visitsLast7Days
                .CountAsync(x => x.VisitorType == "Customer", ct);

            var groupedDailyVisits = await visitsLast7Days
                .GroupBy(x => x.VisitedAtUtc.Date)
                .Select(group => new DailyVisitStatsDto
                {
                    Date = group.Key,
                    Visits = group.Count(),
                    UniqueVisitors = group.Select(x => x.VisitorId).Distinct().Count()
                })
                .OrderBy(x => x.Date)
                .ToListAsync(ct);

            var topPaths = await visitsLast7Days
                .GroupBy(x => x.Path)
                .Select(group => new PathVisitStatsDto
                {
                    Path = group.Key,
                    Visits = group.Count(),
                    UniqueVisitors = group.Select(x => x.VisitorId).Distinct().Count()
                })
                .OrderByDescending(x => x.Visits)
                .Take(10)
                .ToListAsync(ct);

            return new VisitStatsDto
            {
                TotalVisitsToday = totalVisitsToday,
                TotalVisitsLast7Days = totalVisitsLast7Days,
                UniqueVisitorsLast7Days = uniqueVisitorsLast7Days,
                AnonymousVisitsLast7Days = anonymousVisitsLast7Days,
                CustomerVisitsLast7Days = customerVisitsLast7Days,
                DailyVisits = groupedDailyVisits,
                TopPaths = topPaths
            };
        }
    }
}