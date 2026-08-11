namespace beef_and_chicken.Application.DTOs
{
    public class CreateDishDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public bool IsOnSale { get; set; } = false;
        public decimal? SalePrice { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsRecommended { get; set; } = false;
        public int RecommendedSortOrder { get; set; } = 0;
        public int CategoryId { get; set; }
        public List<DishAllergenInputDto> Allergens { get; set; } = new();
    }
}
