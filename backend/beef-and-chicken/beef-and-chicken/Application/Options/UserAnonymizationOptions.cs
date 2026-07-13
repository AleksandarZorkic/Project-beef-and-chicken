namespace beef_and_chicken.Application.Options
{
    public class UserAnonymizationOptions
    {
        public int BlockedUserRetentionMonths { get; set; } = 12;

        public int CheckIntervalHours { get; set; } = 24;
    }
}