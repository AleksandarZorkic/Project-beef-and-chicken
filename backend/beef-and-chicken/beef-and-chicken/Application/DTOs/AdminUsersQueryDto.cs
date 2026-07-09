namespace beef_and_chicken.Application.DTOs
{
    public class AdminUsersQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? Search {  get; set; }

        // all, staff, customers
        public string? Group { get; set; } = "all";

        //all, active, blocked, anonymized
        public string? Status { get; set; } = "all";
    }
}
