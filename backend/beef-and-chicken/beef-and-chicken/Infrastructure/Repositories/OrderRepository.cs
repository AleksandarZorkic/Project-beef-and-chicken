using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class OrderRepository : IOrderRepository
    {
        private readonly AppDbContext _context;

        public OrderRepository(AppDbContext context) => _context = context;

        public async Task<IEnumerable<Order>> GetAllOrders(CancellationToken ct = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.DeliveryAddress)
                .Include(o => o.OrderItems).ThenInclude(oi => oi.Dish)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<Order?> GetOrderById(int id, CancellationToken ct = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.DeliveryAddress)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Dish)
                .FirstOrDefaultAsync(o => o.Id == id, ct);
        }

        public async Task<IEnumerable<Order>> GetPendingOrders(CancellationToken ct = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Dish)
                .Where(o => o.Status == OrderStatus.Na_Cekanju)
                .OrderBy(o => o.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<Order> CreateOrder(Order order, CancellationToken ct  = default)
        {
            await _context.Orders.AddAsync(order, ct);
            await _context.SaveChangesAsync(ct);
            return order;
        }

        public async Task<Order?> UpdateOrder(int id, UpdateOrderStatusDto dto, CancellationToken ct = default)
        {
            var order = await _context.Orders.FindAsync(new object[] { id }, ct);

            if (order == null)
                return null;

            order.Status = dto.Status;

            await _context.SaveChangesAsync(ct);
            return order;
        }

        public async Task<bool> DeleteOrder(int id, CancellationToken ct = default)
        {
            var order = await _context.Orders.FindAsync(new object[] { id }, ct);

            if (order == null)
                return false;

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync(ct);
            return true;
        }  
    }
}
