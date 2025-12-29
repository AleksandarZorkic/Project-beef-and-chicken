using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.DTOs
{
    public class DishMenuDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public List<DishAllergenDto> Allergens { get; set; } = new List<DishAllergenDto>();
    }
}
