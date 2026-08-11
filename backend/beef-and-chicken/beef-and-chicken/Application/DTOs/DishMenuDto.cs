namespace beef_and_chicken.Application.DTOs
{
    public class DishMenuDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public decimal Price { get; set; }

        public bool IsOnSale { get; set; }

        public decimal? SalePrice { get; set; }

        public decimal EffectivePrice { get; set; }

        public string? ImageUrl { get; set; }

        public bool IsRecommended { get; set; }

        public int RecommendedSortOrder { get; set; }

        public int CategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        public bool AllowsSideDishes { get; set; }

        public bool AllowsSpices { get; set; }

        public bool AllowsSweetAdditions { get; set; }

        public List<DishAllergenDto> Allergens { get; set; } = new();
    }
}