namespace beef_and_chicken.Application.DTOs
{
    public class CategoryDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public bool IsActive { get; set; }

        public int SortOrder { get; set; }

        public bool AllowsSideDishes { get; set; }

        public bool AllowsSpices { get; set; }

        public bool AllowsSweetAdditions { get; set; }

        public int DishCount { get; set; }

        public int ActiveDishCount { get; set; }
    }
}