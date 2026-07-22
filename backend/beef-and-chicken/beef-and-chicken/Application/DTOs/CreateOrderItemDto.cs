namespace beef_and_chicken.Application.DTOs
{
    public class CreateOrderItemDto
    {
        public int DishId { get; set; }
        public int Quantity { get; set; }
        public List<int> SelectedOptionIds { get; set; } = new();
    }
}
