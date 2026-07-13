using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IAdminUserService
    {
        Task<List<AdminUserDto>> GetAllAsync(CancellationToken ct = default);
        Task<AdminUserDto> GetByIdAsync(int userId, CancellationToken ct = default);
        Task<AdminUserDto> CreateAsync(CreateUserByAdminDto data, CancellationToken ct = default);
        Task<AdminUserDto> UpdateAsync(int userId, UpdateUserByAdminDto data, CancellationToken ct = default);
        Task<AdminUserDto> UpdateRolesAsync(int userId, UpdateUserRolesDto data, CancellationToken ct = default);
        Task BlockAsync(int userId, CancellationToken ct = default);
        Task UnblockAsync(int userId, CancellationToken ct = default);
        Task<PagedResultDto<AdminUserDto>> GetPagedAsync(AdminUsersQueryDto query, CancellationToken ct = default);
        Task<AdminUserDto> AnonymizeAsync(int userId, CancellationToken ct = default);
    }
}