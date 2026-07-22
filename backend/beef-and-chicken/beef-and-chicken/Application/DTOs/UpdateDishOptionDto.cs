using beef_and_chicken.Domain.Enums;

namespace beef_and_chicken.Application.DTOs
{
    public class UpdateDishOptionDto
    {
        public string Name { get; set; } = string.Empty;

        public DishOptionType Type { get; set; }

        public decimal Price { get; set; }

        public bool IsAlwaysPaid { get; set; }

        public int SortOrder { get; set; }
    }
}