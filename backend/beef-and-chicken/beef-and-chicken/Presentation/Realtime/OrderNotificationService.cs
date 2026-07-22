using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Presentation.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace beef_and_chicken.Presentation.Realtime
{
    public class OrderNotificationService : IOrderNotificationService
    {
        private readonly IHubContext<OrderHub> _hubContext;

        public OrderNotificationService(IHubContext<OrderHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task NotifyOrderChangedAsync(
            Order order,
            string eventType,
            CancellationToken ct = default)
        {
            var message = new OrderRealtimeNotificationDto
            {
                OrderId = order.Id,
                OrderNumber = order.OrderNumber,
                CustomerId = order.CustomerId,
                CourierId = order.CourierId,
                Status = order.Status,
                EventType = eventType
            };

            var tasks = new List<Task>
            {
                _hubContext.Clients
                    .Group("operations")
                    .SendAsync("OrderChanged", message, ct),

                _hubContext.Clients
                    .Group($"customer:{order.CustomerId}")
                    .SendAsync("OrderChanged", message, ct),

                _hubContext.Clients
                    .Group("couriers")
                    .SendAsync("OrderChanged", message, ct)
            };

            if (order.CourierId.HasValue)
            {
                tasks.Add(
                    _hubContext.Clients
                        .Group($"courier:{order.CourierId.Value}")
                        .SendAsync("OrderChanged", message, ct)
                );
            }

            await Task.WhenAll(tasks);
        }
    }
}