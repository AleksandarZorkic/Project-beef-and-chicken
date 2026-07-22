using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Domain.Enums;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IDishOptionService
    {
        Task<List<DishOptionDto>> GetAllAsync(
            bool includeInactive = false,
            DishOptionType? type = null,
            CancellationToken ct = default
        );

        Task<List<DishOptionDto>> GetActiveAsync(CancellationToken ct = default);

        Task<DishOptionDto> GetByIdAsync(int id, CancellationToken ct = default);

        Task<DishOptionDto> CreateAsync(
            CreateDishOptionDto data,
            CancellationToken ct = default
        );

        Task<DishOptionDto> UpdateAsync(
            int id,
            UpdateDishOptionDto data,
            CancellationToken ct = default
        );

        Task<DishOptionDto> ActivateAsync(int id, CancellationToken ct = default);

        Task<DishOptionDto> DeactivateAsync(int id, CancellationToken ct = default);
    }
}