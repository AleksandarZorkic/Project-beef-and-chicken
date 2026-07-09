using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IMenuRepository
    {
        Task<IEnumerable<Dish>> GetAllAsync(CancellationToken ct = default);
        Task<Dish?> GetByIdAsync(int dishId, CancellationToken ct = default);
        Task<IEnumerable<Dish>> GetByIdsAsync(IEnumerable<int> ids, CancellationToken ct = default);
        Task<Dish?> GetByIdForUpdateAsync(int dishId, CancellationToken ct = default);
        Task AddAsync(Dish dish, CancellationToken ct = default);
        Task<bool> CategoryExistsAsync(int categoryId, CancellationToken ct = default);
        Task<List<int>> GetExistingAllergenIdsAsync(IEnumerable<int> allergenIds, CancellationToken ct = default);
        Task<IEnumerable<Dish>> GetInactiveAsync(CancellationToken ct = default);
    }
}
