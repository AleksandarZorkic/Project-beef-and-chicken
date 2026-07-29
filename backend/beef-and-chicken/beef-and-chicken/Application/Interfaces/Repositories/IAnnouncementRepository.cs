using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IAnnouncementRepository
    {
        Task<List<Announcement>> GetAllAsync(CancellationToken ct = default);

        Task<List<Announcement>> GetActiveForHomePageAsync(CancellationToken ct = default);

        Task<Announcement?> GetByIdAsync(int id, CancellationToken ct = default);

        Task AddAsync(Announcement announcement, CancellationToken ct = default);
    }
}