using beef_and_chicken.Application.Interfaces.Services;

namespace beef_and_chicken.Tests.TestDoubles
{
    internal sealed class TestCurrentUserService
        : ICurrentUserService
    {
        private readonly HashSet<string> _roles;

        public TestCurrentUserService(
            int? userId,
            bool isAuthenticated,
            params string[] roles)
        {
            UserId = userId;
            IsAuthenticated = isAuthenticated;

            _roles = new HashSet<string>(
                roles,
                StringComparer.OrdinalIgnoreCase);
        }

        public int? UserId { get; }

        public string UserName { get; init; } = "test-customer";

        public string? IpAddress { get; init; } = "127.0.0.1";

        public string? UserAgent { get; init; } = "Test";

        public bool IsAuthenticated { get; }

        public bool IsInRole(string role)
        {
            return _roles.Contains(role);
        }
    }
}