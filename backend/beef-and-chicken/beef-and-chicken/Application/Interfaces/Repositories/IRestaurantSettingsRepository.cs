using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IRestaurantSettingsRepository
    {
        Task<RestaurantSettings?> GetAsync(CancellationToken ct = default);

        Task<RestaurantSettings?> GetForUpdateAsync(CancellationToken ct = default);

        Task AddAsync(
            RestaurantSettings settings,
            CancellationToken ct = default
        );
    }
}