namespace beef_and_chicken.Application.DTOs
{
    public class UpdateCategoryDto
    {
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int SortOrder { get; set; } = 0;
    }
}