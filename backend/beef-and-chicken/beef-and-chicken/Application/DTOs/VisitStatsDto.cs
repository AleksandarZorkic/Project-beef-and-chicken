namespace beef_and_chicken.Application.DTOs
{
    public class VisitStatsDto
    {
        public int TotalVisitsToday { get; set; }

        public int TotalVisitsLast7Days { get; set; }

        public int UniqueVisitorsLast7Days { get; set; }

        public int AnonymousVisitsLast7Days { get; set; }

        public int CustomerVisitsLast7Days { get; set; }

        public List<DailyVisitStatsDto> DailyVisits { get; set; } = new();

        public List<PathVisitStatsDto> TopPaths { get; set; } = new();
    }

    public class DailyVisitStatsDto
    {
        public DateTime Date { get; set; }

        public int Visits { get; set; }

        public int UniqueVisitors { get; set; }
    }

    public class PathVisitStatsDto
    {
        public string Path { get; set; } = string.Empty;

        public int Visits { get; set; }

        public int UniqueVisitors { get; set; }
    }
}