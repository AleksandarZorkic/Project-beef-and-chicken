using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Application.DTOs
{
    public class OrderRealtimeNotificationDto
    {
        public int OrderId { get; set; }

        public string? OrderNumber { get; set; }

        public int CustomerId { get; set; }

        public int? CourierId { get; set; }

        public OrderStatus Status { get; set; }

        public string EventType { get; set; } = string.Empty;
    }
}