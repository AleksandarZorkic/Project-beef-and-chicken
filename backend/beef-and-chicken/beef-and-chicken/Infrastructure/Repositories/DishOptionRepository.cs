using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Domain.Enums;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class DishOptionRepository : IDishOptionRepository
    {
        private readonly AppDbContext _context;

        public DishOptionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<DishOption>> GetAllAsync(
            bool includeInactive = false,
            DishOptionType? type = null,
            CancellationToken ct = default)
        {
            var query = _context.DishOptions.AsQueryable();

            if (!includeInactive)
            {
                query = query.Where(x => x.IsActive);
            }

            if (type.HasValue)
            {
                query = query.Where(x => x.Type == type.Value);
            }

            return await query
                .AsNoTracking()
                .OrderBy(x => x.Type)
                .ThenBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .ToListAsync(ct);
        }

        public async Task<List<DishOption>> GetActiveAsync(CancellationToken ct = default)
        {
            return await _context.DishOptions
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.Type)
                .ThenBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .ToListAsync(ct);
        }

        public async Task<DishOption?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            return await _context.DishOptions
                .FirstOrDefaultAsync(x => x.Id == id, ct);
        }

        public async Task<bool> ExistsByNameAndTypeAsync(
            string name,
            DishOptionType type,
            int? excludeId = null,
            CancellationToken ct = default)
        {
            var normalizedName = name.Trim().ToLower();

            return await _context.DishOptions
                .AnyAsync(x =>
                    x.Type == type &&
                    x.Name.ToLower() == normalizedName &&
                    (!excludeId.HasValue || x.Id != excludeId.Value),
                    ct
                );
        }

        public async Task AddAsync(DishOption option, CancellationToken ct = default)
        {
            await _context.DishOptions.AddAsync(option, ct);
        }

        public async Task<List<DishOption>> GetActiveByIdsAsync(
            IEnumerable<int> ids,
            CancellationToken ct = default)
        {
            var optionIds = ids.Distinct().ToList();

            return await _context.DishOptions
                .AsNoTracking()
                .Where(x => optionIds.Contains(x.Id) && x.IsActive)
                .ToListAsync(ct);
        }
    }
}