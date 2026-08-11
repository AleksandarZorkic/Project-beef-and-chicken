using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IFastFoodWorkTimeRepository
    {
        Task<List<FastFoodWorkTime>> GetAllAsync(CancellationToken ct = default);

        Task<List<FastFoodWorkTime>> GetAllForUpdateAsync(CancellationToken ct = default);

        Task AddRangeAsync(
            IEnumerable<FastFoodWorkTime> workingHours,
            CancellationToken ct = default
        );
    }
}