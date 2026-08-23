using beef_and_chicken.Domain.Enum;

namespace beef_and_chicken.Application.DTOs
{
    public class UpdateRestaurantSettingsDto
    {
        public decimal MinimumOrderAmount { get; set; }

        public decimal DeliveryFee { get; set; }

        public decimal? FreeDeliveryThreshold { get; set; }

        public bool IsDeliveryEnabled { get; set; } = true;

        public bool IsOnlinePaymentEnabled { get; set; }

        public PaymentProviderType PaymentProvider { get; set; }

        public List<UpdateRestaurantWorkingHourDto>? WorkingHours { get; set; }
    }
}