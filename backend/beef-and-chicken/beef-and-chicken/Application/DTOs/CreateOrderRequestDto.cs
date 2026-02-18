namespace beef_and_chicken.Application.DTOs
{
    public class CreateOrderRequestDto
    {
        public int CustomerAddressId { get; set; }
        public List<CreateOrderItemDto> Items { get; set; } = new();
    }
}
