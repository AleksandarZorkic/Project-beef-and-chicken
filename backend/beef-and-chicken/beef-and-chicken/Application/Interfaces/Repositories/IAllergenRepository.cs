using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IAllergenRepository
    {
        Task<List<Allergen>> GetAllAsync(CancellationToken ct = default);
        Task<Allergen?> GetByIdAsync(int allergenId, CancellationToken ct = default);
        Task<bool> ExistsByNameAsync(string name, CancellationToken ct = default);
        Task<Allergen> AddAsync(Allergen allergen, CancellationToken ct = default);
        Task<Allergen?> UpdateAsync(int allergenId, Allergen updatedAllergen, CancellationToken ct = default);
        Task<bool> IsInUseAsync(int allergenId, CancellationToken ct = default);
        Task<bool> DeleteAsync(int allergenId, CancellationToken ct = default);
    }
}
