using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using beef_and_chicken.Application.DTOs;
using Microsoft.AspNetCore.Authorization;

namespace beef_and_chicken.Presentation.Controllers
{
    [Authorize]
    [Route("api/allergens")]
    [ApiController]
    public class AllergenController : ControllerBase
    {
        private readonly IAllergenService _allergenService;

        public AllergenController(IAllergenService allergenService)
        {
            _allergenService = allergenService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
        {
            var allergens = await _allergenService.GetAllAsync(ct);
            return Ok(allergens);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id, CancellationToken ct)
        {
            var allergen = await _allergenService.GetByIdAsync(id, ct);
            return Ok(allergen);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAllergenDto data, CancellationToken ct)
        {
            var createdAllergen = await _allergenService.CreateAsync(data, ct);
            return CreatedAtAction(nameof(GetById), new { id = createdAllergen.Id }, createdAllergen);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateAllergenDto data, CancellationToken ct)
        {
            var updatedAllergen = await _allergenService.UpdateAsync(id, data, ct);
            return Ok(updatedAllergen);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            await _allergenService.DeleteAsync(id, ct);
            return NoContent();
        }
    }
}
