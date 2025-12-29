namespace beef_and_chicken.Domain.Entities
{
    public class DishAllergen
    {
        public int DishId { get; set; }
        public Dish Dish { get; set; } = null!;

        public int AllergenId { get; set; }
        public Allergen Allergen { get; set; } = null!;

        public bool IsTrace { get; set; } = false; // Moze sadrzati tragove
    }
}
