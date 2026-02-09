using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Mapping;
using beef_and_chicken.Application.Exceptions;

namespace beef_and_chicken.Application.Services
{
    public class MenuService : IMenuService
    {
        private readonly IMenuRepository _menuRepo;
        private readonly ILogger<MenuService> _logger;

        public MenuService(IMenuRepository menuRepo, ILogger<MenuService> logger)
        {
            _menuRepo = menuRepo;
            _logger = logger;
        }

        public async Task<IEnumerable<DishMenuDto>> GetAllAsync(CancellationToken ct = default)
        {
            var menu = await _menuRepo.GetAllAsync(ct);
            return menu.Select(MenuMappings.MapDishToMenuDto).ToList();
        }

        public async Task<DishMenuDto> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var dish = await _menuRepo.GetByIdAsync(id, ct);

            if (dish == null)
            {
                _logger.LogInformation("Dish not found. Id={DishId}", id);
                throw new NotFoundException($"Jelo sa ID={id} nije pronađeno.");
            }

            return MenuMappings.MapDishToMenuDto(dish);
        }
    }
}
