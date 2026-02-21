using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Application.DTOs
{
    public class OrderListDto
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string DeliveryAddress { get; set; } = null!;
        public decimal TotalAmount { get; set; }
        public OrderStatus Status { get; set; }
        public int? CourierId { get; set; }
    }
}
