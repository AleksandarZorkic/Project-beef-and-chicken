namespace beef_and_chicken.Domain.Entities
{
    public class PagedResultDto<T>
    {
        public List<T> Items { get; set; } = new List<T>();
        public int Page {  get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages => PageSize <= 0
            ? 0
            : (int)Math.Ceiling((double)TotalCount / PageSize);
    }
}
