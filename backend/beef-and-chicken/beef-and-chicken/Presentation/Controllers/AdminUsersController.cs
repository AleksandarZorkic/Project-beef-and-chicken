using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [Authorize(Roles = AppRoles.Admin)]
    [Route("api/admin/users")]
    [ApiController]
    public class AdminUsersController : ControllerBase
    {
        private readonly IAdminUserService _adminUserService;

        public AdminUsersController(IAdminUserService adminUserService)
        {
            _adminUserService = adminUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetPaged([FromQuery] AdminUsersQueryDto query, CancellationToken ct = default)
        {
            var users = await _adminUserService.GetPagedAsync(query, ct);
            return Ok(users);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id, CancellationToken ct = default)
        {
            var user = await _adminUserService.GetByIdAsync(id, ct);
            return Ok(user);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserByAdminDto data, CancellationToken ct = default)
        {
            var user = await _adminUserService.CreateAsync(data, ct);
            return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserByAdminDto data, CancellationToken ct = default)
        {
            var user = await _adminUserService.UpdateAsync(id, data, ct);
            return Ok(user);
        }

        [HttpPatch("{id:int}/roles")]
        public async Task<IActionResult> UpdateRoles(int id, [FromBody] UpdateUserRolesDto data, CancellationToken ct = default)
        {
            var user = await _adminUserService.UpdateRolesAsync(id, data, ct);
            return Ok(user);
        }

        [HttpPatch("{id:int}/block")]
        public async Task<IActionResult> Block(int id, CancellationToken ct = default)
        {
            await _adminUserService.BlockAsync(id, ct);
            return NoContent();
        }

        [HttpPatch("{id:int}/unblock")]
        public async Task<IActionResult> Unblock(int id, CancellationToken ct = default)
        {
            await _adminUserService.UnblockAsync(id, ct);
            return NoContent();
        }
    }
}
