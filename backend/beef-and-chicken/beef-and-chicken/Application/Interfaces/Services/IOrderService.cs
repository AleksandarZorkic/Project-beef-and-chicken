using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IOrderService
    {
        Task<IEnumerable<OrderDetailsDto>> GetCustomerOrders(int userId, CancellationToken ct = default);
        Task<Order?> GetCustomerOrderById(int userId, int orderId, CancellationToken ct = default);
        Task<OrderDetailsDto> GetOrderById(int userId, int orderId, CancellationToken ct = default);
        Task<OrderDetailsDto> CreateOrderAsync(int userId, CreateOrderRequestDto orderDto, CancellationToken ct = default);
        Task AcceptOrderAsync(int orderId, CancellationToken ct = default);
        Task RejectOrderAsync(int orderId, CancellationToken ct = default);
        Task<IEnumerable<OrderDetailsDto>> GetPendingOrdersAsync(CancellationToken ct = default);
    }
}
