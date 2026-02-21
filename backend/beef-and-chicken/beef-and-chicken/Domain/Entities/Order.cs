using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Domain.Entities
{
    public class Order
    {
        public int Id { get; set; }

        public int CustomerId { get; set; }
        public User Customer { get; set; } = null!;

        public int? CourierId { get; set; }
        public User? Courier { get; set; }


        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int? CustomerAddressId { get; set; }
        public Address? CustomerAddress { get; set; }

        // Addresa dostave u trenutku porudzbine
        public OrderAddressSnapshot DeliveryAddress { get; set; } = new();

        public string? Notes { get; set; } = null;

        public decimal Subtotal { get; set; }
        public decimal DeliveryFee { get; set; }
        public decimal TotalAmount { get; set; }

        public OrderStatus Status { get; set; } = OrderStatus.Na_Cekanju;


        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }
}
