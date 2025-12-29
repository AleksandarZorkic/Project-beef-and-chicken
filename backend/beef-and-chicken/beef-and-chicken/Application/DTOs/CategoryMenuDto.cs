namespace beef_and_chicken.Application.DTOs
{
    public class CategoryMenuDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int SortOrder { get; set; } = 0;
        public List<DishMenuDto> Dishes { get; set; } = new List<DishMenuDto>();
    }
}
