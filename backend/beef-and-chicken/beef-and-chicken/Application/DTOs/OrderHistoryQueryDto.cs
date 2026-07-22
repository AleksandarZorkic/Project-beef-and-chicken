using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Application.DTOs
{
    public class OrderHistoryQueryDto
    {
        public DateTime? From { get; set; }

        public DateTime? To { get; set; }

        public OrderStatus? Status { get; set; }

        public string? OrderNumber { get; set; }

        public int? CourierId { get; set; }

        public int Page { get; set; } = 1;

        public int PageSize { get; set; } = 20;
    }
}