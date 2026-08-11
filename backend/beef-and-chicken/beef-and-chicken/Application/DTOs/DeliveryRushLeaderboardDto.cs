namespace beef_and_chicken.Application.DTOs
{
    public class DeliveryRushLeaderboardDto
    {
        public DateOnly WeekStartDate { get; set; }
        public DateOnly WeekEndDate { get; set; }

        public List<DeliveryRushLeaderboardEntryDto> Entries { get; set; }
            = new List<DeliveryRushLeaderboardEntryDto>();
    }
}