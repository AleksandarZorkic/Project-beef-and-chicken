using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

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
            var ids = dishIds.Distinct().ToList();

            return await _context.Dishes
                .AsNoTracking()
                .Include(d => d.Category)
                .Where(d =>
                    ids.Contains(d.Id) &&
                    d.IsActive &&
                    d.Category.IsActive
                )
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

        public async Task<List<HomepageDishDto>> GetBestSellersAsync(
            int limit,
            int days,
            CancellationToken ct = default)
        {
            var safeLimit = limit <= 0 ? 6 : Math.Min(limit, 12);
            var safeDays = days <= 0 ? 30 : Math.Min(days, 365);
            var fromDate = DateTime.UtcNow.AddDays(-safeDays);

            return await _context.OrderItems
                .AsNoTracking()
                .Where(orderItem =>
                    orderItem.Order.Status == OrderStatus.Dostavljena &&
                    (orderItem.Order.DeliveredAt ?? orderItem.Order.CreatedAt) >= fromDate &&
                    orderItem.Dish != null &&
                    orderItem.Dish.IsActive &&
                    orderItem.Dish.Category.IsActive
                )
                .GroupBy(orderItem => new
                {
                    orderItem.DishId,
                    orderItem.Dish!.Name,
                    orderItem.Dish.Description,
                    orderItem.Dish.Price,
                    orderItem.Dish.IsOnSale,
                    orderItem.Dish.SalePrice,
                    orderItem.Dish.ImageUrl,
                    CategoryId = orderItem.Dish.CategoryId,
                    CategoryName = orderItem.Dish.Category.Name
                })
                .Select(group => new HomepageDishDto
                {
                    Id = group.Key.DishId,
                    Name = group.Key.Name,
                    Description = group.Key.Description,
                    Price = group.Key.Price,
                    IsOnSale = group.Key.IsOnSale,
                    SalePrice = group.Key.SalePrice,
                    EffectivePrice = group.Key.IsOnSale && group.Key.SalePrice.HasValue
                        ? group.Key.SalePrice.Value
                        : group.Key.Price,
                    ImageUrl = group.Key.ImageUrl,
                    CategoryId = group.Key.CategoryId,
                    CategoryName = group.Key.CategoryName,
                    SoldQuantity = group.Sum(x => x.Quantity)
                })
                .OrderByDescending(x => x.SoldQuantity)
                .ThenBy(x => x.Name)
                .Take(safeLimit)
                .ToListAsync(ct);
        }

        public async Task<List<HomepageDishDto>> GetRecommendedDishesAsync(
            int limit,
            CancellationToken ct = default)
        {
            var safeLimit = limit <= 0 ? 6 : Math.Min(limit, 12);

            return await _context.Dishes
                .AsNoTracking()
                .Where(dish =>
                    dish.IsActive &&
                    dish.Category.IsActive &&
                    dish.IsRecommended
                )
                .OrderBy(dish => dish.RecommendedSortOrder)
                .ThenBy(dish => dish.Name)
                .Take(safeLimit)
                .Select(dish => new HomepageDishDto
                {
                    Id = dish.Id,
                    Name = dish.Name,
                    Description = dish.Description,
                    Price = dish.Price,
                    IsOnSale = dish.IsOnSale,
                    SalePrice = dish.SalePrice,
                    EffectivePrice = dish.IsOnSale && dish.SalePrice.HasValue
                        ? dish.SalePrice.Value
                        : dish.Price,
                    ImageUrl = dish.ImageUrl,
                    CategoryId = dish.CategoryId,
                    CategoryName = dish.Category.Name,
                    SoldQuantity = null
                })
                .ToListAsync(ct);
        }
    }
}
