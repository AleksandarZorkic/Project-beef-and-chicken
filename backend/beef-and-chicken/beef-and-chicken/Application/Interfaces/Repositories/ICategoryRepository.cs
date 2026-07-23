using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface ICategoryRepository
    {
        Task<IEnumerable<Category>> GetAllAsync(CancellationToken ct = default);

        Task<IEnumerable<Category>> GetActiveAsync(CancellationToken ct = default);

        Task<Category?> GetByIdAsync(int categoryId, CancellationToken ct = default);

        Task<Category?> GetByIdForUpdateAsync(int categoryId, CancellationToken ct = default);

        Task<bool> ExistsByNameAsync(
            string name,
            int? excludedCategoryId = null,
            CancellationToken ct = default
        );

        Task AddAsync(Category category, CancellationToken ct = default);

        void Remove(Category category);
    }
}