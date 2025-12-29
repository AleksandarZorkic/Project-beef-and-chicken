namespace beef_and_chicken.Domain.Entities
{
    public class EmployeeWorkTime
    {
        public int Id { get; set; }
        public User User { get; set; } = null!;
        public int UserId { get; set; }
        public DayOfWeek DayOfWeek { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public bool IsOffDay { get; set; } = false;
    }
}
