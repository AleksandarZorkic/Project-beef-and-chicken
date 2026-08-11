using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using beef_and_chicken.Presentation.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace beef_and_chicken.Presentation.Controllers
{
    [ApiController]
    [Route("api/games/delivery-rush")]
    public class DeliveryRushController : ControllerBase
    {
        private readonly IDeliveryRushService _deliveryRushService;

        public DeliveryRushController(
            IDeliveryRushService deliveryRushService)
        {
            _deliveryRushService = deliveryRushService;
        }

        [EnableRateLimiting(RateLimitPolicies.DeliveryRushStart)]
        [Authorize(Roles = AppRoles.Customer)]
        [HttpPost("runs")]
        [ProducesResponseType(
        typeof(StartDeliveryRushRunResponseDto),
        StatusCodes.Status200OK)]
            [ProducesResponseType(
        StatusCodes.Status401Unauthorized)]
            [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
            [ProducesResponseType(
        typeof(ApiErrorResponseDto),
        StatusCodes.Status409Conflict)]
            [ProducesResponseType(
        typeof(ApiErrorResponseDto),
        StatusCodes.Status429TooManyRequests)]
            [ProducesResponseType(
        typeof(ApiErrorResponseDto),
        StatusCodes.Status500InternalServerError)]
        public async Task<
            ActionResult<StartDeliveryRushRunResponseDto>> StartRun(
                CancellationToken ct = default)
        {
            var result = await _deliveryRushService.StartRunAsync(ct);

            return Ok(result);
        }

        [EnableRateLimiting(RateLimitPolicies.DeliveryRushFinish)]
        [Authorize(Roles = AppRoles.Customer)]
        [Consumes("application/json")]
        [ProducesResponseType(
        typeof(DeliveryRushRunResultDto),
        StatusCodes.Status200OK)]
            [ProducesResponseType(
        typeof(ApiErrorResponseDto),
        StatusCodes.Status400BadRequest)]
            [ProducesResponseType(
        StatusCodes.Status401Unauthorized)]
            [ProducesResponseType(
        StatusCodes.Status403Forbidden)]
            [ProducesResponseType(
        typeof(ApiErrorResponseDto),
        StatusCodes.Status404NotFound)]
            [ProducesResponseType(
        typeof(ApiErrorResponseDto),
        StatusCodes.Status409Conflict)]
            [ProducesResponseType(
        typeof(ApiErrorResponseDto),
        StatusCodes.Status429TooManyRequests)]
            [ProducesResponseType(
        typeof(ApiErrorResponseDto),
        StatusCodes.Status500InternalServerError)]
        [HttpPost("runs/{runId:int}/finish")]
        public async Task<
            ActionResult<DeliveryRushRunResultDto>> FinishRun(
                int runId,
                [FromBody] FinishDeliveryRushRunRequestDto data,
                CancellationToken ct = default)
        {
            var result = await _deliveryRushService.FinishRunAsync(
                runId,
                data,
                ct);

            return Ok(result);
        }

        [AllowAnonymous]
        [ProducesResponseType(
        typeof(DeliveryRushLeaderboardDto),
        StatusCodes.Status200OK)]
            [ProducesResponseType(
        typeof(ApiErrorResponseDto),
        StatusCodes.Status500InternalServerError)]
        [HttpGet("leaderboard")]
        public async Task<
            ActionResult<DeliveryRushLeaderboardDto>> GetLeaderboard(
                CancellationToken ct = default)
        {
            var result =
                await _deliveryRushService
                    .GetCurrentLeaderboardAsync(ct);

            return Ok(result);
        }

        [Authorize(Roles = AppRoles.Customer)]
        [HttpPost("runs/{runId:int}/cancel")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(
        typeof(ApiErrorResponseDto),
        StatusCodes.Status404NotFound)]
            [ProducesResponseType(
        typeof(ApiErrorResponseDto),
        StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CancelRun(
            int runId,
            CancellationToken ct = default)
        {
            await _deliveryRushService.CancelRunAsync(
                runId,
                ct);

            return NoContent();
        }
    }
}