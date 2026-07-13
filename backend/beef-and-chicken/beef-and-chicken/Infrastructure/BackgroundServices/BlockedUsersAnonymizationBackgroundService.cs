using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Application.Options;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace beef_and_chicken.Infrastructure.BackgroundServices
{
    public class BlockedUsersAnonymizationBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IOptions<UserAnonymizationOptions> _options;
        private readonly ILogger<BlockedUsersAnonymizationBackgroundService> _logger;

        public BlockedUsersAnonymizationBackgroundService(
            IServiceScopeFactory scopeFactory,
            IOptions<UserAnonymizationOptions> options,
            ILogger<BlockedUsersAnonymizationBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _options = options;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Blocked users anonymization background service started.");

            await RunAnonymizationAsync(stoppingToken);

            var interval = TimeSpan.FromHours(_options.Value.CheckIntervalHours);

            using var timer = new PeriodicTimer(interval);

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await RunAnonymizationAsync(stoppingToken);
            }
        }

        private async Task RunAnonymizationAsync(CancellationToken ct)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();

                var service = scope.ServiceProvider
                    .GetRequiredService<IUserAnonymizationService>();

                var cutoffDate = DateTimeOffset.UtcNow
                    .AddMonths(-_options.Value.BlockedUserRetentionMonths);

                var count = await service.AnonymizeBlockedUsersOlderThanAsync(
                    cutoffDate,
                    ct
                );

                _logger.LogInformation(
                    "Automatic blocked users anonymization completed. Count={Count}",
                    count
                );
            }
            catch (OperationCanceledException)
            {
                // Application is shutting down.
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Automatic blocked users anonymization job failed."
                );
            }
        }
    }
}