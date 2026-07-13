using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Services
{
    public class UserPersonalDataCleanupService : IUserPersonalDataCleanupService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<UserPersonalDataCleanupService> _logger;

        public UserPersonalDataCleanupService(
            AppDbContext context,
            ILogger<UserPersonalDataCleanupService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<UserPersonalDataCleanupResult> CleanupAsync(
            User user,
            CancellationToken ct = default)
        {
            var result = new UserPersonalDataCleanupResult
            {
                HadProfilePicture = !string.IsNullOrWhiteSpace(user.ProfilePicture)
            };

            result.DeletedAddressesCount = await DeleteCustomerAddressesAsync(user.Id, ct);
            result.DeletedUserAllergensCount = await DeleteUserAllergensAsync(user.Id, ct);

            result.DeletedRefreshTokensCount = 0;

            user.ProfilePicture = null;

            _logger.LogInformation(
                "User personal data cleaned. UserId={UserId}, Addresses={Addresses}, Allergens={Allergens}, HadProfilePicture={HadProfilePicture}",
                user.Id,
                result.DeletedAddressesCount,
                result.DeletedUserAllergensCount,
                result.HadProfilePicture
            );

            return result;
        }

        private async Task<int> DeleteCustomerAddressesAsync(int customerId, CancellationToken ct)
        {
            var addresses = await _context.Addresses
                .Where(address => address.CustomerId == customerId)
                .ToListAsync(ct);

            if (addresses.Count == 0)
                return 0;

            _context.Addresses.RemoveRange(addresses);

            return addresses.Count;
        }

        private async Task<int> DeleteUserAllergensAsync(int userId, CancellationToken ct)
        {
            var userAllergens = await _context.UserAllergens
                .Where(userAllergen => userAllergen.UserId == userId)
                .ToListAsync(ct);

            if (userAllergens.Count == 0)
                return 0;

            _context.UserAllergens.RemoveRange(userAllergens);

            return userAllergens.Count;
        }
    }
}