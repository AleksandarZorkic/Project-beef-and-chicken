using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [Authorize(Roles = AppRoles.Admin)]
    [Route("api/admin/announcements")]
    [ApiController]
    public class AdminAnnouncementsController : ControllerBase
    {
        private readonly IAnnouncementService _announcementService;

        public AdminAnnouncementsController(IAnnouncementService announcementService)
        {
            _announcementService = announcementService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct = default)
        {
            var announcements = await _announcementService.GetAllAsync(ct);

            return Ok(announcements);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(
            int id,
            CancellationToken ct = default)
        {
            var announcement = await _announcementService.GetByIdAsync(id, ct);

            return Ok(announcement);
        }

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateAnnouncementDto data,
            CancellationToken ct = default)
        {
            var announcement = await _announcementService.CreateAsync(data, ct);

            return CreatedAtAction(
                nameof(GetById),
                new { id = announcement.Id },
                announcement
            );
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] UpdateAnnouncementDto data,
            CancellationToken ct = default)
        {
            var announcement = await _announcementService.UpdateAsync(id, data, ct);

            return Ok(announcement);
        }

        [HttpPatch("{id:int}/activate")]
        public async Task<IActionResult> Activate(
            int id,
            CancellationToken ct = default)
        {
            await _announcementService.ActivateAsync(id, ct);

            return NoContent();
        }

        [HttpPatch("{id:int}/deactivate")]
        public async Task<IActionResult> Deactivate(
            int id,
            CancellationToken ct = default)
        {
            await _announcementService.DeactivateAsync(id, ct);

            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(
            int id,
            CancellationToken ct = default)
        {
            await _announcementService.DeleteAsync(id, ct);

            return NoContent();
        }
    }
}