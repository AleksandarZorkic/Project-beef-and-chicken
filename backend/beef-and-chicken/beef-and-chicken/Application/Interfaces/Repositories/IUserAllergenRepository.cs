using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IUserAllergenRepository
    {
        Task<List<UserAllergen>> GetUserAllergensAsync(int userId, CancellationToken ct = default);
        Task<bool> ExistsAsync(int userId, int allergenId, CancellationToken ct = default);
        Task AddAsync(UserAllergen userAllergen, CancellationToken ct = default);
        Task<bool> DeleteAsync(int userId, int allergenId, CancellationToken ct = default);
    }
}
