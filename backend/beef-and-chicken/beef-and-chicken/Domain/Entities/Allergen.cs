namespace beef_and_chicken.Domain.Entities
{
    public class Allergen
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public ICollection<UserAllergen> UserAllergens { get; set; } = new List<UserAllergen>();
        public ICollection<DishAllergen> DishAllergens { get; set; } = new List<DishAllergen>();
    }
}
