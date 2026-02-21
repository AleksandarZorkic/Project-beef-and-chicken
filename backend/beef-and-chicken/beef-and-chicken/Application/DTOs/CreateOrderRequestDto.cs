namespace beef_and_chicken.Application.DTOs
{
    public class CreateOrderRequestDto
    {
        public int CustomerAddressId { get; set; }
        public string? Notes { get; set; } = null;
        public List<CreateOrderItemDto> Items { get; set; } = new();
    }
}
