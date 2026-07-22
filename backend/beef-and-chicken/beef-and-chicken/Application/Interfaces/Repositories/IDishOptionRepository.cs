using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Domain.Enums;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IDishOptionRepository
    {
        Task<List<DishOption>> GetAllAsync(
            bool includeInactive = false,
            DishOptionType? type = null,
            CancellationToken ct = default
        );

        Task<List<DishOption>> GetActiveAsync(CancellationToken ct = default);

        Task<DishOption?> GetByIdAsync(int id, CancellationToken ct = default);

        Task<bool> ExistsByNameAndTypeAsync(
            string name,
            DishOptionType type,
            int? excludeId = null,
            CancellationToken ct = default
        );

        Task AddAsync(DishOption option, CancellationToken ct = default);

        Task<List<DishOption>> GetActiveByIdsAsync(
            IEnumerable<int> ids,
            CancellationToken ct = default
        );
    }
}