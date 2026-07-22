using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Domain.Enums;

namespace beef_and_chicken.Domain.Entities
{
    public class DishOption
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public DishOptionType Type { get; set; }

        public decimal Price { get; set; }

        public bool IsAlwaysPaid { get; set; }

        public bool IsActive { get; set; } = true;

        public int SortOrder { get; set; }
    }
}