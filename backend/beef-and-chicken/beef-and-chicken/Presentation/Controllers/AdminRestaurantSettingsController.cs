using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [Authorize(Roles = AppRoles.Admin)]
    [Route("api/admin/restaurant-settings")]
    [ApiController]
    public class AdminRestaurantSettingsController : ControllerBase
    {
        private readonly IRestaurantSettingsService _settingsService;

        public AdminRestaurantSettingsController(
            IRestaurantSettingsService settingsService)
        {
            _settingsService = settingsService;
        }

        [HttpGet]
        public async Task<ActionResult<RestaurantSettingsDto>> Get(
            CancellationToken ct = default)
        {
            var settings = await _settingsService.GetAsync(ct);

            return Ok(settings);
        }

        [HttpPut]
        public async Task<ActionResult<RestaurantSettingsDto>> Update(
            [FromBody] UpdateRestaurantSettingsDto data,
            CancellationToken ct = default)
        {
            var settings = await _settingsService.UpdateAsync(data, ct);

            return Ok(settings);
        }
    }
}