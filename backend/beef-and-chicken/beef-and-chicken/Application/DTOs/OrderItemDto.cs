namespace beef_and_chicken.Application.DTOs
{
    public class OrderItemDto
    {
        public int Id { get; set; }
        public int DishId { get; set; }
        public string DishName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }
}
