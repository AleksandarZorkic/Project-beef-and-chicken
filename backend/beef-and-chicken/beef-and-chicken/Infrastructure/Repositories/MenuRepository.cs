using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using beef_and_chicken.Application.Interfaces.Repositories;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class MenuRepository : IMenuRepository
    {
        private readonly AppDbContext _context;

        public MenuRepository(AppDbContext context) => _context = context;

        public async Task<IEnumerable<Dish>> GetAllAsync(CancellationToken ct = default)
        {
            return await _context.Dishes
                .AsNoTracking()
                .Include(d => d.Category)
                .Include(d => d.DishAllergens)
                    .ThenInclude(da => da.Allergen)
                .Where(d => d.IsActive && d.Category.IsActive)
                .OrderBy(d => d.Category.SortOrder)
                .ThenBy(d => d.Name)
                .ToListAsync(ct);
        }

        public async Task<Dish?> GetByIdAsync(int id, CancellationToken ct = default) 
        {
            return await _context.Dishes
                .AsNoTracking()
                .Include(d => d.Category)
                .Include(d => d.DishAllergens)
                    .ThenInclude(da => da.Allergen)
                .FirstOrDefaultAsync(d => d.Id == id && d.IsActive && d.Category.IsActive, ct);
        }

        public async Task<IEnumerable<Dish>> GetByIdsAsync(IEnumerable<int> ids, CancellationToken ct = default)
        {
            return await _context.Dishes
                .AsNoTracking()
                .Where(d => ids.Contains(d.Id) && d.IsActive && d.Category.IsActive)
                .ToListAsync(ct);
        }
    }
}
