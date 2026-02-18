using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Domain.Entities;

namespace beef_and_chicken.Application.Interfaces.Repositories
{
    public interface IOrderRepository 
    {
        Task<IEnumerable<Order>> GetAllOrders(CancellationToken ct = default);
        Task<Order?> GetOrderById(int id, CancellationToken ct = default);
        Task<IEnumerable<Order>> GetPendingOrders(CancellationToken ct = default);
        Task<Order> CreateOrder(Order order, CancellationToken ct = default);
        Task<Order?> UpdateOrder(int id, UpdateOrderStatusDto dto, CancellationToken ct = default);
        Task<bool> DeleteOrder(int id, CancellationToken ct = default);

    }
}
