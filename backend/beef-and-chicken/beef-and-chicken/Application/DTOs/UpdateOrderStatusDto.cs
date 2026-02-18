using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Application.DTOs
{
    public class UpdateOrderStatusDto
    {
        public OrderStatus Status { get; set; }
    }
}
