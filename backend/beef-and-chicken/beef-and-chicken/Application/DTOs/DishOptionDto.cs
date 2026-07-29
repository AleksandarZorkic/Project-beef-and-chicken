using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Domain.Enums;

namespace beef_and_chicken.Application.DTOs
{
    public class DishOptionDto
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public DishOptionType Type { get; set; }

        public decimal Price { get; set; }

        public bool IsRecommended { get; set; }

        public int RecommendedSortOrder { get; set; }

        public bool IsAlwaysPaid { get; set; }

        public bool IsActive { get; set; }

        public int SortOrder { get; set; }
    }
}