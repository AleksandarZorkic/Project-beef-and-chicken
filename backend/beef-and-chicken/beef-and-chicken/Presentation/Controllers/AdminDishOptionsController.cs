using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [ApiController]
    [Authorize(Roles = AppRoles.Admin)]
    [Route("api/admin/dish-options")]
    public class AdminDishOptionsController : ControllerBase
    {
        private readonly IDishOptionService _service;

        public AdminDishOptionsController(IDishOptionService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<List<DishOptionDto>>> GetAll(
            [FromQuery] bool includeInactive = true,
            [FromQuery] DishOptionType? type = null,
            CancellationToken ct = default)
        {
            var options = await _service.GetAllAsync(includeInactive, type, ct);
            return Ok(options);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<DishOptionDto>> GetById(
            int id,
            CancellationToken ct = default)
        {
            var option = await _service.GetByIdAsync(id, ct);
            return Ok(option);
        }

        [HttpPost]
        public async Task<ActionResult<DishOptionDto>> Create(
            [FromBody] CreateDishOptionDto data,
            CancellationToken ct = default)
        {
            var option = await _service.CreateAsync(data, ct);

            return CreatedAtAction(
                nameof(GetById),
                new { id = option.Id },
                option
            );
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<DishOptionDto>> Update(
            int id,
            [FromBody] UpdateDishOptionDto data,
            CancellationToken ct = default)
        {
            var option = await _service.UpdateAsync(id, data, ct);
            return Ok(option);
        }

        [HttpPatch("{id:int}/activate")]
        public async Task<ActionResult<DishOptionDto>> Activate(
            int id,
            CancellationToken ct = default)
        {
            var option = await _service.ActivateAsync(id, ct);
            return Ok(option);
        }

        [HttpPatch("{id:int}/deactivate")]
        public async Task<ActionResult<DishOptionDto>> Deactivate(
            int id,
            CancellationToken ct = default)
        {
            var option = await _service.DeactivateAsync(id, ct);
            return Ok(option);
        }
    }
}