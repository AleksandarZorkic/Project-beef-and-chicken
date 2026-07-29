using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IRestaurantSettingsService
    {
        Task<RestaurantSettingsDto> GetAsync(CancellationToken ct = default);

        Task<RestaurantSettingsDto> UpdateAsync(
            UpdateRestaurantSettingsDto data,
            CancellationToken ct = default
        );
    }
}