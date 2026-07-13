using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Entities.Constants;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Application.Services
{
    public class AdminUserService : IAdminUserService
    {
        private readonly UserManager<User> _userManager;
        private readonly RoleManager<IdentityRole<int>> _roleManager;
        private readonly IAdminUserQueryRepository _adminUserQueryRepository;
        private readonly ILogger<AdminUserService> _logger;
        private readonly IAuditLogService _auditLogService;
        private readonly ICurrentUserService _currentUserService;
        private readonly IUserAnonymizationService _userAnonymizationService;

        public AdminUserService(
            UserManager<User> userManager,
            RoleManager<IdentityRole<int>> roleManager,
            IAdminUserQueryRepository adminUserQueryRepository,
            ILogger<AdminUserService> logger,
            IAuditLogService auditLogService,
            ICurrentUserService currentUserService,
            IUserAnonymizationService userAnonymizationService)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _adminUserQueryRepository = adminUserQueryRepository;
            _logger = logger;
            _auditLogService = auditLogService;
            _currentUserService = currentUserService;
            _userAnonymizationService = userAnonymizationService;
        }

        public async Task<List<AdminUserDto>> GetAllAsync(CancellationToken ct = default)
        {
            var users = await _userManager.Users
                .OrderBy(u => u.Id)
                .ToListAsync(ct);

            var result = new List<AdminUserDto>();

            foreach (var user in users)
            {
                result.Add(await MapToDtoAsync(user));
            }

            return result;
        }

        public async Task<AdminUserDto> GetByIdAsync(int userId, CancellationToken ct = default)
        {
            var user = await _userManager.Users
                .FirstOrDefaultAsync(u => u.Id == userId, ct);

            if (user == null)
                throw new NotFoundException("Korisnik nije pronađen.");

            EnsureUserIsNotAnonymized(user);

            return await MapToDtoAsync(user);
        }

        public async Task<AdminUserDto> CreateAsync(CreateUserByAdminDto data, CancellationToken ct = default)
        {
            ValidateCreateUser(data);

            var roles = NormalizeRoles(data.Roles);

            if (roles.Count == 0)
            {
                roles.Add(AppRoles.Customer);
            }

            await ValidateRolesExistAsync(roles);

            var user = new User
            {
                UserName = data.UserName.Trim(),
                Email = data.Email.Trim(),
                FirstName = data.FirstName.Trim(),
                LastName = data.LastName.Trim(),
                LockoutEnabled = true
            };

            var createResult = await _userManager.CreateAsync(user, data.Password);

            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                throw new BadRequestException(errors);
            }

            var roleResult = await _userManager.AddToRolesAsync(user, roles);

            if (!roleResult.Succeeded)
            {
                await _userManager.DeleteAsync(user);

                var errors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
                throw new BadRequestException(errors);
            }

            await _auditLogService.LogAsync(
                AuditActions.CreateUser,
                "User",
                user.Id.ToString(),
                oldValues: null,
                newValues: new
                {
                    user.Id,
                    user.UserName,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    Roles = roles
                },
                ct
            );

            _logger.LogInformation(
                "Admin created user. UserId={UserId}, Username={Username}, Roles={Roles}",
                user.Id,
                user.UserName,
                string.Join(", ", roles)
            );

            return await MapToDtoAsync(user);
        }

        public async Task<AdminUserDto> UpdateAsync(int userId, UpdateUserByAdminDto data, CancellationToken ct = default)
        {
            ValidateUpdateUser(data);

            var user = await _userManager.Users
                .FirstOrDefaultAsync(u => u.Id == userId, ct);

            if (user == null)
                throw new NotFoundException("Korisnik nije pronađen.");

            EnsureUserIsNotAnonymized(user);

            var oldValues = new
            {
                user.Id,
                user.UserName,
                user.Email,
                user.FirstName,
                user.LastName
            };

            user.UserName = data.UserName.Trim();
            user.Email = data.Email.Trim();
            user.FirstName = data.FirstName.Trim();
            user.LastName = data.LastName.Trim();

            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new BadRequestException(errors);
            }

            var newValues = new
            {
                user.Id,
                user.UserName,
                user.Email,
                user.FirstName,
                user.LastName
            };

            await _auditLogService.LogAsync(
                AuditActions.UpdateUser,
                "User",
                user.Id.ToString(),
                oldValues,
                newValues,
                ct
            );

            _logger.LogInformation(
                "Admin updated user. UserId={UserId}, Username={Username}",
                user.Id,
                user.UserName
            );

            return await MapToDtoAsync(user);
        }

        public async Task<AdminUserDto> UpdateRolesAsync(
            int userId,
            UpdateUserRolesDto data,
            CancellationToken ct = default)
        {
            var user = await _userManager.Users
                .FirstOrDefaultAsync(u => u.Id == userId, ct);

            if (user == null)
                throw new NotFoundException("Korisnik nije pronađen.");

            EnsureUserIsNotAnonymized(user);

            var oldRoles = (await _userManager.GetRolesAsync(user)).ToList();

            var newRoles = NormalizeRoles(data.Roles);

            if (newRoles.Count == 0)
                throw new BadRequestException("Korisnik mora imati bar jednu rolu.");

            if (_currentUserService.UserId == user.Id && !newRoles.Contains(AppRoles.Admin))
                throw new BadRequestException("Ne možeš sebi ukloniti Admin rolu.");

            await ValidateRolesExistAsync(newRoles);

            var rolesToRemove = oldRoles.Except(newRoles).ToList();
            var rolesToAdd = newRoles.Except(oldRoles).ToList();

            if (rolesToRemove.Count > 0)
            {
                var removeResult = await _userManager.RemoveFromRolesAsync(user, rolesToRemove);

                if (!removeResult.Succeeded)
                {
                    var errors = string.Join(", ", removeResult.Errors.Select(e => e.Description));
                    throw new BadRequestException(errors);
                }
            }

            if (rolesToAdd.Count > 0)
            {
                var addResult = await _userManager.AddToRolesAsync(user, rolesToAdd);

                if (!addResult.Succeeded)
                {
                    var errors = string.Join(", ", addResult.Errors.Select(e => e.Description));
                    throw new BadRequestException(errors);
                }
            }

            var finalRoles = (await _userManager.GetRolesAsync(user)).ToList();

            await _auditLogService.LogAsync(
                AuditActions.UpdateUserRoles,
                "User",
                user.Id.ToString(),
                new
                {
                    user.Id,
                    user.UserName,
                    Roles = oldRoles
                },
                new
                {
                    user.Id,
                    user.UserName,
                    Roles = finalRoles
                },
                ct
            );

            _logger.LogInformation(
                "Admin updated user roles. UserId={UserId}, Roles={Roles}",
                user.Id,
                string.Join(", ", finalRoles)
            );

            return await MapToDtoAsync(user);
        }

        public async Task BlockAsync(int userId, CancellationToken ct = default)
        {
            EnsureTargetIsNotCurrentUser(userId, "blokiraš");

            var user = await _userManager.FindByIdAsync(userId.ToString());

            if (user == null)
                throw new NotFoundException("Korisnik nije pronađen.");

            EnsureUserIsNotAnonymized(user);

            var oldValues = new
            {
                user.Id,
                user.UserName,
                user.Email,
                user.LockoutEnd,
                user.BlockedAt,
                user.BlockReason
            };

            user.BlockedAt = DateTimeOffset.UtcNow;
            user.BlockReason = "Blocked by admin";

            var result = await _userManager.SetLockoutEndDateAsync(
                user,
                DateTimeOffset.UtcNow.AddYears(100)
            );

            if (!result.Succeeded)
                throw new BadRequestException("Blokiranje korisnika nije uspelo.");

            var updateResult = await _userManager.UpdateAsync(user);

            if (!updateResult.Succeeded)
            {
                var errors = string.Join(", ", updateResult.Errors.Select(e => e.Description));
                throw new BadRequestException(errors);
            }

            var newValues = new
            {
                user.Id,
                user.UserName,
                user.Email,
                user.LockoutEnd,
                user.BlockedAt,
                user.BlockReason
            };

            await _auditLogService.LogAsync(
                AuditActions.BlockUser,
                "User",
                user.Id.ToString(),
                oldValues,
                newValues,
                ct
            );
        }

        public async Task UnblockAsync(int userId, CancellationToken ct = default)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());

            if (user == null)
                throw new NotFoundException("Korisnik nije pronađen.");

            EnsureUserIsNotAnonymized(user);

            var oldValues = new
            {
                user.Id,
                user.UserName,
                user.Email,
                user.LockoutEnd,
                user.BlockedAt,
                user.BlockReason
            };

            var result = await _userManager.SetLockoutEndDateAsync(user, null);

            if (!result.Succeeded)
                throw new BadRequestException("Odblokiranje korisnika nije uspelo.");

            user.BlockedAt = null;
            user.BlockReason = null;

            var updateResult = await _userManager.UpdateAsync(user);

            if (!updateResult.Succeeded)
            {
                var errors = string.Join(", ", updateResult.Errors.Select(e => e.Description));
                throw new BadRequestException(errors);
            }

            var newValues = new
            {
                user.Id,
                user.UserName,
                user.Email,
                user.LockoutEnd,
                user.BlockedAt,
                user.BlockReason
            };

            await _auditLogService.LogAsync(
                AuditActions.UnblockUser,
                "User",
                user.Id.ToString(),
                oldValues,
                newValues,
                ct
            );
        }

        public async Task<PagedResultDto<AdminUserDto>> GetPagedAsync(AdminUsersQueryDto query, CancellationToken ct = default)
        {
            ValidateUsersQuery(query);
            return await _adminUserQueryRepository.GetPagedAsync(query, ct);
        }

        public async Task<AdminUserDto> AnonymizeAsync(int userId, CancellationToken ct = default)
        {
            EnsureTargetIsNotCurrentUser(userId, "anonimizuješ");

            return await _userAnonymizationService.AnonymizeAsync(userId, ct);
        }

        private static void ValidateUsersQuery(AdminUsersQueryDto query)
        {
            if (query.Page <= 0)
                query.Page = 1;

            if (query.PageSize <= 0)
                query.PageSize = 20;

            if (query.PageSize > 100)
                query.PageSize = 100;

            var allowedGroups = new[] { "all", "staff", "customers" };
            var group = query.Group?.Trim().ToLowerInvariant() ?? "all";

            if (!allowedGroups.Contains(group))
                throw new BadRequestException("Group filter nije validan. Dozvoljeno: all, staff, customers.");

            query.Group = group;

            var allowedStatuses = new[] { "all", "active", "blocked", "anonymized" };
            var status = query.Status?.Trim().ToLowerInvariant() ?? "all";

            if (!allowedStatuses.Contains(status))
                throw new BadRequestException("Status filter nije validan. Dozvoljeno: all, active, blocked, anonymized.");

            query.Status = status;

            query.Search = query.Search?.Trim();
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

        private static List<string> NormalizeRoles(IEnumerable<string>? roles)
        {
            return roles?
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Select(r => r.Trim())
                .Distinct()
                .ToList() ?? new List<string>();
        }

        private async Task ValidateRolesExistAsync(IEnumerable<string> roles)
        {
            foreach (var role in roles)
            {
                if (!AppRoles.All.Contains(role))
                    throw new BadRequestException($"Rola '{role}' nije dozvoljena.");

                var exists = await _roleManager.RoleExistsAsync(role);

                if (!exists)
                    throw new BadRequestException($"Rola '{role}' ne postoji u bazi.");
            }
        }

        private static void ValidateCreateUser(CreateUserByAdminDto data)
        {
            if (data == null)
                throw new BadRequestException("Podaci za korisnika su obavezni.");

            if (string.IsNullOrWhiteSpace(data.UserName))
                throw new BadRequestException("Korisničko ime je obavezno.");

            if (string.IsNullOrWhiteSpace(data.Email))
                throw new BadRequestException("Email je obavezan.");

            if (string.IsNullOrWhiteSpace(data.FirstName))
                throw new BadRequestException("Ime je obavezno.");

            if (string.IsNullOrWhiteSpace(data.LastName))
                throw new BadRequestException("Prezime je obavezno.");

            if (string.IsNullOrWhiteSpace(data.Password))
                throw new BadRequestException("Lozinka je obavezna.");
        }

        private static void ValidateUpdateUser(UpdateUserByAdminDto data)
        {
            if (data == null)
                throw new BadRequestException("Podaci za korisnika su obavezni.");

            if (string.IsNullOrWhiteSpace(data.UserName))
                throw new BadRequestException("Korisničko ime je obavezno.");

            if (string.IsNullOrWhiteSpace(data.Email))
                throw new BadRequestException("Email je obavezan.");

            if (string.IsNullOrWhiteSpace(data.FirstName))
                throw new BadRequestException("Ime je obavezno.");

            if (string.IsNullOrWhiteSpace(data.LastName))
                throw new BadRequestException("Prezime je obavezno.");
        }

        private static void EnsureUserIsNotAnonymized(User user)
        {
            if (user.IsAnonymized)
                throw new BadRequestException("Anonimizovan korisnik ne može da se menja.");
        }

        private void EnsureTargetIsNotCurrentUser(int targetUserId, string action)
        {
            if (_currentUserService.UserId == targetUserId)
                throw new BadRequestException($"Ne možeš da {action} sopstveni nalog.");
        }

        private static void EnsureUserIsBlocked(User user)
        {
            var isBlocked =
                user.LockoutEnd.HasValue &&
                user.LockoutEnd.Value > DateTimeOffset.UtcNow;

            if (!isBlocked)
                throw new BadRequestException("Korisnik mora biti blokiran pre anonimizacije.");
        }
    }
}