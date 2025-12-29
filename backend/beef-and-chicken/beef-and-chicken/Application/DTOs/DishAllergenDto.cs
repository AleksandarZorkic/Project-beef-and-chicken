namespace beef_and_chicken.Application.DTOs
{
    public class DishAllergenDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int AllergenId { get; set; }
        public string AllergenName { get; set; } = string.Empty;
        public bool IsTrace { get; set; } = false;
    }
}
