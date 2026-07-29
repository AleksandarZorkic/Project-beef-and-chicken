using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MenuController : ControllerBase
    {
        private readonly IMenuService _menuService;

        public MenuController(IMenuService menuService) => _menuService = menuService;

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetMenu(CancellationToken ct)
        {
            var menu = await _menuService.GetAllAsync(ct);
            return Ok(menu);
        }

        [AllowAnonymous]
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetDishById(int id, CancellationToken ct)
        {
            var dish = await _menuService.GetByIdAsync(id, ct);
            return Ok(dish);
        }

        [HttpGet("best-sellers")]
        public async Task<ActionResult<List<HomepageDishDto>>> GetBestSellers(
            [FromQuery] int limit = 6,
            [FromQuery] int days = 30,
            CancellationToken ct = default)
        {
            var dishes = await _menuService.GetBestSellersAsync(limit, days, ct);

            return Ok(dishes);
        }

        [HttpGet("recommended")]
        public async Task<ActionResult<List<HomepageDishDto>>> GetRecommended(
            [FromQuery] int limit = 6,
            CancellationToken ct = default)
        {
            var dishes = await _menuService.GetRecommendedDishesAsync(limit, ct);

            return Ok(dishes);
        }
    }
}
