namespace beef_and_chicken.Domain.Entities
{
    public class Dish
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
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
