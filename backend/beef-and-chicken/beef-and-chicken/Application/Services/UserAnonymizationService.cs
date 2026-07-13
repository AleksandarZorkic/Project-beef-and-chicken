using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Entities.Constants;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Application.Services
{
    public class UserAnonymizationService : IUserAnonymizationService
    {
        private readonly UserManager<User> _userManager;
        private readonly IAuditLogService _auditLogService;
        private readonly ILogger<UserAnonymizationService> _logger;
        private readonly AppDbContext _context;
        private readonly IUserPersonalDataCleanupService _personalDataCleanupService;

        public UserAnonymizationService(
            UserManager<User> userManager,
            IAuditLogService auditLogService,
            ILogger<UserAnonymizationService> logger,
            AppDbContext context,
            IUserPersonalDataCleanupService personalDataCleanupService)
        {
            _userManager = userManager;
            _auditLogService = auditLogService;
            _logger = logger;
            _context = context;
            _personalDataCleanupService = personalDataCleanupService;
        }

        public async Task<AdminUserDto> AnonymizeAsync(int userId, CancellationToken ct = default)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(ct);

            try
            {
                var user = await _userManager.FindByIdAsync(userId.ToString());

                if (user == null)
                    throw new NotFoundException("Korisnik nije pronađen.");

                EnsureUserCanBeAnonymized(user);

                var oldRoles = (await _userManager.GetRolesAsync(user)).ToList();
                var cleanupResult = await _personalDataCleanupService.CleanupAsync(user, ct);

                var oldValues = new
                {
                    user.Id,
                    PreviousPersonalData = "Redacted",
                    HadEmail = !string.IsNullOrWhiteSpace(user.Email),
                    HadPhoneNumber = !string.IsNullOrWhiteSpace(user.PhoneNumber),
                    HadProfilePicture = cleanupResult.HadProfilePicture,
                    DeletedAddressesCount = cleanupResult.DeletedAddressesCount,
                    DeletedUserAllergensCount = cleanupResult.DeletedUserAllergensCount,
                    DeletedRefreshTokensCount = cleanupResult.DeletedRefreshTokensCount,
                    user.LockoutEnd,
                    user.BlockedAt,
                    user.BlockReason,
                    user.IsAnonymized,
                    user.AnonymizedAt,
                    Roles = oldRoles
                };

                if (oldRoles.Count > 0)
                {
                    var removeRolesResult = await _userManager.RemoveFromRolesAsync(user, oldRoles);

                    if (!removeRolesResult.Succeeded)
                    {
                        var errors = string.Join(", ", removeRolesResult.Errors.Select(e => e.Description));
                        throw new BadRequestException(errors);
                    }
                }

                user.UserName = $"anonymized-user-{user.Id}";
                user.Email = $"anonymized-user-{user.Id}@deleted.local";
                user.FirstName = "Anonimizovan";
                user.LastName = "Korisnik";
                user.PhoneNumber = null;
                user.PhoneNumberConfirmed = false;
                user.EmailConfirmed = false;
                user.ProfilePicture = null;

                var randomPassword = $"ANONYMIZED-{Guid.NewGuid():N}-{Guid.NewGuid():N}";
                user.PasswordHash = _userManager.PasswordHasher.HashPassword(user, randomPassword);

                user.AccessFailedCount = 0;
                user.TwoFactorEnabled = false;

                user.IsAnonymized = true;
                user.AnonymizedAt = DateTimeOffset.UtcNow;

                user.LockoutEnabled = true;
                user.LockoutEnd = DateTimeOffset.UtcNow.AddYears(100);
                user.SecurityStamp = Guid.NewGuid().ToString();

                var updateResult = await _userManager.UpdateAsync(user);

                if (!updateResult.Succeeded)
                {
                    var errors = string.Join(", ", updateResult.Errors.Select(e => e.Description));
                    throw new BadRequestException(errors);
                }

                await _context.SaveChangesAsync(ct);

                var finalRoles = (await _userManager.GetRolesAsync(user)).ToList();

                var newValues = new
                {
                    user.Id,
                    user.UserName,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.LockoutEnd,
                    user.BlockedAt,
                    user.BlockReason,
                    user.IsAnonymized,
                    user.AnonymizedAt,
                    Roles = finalRoles,
                    Cleanup = cleanupResult
                };

                await _auditLogService.LogAsync(
                    AuditActions.AnonymizeUser,
                    "User",
                    user.Id.ToString(),
                    oldValues,
                    newValues,
                    ct
                );

                await transaction.CommitAsync(ct);

                _logger.LogInformation(
                    "User anonymized. UserId={UserId}, UserName={UserName}",
                    user.Id,
                    user.UserName
                );

                return await MapToDtoAsync(user);
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        }

        public async Task<int> AnonymizeBlockedUsersOlderThanAsync(
            DateTimeOffset cutoffDate,
            CancellationToken ct = default)
        {
            var now = DateTimeOffset.UtcNow;

            var userIds = await _userManager.Users
                .Where(user =>
                    !user.IsAnonymized &&
                    user.BlockedAt.HasValue &&
                    user.BlockedAt.Value <= cutoffDate &&
                    user.LockoutEnd.HasValue &&
                    user.LockoutEnd.Value > now
                )
                .Select(user => user.Id)
                .ToListAsync(ct);

            var anonymizedCount = 0;

            foreach (var userId in userIds)
            {
                try
                {
                    await AnonymizeAsync(userId, ct);
                    anonymizedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Automatic user anonymization failed. UserId={UserId}",
                        userId
                    );
                }
            }

            return anonymizedCount;
        }

        private static void EnsureUserCanBeAnonymized(User user)
        {
            if (user.IsAnonymized)
                throw new BadRequestException("Korisnik je već anonimizovan.");

            var isBlocked =
                user.LockoutEnd.HasValue &&
                user.LockoutEnd.Value > DateTimeOffset.UtcNow;

            if (!isBlocked)
                throw new BadRequestException("Korisnik mora biti blokiran pre anonimizacije.");
        }

        private async Task<AdminUserDto> MapToDtoAsync(User user)
        {
            var roles = await _userManager.GetRolesAsync(user);

            var isBlocked =
                user.LockoutEnd.HasValue &&
                user.LockoutEnd.Value > DateTimeOffset.UtcNow;

            return new AdminUserDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                FirstName = user.FirstName ?? string.Empty,
                LastName = user.LastName ?? string.Empty,
                IsBlocked = isBlocked,
                BlockedAt = user.BlockedAt,
                BlockReason = user.BlockReason,
                IsAnonymized = user.IsAnonymized,
                AnonymizedAt = user.AnonymizedAt,
                Roles = roles.ToList()
            };
        }
    }
}