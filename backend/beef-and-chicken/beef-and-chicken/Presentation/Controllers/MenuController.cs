using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MenuController : ControllerBase
    {
        private readonly IMenuService _menuService;

        public MenuController(IMenuService menuService) => _menuService = menuService;

        [HttpGet]
        public async Task<IActionResult> GetMenu(CancellationToken ct = default)
        {
            var menu = await _menuService.GetAllAsync(ct);
            return Ok(menu);
        }

        [HttpGet("{dishId:int}")]
        public async Task<IActionResult> GetDishById(int dishId, CancellationToken ct = default)
        {
            var dish = await _menuService.GetByIdAsync(dishId, ct);
            return Ok(dish);
        }
    }
}
