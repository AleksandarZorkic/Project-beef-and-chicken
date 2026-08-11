namespace beef_and_chicken.Application.DTOs
{
    public class HomepageDishDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public decimal Price { get; set; }

        public bool IsOnSale { get; set; }

        public decimal? SalePrice { get; set; }

        public decimal EffectivePrice { get; set; }

        public string? ImageUrl { get; set; }

        public int CategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        public int? SoldQuantity { get; set; }
    }
}