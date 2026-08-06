using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Domain.Entities
{
    public class Order
    {
        public int Id { get; set; }

        public string? OrderNumber { get; set; }

        public int CustomerId { get; set; }
        public User Customer { get; set; } = null!;

        public int? CourierId { get; set; }
        public User? Courier { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? AcceptedAt { get; set; }

        public DateTime? RejectedAt { get; set; }

        public DateTime? ReadyForPickupAt { get; set; }

        public DateTime? DeliveryStartedAt { get; set; }

        public DateTime? DeliveredAt { get; set; }

        public int? CustomerAddressId { get; set; }
        public Address? CustomerAddress { get; set; }

        public OrderAddressSnapshot DeliveryAddress { get; set; } = new();

        public string DeliveryContactPhoneNumber { get; set; } = string.Empty;

        public string? Notes { get; set; } = null;

        public decimal Subtotal { get; set; }
        public decimal DeliveryFee { get; set; }
        public decimal TotalAmount { get; set; }

        public PaymentMethod PaymentMethod { get; set; }

        public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

        public OrderStatus Status { get; set; } = OrderStatus.Na_Cekanju;

        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

        public ICollection<OrderStatusHistory> StatusHistory { get; set; } = new List<OrderStatusHistory>();

        public FulfillmentType FulfillmentType { get; set; } = FulfillmentType.Delivery;
    }
}