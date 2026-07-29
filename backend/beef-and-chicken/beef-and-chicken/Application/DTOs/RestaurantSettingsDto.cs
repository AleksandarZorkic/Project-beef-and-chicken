namespace beef_and_chicken.Application.DTOs
{
    public class RestaurantSettingsDto
    {
        public decimal MinimumOrderAmount { get; set; }

        public decimal DeliveryFee { get; set; }

        public decimal? FreeDeliveryThreshold { get; set; }

        public bool IsDeliveryEnabled { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}