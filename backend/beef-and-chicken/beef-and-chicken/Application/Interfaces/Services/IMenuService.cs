using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IMenuService 
    {
        Task<IEnumerable<DishMenuDto>> GetAllAsync(CancellationToken ct = default);
        Task<DishMenuDto> GetByIdAsync(int dishId, CancellationToken ct = default);
        Task<DishMenuDto> CreateAsync(CreateDishDto data, CancellationToken ct = default);
        Task<DishMenuDto> UpdateAsync(int dishId, UpdateDishDto data, CancellationToken ct = default);
        Task DeleteAsync(int dishId, CancellationToken ct = default);
        Task<IEnumerable<DishMenuDto>> GetInactiveAsync(CancellationToken ct = default);
        Task DeactivateAsync(int dishId, CancellationToken ct = default);
        Task<DishMenuDto> ActivateAsync(int dishId, CancellationToken ct = default);
    }
}
