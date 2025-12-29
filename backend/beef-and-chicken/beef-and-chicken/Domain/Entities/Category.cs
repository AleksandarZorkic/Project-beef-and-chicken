namespace beef_and_chicken.Domain.Entities
{
    public class Category
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; } 
        public bool IsActive { get; set; } = true;
        public int SortOrder { get; set; } = 0;
        public ICollection<Dish> Dishes { get; set; } = new List<Dish>();
    }
}
