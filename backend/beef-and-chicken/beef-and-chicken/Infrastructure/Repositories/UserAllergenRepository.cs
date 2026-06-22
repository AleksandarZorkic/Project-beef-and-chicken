using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Infrastructure.Data;
using beef_and_chicken.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class UserAllergenRepository : IUserAllergenRepository
    {
        private readonly AppDbContext _context;

        public UserAllergenRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<UserAllergen>> GetUserAllergensAsync(int userId, CancellationToken ct = default)
        {
            return await _context.UserAllergens
                .AsNoTracking()
                .Include(ua => ua.Allergen)
                .Where(ua => ua.UserId == userId)
                .OrderBy(ua => ua.Allergen.Name)
                .ToListAsync(ct);
        }

        public async Task<bool> ExistsAsync(int userId, int allergenId, CancellationToken ct = default)
        {
            return await _context.UserAllergens
                .AnyAsync(ua => ua.UserId == userId && ua.AllergenId == allergenId, ct);
        }

        public async Task AddAsync(UserAllergen userAllergen, CancellationToken ct = default)
        {
            await _context.UserAllergens.AddAsync(userAllergen, ct);
        }

        public async Task<bool> DeleteAsync(int userId, int allergenId, CancellationToken ct = default)
        {
            var userAllergen = await _context.UserAllergens
                .FirstOrDefaultAsync(ua => ua.UserId == userId && ua.AllergenId == allergenId, ct);

            if (userAllergen == null)
                return false;

            _context.UserAllergens.Remove(userAllergen);

            return true;
        }
    }
}
