using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Domain.Enums;

namespace beef_and_chicken.Domain.Entities
{
    public class OrderItemOption
    {
        public int Id { get; set; }

        public int OrderItemId { get; set; }
        public OrderItem OrderItem { get; set; } = null!;

        public int? DishOptionId { get; set; }
        public DishOption? DishOption { get; set; }

        public string OptionName { get; set; } = string.Empty;

        public DishOptionType OptionType { get; set; }

        public decimal UnitPrice { get; set; }
    }
}