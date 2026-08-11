using beef_and_chicken.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace beef_and_chicken.Tests.Integration
{
    internal sealed class CustomWebApplicationFactory
        : WebApplicationFactory<Program>
    {
        private readonly string _databaseName =
            $"DeliveryRushTests-{Guid.NewGuid()}";

        internal IntegrationTestTimeProvider TestTimeProvider
            { get; } = new(
                new DateTimeOffset(
                    2026,
                    8,
                    9,
                    12,
                    0,
                    0,
                    TimeSpan.Zero));

        protected override void ConfigureWebHost(
            IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<AppDbContext>();

                services.RemoveAll<
                    DbContextOptions<AppDbContext>>();

                services.RemoveAll<
                    IDbContextOptionsConfiguration<AppDbContext>>();

                services.AddDbContext<AppDbContext>(options =>
                {
                    options.UseInMemoryDatabase(_databaseName);
                });

                services.RemoveAll<TimeProvider>();

                services.AddSingleton<TimeProvider>(
                    TestTimeProvider);

                services
                    .AddAuthentication(options =>
                    {
                        options.DefaultScheme =
                            TestAuthenticationDefaults
                                .AuthenticationScheme;

                        options.DefaultAuthenticateScheme =
                            TestAuthenticationDefaults
                                .AuthenticationScheme;

                        options.DefaultChallengeScheme =
                            TestAuthenticationDefaults
                                .AuthenticationScheme;

                        options.DefaultForbidScheme =
                            TestAuthenticationDefaults
                                .AuthenticationScheme;
                    })
                    .AddScheme<
                        AuthenticationSchemeOptions,
                        TestAuthenticationHandler>(
                            TestAuthenticationDefaults
                                .AuthenticationScheme,
                            _ =>
                            {
                            });
            });
        }
    }
}