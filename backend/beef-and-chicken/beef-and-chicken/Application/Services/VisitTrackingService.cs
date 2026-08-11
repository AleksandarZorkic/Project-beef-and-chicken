using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using System.Security.Claims;

namespace beef_and_chicken.Application.Services
{
    public class VisitTrackingService : IVisitTrackingService
    {
        private const int MaxVisitorIdLength = 100;
        private const int MaxPathLength = 500;

        private readonly IVisitLogRepository _visitLogRepository;
        private readonly IUnitOfWork _unitOfWork;

        public VisitTrackingService(
            IVisitLogRepository visitLogRepository,
            IUnitOfWork unitOfWork)
        {
            _visitLogRepository = visitLogRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task TrackVisitAsync(
            TrackVisitRequestDto data,
            ClaimsPrincipal user,
            CancellationToken ct = default)
        {
            if (data == null)
                throw new BadRequestException("Podaci o poseti su obavezni.");

            var visitorId = NormalizeVisitorId(data.VisitorId);
            var path = NormalizePath(data.Path);

            var visitorType = GetVisitorType(user);

            if (visitorType == null)
            {
                return;
            }

            var userId = GetUserId(user);

            var visitLog = new VisitLog
            {
                VisitorId = visitorId,
                UserId = visitorType == "Customer" ? userId : null,
                VisitorType = visitorType,
                Path = path,
                VisitedAtUtc = DateTime.UtcNow
            };

            await _visitLogRepository.AddAsync(visitLog, ct);
            await _unitOfWork.SaveChangesAsync(ct);
        }

        public async Task<VisitStatsDto> GetStatsAsync(CancellationToken ct = default)
        {
            return await _visitLogRepository.GetStatsAsync(ct);
        }

        private static string NormalizeVisitorId(string visitorId)
        {
            if (string.IsNullOrWhiteSpace(visitorId))
            {
                throw new BadRequestException("VisitorId je obavezan.");
            }

            var normalized = visitorId.Trim();

            if (normalized.Length > MaxVisitorIdLength)
            {
                throw new BadRequestException(
                    $"VisitorId ne sme imati više od {MaxVisitorIdLength} karaktera."
                );
            }

            return normalized;
        }

        private static string NormalizePath(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
            {
                throw new BadRequestException("Putanja stranice je obavezna.");
            }

            var normalized = path.Trim();

            if (!normalized.StartsWith("/"))
            {
                normalized = "/" + normalized;
            }

            if (normalized.Length > MaxPathLength)
            {
                normalized = normalized[..MaxPathLength];
            }

            return normalized;
        }

        private static string? GetVisitorType(ClaimsPrincipal user)
        {
            if (user?.Identity?.IsAuthenticated != true)
            {
                return "Anonymous";
            }

            if (user.IsInRole(AppRoles.Admin) ||
                user.IsInRole(AppRoles.Employee) ||
                user.IsInRole(AppRoles.Courier))
            {
                return null;
            }

            if (user.IsInRole(AppRoles.Customer))
            {
                return "Customer";
            }

            return null;
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId) ||
                !int.TryParse(userId, out var parsedUserId))
            {
                return null;
            }

            return parsedUserId;
        }
    }
}