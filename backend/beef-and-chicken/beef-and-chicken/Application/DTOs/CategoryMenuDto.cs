namespace beef_and_chicken.Application.DTOs
{
    public class CategoryMenuDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int SortOrder { get; set; } = 0;

        public bool AllowsSideDishes { get; set; }

        public bool AllowsSpices { get; set; }

        public bool AllowsSweetAdditions { get; set; }

        public bool AllowsSavoryPancakeAdditions { get; set; }

        public List<DishMenuDto> Dishes { get; set; } = new List<DishMenuDto>();
    }
}