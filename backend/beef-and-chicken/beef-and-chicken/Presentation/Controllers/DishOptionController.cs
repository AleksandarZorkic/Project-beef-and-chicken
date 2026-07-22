using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [ApiController]
    [Route("api/dish-options")]
    public class DishOptionsController : ControllerBase
    {
        private readonly IDishOptionService _service;

        public DishOptionsController(IDishOptionService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<List<DishOptionDto>>> GetActive(
            CancellationToken ct = default)
        {
            var options = await _service.GetActiveAsync(ct);
            return Ok(options);
        }
    }
}