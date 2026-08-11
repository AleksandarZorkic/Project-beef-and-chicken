using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [ApiController]
    [Route("api/visits")]
    public class VisitsController : ControllerBase
    {
        private readonly IVisitTrackingService _visitTrackingService;

        public VisitsController(IVisitTrackingService visitTrackingService)
        {
            _visitTrackingService = visitTrackingService;
        }

        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> TrackVisit(
            [FromBody] TrackVisitRequestDto data,
            CancellationToken ct = default)
        {
            await _visitTrackingService.TrackVisitAsync(data, User, ct);

            return NoContent();
        }

        [Authorize(Roles = AppRoles.Admin)]
        [HttpGet("summary")]
        public async Task<ActionResult<VisitStatsDto>> GetSummary(
            CancellationToken ct = default)
        {
            var stats = await _visitTrackingService.GetStatsAsync(ct);

            return Ok(stats);
        }
    }
}