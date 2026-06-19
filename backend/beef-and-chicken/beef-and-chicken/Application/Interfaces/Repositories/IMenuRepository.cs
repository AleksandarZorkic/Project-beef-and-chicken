using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IMenuRepository
    {
        Task<IEnumerable<Dish>> GetAllAsync(CancellationToken ct = default);
        Task<Dish?> GetByIdAsync(int dishId, CancellationToken ct = default);
        Task<IEnumerable<Dish>> GetByIdsAsync(IEnumerable<int> ids, CancellationToken ct = default);
    }
}
