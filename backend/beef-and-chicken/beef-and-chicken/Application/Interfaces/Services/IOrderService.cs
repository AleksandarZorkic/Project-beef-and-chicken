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

        Task AcceptOrderAsync(
            int orderId,
            int changedByUserId,
            CancellationToken ct = default);

        Task RejectOrderAsync(
            int orderId,
            int changedByUserId,
            CancellationToken ct = default);

        Task<IEnumerable<OrderDetailsDto>> GetPendingOrdersAsync(CancellationToken ct = default);
        Task<IEnumerable<OrderDetailsDto>> GetActiveOrdersAsync(CancellationToken ct = default);

        Task<OrderDetailsDto> MarkReadyForPickupAsync(
            int orderId,
            int changedByUserId,
            CancellationToken ct = default);

        Task<OrderDetailsDto> CompletePickupOrderAsync(
            int orderId,
            int changedByUserId,
            CancellationToken ct = default);

        Task<IEnumerable<OrderDetailsDto>> GetReadyForPickupOrdersAsync(CancellationToken ct = default);
        Task<IEnumerable<OrderDetailsDto>> GetCourierOrdersAsync(int courierId, CancellationToken ct = default);

        Task<OrderDetailsDto> StartDeliveryAsync(int courierId, int orderId, CancellationToken ct = default);
        Task<OrderDetailsDto> MarkDeliveredAsync(int courierId, int orderId, CancellationToken ct = default);

        Task<PagedResultDto<OrderDetailsDto>> GetOrderHistoryAsync(
            OrderHistoryQueryDto query,
            CancellationToken ct = default
        );

        Task<IEnumerable<OrderDetailsDto>> StartDeliveryBatchAsync(
            int courierId,
            StartDeliveryBatchRequestDto dto,
            CancellationToken ct = default
        );

        Task<OrderDashboardDto> GetDashboardAsync(
            OrderDashboardQueryDto query,
            CancellationToken ct = default);

        Task<OrderDetailsDto> CancelCustomerOrderAsync(
            int userId,
            int orderId,
            CancellationToken ct = default
        );
    }
}