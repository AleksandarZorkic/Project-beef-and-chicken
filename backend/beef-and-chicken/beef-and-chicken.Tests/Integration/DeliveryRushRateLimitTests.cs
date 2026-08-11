using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using beef_and_chicken.Domain.Games.DeliveryRush;

namespace beef_and_chicken.Tests.Integration
{
    public sealed class DeliveryRushRateLimitTests
    {
        [Fact]
        public async Task StartRun_WhenSixthRequestIsSent_ReturnsTooManyRequests()
        {
            await using var factory =
                new CustomWebApplicationFactory();

            using var client = factory.CreateClient(
                new WebApplicationFactoryClientOptions
                {
                    BaseAddress =
                        new Uri("https://localhost"),

                    AllowAutoRedirect = false
                });

            using var firstResponse = await client.PostAsync(
                "/api/games/delivery-rush/runs",
                content: null);

            Assert.Equal(
                HttpStatusCode.OK,
                firstResponse.StatusCode);

            for (var requestNumber = 2;
                 requestNumber <= 5;
                 requestNumber++)
            {
                using var conflictResponse =
                    await client.PostAsync(
                        "/api/games/delivery-rush/runs",
                        content: null);

                Assert.Equal(
                    HttpStatusCode.Conflict,
                    conflictResponse.StatusCode);
            }

            using var rateLimitedResponse =
                await client.PostAsync(
                    "/api/games/delivery-rush/runs",
                    content: null);

            Assert.Equal(
                HttpStatusCode.TooManyRequests,
                rateLimitedResponse.StatusCode);

            var responseBody =
                await rateLimitedResponse.Content
                    .ReadFromJsonAsync<RateLimitErrorResponse>();

            Assert.NotNull(responseBody);

            Assert.Equal(
                "Previše zahteva. Pokušajte ponovo za nekoliko trenutaka.",
                responseBody!.Error);

            Assert.False(
                string.IsNullOrWhiteSpace(
                    responseBody.TraceId));

            Assert.True(
                rateLimitedResponse.Headers.Contains(
                    "X-Trace-Id"));
        }

        [Fact]
        public async Task FinishRun_WhenEleventhRequestIsSent_ReturnsTooManyRequests()
        {
            await using var factory =
                new CustomWebApplicationFactory();

            using var client = factory.CreateClient(
                new WebApplicationFactoryClientOptions
                {
                    BaseAddress =
                        new Uri("https://localhost"),

                    AllowAutoRedirect = false
                });

            using var startResponse = await client.PostAsync(
                "/api/games/delivery-rush/runs",
                content: null);

            Assert.Equal(
                HttpStatusCode.OK,
                startResponse.StatusCode);

            var startedRun = await startResponse.Content
                .ReadFromJsonAsync<StartRunResponse>();

            Assert.NotNull(startedRun);
            Assert.True(startedRun!.RunId > 0);

            factory.TestTimeProvider.Advance(
                TimeSpan.FromSeconds(
                    DeliveryRushGameRules.DurationSeconds));

            var finishUrl =
                $"/api/games/delivery-rush/runs/{startedRun.RunId}/finish";

            using var firstFinishResponse =
                await client.PostAsJsonAsync(
                    finishUrl,
                    new
                    {
                        inputs = Array.Empty<object>()
                    });

            Assert.Equal(
                HttpStatusCode.OK,
                firstFinishResponse.StatusCode);

            for (var requestNumber = 2;
                 requestNumber <= 10;
                 requestNumber++)
            {
                using var repeatedResponse =
                    await client.PostAsJsonAsync(
                        finishUrl,
                        new
                        {
                            inputs = Array.Empty<object>()
                        });

                Assert.Equal(
                    HttpStatusCode.OK,
                    repeatedResponse.StatusCode);
            }

            using var rateLimitedResponse =
                await client.PostAsJsonAsync(
                    finishUrl,
                    new
                    {
                        inputs = Array.Empty<object>()
                    });

            Assert.Equal(
                HttpStatusCode.TooManyRequests,
                rateLimitedResponse.StatusCode);

            var responseBody =
                await rateLimitedResponse.Content
                    .ReadFromJsonAsync<RateLimitErrorResponse>();

            Assert.NotNull(responseBody);

            Assert.Equal(
                "Previše zahteva. Pokušajte ponovo za nekoliko trenutaka.",
                responseBody!.Error);

            Assert.False(
                string.IsNullOrWhiteSpace(
                    responseBody.TraceId));

            Assert.True(
                rateLimitedResponse.Headers.Contains(
                    "X-Trace-Id"));
        }

        private sealed class RateLimitErrorResponse
        {
            public string Error { get; init; } =
                string.Empty;

            public string TraceId { get; init; } =
                string.Empty;
        }

        private sealed class StartRunResponse
        {
            public int RunId { get; init; }
        }
    }
}