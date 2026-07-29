using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [Authorize(Roles = AppRoles.Admin)]
    [Route("api/admin/dishes")]
    [ApiController]
    public class AdminDishesController : ControllerBase
    {
        private readonly IMenuService _menuService;

        public AdminDishesController(IMenuService menuService)
        {
            _menuService = menuService;
        }

        [HttpGet("inactive")]
        public async Task<IActionResult> GetInactive(CancellationToken ct = default)
        {
            var dishes = await _menuService.GetInactiveAsync(ct);
            return Ok(dishes);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDishDto data, CancellationToken ct = default)
        {
            var dish = await _menuService.CreateAsync(data, ct);
            return CreatedAtAction(nameof(GetById), new { id = dish.Id }, dish);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id, CancellationToken ct = default)
        {
            var dish = await _menuService.GetByIdAsync(id, ct);
            return Ok(dish);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateDishDto data, CancellationToken ct = default)
        {
            var dish = await _menuService.UpdateAsync(id, data, ct);
            return Ok(dish);
        }

        [HttpPost("{id:int}/image")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<UploadDishImageResponseDto>> UploadImage(
            int id,
            IFormFile image,
            CancellationToken ct = default)
        {
            var result = await _menuService.UploadDishImageAsync(id, image, ct);

            return Ok(result);
        }

        [HttpPatch("{id:int}/deactivate")]
        public async Task<IActionResult> Deactivate(int id, CancellationToken ct = default)
        {
            await _menuService.DeactivateAsync(id, ct);
            return NoContent();
        }

        [HttpPatch("{id:int}/activate")]
        public async Task<IActionResult> Activate(int id, CancellationToken ct = default)
        {
            var dish = await _menuService.ActivateAsync(id, ct);
            return Ok(dish);
        }
    }
}
