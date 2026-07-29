using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class AnnouncementRepository : IAnnouncementRepository
    {
        private readonly AppDbContext _context;

        public AnnouncementRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Announcement>> GetAllAsync(CancellationToken ct = default)
        {
            return await _context.Announcements
                .OrderByDescending(x => x.IsPinned)
                .ThenByDescending(x => x.StartsAt)
                .ToListAsync(ct);
        }

        public async Task<List<Announcement>> GetActiveForHomePageAsync(CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;

            return await _context.Announcements
                .Where(x =>
                    x.IsActive &&
                    x.StartsAt <= now &&
                    (x.EndsAt == null || x.EndsAt >= now)
                )
                .OrderByDescending(x => x.IsPinned)
                .ThenByDescending(x => x.StartsAt)
                .Take(5)
                .ToListAsync(ct);
        }

        public async Task<Announcement?> GetByIdAsync(
            int id,
            CancellationToken ct = default)
        {
            return await _context.Announcements
                .FirstOrDefaultAsync(x => x.Id == id, ct);
        }

        public async Task AddAsync(
            Announcement announcement,
            CancellationToken ct = default)
        {
            await _context.Announcements.AddAsync(announcement, ct);
        }
    }
}