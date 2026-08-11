namespace beef_and_chicken.Application.DTOs
{
    public class RestaurantOpenStatusDto
    {
        public bool IsOpen { get; set; }

        public string Message { get; set; } = string.Empty;

        public string CurrentTime { get; set; } = string.Empty;

        public string TodayWorkingHours { get; set; } = string.Empty;

        public string? NextOpeningText { get; set; }
    }
}