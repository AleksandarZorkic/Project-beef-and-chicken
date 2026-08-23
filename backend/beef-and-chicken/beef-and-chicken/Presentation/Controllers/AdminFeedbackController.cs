using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [ApiController]
    [Authorize(Roles = AppRoles.Admin)]
    [Route("api/admin/feedback")]
    public class AdminFeedbackController : ControllerBase
    {
        private readonly IFeedbackMessageService _feedbackService;

        public AdminFeedbackController(IFeedbackMessageService feedbackService)
        {
            _feedbackService = feedbackService;
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<FeedbackMessageDto>>> GetAll(
            [FromQuery] FeedbackMessageQueryDto query,
            CancellationToken ct = default)
        {
            var messages = await _feedbackService.GetForAdminAsync(query, ct);

            return Ok(messages);
        }

        [HttpPatch("{id:int}/read")]
        public async Task<ActionResult<FeedbackMessageDto>> MarkAsRead(
            int id,
            CancellationToken ct = default)
        {
            var message = await _feedbackService.MarkAsReadAsync(id, ct);

            return Ok(message);
        }

        [HttpPatch("{id:int}/archive")]
        public async Task<ActionResult<FeedbackMessageDto>> Archive(
            int id,
            CancellationToken ct = default)
        {
            var message = await _feedbackService.ArchiveAsync(id, ct);

            return Ok(message);
        }
    }
}