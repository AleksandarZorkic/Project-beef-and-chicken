using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Domain.Enums;

namespace beef_and_chicken.Application.DTOs
{
    public class OrderItemOptionDto
    {
        public int Id { get; set; }

        public int? DishOptionId { get; set; }

        public string OptionName { get; set; } = string.Empty;

        public DishOptionType OptionType { get; set; }

        public decimal UnitPrice { get; set; }
    }
}