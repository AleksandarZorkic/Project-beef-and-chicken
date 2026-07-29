using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Services
{
    public class RestaurantSettingsService : IRestaurantSettingsService
    {
        private readonly IRestaurantSettingsRepository _repository;
        private readonly IUnitOfWork _unitOfWork;

        public RestaurantSettingsService(
            IRestaurantSettingsRepository repository,
            IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<RestaurantSettingsDto> GetAsync(
            CancellationToken ct = default)
        {
            var settings = await _repository.GetAsync(ct)
                ?? RestaurantSettings.CreateDefault();

            return ToDto(settings);
        }

        public async Task<RestaurantSettingsDto> UpdateAsync(
            UpdateRestaurantSettingsDto data,
            CancellationToken ct = default)
        {
            if (data == null)
                throw new BadRequestException("Podešavanja restorana su obavezna.");

            Validate(data);

            var settings = await _repository.GetForUpdateAsync(ct);

            if (settings == null)
            {
                settings = RestaurantSettings.CreateDefault();

                await _repository.AddAsync(settings, ct);
            }

            settings.MinimumOrderAmount = data.MinimumOrderAmount;
            settings.DeliveryFee = data.DeliveryFee;
            settings.FreeDeliveryThreshold = data.FreeDeliveryThreshold;
            settings.IsDeliveryEnabled = data.IsDeliveryEnabled;
            settings.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync(ct);

            return ToDto(settings);
        }

        private static void Validate(UpdateRestaurantSettingsDto data)
        {
            if (data.MinimumOrderAmount < 0)
                throw new BadRequestException(
                    "Minimalna porudžbina ne može biti negativna."
                );

            if (data.DeliveryFee < 0)
                throw new BadRequestException(
                    "Cena dostave ne može biti negativna."
                );

            if (data.FreeDeliveryThreshold.HasValue &&
                data.FreeDeliveryThreshold.Value <= 0)
            {
                throw new BadRequestException(
                    "Iznos za besplatnu dostavu mora biti veći od 0."
                );
            }

            if (data.FreeDeliveryThreshold.HasValue &&
                data.FreeDeliveryThreshold.Value < data.MinimumOrderAmount)
            {
                throw new BadRequestException(
                    "Iznos za besplatnu dostavu ne treba da bude manji od minimalne porudžbine."
                );
            }
        }

        private static RestaurantSettingsDto ToDto(RestaurantSettings settings)
        {
            return new RestaurantSettingsDto
            {
                MinimumOrderAmount = settings.MinimumOrderAmount,
                DeliveryFee = settings.DeliveryFee,
                FreeDeliveryThreshold = settings.FreeDeliveryThreshold,
                IsDeliveryEnabled = settings.IsDeliveryEnabled,
                UpdatedAt = settings.UpdatedAt
            };
        }
    }
}