using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using System.ComponentModel.DataAnnotations;

namespace beef_and_chicken.Application.DTOs
{
    public class OrderDetailsDto
    {
        public int Id { get; set; }
        public string? OrderNumber { get; set; }

        public int CustomerId { get; set; }

        public int? CourierId { get; set; }

        public DateTime CreatedAt {  get; set; }

        public DateTime? AcceptedAt { get; set; }

        public DateTime? RejectedAt { get; set; }

        public DateTime? ReadyForPickupAt { get; set; }

        public DateTime? DeliveryStartedAt { get; set; }

        public DateTime? DeliveredAt { get; set; }

        public OrderAddressSnapshot DeliveryAddress { get; set; } = new();

        public string DeliveryContactPhoneNumber { get; set; } = string.Empty;

        public string? Notes { get; set; }

        public decimal Subtotal { get; set; }

        public decimal DeliveryFee { get; set; }

        public decimal TotalAmount { get; set; }

        public PaymentMethod PaymentMethod { get; set; }

        public PaymentStatus PaymentStatus { get; set; }

        public OrderStatus Status { get; set;  }

        public List<OrderItemDto> Items { get; set; } = new ();
    }
}
