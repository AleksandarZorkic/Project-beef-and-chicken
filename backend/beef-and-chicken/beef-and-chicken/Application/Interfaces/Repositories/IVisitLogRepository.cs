using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IVisitLogRepository
    {
        Task AddAsync(VisitLog visitLog, CancellationToken ct = default);
        Task<VisitStatsDto> GetStatsAsync(CancellationToken ct = default);
    }
}