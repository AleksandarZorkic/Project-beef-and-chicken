namespace beef_and_chicken.Application.DTOs
{
    public class OrderDashboardDto
    {
        public DateTime From { get; set; }

        public DateTime To { get; set; }

        public int PeriodTotalOrders { get; set; }

        public int PeriodDeliveredOrders { get; set; }

        public int PeriodRejectedOrders { get; set; }

        public decimal Revenue { get; set; }

        public decimal AverageDeliveredOrderValue { get; set; }

        public int ActiveOrders { get; set; }

        public int PendingOrders { get; set; }

        public int AcceptedOrders { get; set; }

        public int ReadyForPickupOrders { get; set; }

        public int DeliveryInProgressOrders { get; set; }

        public IReadOnlyList<DashboardTopDishDto> TopDishes { get; set; } = [];
    }
}