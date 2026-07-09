namespace beef_and_chicken.Application.DTOs
{
    public class DishAllergenInputDto
    {
        public int AllergenId { get; set; }
        public bool IsTrace { get; set; } = false;
    }
}
