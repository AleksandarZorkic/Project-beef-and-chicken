namespace beef_and_chicken.Application.DTOs
{
    public class UpdateRestaurantWorkingHourDto
    {
        public DayOfWeek DayOfWeek { get; set; }

        public string OpenTime { get; set; } = "10:00";

        public string CloseTime { get; set; } = "23:00";

        public bool IsClosed { get; set; }

        public bool ClosesNextDay { get; set; }
    }
}