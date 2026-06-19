using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Mapping;
using beef_and_chicken.Application.Exceptions;
using System.Runtime.CompilerServices;
using AutoMapper;

namespace beef_and_chicken.Application.Services
{
    public class MenuService : IMenuService
    {
        private readonly IMenuRepository _menuRepo;
        private readonly ILogger<MenuService> _logger;
        private readonly IMapper _mapper;

        public MenuService(IMenuRepository menuRepo, ILogger<MenuService> logger, IMapper mapper)
        {
            _menuRepo = menuRepo;
            _logger = logger;
            _mapper = mapper;
        }

        public async Task<IEnumerable<DishMenuDto>> GetAllAsync(CancellationToken ct = default)
        {
            var menu = await _menuRepo.GetAllAsync(ct);
            return _mapper.Map<IEnumerable<DishMenuDto>>(menu);
        }

        public async Task<DishMenuDto> GetByIdAsync(int dishId, CancellationToken ct = default)
        {
            var dish = await _menuRepo.GetByIdAsync(dishId, ct);

            if (dish == null)
            {
                _logger.LogInformation("Dish not found. Id={DishId}", dishId);
                throw new NotFoundException($"Jelo sa ID-{dishId} nije pronađeno.");
            }

            return _mapper.Map<DishMenuDto>(dish);
        }
    }
}
