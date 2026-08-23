using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Domain.Entities
{
    public class RestaurantSettings
    {
        public const int DefaultId = 1;

        public int Id { get; set; } = DefaultId;

        public decimal MinimumOrderAmount { get; set; } = 800m;

        public decimal DeliveryFee { get; set; } = 200m;

        public decimal? FreeDeliveryThreshold { get; set; } = 2500m;

        public bool IsDeliveryEnabled { get; set; } = true;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public bool IsOnlinePaymentEnabled { get; set; } = false;

        public PaymentProviderType PaymentProvider { get; set; } = PaymentProviderType.Disabled;

        public static RestaurantSettings CreateDefault()
        {
            return new RestaurantSettings
            {
                Id = DefaultId,
                MinimumOrderAmount = 800m,
                DeliveryFee = 200m,
                FreeDeliveryThreshold = 2500m,
                IsDeliveryEnabled = true,
                UpdatedAt = DateTime.UtcNow
            };
        }
    }
}