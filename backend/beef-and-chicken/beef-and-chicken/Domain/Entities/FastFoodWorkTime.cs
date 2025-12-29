namespace beef_and_chicken.Domain.Entities
{
    public class FastFoodWorkTime
    {
        public int Id { get; set; }
        public DayOfWeek DayOfWeek { get; set; }

        public TimeOnly OpenTime { get; set; }
        public TimeOnly CloseTime { get; set; }

        public bool IsClosed { get; set; } = false;

        public bool ClosesNextDay { get; set; } = false;
    }
}
