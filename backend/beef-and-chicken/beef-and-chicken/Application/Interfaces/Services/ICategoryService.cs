using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface ICategoryService
    {
        Task<IEnumerable<CategoryDto>> GetAllAsync(CancellationToken ct = default);

        Task<IEnumerable<CategoryDto>> GetActiveAsync(CancellationToken ct = default);

        Task<CategoryDto> GetByIdAsync(int categoryId, CancellationToken ct = default);

        Task<CategoryDto> CreateAsync(CreateCategoryDto dto, CancellationToken ct = default);

        Task<CategoryDto> UpdateAsync(
            int categoryId,
            UpdateCategoryDto dto,
            CancellationToken ct = default
        );

        Task DeactivateAsync(int categoryId, CancellationToken ct = default);

        Task<CategoryDto> ActivateAsync(int categoryId, CancellationToken ct = default);

        Task DeleteAsync(int categoryId, CancellationToken ct = default);
    }
}