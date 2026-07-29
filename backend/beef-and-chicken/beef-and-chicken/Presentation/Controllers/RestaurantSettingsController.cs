using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [Route("api/restaurant-settings")]
    [ApiController]
    public class RestaurantSettingsController : ControllerBase
    {
        private readonly IRestaurantSettingsService _settingsService;

        public RestaurantSettingsController(
            IRestaurantSettingsService settingsService)
        {
            _settingsService = settingsService;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<ActionResult<RestaurantSettingsDto>> Get(
            CancellationToken ct = default)
        {
            var settings = await _settingsService.GetAsync(ct);

            return Ok(settings);
        }
    }
}