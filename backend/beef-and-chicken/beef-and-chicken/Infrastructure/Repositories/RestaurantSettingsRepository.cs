using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class RestaurantSettingsRepository : IRestaurantSettingsRepository
    {
        private readonly AppDbContext _context;

        public RestaurantSettingsRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<RestaurantSettings?> GetAsync(
            CancellationToken ct = default)
        {
            return await _context.RestaurantSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.Id == RestaurantSettings.DefaultId,
                    ct
                );
        }

        public async Task<RestaurantSettings?> GetForUpdateAsync(
            CancellationToken ct = default)
        {
            return await _context.RestaurantSettings
                .FirstOrDefaultAsync(
                    x => x.Id == RestaurantSettings.DefaultId,
                    ct
                );
        }

        public async Task AddAsync(
            RestaurantSettings settings,
            CancellationToken ct = default)
        {
            await _context.RestaurantSettings.AddAsync(settings, ct);
        }
    }
}