using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IAnnouncementService
    {
        Task<List<AnnouncementDto>> GetAllAsync(CancellationToken ct = default);

        Task<List<AnnouncementDto>> GetActiveForHomePageAsync(CancellationToken ct = default);

        Task<AnnouncementDto> GetByIdAsync(int id, CancellationToken ct = default);

        Task<AnnouncementDto> CreateAsync(
            CreateAnnouncementDto data,
            CancellationToken ct = default
        );

        Task<AnnouncementDto> UpdateAsync(
            int id,
            UpdateAnnouncementDto data,
            CancellationToken ct = default
        );

        Task DeactivateAsync(int id, CancellationToken ct = default);

        Task ActivateAsync(int id, CancellationToken ct = default);

        Task DeleteAsync(int id, CancellationToken ct = default);
    }
}