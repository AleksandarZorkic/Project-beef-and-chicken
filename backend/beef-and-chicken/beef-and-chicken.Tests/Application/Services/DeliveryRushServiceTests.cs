using beef_and_chicken.Application.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Domain.Games.DeliveryRush;
using beef_and_chicken.Tests.TestDoubles;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.DTOs;
using Xunit;

namespace beef_and_chicken.Tests.Application.Services
{
    public class DeliveryRushServiceTests
    {
        [Fact]
        public async Task StartRunAsync_ForCustomer_CreatesNewRun()
        {
            var currentTime = new DateTimeOffset(
                2026,
                8,
                7,
                12,
                0,
                0,
                TimeSpan.Zero);

            var repository =
                new TestDeliveryRushRunRepository();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var simulator = new DeliveryRushSimulator();

            var timeProvider =
                new TestTimeProvider(currentTime);

            var seedGenerator =
                new TestDeliveryRushSeedGenerator(123456);

            var service = new DeliveryRushService(
                repository,
                unitOfWork,
                currentUser,
                simulator,
                timeProvider,
                seedGenerator);

            var result = await service.StartRunAsync();

            var savedRun = Assert.Single(repository.Runs);

            Assert.Equal(1, result.RunId);
            Assert.Equal(123456, result.Seed);
            Assert.Equal(
                DeliveryRushGameRules.GameVersion,
                result.GameVersion);

            Assert.Equal(
                DeliveryRushGameRules.DurationSeconds,
                result.DurationSeconds);

            Assert.Equal(
                DeliveryRushGameRules.TickRate,
                result.TickRate);

            Assert.Equal(currentTime, result.StartedAtUtc);

            Assert.Equal(
                currentTime.AddSeconds(
                    DeliveryRushGameRules.DurationSeconds +
                    DeliveryRushGameRules.ExpirationGraceSeconds),
                result.ExpiresAtUtc);

            Assert.Equal(15, savedRun.UserId);
            Assert.Equal(123456, savedRun.Seed);

            Assert.Equal(
                DeliveryRushRunStatus.Started,
                savedRun.Status);

            Assert.Equal(currentTime, savedRun.StartedAtUtc);

            Assert.Equal(
                new DateOnly(2026, 8, 3),
                savedRun.WeekStartDate);

            Assert.Equal(
                1,
                unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task StartRunAsync_WhenActiveRunExists_ThrowsConflictException()
        {
            var currentTime = new DateTimeOffset(
                2026,
                8,
                7,
                12,
                0,
                0,
                TimeSpan.Zero);

            var repository =
                new TestDeliveryRushRunRepository();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var simulator = new DeliveryRushSimulator();

            var timeProvider =
                new TestTimeProvider(currentTime);

            var seedGenerator =
                new TestDeliveryRushSeedGenerator(123456);

            var service = new DeliveryRushService(
                repository,
                unitOfWork,
                currentUser,
                simulator,
                timeProvider,
                seedGenerator);

            await service.StartRunAsync();

            var exception = await Assert.ThrowsAsync<ConflictException>(
                () => service.StartRunAsync());

            Assert.Equal(
                "Već imate aktivnu Delivery Rush partiju.",
                exception.Message);

            Assert.Single(repository.Runs);

            Assert.Equal(
                1,
                unitOfWork.SaveChangesCallCount);
        }

        [Theory]
        [InlineData(AppRoles.Admin)]
        [InlineData(AppRoles.Employee)]
        [InlineData(AppRoles.Courier)]
        public async Task StartRunAsync_ForStaffRole_ThrowsForbiddenException(
            string staffRole)
        {
            var repository =
                new TestDeliveryRushRunRepository();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer,
                staffRole);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser);

            var exception = await Assert.ThrowsAsync<ForbiddenException>(
                () => service.StartRunAsync());

            Assert.Equal(
                "Samo Customer korisnici mogu igrati rangiranu partiju.",
                exception.Message);

            Assert.Empty(repository.Runs);
            Assert.Equal(0, unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task StartRunAsync_ForAnonymousUser_ThrowsForbiddenException()
        {
            var repository =
                new TestDeliveryRushRunRepository();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: null,
                isAuthenticated: false);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser);

            var exception = await Assert.ThrowsAsync<ForbiddenException>(
                () => service.StartRunAsync());

            Assert.Equal(
                "Samo Customer korisnici mogu igrati rangiranu partiju.",
                exception.Message);

            Assert.Empty(repository.Runs);
            Assert.Equal(0, unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task FinishRunAsync_WhenRunIsFinishedTooEarly_ThrowsBadRequestException()
        {
            var currentTime = new DateTimeOffset(
                2026,
                8,
                7,
                12,
                0,
                0,
                TimeSpan.Zero);

            var repository =
                new TestDeliveryRushRunRepository();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var timeProvider =
                new TestTimeProvider(currentTime);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser,
                timeProvider);

            var startedRun = await service.StartRunAsync();

            timeProvider.Advance(TimeSpan.FromSeconds(1));

            var request = new FinishDeliveryRushRunRequestDto
            {
                Inputs = new List<DeliveryRushInputDto>()
            };

            var exception = await Assert.ThrowsAsync<BadRequestException>(
                () => service.FinishRunAsync(
                    startedRun.RunId,
                    request));

            Assert.Equal(
                "Partija još uvek nije završena.",
                exception.Message);

            var savedRun = Assert.Single(repository.Runs);

            Assert.Equal(
                DeliveryRushRunStatus.Started,
                savedRun.Status);

            Assert.Null(savedRun.FinishedAtUtc);

            Assert.Equal(
                1,
                unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task FinishRunAsync_WhenRunHasExpired_MarksRunAsExpired()
        {
            var currentTime = new DateTimeOffset(
                2026,
                8,
                7,
                12,
                0,
                0,
                TimeSpan.Zero);

            var repository =
                new TestDeliveryRushRunRepository();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var timeProvider =
                new TestTimeProvider(currentTime);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser,
                timeProvider);

            var startedRun = await service.StartRunAsync();

            var elapsedTime = TimeSpan.FromSeconds(
                DeliveryRushGameRules.DurationSeconds +
                DeliveryRushGameRules.ExpirationGraceSeconds +
                1);

            timeProvider.Advance(elapsedTime);

            var request = new FinishDeliveryRushRunRequestDto
            {
                Inputs = new List<DeliveryRushInputDto>()
            };

            var exception = await Assert.ThrowsAsync<BadRequestException>(
                () => service.FinishRunAsync(
                    startedRun.RunId,
                    request));

            Assert.Equal(
                "Vreme za slanje rezultata je isteklo.",
                exception.Message);

            var savedRun = Assert.Single(repository.Runs);

            Assert.Equal(
                DeliveryRushRunStatus.Expired,
                savedRun.Status);

            Assert.Equal(
                currentTime.Add(elapsedTime),
                savedRun.FinishedAtUtc);

            Assert.Equal(
                2,
                unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task FinishRunAsync_WithInvalidInput_MarksRunAsRejected()
        {
            var currentTime = new DateTimeOffset(
                2026,
                8,
                7,
                12,
                0,
                0,
                TimeSpan.Zero);

            var repository =
                new TestDeliveryRushRunRepository();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var timeProvider =
                new TestTimeProvider(currentTime);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser,
                timeProvider);

            var startedRun = await service.StartRunAsync();

            timeProvider.Advance(
                TimeSpan.FromSeconds(
                    DeliveryRushGameRules.DurationSeconds));

            var request = new FinishDeliveryRushRunRequestDto
            {
                Inputs = new List<DeliveryRushInputDto>
        {
            new DeliveryRushInputDto
            {
                Tick = 0,
                Direction = 0
            }
        }
            };

            var exception = await Assert.ThrowsAsync<BadRequestException>(
                () => service.FinishRunAsync(
                    startedRun.RunId,
                    request));

            Assert.Equal(
                "Poslate komande partije nisu ispravne.",
                exception.Message);

            var savedRun = Assert.Single(repository.Runs);

            Assert.Equal(
                DeliveryRushRunStatus.Rejected,
                savedRun.Status);

            Assert.Equal(
                currentTime.AddSeconds(
                    DeliveryRushGameRules.DurationSeconds),
                savedRun.FinishedAtUtc);

            Assert.Null(savedRun.Score);
            Assert.Null(savedRun.Distance);
            Assert.Null(savedRun.AvoidedObstacles);
            Assert.Null(savedRun.CollisionCount);
            Assert.Null(savedRun.MaxCombo);

            Assert.Equal(
                2,
                unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task FinishRunAsync_WithValidInputs_CompletesRunAndReturnsResult()
        {
            var currentTime = new DateTimeOffset(
                2026,
                8,
                7,
                12,
                0,
                0,
                TimeSpan.Zero);

            var repository =
                new TestDeliveryRushRunRepository();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var timeProvider =
                new TestTimeProvider(currentTime);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser,
                timeProvider);

            var startedRun = await service.StartRunAsync();

            timeProvider.Advance(
                TimeSpan.FromSeconds(
                    DeliveryRushGameRules.DurationSeconds));

            var request = new FinishDeliveryRushRunRequestDto
            {
                Inputs = new List<DeliveryRushInputDto>()
            };

            var result = await service.FinishRunAsync(
                startedRun.RunId,
                request);

            var savedRun = Assert.Single(repository.Runs);

            Assert.Equal(
                DeliveryRushRunStatus.Completed,
                savedRun.Status);

            Assert.Equal(341, savedRun.Score);
            Assert.Equal(431, savedRun.Distance);
            Assert.Equal(2, savedRun.AvoidedObstacles);
            Assert.Equal(3, savedRun.CollisionCount);
            Assert.Equal(2, savedRun.MaxCombo);

            Assert.Equal(
                currentTime.AddSeconds(
                    DeliveryRushGameRules.DurationSeconds),
                savedRun.FinishedAtUtc);

            Assert.Equal(341, result.Score);
            Assert.Equal(431, result.Distance);
            Assert.Equal(2, result.AvoidedObstacles);
            Assert.Equal(3, result.CollisionCount);
            Assert.Equal(2, result.MaxCombo);

            Assert.True(result.IsPersonalBest);
            Assert.Equal(1, result.WeeklyRank);

            Assert.Equal(
                currentTime.AddSeconds(
                    DeliveryRushGameRules.DurationSeconds),
                result.FinishedAtUtc);

            Assert.Equal(
                2,
                unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task FinishRunAsync_WithLowerScore_IsNotPersonalBest()
        {
            var currentTime = new DateTimeOffset(
                2026,
                8,
                7,
                12,
                0,
                0,
                TimeSpan.Zero);

            var weekStartDate = new DateOnly(
                2026,
                8,
                3);

            var repository =
                new TestDeliveryRushRunRepository();

            repository.Runs.Add(new DeliveryRushRun
            {
                Id = 100,
                UserId = 15,
                Seed = 999999,
                GameVersion = DeliveryRushGameRules.GameVersion,
                Status = DeliveryRushRunStatus.Completed,
                StartedAtUtc = currentTime.AddDays(-1),

                ExpiresAtUtc = currentTime.AddDays(-1)
                    .AddSeconds(
                        DeliveryRushGameRules.DurationSeconds +
                        DeliveryRushGameRules.ExpirationGraceSeconds),

                                FinishedAtUtc = currentTime.AddDays(-1)
                    .AddSeconds(
                        DeliveryRushGameRules.DurationSeconds),
                WeekStartDate = weekStartDate,
                Score = 5000,
                Distance = 4500,
                AvoidedObstacles = 30,
                CollisionCount = 10,
                MaxCombo = 12
            });

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var timeProvider =
                new TestTimeProvider(currentTime);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser,
                timeProvider);

            var startedRun = await service.StartRunAsync();

            timeProvider.Advance(
                TimeSpan.FromSeconds(
                    DeliveryRushGameRules.DurationSeconds));

            var request = new FinishDeliveryRushRunRequestDto
            {
                Inputs = new List<DeliveryRushInputDto>()
            };

            var result = await service.FinishRunAsync(
                startedRun.RunId,
                request);

            Assert.Equal(341, result.Score);
            Assert.False(result.IsPersonalBest);
            Assert.Equal(1, result.WeeklyRank);

            var finishedRun = repository.Runs.Single(
                x => x.Id == startedRun.RunId);

            Assert.Equal(
                DeliveryRushRunStatus.Completed,
                finishedRun.Status);

            Assert.Equal(341, finishedRun.Score);

            var bestRuns =
                await repository.GetWeeklyBestRunsAsync(
                    weekStartDate,
                    10);

            var bestRun = Assert.Single(bestRuns);

            Assert.Equal(100, bestRun.Id);
            Assert.Equal(5000, bestRun.Score);

            Assert.Equal(2, repository.Runs.Count);

            Assert.Equal(
                2,
                unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task GetCurrentLeaderboardAsync_ReturnsBestRunsInCorrectOrder()
        {
            var weekStartDate = new DateOnly(
                2026,
                8,
                3);

            var repository =
                new TestDeliveryRushRunRepository();

            repository.Runs.AddRange(
                CreateCompletedRun(
                    id: 1,
                    userId: 15,
                    score: 4200,
                    weekStartDate,
                    firstName: "Aleksandar",
                    lastName: "Zorkic"),

                CreateCompletedRun(
                    id: 2,
                    userId: 15,
                    score: 4500,
                    weekStartDate,
                    firstName: "Aleksandar",
                    lastName: "Zorkic"),

                CreateCompletedRun(
                    id: 3,
                    userId: 20,
                    score: 5200,
                    weekStartDate,
                    firstName: "Ana",
                    lastName: "Petrovic"),

                CreateCompletedRun(
                    id: 4,
                    userId: 30,
                    score: 4800,
                    weekStartDate,
                    firstName: "Marko",
                    lastName: "Jovanovic"),

                CreateCompletedRun(
                    id: 5,
                    userId: 40,
                    score: 9000,
                    weekStartDate.AddDays(-7),
                    firstName: "Stari",
                    lastName: "Rezultat"));

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser);

            var result =
                await service.GetCurrentLeaderboardAsync();

            Assert.Equal(
                new DateOnly(2026, 8, 3),
                result.WeekStartDate);

            Assert.Equal(
                new DateOnly(2026, 8, 9),
                result.WeekEndDate);

            Assert.Collection(
                result.Entries,
                first =>
                {
                    Assert.Equal(1, first.Rank);
                    Assert.Equal("Ana P.", first.PlayerName);
                    Assert.Equal(5200, first.Score);
                    Assert.False(first.IsCurrentUser);
                },
                second =>
                {
                    Assert.Equal(2, second.Rank);
                    Assert.Equal("Marko J.", second.PlayerName);
                    Assert.Equal(4800, second.Score);
                    Assert.False(second.IsCurrentUser);
                },
                third =>
                {
                    Assert.Equal(3, third.Rank);
                    Assert.Equal("Aleksandar Z.", third.PlayerName);
                    Assert.Equal(4500, third.Score);
                    Assert.True(third.IsCurrentUser);
                });

            Assert.Equal(
                0,
                unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task FinishRunAsync_WhenRunDoesNotExist_ThrowsNotFoundException()
        {
            var repository =
                new TestDeliveryRushRunRepository();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser);

            var request = new FinishDeliveryRushRunRequestDto
            {
                Inputs = new List<DeliveryRushInputDto>()
            };

            var exception = await Assert.ThrowsAsync<NotFoundException>(
                () => service.FinishRunAsync(
                    runId: 999,
                    data: request));

            Assert.Equal(
                "Delivery Rush partija nije pronađena.",
                exception.Message);

            Assert.Empty(repository.Runs);

            Assert.Equal(
                0,
                unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task FinishRunAsync_WhenGameVersionChanged_RejectsRun()
        {
            var currentTime = new DateTimeOffset(
                2026,
                8,
                7,
                12,
                0,
                0,
                TimeSpan.Zero);

            var repository =
                new TestDeliveryRushRunRepository();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var timeProvider =
                new TestTimeProvider(currentTime);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser,
                timeProvider);

            var startedRun = await service.StartRunAsync();

            var savedRun = Assert.Single(repository.Runs);

            savedRun.GameVersion = "0.9.0";

            timeProvider.Advance(
                TimeSpan.FromSeconds(
                    DeliveryRushGameRules.DurationSeconds));

            var request = new FinishDeliveryRushRunRequestDto
            {
                Inputs = new List<DeliveryRushInputDto>()
            };

            var exception = await Assert.ThrowsAsync<ConflictException>(
                () => service.FinishRunAsync(
                    startedRun.RunId,
                    request));

            Assert.Equal(
                "Verzija igrice je promenjena. Pokrenite novu partiju.",
                exception.Message);

            Assert.Equal(
                DeliveryRushRunStatus.Rejected,
                savedRun.Status);

            Assert.Equal(
                currentTime.AddSeconds(
                    DeliveryRushGameRules.DurationSeconds),
                savedRun.FinishedAtUtc);

            Assert.Null(savedRun.Score);

            Assert.Equal(
                2,
                unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task FinishRunAsync_WhenCalledTwice_ReturnsStoredResult()
        {
            var currentTime = new DateTimeOffset(
                2026,
                8,
                7,
                12,
                0,
                0,
                TimeSpan.Zero);

            var repository =
                new TestDeliveryRushRunRepository();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var timeProvider =
                new TestTimeProvider(currentTime);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser,
                timeProvider);

            var startedRun = await service.StartRunAsync();

            timeProvider.Advance(
                TimeSpan.FromSeconds(
                    DeliveryRushGameRules.DurationSeconds));

            var request = new FinishDeliveryRushRunRequestDto
            {
                Inputs = new List<DeliveryRushInputDto>()
            };

            var firstResult = await service.FinishRunAsync(
                startedRun.RunId,
                request);

            var secondResult = await service.FinishRunAsync(
                startedRun.RunId,
                request);

            Assert.Equal(firstResult.RunId, secondResult.RunId);
            Assert.Equal(firstResult.Score, secondResult.Score);
            Assert.Equal(firstResult.Distance, secondResult.Distance);

            Assert.Equal(
                firstResult.AvoidedObstacles,
                secondResult.AvoidedObstacles);

            Assert.Equal(
                firstResult.CollisionCount,
                secondResult.CollisionCount);

            Assert.Equal(
                firstResult.MaxCombo,
                secondResult.MaxCombo);

            Assert.Equal(
                firstResult.IsPersonalBest,
                secondResult.IsPersonalBest);

            Assert.Equal(
                firstResult.WeeklyRank,
                secondResult.WeeklyRank);

            Assert.Equal(
                firstResult.FinishedAtUtc,
                secondResult.FinishedAtUtc);

            var savedRun = Assert.Single(repository.Runs);

            Assert.Equal(
                DeliveryRushRunStatus.Completed,
                savedRun.Status);

            Assert.Equal(
                2,
                unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task StartRunAsync_WhenPreviousRunExpired_ExpiresOldRunAndCreatesNewRun()
        {
            var currentTime = new DateTimeOffset(
                2026,
                8,
                7,
                12,
                0,
                0,
                TimeSpan.Zero);

            var repository =
                new TestDeliveryRushRunRepository();

            var expiredAtUtc = currentTime.AddSeconds(-1);

            repository.Runs.Add(new DeliveryRushRun
            {
                Id = 100,
                UserId = 15,
                Seed = 999999,
                GameVersion = DeliveryRushGameRules.GameVersion,
                Status = DeliveryRushRunStatus.Started,
                StartedAtUtc = currentTime.AddMinutes(-2),
                ExpiresAtUtc = expiredAtUtc,
                WeekStartDate = new DateOnly(2026, 8, 3)
            });

            var oldRun = repository.Runs.Single();

            var unitOfWork = new TestUnitOfWork();

            var currentUser = new TestCurrentUserService(
                userId: 15,
                isAuthenticated: true,
                AppRoles.Customer);

            var timeProvider =
                new TestTimeProvider(currentTime);

            var service = CreateService(
                repository,
                unitOfWork,
                currentUser,
                timeProvider);

            var result = await service.StartRunAsync();

            Assert.Equal(
                DeliveryRushRunStatus.Expired,
                oldRun.Status);

            Assert.Equal(
                expiredAtUtc,
                oldRun.FinishedAtUtc);

            Assert.Equal(2, repository.Runs.Count);

            var newRun = repository.Runs.Single(
                x => x.Id == result.RunId);

            Assert.NotSame(oldRun, newRun);

            Assert.Equal(
                DeliveryRushRunStatus.Started,
                newRun.Status);

            Assert.Equal(15, newRun.UserId);
            Assert.Equal(123456, newRun.Seed);
            Assert.Equal(currentTime, newRun.StartedAtUtc);

            Assert.Equal(
                currentTime.AddSeconds(
                    DeliveryRushGameRules.DurationSeconds +
                    DeliveryRushGameRules.ExpirationGraceSeconds),
                newRun.ExpiresAtUtc);

            Assert.Equal(
                2,
                unitOfWork.SaveChangesCallCount);
        }

        private static DeliveryRushService CreateService(
            TestDeliveryRushRunRepository repository,
            TestUnitOfWork unitOfWork,
            TestCurrentUserService currentUser,
            TestTimeProvider? timeProvider = null)
        {
            var defaultTime = new DateTimeOffset(
                2026,
                8,
                7,
                12,
                0,
                0,
                TimeSpan.Zero);

            timeProvider ??= new TestTimeProvider(defaultTime);

            return new DeliveryRushService(
                repository,
                unitOfWork,
                currentUser,
                new DeliveryRushSimulator(),
                timeProvider,
                new TestDeliveryRushSeedGenerator(123456));
        }

        private static DeliveryRushRun CreateCompletedRun(
            int id,
            int userId,
            int score,
            DateOnly weekStartDate,
            string firstName,
            string lastName)
        {
            var finishedAtUtc = new DateTimeOffset(
                2026,
                8,
                7,
                11,
                0,
                0,
                TimeSpan.Zero);

            return new DeliveryRushRun
            {
                Id = id,
                UserId = userId,
                User = new User
                {
                    Id = userId,
                    FirstName = firstName,
                    LastName = lastName,
                    UserName = $"test-user-{userId}"
                },
                Seed = 123456,
                GameVersion = DeliveryRushGameRules.GameVersion,
                Status = DeliveryRushRunStatus.Completed,
                StartedAtUtc = finishedAtUtc.AddSeconds(
                    -DeliveryRushGameRules.DurationSeconds),

                                ExpiresAtUtc = finishedAtUtc.AddSeconds(
                    DeliveryRushGameRules.ExpirationGraceSeconds),
                FinishedAtUtc = finishedAtUtc,
                WeekStartDate = weekStartDate,
                Score = score,
                Distance = score - 500,
                AvoidedObstacles = 25,
                CollisionCount = 10,
                MaxCombo = 8
            };
        }

        [Fact]
        public async Task CancelRunAsync_WhenRunIsActive_MarksItAsCancelled()
        {
            var nowUtc = new DateTimeOffset(
                2026,
                8,
                10,
                10,
                0,
                0,
                TimeSpan.Zero);

            var repository = new TestDeliveryRushRunRepository();
            var unitOfWork = new TestUnitOfWork();

            var run = new DeliveryRushRun
            {
                Id = 25,
                UserId = 15,
                Status = DeliveryRushRunStatus.Started,
                StartedAtUtc = nowUtc.AddSeconds(-30),
                ExpiresAtUtc = nowUtc.AddSeconds(30),
                WeekStartDate = new DateOnly(2026, 8, 10)
            };

            repository.Runs.Add(run);

            var service = CreateCancellationTestService(
                repository,
                unitOfWork,
                nowUtc);

            await service.CancelRunAsync(run.Id);

            Assert.Equal(
                DeliveryRushRunStatus.Cancelled,
                run.Status);

            Assert.Equal(nowUtc, run.FinishedAtUtc);
            Assert.Equal(1, unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task CancelRunAsync_WhenRunHasExpired_MarksItAsExpired()
        {
            var nowUtc = new DateTimeOffset(
                2026,
                8,
                10,
                10,
                0,
                0,
                TimeSpan.Zero);

            var expiresAtUtc = nowUtc.AddSeconds(-1);

            var repository = new TestDeliveryRushRunRepository();
            var unitOfWork = new TestUnitOfWork();

            var run = new DeliveryRushRun
            {
                Id = 26,
                UserId = 15,
                Status = DeliveryRushRunStatus.Started,
                StartedAtUtc = nowUtc.AddMinutes(-2),
                ExpiresAtUtc = expiresAtUtc,
                WeekStartDate = new DateOnly(2026, 8, 10)
            };

            repository.Runs.Add(run);

            var service = CreateCancellationTestService(
                repository,
                unitOfWork,
                nowUtc);

            await service.CancelRunAsync(run.Id);

            Assert.Equal(
                DeliveryRushRunStatus.Expired,
                run.Status);

            Assert.Equal(expiresAtUtc, run.FinishedAtUtc);
            Assert.Equal(1, unitOfWork.SaveChangesCallCount);
        }

        [Theory]
        [InlineData(DeliveryRushRunStatus.Completed)]
        [InlineData(DeliveryRushRunStatus.Expired)]
        [InlineData(DeliveryRushRunStatus.Rejected)]
        [InlineData(DeliveryRushRunStatus.Cancelled)]
        public async Task CancelRunAsync_WhenRunIsNotStarted_DoesNotModifyIt(
    DeliveryRushRunStatus status)
        {
            var nowUtc = new DateTimeOffset(
                2026,
                8,
                10,
                10,
                0,
                0,
                TimeSpan.Zero);

            var originalFinishedAtUtc = nowUtc.AddSeconds(-10);

            var repository = new TestDeliveryRushRunRepository();
            var unitOfWork = new TestUnitOfWork();

            var run = new DeliveryRushRun
            {
                Id = 27,
                UserId = 15,
                Status = status,
                StartedAtUtc = nowUtc.AddMinutes(-2),
                ExpiresAtUtc = nowUtc.AddMinutes(-1),
                FinishedAtUtc = originalFinishedAtUtc,
                WeekStartDate = new DateOnly(2026, 8, 10)
            };

            repository.Runs.Add(run);

            var service = CreateCancellationTestService(
                repository,
                unitOfWork,
                nowUtc);

            await service.CancelRunAsync(run.Id);

            Assert.Equal(status, run.Status);
            Assert.Equal(originalFinishedAtUtc, run.FinishedAtUtc);
            Assert.Equal(0, unitOfWork.SaveChangesCallCount);
        }

        [Fact]
        public async Task CancelRunAsync_WhenRunDoesNotExist_ThrowsNotFoundException()
        {
            var nowUtc = new DateTimeOffset(
                2026,
                8,
                10,
                10,
                0,
                0,
                TimeSpan.Zero);

            var repository = new TestDeliveryRushRunRepository();
            var unitOfWork = new TestUnitOfWork();

            var service = CreateCancellationTestService(
                repository,
                unitOfWork,
                nowUtc);

            await Assert.ThrowsAsync<NotFoundException>(
                () => service.CancelRunAsync(999));

            Assert.Equal(0, unitOfWork.SaveChangesCallCount);
        }

        private static DeliveryRushService CreateCancellationTestService(
            TestDeliveryRushRunRepository repository,
            TestUnitOfWork unitOfWork,
            DateTimeOffset nowUtc)
        {
            return new DeliveryRushService(
                repository,
                unitOfWork,
                new TestCurrentUserService(
                    userId: 15,
                    isAuthenticated: true,
                    AppRoles.Customer),
                new DeliveryRushSimulator(),
                new TestTimeProvider(nowUtc),
                new TestDeliveryRushSeedGenerator(123456));
        }
    }
}