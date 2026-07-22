namespace beef_and_chicken.Application.DTOs
{
    public class DashboardTopDishDto
    {
        public string DishName { get; set; } = string.Empty;

        public int Quantity { get; set; }

        public decimal Revenue { get; set; }
    }
}