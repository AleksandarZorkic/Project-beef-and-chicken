using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class CategoryRepository : ICategoryRepository
    {
        private readonly AppDbContext _context;

        public CategoryRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Category>> GetAllAsync(
            CancellationToken ct = default)
        {
            return await _context.Categories
                .AsNoTracking()
                .Include(c => c.Dishes)
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Name)
                .ToListAsync(ct);
        }

        public async Task<IEnumerable<Category>> GetActiveAsync(
            CancellationToken ct = default)
        {
            return await _context.Categories
                .AsNoTracking()
                .Include(c => c.Dishes)
                .Where(c => c.IsActive)
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Name)
                .ToListAsync(ct);
        }

        public async Task<Category?> GetByIdAsync(
            int categoryId,
            CancellationToken ct = default)
        {
            return await _context.Categories
                .AsNoTracking()
                .Include(c => c.Dishes)
                .FirstOrDefaultAsync(c => c.Id == categoryId, ct);
        }

        public async Task<Category?> GetByIdForUpdateAsync(
            int categoryId,
            CancellationToken ct = default)
        {
            return await _context.Categories
                .Include(c => c.Dishes)
                .FirstOrDefaultAsync(c => c.Id == categoryId, ct);
        }

        public async Task<bool> ExistsByNameAsync(
            string name,
            int? excludedCategoryId = null,
            CancellationToken ct = default)
        {
            var normalizedName = name.Trim();

            var query = _context.Categories.AsQueryable();

            if (excludedCategoryId.HasValue)
            {
                query = query.Where(c => c.Id != excludedCategoryId.Value);
            }

            return await query.AnyAsync(
                c => EF.Functions.ILike(c.Name, normalizedName),
                ct
            );
        }

        public async Task AddAsync(
            Category category,
            CancellationToken ct = default)
        {
            await _context.Categories.AddAsync(category, ct);
        }

        public void Remove(Category category)
        {
            _context.Categories.Remove(category);
        }
    }
}