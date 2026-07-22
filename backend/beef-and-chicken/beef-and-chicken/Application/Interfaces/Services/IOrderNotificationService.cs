using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IOrderNotificationService
    {
        Task NotifyOrderChangedAsync(
            Order order,
            string eventType,
            CancellationToken ct = default
        );
    }
}