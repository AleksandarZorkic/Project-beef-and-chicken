using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Mapping
{
    public class MenuMappings
    {
        public static DishMenuDto MapDishToMenuDto(Dish d)
        {
            return new DishMenuDto
            {
                Id = d.Id,
                Name = d.Name,
                Description = d.Description,
                Price = d.Price,
                ImageUrl = d.ImageUrl,
                CategoryId = d.CategoryId,
                CategoryName = d.Category.Name,
                Allergens = d.DishAllergens
                    .Select(MapDishAllergenToDto)
                    .ToList()
            };
        }
        public static DishAllergenDto MapDishAllergenToDto(DishAllergen da) 
        {
            return new DishAllergenDto
            {
                AllergenId = da.AllergenId,
                AllergenName = da.Allergen.Name,
                IsTrace = da.IsTrace
            };
        }
    }
}
