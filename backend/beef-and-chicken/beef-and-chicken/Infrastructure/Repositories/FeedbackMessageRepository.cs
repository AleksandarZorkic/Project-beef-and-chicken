using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class FeedbackMessageRepository : IFeedbackMessageRepository
    {
        private readonly AppDbContext _context;

        public FeedbackMessageRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(
            FeedbackMessage message,
            CancellationToken ct = default)
        {
            await _context.FeedbackMessages.AddAsync(message, ct);
        }

        public async Task<FeedbackMessage?> GetByIdAsync(
            int id,
            CancellationToken ct = default)
        {
            return await _context.FeedbackMessages
                .FirstOrDefaultAsync(message => message.Id == id, ct);
        }

        public async Task<IReadOnlyList<FeedbackMessage>> GetForAdminAsync(
            FeedbackMessageQueryDto query,
            CancellationToken ct = default)
        {
            var dbQuery = _context.FeedbackMessages
                .AsNoTracking()
                .AsQueryable();

            if (query.Status.HasValue)
            {
                dbQuery = dbQuery.Where(message =>
                    message.Status == query.Status.Value
                );
            }
            else if (!query.IncludeArchived)
            {
                dbQuery = dbQuery.Where(message =>
                    message.Status != FeedbackMessageStatus.Archived
                );
            }

            if (query.Type.HasValue)
            {
                dbQuery = dbQuery.Where(message =>
                    message.Type == query.Type.Value
                );
            }

            var take = Math.Clamp(query.Take, 1, 200);

            return await dbQuery
                .OrderByDescending(message => message.CreatedAtUtc)
                .Take(take)
                .ToListAsync(ct);
        }
    }
}