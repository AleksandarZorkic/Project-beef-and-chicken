using beef_and_chicken.Application.DTOs;
using System.Security.Claims;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IVisitTrackingService
    {
        Task TrackVisitAsync(
            TrackVisitRequestDto data,
            ClaimsPrincipal user,
            CancellationToken ct = default
        );

        Task<VisitStatsDto> GetStatsAsync(CancellationToken ct = default);
    }
}