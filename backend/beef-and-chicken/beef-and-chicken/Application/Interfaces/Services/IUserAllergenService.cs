using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IUserAllergenService
    {
        Task<List<AllergenDto>> GetMyAllergensAsync(int userId, CancellationToken ct = default);
        Task<AllergenDto> AddAllergenToUserAsync(int userId, int allergenId, CancellationToken ct = default);
        Task RemoveAllergenFromUserAsync(int userId, int allergenId, CancellationToken ct = default);
    }
}
 