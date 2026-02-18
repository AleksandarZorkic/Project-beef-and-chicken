using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Application.Interfaces.Services
{
    public interface IOrderService
    {
        Task<IEnumerable<OrderDetailsDto>> GetAllOrders(CancellationToken ct = default);
        Task<OrderDetailsDto> GetOrderById(int id, CancellationToken ct = default);
        Task<OrderDetailsDto> CreateOrderAsync(OrderDetailsDto orderDto, CancellationToken ct = default);
        Task AcceptOrderAsync(int id, CancellationToken ct = default);
        Task RejectOrderAsync(int id, CancellationToken ct = default);
        Task<IEnumerable<OrderDetailsDto>> GetPendingOrdersAsync(CancellationToken ct = default);

    }
}
