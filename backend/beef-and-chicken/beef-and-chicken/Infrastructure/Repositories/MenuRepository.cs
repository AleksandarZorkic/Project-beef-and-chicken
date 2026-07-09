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

        public async Task<Dish?> GetByIdAsync(int dishId, CancellationToken ct = default) 
        {
            return await _context.Dishes
                .AsNoTracking()
                .Include(d => d.Category)
                .Include(d => d.DishAllergens)
                    .ThenInclude(da => da.Allergen)
                .FirstOrDefaultAsync(d => d.Id == dishId && d.IsActive && d.Category.IsActive, ct);
        }

        public async Task<IEnumerable<Dish>> GetByIdsAsync(IEnumerable<int> dishIds, CancellationToken ct = default)
        {
            return await _context.Dishes
                .AsNoTracking()
                .Where(d => dishIds.Contains(d.Id) && d.IsActive && d.Category.IsActive)
                .ToListAsync(ct);
        }

        public async Task<Dish?> GetByIdForUpdateAsync(int dishId, CancellationToken ct = default)
        {
            return await _context.Dishes
                .Include(d => d.DishAllergens)
                .FirstOrDefaultAsync(d => d.Id ==dishId, ct);
        }

        public async Task AddAsync(Dish dish, CancellationToken ct = default)
        {
            await _context.Dishes.AddAsync(dish, ct);
        }

        public async Task<bool> CategoryExistsAsync(int categoryId, CancellationToken ct = default)
        {
            return await _context.Categories.AnyAsync(c => c.Id == categoryId && c.IsActive, ct);
        }

        public async Task<List<int>> GetExistingAllergenIdsAsync(IEnumerable<int> allergenIds, CancellationToken ct = default)
        {
            var ids = allergenIds.Distinct().ToList();

            return await _context.Allergens
                .Where(a => ids.Contains(a.Id))
                .Select(a => a.Id)
                .ToListAsync(ct);
        }

        public async Task<IEnumerable<Dish>> GetInactiveAsync(CancellationToken ct = default)
        {
            return await _context.Dishes
                .AsNoTracking()
                .Include(d => d.Category)
                .Include(d => d.DishAllergens)
                    .ThenInclude(da => da.Allergen)
                .Where(d => !d.IsActive)
                .OrderBy(d => d.Category.SortOrder)
                .ThenBy(d => d.Name)
                .ToListAsync(ct);
        }
    }
}
