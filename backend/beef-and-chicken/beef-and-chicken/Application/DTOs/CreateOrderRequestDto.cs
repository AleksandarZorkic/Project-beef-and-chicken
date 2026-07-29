using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Application.DTOs
{
    public class CreateOrderRequestDto
    {
        public int CustomerAddressId { get; set; }

        public string DeliveryContactPhoneNumber { get; set; } = string.Empty;

        public PaymentMethod? PaymentMethod { get; set; }

        public string? Notes { get; set; } = null;

        public List<CreateOrderItemDto> Items { get; set; } = new();
    }
}