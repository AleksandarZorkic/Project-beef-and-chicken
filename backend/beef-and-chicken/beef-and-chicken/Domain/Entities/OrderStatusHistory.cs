using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Domain.Entities
{
    public class OrderStatusHistory
    {
        public int Id { get; set; }

        public int OrderId { get; set; }
        public Order Order { get; set; } = null!;

        public OrderStatus OldStatus { get; set; }

        public OrderStatus NewStatus { get; set; }

        public int? ChangedByUserId { get; set; }
        public User? ChangedByUser { get; set; }

        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

        public string? Note { get; set; }
    }
}