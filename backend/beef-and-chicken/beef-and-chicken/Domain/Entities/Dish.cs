namespace beef_and_chicken.Domain.Entities
{
    public class Dish
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string?  Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public bool IsOnSale { get; set; } = false;
        public decimal? SalePrice { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsRecommended { get; set; } = false;
        public int RecommendedSortOrder { get; set; } = 0;
        // Da li je jelo dostupno za naručivanje
        public bool IsActive { get; set; } = true;
        // Foreign Keys
        public int CategoryId { get; set; }
        public Category Category { get; set; } = null!;
        // Collections
        public ICollection<DishAllergen> DishAllergens { get; set; } = new List<DishAllergen>();
        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }
}
