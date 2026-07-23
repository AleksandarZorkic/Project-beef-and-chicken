using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [Authorize(Roles = AppRoles.Admin)]
    [ApiController]
    [Route("api/admin/categories")]
    public class AdminCategoriesController : ControllerBase
    {
        private readonly ICategoryService _categoryService;

        public AdminCategoriesController(ICategoryService categoryService)
        {
            _categoryService = categoryService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAll(
            CancellationToken ct = default)
        {
            var categories = await _categoryService.GetAllAsync(ct);
            return Ok(categories);
        }

        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<CategoryDto>>> GetActive(
            CancellationToken ct = default)
        {
            var categories = await _categoryService.GetActiveAsync(ct);
            return Ok(categories);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<CategoryDto>> GetById(
            int id,
            CancellationToken ct = default)
        {
            var category = await _categoryService.GetByIdAsync(id, ct);
            return Ok(category);
        }

        [HttpPost]
        public async Task<ActionResult<CategoryDto>> Create(
            [FromBody] CreateCategoryDto dto,
            CancellationToken ct = default)
        {
            var category = await _categoryService.CreateAsync(dto, ct);

            return CreatedAtAction(
                nameof(GetById),
                new { id = category.Id },
                category
            );
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<CategoryDto>> Update(
            int id,
            [FromBody] UpdateCategoryDto dto,
            CancellationToken ct = default)
        {
            var category = await _categoryService.UpdateAsync(id, dto, ct);
            return Ok(category);
        }

        [HttpPatch("{id:int}/deactivate")]
        public async Task<ActionResult> Deactivate(
            int id,
            CancellationToken ct = default)
        {
            await _categoryService.DeactivateAsync(id, ct);
            return NoContent();
        }

        [HttpPatch("{id:int}/activate")]
        public async Task<ActionResult<CategoryDto>> Activate(
            int id,
            CancellationToken ct = default)
        {
            var category = await _categoryService.ActivateAsync(id, ct);
            return Ok(category);
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult> Delete(
            int id,
            CancellationToken ct = default)
        {
            await _categoryService.DeleteAsync(id, ct);
            return NoContent();
        }
    }
}