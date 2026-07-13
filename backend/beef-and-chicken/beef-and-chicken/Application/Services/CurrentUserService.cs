using System.Security.Claims;
using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Http;

namespace beef_and_chicken.Infrastructure.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public int? UserId
        {
            get
            {
                var value = _httpContextAccessor.HttpContext?.User
                    .FindFirstValue(ClaimTypes.NameIdentifier);

                return int.TryParse(value, out var userId)
                    ? userId
                    : null;
            }
        }

        public string UserName =>
            _httpContextAccessor.HttpContext?.User
                .FindFirstValue(ClaimTypes.Name)
            ?? _httpContextAccessor.HttpContext?.User
                .FindFirstValue("username")
            ?? "System";

        public string? IpAddress =>
            _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

        public string? UserAgent =>
            _httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();
    }
}