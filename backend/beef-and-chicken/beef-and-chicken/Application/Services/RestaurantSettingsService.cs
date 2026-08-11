using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Services
{
    public class RestaurantSettingsService : IRestaurantSettingsService
    {
        private readonly IRestaurantSettingsRepository _repository;
        private readonly IFastFoodWorkTimeRepository _workingHoursRepository;
        private readonly IUnitOfWork _unitOfWork;

        public RestaurantSettingsService(
            IRestaurantSettingsRepository repository,
            IFastFoodWorkTimeRepository workingHoursRepository,
            IUnitOfWork unitOfWork)
        {
            _repository = repository;
            _workingHoursRepository = workingHoursRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<RestaurantSettingsDto> GetAsync(
            CancellationToken ct = default)
        {
            var settings = await _repository.GetAsync(ct)
                ?? RestaurantSettings.CreateDefault();

            var workingHours = await _workingHoursRepository.GetAllAsync(ct);

            if (workingHours.Count == 0)
            {
                workingHours = CreateDefaultWorkingHours();
            }

            return ToDto(settings, workingHours);
        }

        public async Task<RestaurantSettingsDto> UpdateAsync(
            UpdateRestaurantSettingsDto data,
            CancellationToken ct = default)
        {
            if (data == null)
                throw new BadRequestException("Podešavanja restorana su obavezna.");

            ValidateSettings(data);

            var settings = await _repository.GetForUpdateAsync(ct);

            if (settings == null)
            {
                settings = RestaurantSettings.CreateDefault();

                await _repository.AddAsync(settings, ct);
            }

            settings.MinimumOrderAmount = data.MinimumOrderAmount;
            settings.DeliveryFee = data.DeliveryFee;
            settings.FreeDeliveryThreshold = data.FreeDeliveryThreshold;
            settings.IsDeliveryEnabled = data.IsDeliveryEnabled;
            settings.UpdatedAt = DateTime.UtcNow;

            if (data.WorkingHours != null)
            {
                await UpdateWorkingHoursAsync(data.WorkingHours, ct);
            }

            await _unitOfWork.SaveChangesAsync(ct);

            var workingHours = await _workingHoursRepository.GetAllAsync(ct);

            if (workingHours.Count == 0)
            {
                workingHours = CreateDefaultWorkingHours();
            }

            return ToDto(settings, workingHours);
        }

        private async Task UpdateWorkingHoursAsync(
            List<UpdateRestaurantWorkingHourDto> data,
            CancellationToken ct)
        {
            ValidateWorkingHours(data);

            var existingWorkingHours = await _workingHoursRepository.GetAllForUpdateAsync(ct);

            if (existingWorkingHours.Count == 0)
            {
                var newWorkingHours = data
                    .OrderBy(x => x.DayOfWeek)
                    .Select(ToEntity)
                    .ToList();

                await _workingHoursRepository.AddRangeAsync(newWorkingHours, ct);

                return;
            }

            foreach (var item in data)
            {
                var existing = existingWorkingHours
                    .FirstOrDefault(x => x.DayOfWeek == item.DayOfWeek);

                if (existing == null)
                {
                    existingWorkingHours.Add(ToEntity(item));
                    continue;
                }

                var openTime = ParseTime(item.OpenTime, "Vreme otvaranja nije validno.");
                var closeTime = ParseTime(item.CloseTime, "Vreme zatvaranja nije validno.");

                existing.OpenTime = openTime;
                existing.CloseTime = closeTime;
                existing.IsClosed = item.IsClosed;
                existing.ClosesNextDay = item.IsClosed ? false : item.ClosesNextDay;
            }

            var missingDays = Enum.GetValues<DayOfWeek>()
                .Where(day => existingWorkingHours.All(x => x.DayOfWeek != day))
                .Select(day => ToEntity(new UpdateRestaurantWorkingHourDto
                {
                    DayOfWeek = day,
                    OpenTime = "10:00",
                    CloseTime = "23:00",
                    IsClosed = false,
                    ClosesNextDay = false
                }))
                .ToList();

            if (missingDays.Count > 0)
            {
                await _workingHoursRepository.AddRangeAsync(missingDays, ct);
            }
        }

        private static void ValidateSettings(UpdateRestaurantSettingsDto data)
        {
            if (data.MinimumOrderAmount < 0)
                throw new BadRequestException(
                    "Minimalna porudžbina ne može biti negativna."
                );

            if (data.DeliveryFee < 0)
                throw new BadRequestException(
                    "Cena dostave ne može biti negativna."
                );

            if (data.FreeDeliveryThreshold.HasValue &&
                data.FreeDeliveryThreshold.Value <= 0)
            {
                throw new BadRequestException(
                    "Iznos za besplatnu dostavu mora biti veći od 0."
                );
            }

            if (data.FreeDeliveryThreshold.HasValue &&
                data.FreeDeliveryThreshold.Value < data.MinimumOrderAmount)
            {
                throw new BadRequestException(
                    "Iznos za besplatnu dostavu ne treba da bude manji od minimalne porudžbine."
                );
            }
        }

        private static void ValidateWorkingHours(List<UpdateRestaurantWorkingHourDto> data)
        {
            if (data.Count != 7)
            {
                throw new BadRequestException(
                    "Radno vreme mora biti podešeno za svih 7 dana u nedelji."
                );
            }

            var duplicateDays = data
                .GroupBy(x => x.DayOfWeek)
                .Where(group => group.Count() > 1)
                .Select(group => group.Key)
                .ToList();

            if (duplicateDays.Count > 0)
            {
                throw new BadRequestException(
                    "Radno vreme sadrži duplirane dane u nedelji."
                );
            }

            foreach (var item in data)
            {
                if (!Enum.IsDefined(typeof(DayOfWeek), item.DayOfWeek))
                {
                    throw new BadRequestException("Dan u nedelji nije validan.");
                }

                var openTime = ParseTime(item.OpenTime, "Vreme otvaranja nije validno.");
                var closeTime = ParseTime(item.CloseTime, "Vreme zatvaranja nije validno.");

                if (item.IsClosed)
                {
                    continue;
                }

                if (openTime == closeTime)
                {
                    throw new BadRequestException(
                        $"Vreme otvaranja i zatvaranja ne mogu biti ista za {GetDayName(item.DayOfWeek)}."
                    );
                }

                if (!item.ClosesNextDay && openTime > closeTime)
                {
                    throw new BadRequestException(
                        $"Za {GetDayName(item.DayOfWeek)} uključite opciju rada preko ponoći ili promenite vreme zatvaranja."
                    );
                }

                if (item.ClosesNextDay && openTime < closeTime)
                {
                    throw new BadRequestException(
                        $"Za {GetDayName(item.DayOfWeek)} opcija rada preko ponoći nije potrebna."
                    );
                }
            }
        }

        private static TimeOnly ParseTime(string value, string errorMessage)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new BadRequestException(errorMessage);
            }

            if (!TimeOnly.TryParse(value, out var parsedTime))
            {
                throw new BadRequestException(errorMessage);
            }

            return parsedTime;
        }

        private static FastFoodWorkTime ToEntity(UpdateRestaurantWorkingHourDto data)
        {
            var openTime = ParseTime(data.OpenTime, "Vreme otvaranja nije validno.");
            var closeTime = ParseTime(data.CloseTime, "Vreme zatvaranja nije validno.");

            return new FastFoodWorkTime
            {
                DayOfWeek = data.DayOfWeek,
                OpenTime = openTime,
                CloseTime = closeTime,
                IsClosed = data.IsClosed,
                ClosesNextDay = data.IsClosed ? false : data.ClosesNextDay
            };
        }

        private static RestaurantSettingsDto ToDto(
            RestaurantSettings settings,
            List<FastFoodWorkTime> workingHours)
        {
            var orderedWorkingHours = workingHours
                .OrderBy(x => x.DayOfWeek)
                .ToList();

            return new RestaurantSettingsDto
            {
                MinimumOrderAmount = settings.MinimumOrderAmount,
                DeliveryFee = settings.DeliveryFee,
                FreeDeliveryThreshold = settings.FreeDeliveryThreshold,
                IsDeliveryEnabled = settings.IsDeliveryEnabled,
                UpdatedAt = settings.UpdatedAt,
                WorkingHours = orderedWorkingHours
                    .Select(ToWorkingHourDto)
                    .ToList(),
                RestaurantStatus = BuildRestaurantStatus(orderedWorkingHours)
            };
        }

        private static RestaurantWorkingHourDto ToWorkingHourDto(FastFoodWorkTime item)
        {
            return new RestaurantWorkingHourDto
            {
                DayOfWeek = item.DayOfWeek,
                DayName = GetDayName(item.DayOfWeek),
                OpenTime = item.OpenTime.ToString("HH:mm"),
                CloseTime = item.CloseTime.ToString("HH:mm"),
                IsClosed = item.IsClosed,
                ClosesNextDay = item.ClosesNextDay
            };
        }

        private static RestaurantOpenStatusDto BuildRestaurantStatus(
            List<FastFoodWorkTime> workingHours)
        {
            var now = GetRestaurantLocalNow();

            var todayWorkingHour = workingHours
                .FirstOrDefault(x => x.DayOfWeek == now.DayOfWeek);

            var todayWorkingHoursText = todayWorkingHour == null
                ? "Radno vreme nije podešeno."
                : FormatWorkingHours(todayWorkingHour);

            var currentInterval = GetCurrentOpenInterval(workingHours, now);

            if (currentInterval.IsOpen)
            {
                return new RestaurantOpenStatusDto
                {
                    IsOpen = true,
                    CurrentTime = now.ToString("HH:mm"),
                    TodayWorkingHours = todayWorkingHoursText,
                    Message = $"Restoran je trenutno otvoren. Radimo do {currentInterval.ClosesAt!.Value:HH:mm}.",
                    NextOpeningText = null
                };
            }

            var nextOpening = GetNextOpening(workingHours, now);

            if (nextOpening == null)
            {
                return new RestaurantOpenStatusDto
                {
                    IsOpen = false,
                    CurrentTime = now.ToString("HH:mm"),
                    TodayWorkingHours = todayWorkingHoursText,
                    Message = "Restoran je trenutno zatvoren.",
                    NextOpeningText = "Naredno otvaranje nije podešeno."
                };
            }

            var nextOpeningText = FormatNextOpening(now, nextOpening.Value);

            return new RestaurantOpenStatusDto
            {
                IsOpen = false,
                CurrentTime = now.ToString("HH:mm"),
                TodayWorkingHours = todayWorkingHoursText,
                Message = "Restoran je trenutno zatvoren.",
                NextOpeningText = nextOpeningText
            };
        }

        private static (bool IsOpen, DateTime? OpensAt, DateTime? ClosesAt)
            GetCurrentOpenInterval(List<FastFoodWorkTime> workingHours, DateTime now)
        {
            foreach (var dayOffset in new[] { -1, 0 })
            {
                var candidateDate = DateOnly.FromDateTime(now.Date.AddDays(dayOffset));
                var day = candidateDate.DayOfWeek;

                var workingHour = workingHours.FirstOrDefault(x => x.DayOfWeek == day);

                if (workingHour == null || workingHour.IsClosed)
                {
                    continue;
                }

                var opensAt = candidateDate.ToDateTime(workingHour.OpenTime);

                var closesAtDate = workingHour.ClosesNextDay
                    ? candidateDate.AddDays(1)
                    : candidateDate;

                var closesAt = closesAtDate.ToDateTime(workingHour.CloseTime);

                if (now >= opensAt && now < closesAt)
                {
                    return (true, opensAt, closesAt);
                }
            }

            return (false, null, null);
        }

        private static DateTime? GetNextOpening(
            List<FastFoodWorkTime> workingHours,
            DateTime now)
        {
            for (var dayOffset = 0; dayOffset <= 7; dayOffset++)
            {
                var candidateDate = DateOnly.FromDateTime(now.Date.AddDays(dayOffset));
                var day = candidateDate.DayOfWeek;

                var workingHour = workingHours.FirstOrDefault(x => x.DayOfWeek == day);

                if (workingHour == null || workingHour.IsClosed)
                {
                    continue;
                }

                var opensAt = candidateDate.ToDateTime(workingHour.OpenTime);

                if (opensAt > now)
                {
                    return opensAt;
                }
            }

            return null;
        }

        private static string FormatNextOpening(DateTime now, DateTime opensAt)
        {
            var dayDifference = (opensAt.Date - now.Date).Days;

            var dayText = dayDifference switch
            {
                0 => "danas",
                1 => "sutra",
                _ => GetDayName(opensAt.DayOfWeek).ToLower()
            };

            return $"Sledeće otvaranje: {dayText} u {opensAt:HH:mm}.";
        }

        private static string FormatWorkingHours(FastFoodWorkTime workingHour)
        {
            if (workingHour.IsClosed)
            {
                return "Danas ne radimo.";
            }

            var suffix = workingHour.ClosesNextDay ? " sutradan" : string.Empty;

            return $"{workingHour.OpenTime:HH:mm} - {workingHour.CloseTime:HH:mm}{suffix}";
        }

        private static DateTime GetRestaurantLocalNow()
        {
            var utcNow = DateTime.UtcNow;

            try
            {
                var timeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Belgrade");
                return TimeZoneInfo.ConvertTimeFromUtc(utcNow, timeZone);
            }
            catch (TimeZoneNotFoundException)
            {
                var timeZone = TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time");
                return TimeZoneInfo.ConvertTimeFromUtc(utcNow, timeZone);
            }
        }

        private static List<FastFoodWorkTime> CreateDefaultWorkingHours()
        {
            return Enum.GetValues<DayOfWeek>()
                .Select(day => new FastFoodWorkTime
                {
                    DayOfWeek = day,
                    OpenTime = new TimeOnly(10, 0),
                    CloseTime = new TimeOnly(23, 0),
                    IsClosed = false,
                    ClosesNextDay = false
                })
                .ToList();
        }

        private static string GetDayName(DayOfWeek dayOfWeek)
        {
            return dayOfWeek switch
            {
                DayOfWeek.Monday => "Ponedeljak",
                DayOfWeek.Tuesday => "Utorak",
                DayOfWeek.Wednesday => "Sreda",
                DayOfWeek.Thursday => "Četvrtak",
                DayOfWeek.Friday => "Petak",
                DayOfWeek.Saturday => "Subota",
                DayOfWeek.Sunday => "Nedelja",
                _ => "Nepoznat dan"
            };
        }
    }
}