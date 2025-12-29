namespace beef_and_chicken.Domain.Entities
{
    public class UserAllergen
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public int AllergenId { get; set; }
        public Allergen Allergen { get; set; } = null!;
    }
}
