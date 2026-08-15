using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Domain.Games.DeliveryRush;

namespace beef_and_chicken.Application.Services
{
    public class DeliveryRushService : IDeliveryRushService
    {
        private static readonly TimeZoneInfo LeaderboardTimeZone =
            CreateLeaderboardTimeZone();

        private readonly IDeliveryRushRunRepository _runRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentUserService _currentUserService;
        private readonly DeliveryRushSimulator _simulator;
        private readonly TimeProvider _timeProvider;
        private readonly IDeliveryRushSeedGenerator _seedGenerator;

        public DeliveryRushService(
            IDeliveryRushRunRepository runRepository,
            IUnitOfWork unitOfWork,
            ICurrentUserService currentUserService,
            DeliveryRushSimulator simulator,
            TimeProvider timeProvider,
            IDeliveryRushSeedGenerator seedGenerator)
        {
            _runRepository = runRepository;
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
            _simulator = simulator;
            _timeProvider = timeProvider;
            _seedGenerator = seedGenerator;
        }

        public async Task<StartDeliveryRushRunResponseDto> StartRunAsync(
            CancellationToken ct = default)
        {
            var userId = GetEligibleCustomerUserId();
            var nowUtc = _timeProvider.GetUtcNow();

            var expiredRunCount =
                await _runRepository.ExpireStartedRunsAsync(
                    userId,
                    nowUtc,
                    ct);

            if (expiredRunCount > 0)
            {
                await _unitOfWork.SaveChangesAsync(ct);
            }

            var activeRun = await _runRepository.GetActiveForUserAsync(
                userId,
                nowUtc,
                ct);

            if (activeRun != null)
            {
                throw new ConflictException(
                    "Već imate aktivnu Delivery Rush partiju.");
            }

            var seed = _seedGenerator.Generate();

            var run = new DeliveryRushRun
            {
                UserId = userId,
                Seed = seed,
                GameVersion = DeliveryRushGameRules.GameVersion,
                Status = DeliveryRushRunStatus.Started,
                StartedAtUtc = nowUtc,
                ExpiresAtUtc = nowUtc.AddSeconds(
                    DeliveryRushGameRules.DurationSeconds +
                    DeliveryRushGameRules.ExpirationGraceSeconds),
                WeekStartDate = GetWeekStartDate(nowUtc)
            };

            await _runRepository.AddAsync(run, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            return new StartDeliveryRushRunResponseDto
            {
                RunId = run.Id,
                Seed = run.Seed,
                GameVersion = run.GameVersion,
                DurationSeconds =
                    DeliveryRushGameRules.DurationSeconds,
                TickRate = DeliveryRushGameRules.TickRate,
                StartedAtUtc = run.StartedAtUtc,
                ExpiresAtUtc = run.ExpiresAtUtc
            };
        }

        public async Task<DeliveryRushRunResultDto> FinishRunAsync(
            int runId,
            FinishDeliveryRushRunRequestDto data,
            CancellationToken ct = default)
        {
            var userId = GetEligibleCustomerUserId();

            if (data == null)
            {
                throw new BadRequestException(
                    "Podaci o partiji su obavezni.");
            }

            if (data.Inputs == null)
            {
                throw new BadRequestException(
                    "Lista komandi je obavezna.");
            }

            var run = await _runRepository.GetByIdForUserAsync(
                runId,
                userId,
                ct);

            if (run == null)
            {
                throw new NotFoundException(
                    "Delivery Rush partija nije pronađena.");
            }

            if (run.Status == DeliveryRushRunStatus.Completed)
            {
                return await BuildStoredResultAsync(
                    run,
                    ct);
            }

            if (run.Status != DeliveryRushRunStatus.Started)
            {
                throw new ConflictException(
                    "Ova partija više nije aktivna.");
            }

            var nowUtc = _timeProvider.GetUtcNow();

            if (run.GameVersion != DeliveryRushGameRules.GameVersion)
            {
                run.Status = DeliveryRushRunStatus.Rejected;
                run.FinishedAtUtc = nowUtc;

                await _unitOfWork.SaveChangesAsync(ct);

                throw new ConflictException(
                    "Verzija igrice je promenjena. Pokrenite novu partiju.");
            }

            if (nowUtc > run.ExpiresAtUtc)
            {
                run.Status = DeliveryRushRunStatus.Expired;
                run.FinishedAtUtc = nowUtc;

                await _unitOfWork.SaveChangesAsync(ct);

                throw new BadRequestException(
                    "Vreme za slanje rezultata je isteklo.");
            }

            var inputs = data.Inputs
                .Select(x => new DeliveryRushInput(
                    x.Tick,
                    x.Action,
                    x.Direction))
                .ToList();

            DeliveryRushSimulationResult simulation;

            try
            {
                simulation = _simulator.Simulate(
                    run.Seed,
                    inputs);
            }
            catch (ArgumentException)
            {
                run.Status = DeliveryRushRunStatus.Rejected;
                run.FinishedAtUtc = nowUtc;

                await _unitOfWork.SaveChangesAsync(ct);

                throw new BadRequestException(
                    "Poslate komande partije nisu ispravne.");
            }

            var simulatedDurationSeconds =
                simulation.CompletedTicks /
                (double)DeliveryRushGameRules.TickRate;

            var earliestFinishUtc =
                run.StartedAtUtc.AddSeconds(
                    Math.Max(
                        0,
                        simulatedDurationSeconds -
                        DeliveryRushGameRules.FinishToleranceSeconds));

            if (nowUtc < earliestFinishUtc)
            {
                throw new BadRequestException(
                    "Partija još uvek nije završena.");
            }

            var previousBestScore =
                await _runRepository.GetPersonalBestScoreAsync(
                    userId,
                    run.WeekStartDate,
                    ct);

            run.Status = DeliveryRushRunStatus.Completed;
            run.FinishedAtUtc = nowUtc;
            run.Score = simulation.Score;
            run.Distance = simulation.Distance;
            run.AvoidedObstacles =
                simulation.AvoidedObstacles;
            run.CollisionCount =
                simulation.CollisionCount;
            run.MaxCombo = simulation.MaxCombo;

            await _unitOfWork.SaveChangesAsync(ct);

            var weeklyRank =
                await _runRepository.GetWeeklyRankAsync(
                    userId,
                    run.WeekStartDate,
                    ct);

            return new DeliveryRushRunResultDto
            {
                RunId = run.Id,
                Score = simulation.Score,
                Distance = simulation.Distance,
                AvoidedObstacles =
                    simulation.AvoidedObstacles,
                CollisionCount =
                    simulation.CollisionCount,
                MaxCombo = simulation.MaxCombo,
                IsPersonalBest =
                    !previousBestScore.HasValue ||
                    simulation.Score >= previousBestScore.Value,
                WeeklyRank = weeklyRank,
                FinishedAtUtc = nowUtc
            };
        }

        public async Task CancelRunAsync(
            int runId,
            CancellationToken ct = default)
        {
            var userId = GetEligibleCustomerUserId();

            var run = await _runRepository.GetByIdForUserAsync(
                runId,
                userId,
                ct);

            if (run == null)
            {
                throw new NotFoundException(
                    "Delivery Rush partija nije pronađena.");
            }

            if (run.Status != DeliveryRushRunStatus.Started)
            {
                return;
            }

            var nowUtc = _timeProvider.GetUtcNow();

            if (run.ExpiresAtUtc <= nowUtc)
            {
                run.Status = DeliveryRushRunStatus.Expired;
                run.FinishedAtUtc ??= run.ExpiresAtUtc;
            }
            else
            {
                run.Status = DeliveryRushRunStatus.Cancelled;
                run.FinishedAtUtc = nowUtc;
            }

            await _unitOfWork.SaveChangesAsync(ct);
        }

        public async Task<DeliveryRushLeaderboardDto>
            GetCurrentLeaderboardAsync(
                CancellationToken ct = default)
        {
            var nowUtc = _timeProvider.GetUtcNow();
            var weekStartDate = GetWeekStartDate(nowUtc);

            var runs = await _runRepository.GetWeeklyBestRunsAsync(
                weekStartDate,
                DeliveryRushGameRules.LeaderboardSize,
                ct);

            int? currentUserId = null;

            if (IsEligibleCustomer())
            {
                currentUserId = _currentUserService.UserId;
            }

            var entries = runs
                .Select((run, index) =>
                    new DeliveryRushLeaderboardEntryDto
                    {
                        Rank = index + 1,
                        PlayerName = BuildPlayerName(run.User),
                        Score = run.Score ?? 0,
                        Distance = run.Distance ?? 0,
                        AvoidedObstacles =
                            run.AvoidedObstacles ?? 0,
                        CollisionCount =
                            run.CollisionCount ?? 0,
                        MaxCombo = run.MaxCombo ?? 0,
                        IsCurrentUser =
                            currentUserId == run.UserId,
                        AchievedAtUtc =
                            run.FinishedAtUtc ??
                            run.StartedAtUtc
                    })
                .ToList();

            return new DeliveryRushLeaderboardDto
            {
                WeekStartDate = weekStartDate,
                WeekEndDate = weekStartDate.AddDays(6),
                Entries = entries
            };
        }

        private async Task<DeliveryRushRunResultDto>
            BuildStoredResultAsync(
                DeliveryRushRun run,
                CancellationToken ct)
        {
            if (!run.Score.HasValue ||
                !run.Distance.HasValue ||
                !run.AvoidedObstacles.HasValue ||
                !run.CollisionCount.HasValue ||
                !run.MaxCombo.HasValue ||
                !run.FinishedAtUtc.HasValue)
            {
                throw new ConflictException(
                    "Sačuvani rezultat partije nije potpun.");
            }

            var personalBestScore =
                await _runRepository.GetPersonalBestScoreAsync(
                    run.UserId,
                    run.WeekStartDate,
                    ct);

            var weeklyRank =
                await _runRepository.GetWeeklyRankAsync(
                    run.UserId,
                    run.WeekStartDate,
                    ct);

            return new DeliveryRushRunResultDto
            {
                RunId = run.Id,
                Score = run.Score.Value,
                Distance = run.Distance.Value,
                AvoidedObstacles =
                    run.AvoidedObstacles.Value,
                CollisionCount =
                    run.CollisionCount.Value,
                MaxCombo = run.MaxCombo.Value,
                IsPersonalBest =
                    personalBestScore.HasValue &&
                    run.Score.Value == personalBestScore.Value,
                WeeklyRank = weeklyRank,
                FinishedAtUtc = run.FinishedAtUtc.Value
            };
        }

        private int GetEligibleCustomerUserId()
        {
            if (!IsEligibleCustomer() ||
                !_currentUserService.UserId.HasValue)
            {
                throw new ForbiddenException(
                    "Samo Customer korisnici mogu igrati rangiranu partiju.");
            }

            return _currentUserService.UserId.Value;
        } 

        private bool IsEligibleCustomer()
        {
            return
                _currentUserService.IsAuthenticated &&
                _currentUserService.IsInRole(AppRoles.Customer) &&
                !_currentUserService.IsInRole(AppRoles.Admin) &&
                !_currentUserService.IsInRole(AppRoles.Employee) &&
                !_currentUserService.IsInRole(AppRoles.Courier);
        }

        private static DateOnly GetWeekStartDate(
            DateTimeOffset utcDateTime)
        {
            var localDateTime = TimeZoneInfo.ConvertTime(
                utcDateTime,
                LeaderboardTimeZone);

            var date = DateOnly.FromDateTime(
                localDateTime.DateTime);

            var daysSinceMonday =
                ((int)date.DayOfWeek -
                 (int)DayOfWeek.Monday + 7) % 7;

            return date.AddDays(-daysSinceMonday);
        }

        private static string BuildPlayerName(User user)
        {
            var firstName = user.FirstName.Trim();

            if (string.IsNullOrWhiteSpace(firstName))
            {
                firstName = "Igrač";
            }

            if (string.IsNullOrWhiteSpace(user.LastName))
            {
                return firstName;
            }

            var lastNameInitial = char.ToUpperInvariant(
                user.LastName.Trim()[0]);

            return $"{firstName} {lastNameInitial}.";
        }

        private static TimeZoneInfo CreateLeaderboardTimeZone()
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(
                    "Europe/Belgrade");
            }
            catch (TimeZoneNotFoundException)
            {
                return TimeZoneInfo.FindSystemTimeZoneById(
                    "Central Europe Standard Time");
            }
        }
    }
}