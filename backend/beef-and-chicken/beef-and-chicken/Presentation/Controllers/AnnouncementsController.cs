using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [Route("api/announcements")]
    [ApiController]
    public class AnnouncementsController : ControllerBase
    {
        private readonly IAnnouncementService _announcementService;

        public AnnouncementsController(IAnnouncementService announcementService)
        {
            _announcementService = announcementService;
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActive(CancellationToken ct = default)
        {
            var announcements = await _announcementService.GetActiveForHomePageAsync(ct);

            return Ok(announcements);
        }
    }
}