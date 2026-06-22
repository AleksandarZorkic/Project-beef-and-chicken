using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class AllergenRepository : IAllergenRepository
    {
        private readonly AppDbContext _context;

        public AllergenRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Allergen>> GetAllAsync(CancellationToken ct = default)
        {
            return await _context.Allergens
                .AsNoTracking()
                .OrderBy(a => a.Name)
                .ToListAsync(ct);
        }

        public async Task<Allergen?> GetByIdAsync(int allergenId, CancellationToken ct = default)
        {
            return await _context.Allergens
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == allergenId, ct);
        }

        public async Task<bool> ExistsByNameAsync(string name, CancellationToken ct = default)
        {
            var normalizedName = name.Trim().ToLower();

            return await _context.Allergens
                .AnyAsync(a => a.Name.ToLower() == normalizedName, ct);
        }

        public async Task<Allergen> AddAsync(Allergen allergen, CancellationToken ct = default)
        {
            allergen.Name = allergen.Name.Trim();

            await _context.Allergens.AddAsync(allergen, ct);

            return allergen;
        }

        public async Task<Allergen?> UpdateAsync(int allergenId, Allergen updatedAllergen, CancellationToken ct = default)
        {
            var allergen = await _context.Allergens
                .FirstOrDefaultAsync(a => a.Id == allergenId, ct);

            if (allergen == null)
                return null;

            allergen.Name = updatedAllergen.Name.Trim();

            return allergen;
        }

        public async Task<bool> IsInUseAsync(int allergenId, CancellationToken ct = default)
        {
            return await _context.DishAllergens.AnyAsync(x => x.AllergenId == allergenId, ct)
                || await _context.UserAllergens.AnyAsync(x => x.AllergenId == allergenId, ct);
        }

        public async Task<bool> DeleteAsync(int allergenId, CancellationToken ct = default)
        {
            var allergen = await _context.Allergens
                .FirstOrDefaultAsync(a => a.Id == allergenId, ct);

            if (allergen == null)
                return false;

            _context.Allergens.Remove(allergen);

            return true;
        }
    }
}