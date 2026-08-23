using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Presentation.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace beef_and_chicken.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FeedbackController : ControllerBase
    {
        private readonly IFeedbackMessageService _feedbackService;

        public FeedbackController(IFeedbackMessageService feedbackService)
        {
            _feedbackService = feedbackService;
        }

        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.FeedbackCreate)]
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateFeedbackMessageDto data,
            CancellationToken ct = default)
        {
            var feedback = await _feedbackService.CreateAsync(data, ct);

            return Ok(new
            {
                message = "Hvala! Vaša poruka je poslata administraciji.",
                feedbackId = feedback.Id
            });
        }
    }
}