using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using System.ComponentModel.DataAnnotations;

namespace beef_and_chicken.Application.DTOs
{
    public class OrderDetailsDto
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public int? CourierId { get; set; }
        public OrderAddressDto DeliveryAddress { get; set; } = new();
        public string? Notes { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DeliveryFee { get; set; }
        public decimal TotalAmount { get; set; }
        public OrderStatus Status { get; set;  }
        public List<OrderItemDto> Items { get; set; } = new ();
    }
}
