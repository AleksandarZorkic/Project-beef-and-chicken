using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IMenuService 
    {
        Task<IEnumerable<DishMenuDto>> GetAllAsync(CancellationToken ct = default);
        Task<DishMenuDto> GetByIdAsync(int dishId, CancellationToken ct = default);
    }
}
