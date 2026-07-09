using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IAdminUserQueryRepository
    {
        Task<PagedResultDto<AdminUserDto>> GetPagedAsync(AdminUsersQueryDto query, CancellationToken ct = default);
    }
}
