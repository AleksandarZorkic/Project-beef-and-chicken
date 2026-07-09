using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Application.Interfaces.Repositories;
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

        public AdminUserService(
            UserManager<User> userManager,
            RoleManager<IdentityRole<int>> roleManager,
            IAdminUserQueryRepository adminUserQueryRepository,
            ILogger<AdminUserService> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _adminUserQueryRepository = adminUserQueryRepository;
            _logger = logger;
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
                var errors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
                throw new BadRequestException(errors);
            }

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

            _logger.LogInformation(
                "Admin updated user. UserId={UserId}, Username={Username}",
                user.Id,
                user.UserName
            );

            return await MapToDtoAsync(user);
        }

        public async Task<AdminUserDto> UpdateRolesAsync(int userId, UpdateUserRolesDto data, CancellationToken ct = default)
        {
            var user = await _userManager.Users
                .FirstOrDefaultAsync(u => u.Id == userId, ct);

            if (user == null)
                throw new NotFoundException("Korisnik nije pronađen.");

            var newRoles = NormalizeRoles(data.Roles);

            if (newRoles.Count == 0)
                throw new BadRequestException("Korisnik mora imati bar jednu rolu.");

            await ValidateRolesExistAsync(newRoles);

            var currentRoles = await _userManager.GetRolesAsync(user);

            var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);

            if (!removeResult.Succeeded)
            {
                var errors = string.Join(", ", removeResult.Errors.Select(e => e.Description));
                throw new BadRequestException(errors);
            }

            var addResult = await _userManager.AddToRolesAsync(user, newRoles);

            if (!addResult.Succeeded)
            {
                var errors = string.Join(", ", addResult.Errors.Select(e => e.Description));
                throw new BadRequestException(errors);
            }

            _logger.LogInformation(
                "Admin updated user roles. UserId={UserId}, Roles={Roles}",
                user.Id,
                string.Join(", ", newRoles)
            );

            return await MapToDtoAsync(user);
        }

        public async Task BlockAsync(int userId, CancellationToken ct = default)
        {
            var user = await _userManager.Users
                .FirstOrDefaultAsync(u => u.Id == userId, ct);

            if (user == null)
                throw new NotFoundException("Korisnik nije pronađen.");

            var result = await _userManager.SetLockoutEndDateAsync(
                user,
                DateTimeOffset.UtcNow.AddYears(100)
            );

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new BadRequestException(errors);
            }

            _logger.LogInformation(
                "Admin blocked user. UserId={UserId}, Username={Username}",
                user.Id,
                user.UserName
            );
        }

        public async Task UnblockAsync(int userId, CancellationToken ct = default)
        {
            var user = await _userManager.Users
                .FirstOrDefaultAsync(u => u.Id == userId, ct);

            if (user == null)
                throw new NotFoundException("Korisnik nije pronađen.");

            var result = await _userManager.SetLockoutEndDateAsync(user, null);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new BadRequestException(errors);
            }

            _logger.LogInformation(
                "Admin unblocked user. UserId={UserId}, Username={Username}",
                user.Id,
                user.UserName
            );
        }

        public async Task<PagedResultDto<AdminUserDto>> GetPagedAsync(AdminUsersQueryDto query, CancellationToken ct = default)
        {
            ValidateUsersQuery(query);
            return await _adminUserQueryRepository.GetPagedAsync(query, ct);
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
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsBlocked = isBlocked,
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

        private async Task ValidateRolesExistAsync(List<string> roles)
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
            if (string.IsNullOrWhiteSpace(data.UserName))
                throw new BadRequestException("Korisničko ime je obavezno.");

            if (string.IsNullOrWhiteSpace(data.Email))
                throw new BadRequestException("Email je obavezan.");

            if (string.IsNullOrWhiteSpace(data.Password))
                throw new BadRequestException("Lozinka je obavezna.");
        }

        private static void ValidateUpdateUser(UpdateUserByAdminDto data)
        {
            if (string.IsNullOrWhiteSpace(data.UserName))
                throw new BadRequestException("Korisničko ime je obavezno.");

            if (string.IsNullOrWhiteSpace(data.Email))
                throw new BadRequestException("Email je obavezan.");
        }
    }
}