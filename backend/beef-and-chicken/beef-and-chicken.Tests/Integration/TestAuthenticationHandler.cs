using System.Security.Claims;
using System.Text.Encodings.Web;
using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace beef_and_chicken.Tests.Integration
{
    internal static class TestAuthenticationDefaults
    {
        public const string AuthenticationScheme =
            "TestAuthentication";
    }

    internal sealed class TestAuthenticationHandler
        : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult>
            HandleAuthenticateAsync()
        {
            var claims = new[]
            {
                new Claim(
                    ClaimTypes.NameIdentifier,
                    "15"),

                new Claim(
                    ClaimTypes.Name,
                    "test-customer"),

                new Claim(
                    "username",
                    "test-customer"),

                new Claim(
                    ClaimTypes.Role,
                    AppRoles.Customer)
            };

            var identity = new ClaimsIdentity(
                claims,
                TestAuthenticationDefaults.AuthenticationScheme);

            var principal = new ClaimsPrincipal(identity);

            var ticket = new AuthenticationTicket(
                principal,
                TestAuthenticationDefaults.AuthenticationScheme);

            return Task.FromResult(
                AuthenticateResult.Success(ticket));
        }
    }
}