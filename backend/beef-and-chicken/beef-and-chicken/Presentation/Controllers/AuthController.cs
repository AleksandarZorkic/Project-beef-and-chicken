using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace beef_and_chicken.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        public AuthController(IAuthService authService) => _authService = authService;

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegistrationDto data)
        {
            await _authService.RegisterAsync(data);
            return NoContent();
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto data)
        {
            var token = await _authService.Login(data);
            return Ok(new {token});
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<ActionResult<UserProfileDto>> Profile(
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            var profile = await _authService.GetProfileAsync(userId, ct);

            return Ok(profile);
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<ActionResult<UserProfileDto>> UpdateProfile(
            [FromBody] UpdateUserProfileDto data,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            var profile = await _authService.UpdateProfileAsync(userId, data, ct);

            return Ok(profile);
        }

        [Authorize]
        [HttpPatch("profile/phone-number")]
        public async Task<ActionResult<UserProfileDto>> UpdatePhoneNumber(
            [FromBody] UpdatePhoneNumberDto data,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            var profile = await _authService.UpdatePhoneNumberAsync(userId, data, ct);

            return Ok(profile);
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(
            [FromBody] ForgotPasswordDto data,
            CancellationToken ct = default)
        {
            await _authService.ForgotPasswordAsync(data, ct);

            return Ok(new
            {
                message = "Ako nalog sa tom email adresom postoji, poslat je link za reset lozinke."
            });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(
            [FromBody] ResetPasswordDto data,
            CancellationToken ct = default)
        {
            await _authService.ResetPasswordAsync(data, ct);

            return Ok(new
            {
                message = "Lozinka je uspešno promenjena."
            });
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!int.TryParse(userIdClaim, out var userId))
                throw new UnauthorizedAccessException("Korisnik nije autentifikovan.");

            return userId;
        }
    }
}
