using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class AdminUserQueryRepository : IAdminUserQueryRepository
    {
        private readonly AppDbContext _context;

        public AdminUserQueryRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResultDto<AdminUserDto>> GetPagedAsync(
            AdminUsersQueryDto query,
            CancellationToken ct = default)
        {
            var page = query.Page <= 0 ? 1 : query.Page;
            var pageSize = query.PageSize <= 0 ? 20 : query.PageSize;

            if (pageSize > 100)
                pageSize = 100;

            var group = query.Group?.Trim().ToLowerInvariant() ?? "all";
            var status = query.Status?.Trim().ToLowerInvariant() ?? "all";
            var search = query.Search?.Trim().ToLowerInvariant();

            var staffRoles = new[]
            {
                AppRoles.Admin,
                AppRoles.Employee,
                AppRoles.Courier
            };

            var staffUserIdsQuery =
                from userRole in _context.UserRoles
                join role in _context.Roles on userRole.RoleId equals role.Id
                where role.Name != null && staffRoles.Contains(role.Name)
                select userRole.UserId;

            var usersQuery = _context.Users.AsNoTracking().AsQueryable();

            if (group == "staff")
            {
                usersQuery = usersQuery.Where(user => staffUserIdsQuery.Contains(user.Id));
            }
            else if (group == "customers")
            {
                usersQuery = usersQuery.Where(user => !staffUserIdsQuery.Contains(user.Id));
            }

            if (status == "active")
            {
                var now = DateTimeOffset.UtcNow;

                usersQuery = usersQuery.Where(user =>
                    !user.IsAnonymized &&
                    (!user.LockoutEnd.HasValue || user.LockoutEnd <= now)
                );
            }
            else if (status == "blocked")
            {
                var now = DateTimeOffset.UtcNow;

                usersQuery = usersQuery.Where(user =>
                    user.LockoutEnd.HasValue &&
                    user.LockoutEnd > now
                );
            }
            else if (status == "anonymized")
            {
                usersQuery = usersQuery.Where(user => user.IsAnonymized);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                usersQuery = usersQuery.Where(user =>
                    (user.UserName != null && user.UserName.ToLower().Contains(search)) ||
                    (user.Email != null && user.Email.ToLower().Contains(search)) ||
                    (user.FirstName != null && user.FirstName.ToLower().Contains(search)) ||
                    (user.LastName != null && user.LastName.ToLower().Contains(search))
                );
            }

            var totalCount = await usersQuery.CountAsync(ct);

            var users = await usersQuery
                .OrderBy(user => user.UserName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            var userIds = users.Select(user => user.Id).ToList();

            var userRoles = await (
                from userRole in _context.UserRoles
                join role in _context.Roles on userRole.RoleId equals role.Id
                where userIds.Contains(userRole.UserId)
                select new
                {
                    UserId = userRole.UserId,
                    RoleName = role.Name
                }
            ).ToListAsync(ct);

            var rolesByUserId = userRoles
                .Where(item => !string.IsNullOrWhiteSpace(item.RoleName))
                .GroupBy(item => item.UserId)
                .ToDictionary(
                    groupItem => groupItem.Key,
                    groupItem => groupItem
                        .Select(item => item.RoleName!)
                        .Distinct()
                        .ToList()
                );

            var nowForBlockedCheck = DateTimeOffset.UtcNow;

            var items = users.Select(user => new AdminUserDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsBlocked = user.LockoutEnd.HasValue && user.LockoutEnd > nowForBlockedCheck,
                BlockedAt = user.BlockedAt,
                BlockReason = user.BlockReason,
                IsAnonymized = user.IsAnonymized,
                AnonymizedAt = user.AnonymizedAt,
                Roles = rolesByUserId.TryGetValue(user.Id, out var roles)
                    ? roles
                    : new List<string>()
            }).ToList();

            return new PagedResultDto<AdminUserDto>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            };
        }
    }
}