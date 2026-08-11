namespace beef_and_chicken.Application.DTOs
{
    public class RestaurantWorkingHourDto
    {
        public DayOfWeek DayOfWeek { get; set; }

        public string DayName { get; set; } = string.Empty;

        public string OpenTime { get; set; } = string.Empty;

        public string CloseTime { get; set; } = string.Empty;

        public bool IsClosed { get; set; }

        public bool ClosesNextDay { get; set; }
    }
}