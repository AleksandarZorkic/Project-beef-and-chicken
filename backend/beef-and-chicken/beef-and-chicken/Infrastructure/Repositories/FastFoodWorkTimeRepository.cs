using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class FastFoodWorkTimeRepository : IFastFoodWorkTimeRepository
    {
        private readonly AppDbContext _context;

        public FastFoodWorkTimeRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<FastFoodWorkTime>> GetAllAsync(
            CancellationToken ct = default)
        {
            return await _context.FastFoodWorkTimes
                .AsNoTracking()
                .OrderBy(x => x.DayOfWeek)
                .ToListAsync(ct);
        }

        public async Task<List<FastFoodWorkTime>> GetAllForUpdateAsync(
            CancellationToken ct = default)
        {
            return await _context.FastFoodWorkTimes
                .OrderBy(x => x.DayOfWeek)
                .ToListAsync(ct);
        }

        public async Task AddRangeAsync(
            IEnumerable<FastFoodWorkTime> workingHours,
            CancellationToken ct = default)
        {
            await _context.FastFoodWorkTimes.AddRangeAsync(workingHours, ct);
        }
    }
}