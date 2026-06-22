using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace beef_and_chicken.Presentation.Controllers
{
    [Authorize]
    [Route("api/profile/allergens")]
    [ApiController]
    public class ProfileAllergensController : ControllerBase
    {
        private readonly IUserAllergenService _userAllergenService;

        public ProfileAllergensController(IUserAllergenService userAllergenService)
        {
            _userAllergenService = userAllergenService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyAllergens(CancellationToken ct)
        {
            var userId = GetCurrentUserId();

            var allergens = await _userAllergenService.GetMyAllergensAsync(userId, ct);

            return Ok(allergens);
        }

        [HttpPost("{allergenId:int}")]
        public async Task<IActionResult> AddAllergenToProfile(
            int allergenId,
            CancellationToken ct)
        {
            var userId = GetCurrentUserId();

            var allergen = await _userAllergenService.AddAllergenToUserAsync(
                userId,
                allergenId,
                ct
            );

            return Ok(allergen);
        }

        [HttpDelete("{allergenId:int}")]
        public async Task<IActionResult> RemoveAllergenFromProfile(
            int allergenId,
            CancellationToken ct)
        {
            var userId = GetCurrentUserId();

            await _userAllergenService.RemoveAllergenFromUserAsync(
                userId,
                allergenId,
                ct
            );

            return NoContent();
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!int.TryParse(userIdClaim, out var userId))
                throw new ForbiddenException("Korisnik nije ispravno autentifikovan.");

            return userId;
        }
    }
}