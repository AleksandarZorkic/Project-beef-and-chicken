using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using beef_and_chicken.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace beef_and_chicken.Infrastructure.Repositories
{
    public class OrderRepository : IOrderRepository
    {
        private readonly AppDbContext _context;

        public OrderRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Order>> GetAllOrders(CancellationToken ct = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .AsSplitQuery()
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Options)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<IEnumerable<Order>> GetAllCustomerOrders(
            int userId,
            CancellationToken ct = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .AsSplitQuery()
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Options)
                .Where(o => o.CustomerId == userId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<Order?> GetCustomerOrderById(
            int userId,
            int orderId,
            CancellationToken ct = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .AsSplitQuery()
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Options)
                .FirstOrDefaultAsync(
                    o => o.Id == orderId && o.CustomerId == userId,
                    ct
                );
        }

        public async Task<Order?> GetOrderById(
            int orderId,
            CancellationToken ct = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .AsSplitQuery()
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Options)
                .FirstOrDefaultAsync(o => o.Id == orderId, ct);
        }

        public async Task<IEnumerable<Order>> GetPendingOrders(
            CancellationToken ct = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .AsSplitQuery()
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Options)
                .Where(o => o.Status == OrderStatus.Na_Cekanju)
                .OrderBy(o => o.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<Order> CreateOrder(
            Order order,
            CancellationToken ct = default)
        {
            await _context.Orders.AddAsync(order, ct);
            return order;
        }

        public async Task<Order?> UpdateOrder(
            int id,
            UpdateOrderStatusDto dto,
            CancellationToken ct = default)
        {
            var order = await _context.Orders.FindAsync(new object[] { id }, ct);

            if (order == null)
                return null;

            order.Status = dto.Status;

            return order;
        }

        public async Task<bool> DeleteOrder(int id, CancellationToken ct = default)
        {
            var order = await _context.Orders.FindAsync(new object[] { id }, ct);

            if (order == null)
                return false;

            _context.Orders.Remove(order);
            return true;
        }

        public async Task<IEnumerable<Order>> GetActiveOrders(CancellationToken ct = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .AsSplitQuery()
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Options)
                .Where(o =>
                    o.Status == OrderStatus.Na_Cekanju ||
                    o.Status == OrderStatus.Prihvacena ||
                    o.Status == OrderStatus.Spremna_za_preuzimanje ||
                    o.Status == OrderStatus.Dostava_u_toku
                )
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<IEnumerable<Order>> GetReadyForPickupOrders(
            CancellationToken ct = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .AsSplitQuery()
                .Include(o => o.Customer)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Options)
                .Where(o => o.Status == OrderStatus.Spremna_za_preuzimanje)
                .OrderBy(o => o.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<Order?> GetOrderByIdForUpdate(int orderId, CancellationToken ct = default)
        {
            return await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Options)
                .FirstOrDefaultAsync(o => o.Id == orderId, ct);
        }

        public async Task<IEnumerable<Order>> GetCourierOrders(
            int courierId,
            CancellationToken ct = default)
        {
            return await _context.Orders
                .AsNoTracking()
                .AsSplitQuery()
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Options)
                .Where(o =>
                    o.CourierId == courierId &&
                    o.Status == OrderStatus.Dostava_u_toku
                )
                .OrderBy(o => o.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<(List<Order> Items, int TotalCount)> GetOrderHistoryAsync(
            OrderHistoryQueryDto query,
            CancellationToken ct = default)
        {
            var page = query.Page < 1 ? 1 : query.Page;
            var pageSize = query.PageSize < 1 ? 20 : Math.Min(query.PageSize, 100);

            var ordersQuery = _context.Orders
                .AsNoTracking()
                .AsSplitQuery()
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Options)
                .AsQueryable();

            if (query.Status.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.Status == query.Status.Value);
            }
            else
            {
                ordersQuery = ordersQuery.Where(o =>
                    o.Status == OrderStatus.Dostavljena ||
                    o.Status == OrderStatus.Odbijena ||
                    o.Status == OrderStatus.Otkazana
);
            }

            if (query.From.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.CreatedAt >= query.From.Value);
            }

            if (query.To.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.CreatedAt < query.To.Value);
            }

            if (!string.IsNullOrWhiteSpace(query.OrderNumber))
            {
                var pattern = $"%{query.OrderNumber.Trim()}%";

                ordersQuery = ordersQuery.Where(o =>
                    o.OrderNumber != null &&
                    EF.Functions.ILike(o.OrderNumber, pattern)
                );
            }

            if (query.CourierId.HasValue)
            {
                ordersQuery = ordersQuery.Where(o => o.CourierId == query.CourierId.Value);
            }

            var totalCount = await ordersQuery.CountAsync(ct);

            var items = await ordersQuery
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return (items, totalCount);
        }

        public async Task<List<Order>> GetOrdersByIdsForUpdateAsync(
            IEnumerable<int> orderIds,
            CancellationToken ct = default)
        {
            var ids = orderIds
                .Distinct()
                .ToList();

            return await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Courier)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Options)
                .Where(o => ids.Contains(o.Id))
                .ToListAsync(ct);
        }

        public async Task<OrderDashboardDto> GetDashboardAsync(
            OrderDashboardQueryDto query,
            CancellationToken ct = default)
        {
            var from = query.From ?? DateTime.UtcNow.Date;
            var to = query.To ?? from.AddDays(1);

            if (to <= from)
            {
                to = from.AddDays(1);
            }

            var periodOrders = _context.Orders
                .AsNoTracking()
                .Where(o => o.CreatedAt >= from && o.CreatedAt < to);

            var deliveredPeriodOrders = periodOrders
                .Where(o => o.Status == OrderStatus.Dostavljena);

            var periodTotalOrders = await periodOrders.CountAsync(ct);

            var periodDeliveredOrders = await deliveredPeriodOrders.CountAsync(ct);

            var periodRejectedOrders = await periodOrders
                .CountAsync(o => o.Status == OrderStatus.Odbijena, ct);

            var revenue = await deliveredPeriodOrders
                .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0m;

            var averageDeliveredOrderValue = periodDeliveredOrders == 0
                ? 0m
                : revenue / periodDeliveredOrders;

            var activeOrdersQuery = _context.Orders
                .AsNoTracking()
                .Where(o =>
                    o.Status == OrderStatus.Na_Cekanju ||
                    o.Status == OrderStatus.Prihvacena ||
                    o.Status == OrderStatus.Spremna_za_preuzimanje ||
                    o.Status == OrderStatus.Dostava_u_toku
                );

            var activeOrders = await activeOrdersQuery.CountAsync(ct);

            var pendingOrders = await activeOrdersQuery
                .CountAsync(o => o.Status == OrderStatus.Na_Cekanju, ct);

            var acceptedOrders = await activeOrdersQuery
                .CountAsync(o => o.Status == OrderStatus.Prihvacena, ct);

            var readyForPickupOrders = await activeOrdersQuery
                .CountAsync(o => o.Status == OrderStatus.Spremna_za_preuzimanje, ct);

            var deliveryInProgressOrders = await activeOrdersQuery
                .CountAsync(o => o.Status == OrderStatus.Dostava_u_toku, ct);

            var topDishes = await _context.OrderItems
                .AsNoTracking()
                .Where(oi =>
                    oi.Order.CreatedAt >= from &&
                    oi.Order.CreatedAt < to &&
                    oi.Order.Status == OrderStatus.Dostavljena
                )
                .GroupBy(oi => oi.DishName)
                .Select(g => new DashboardTopDishDto
                {
                    DishName = g.Key,
                    Quantity = g.Sum(x => x.Quantity),
                    Revenue = g.Sum(x => (x.UnitPrice + x.OptionsTotal) * x.Quantity)
                })
                .OrderByDescending(x => x.Quantity)
                .ThenByDescending(x => x.Revenue)
                .Take(5)
                .ToListAsync(ct);

            return new OrderDashboardDto
            {
                From = from,
                To = to,
                PeriodTotalOrders = periodTotalOrders,
                PeriodDeliveredOrders = periodDeliveredOrders,
                PeriodRejectedOrders = periodRejectedOrders,
                Revenue = revenue,
                AverageDeliveredOrderValue = averageDeliveredOrderValue,
                ActiveOrders = activeOrders,
                PendingOrders = pendingOrders,
                AcceptedOrders = acceptedOrders,
                ReadyForPickupOrders = readyForPickupOrders,
                DeliveryInProgressOrders = deliveryInProgressOrders,
                TopDishes = topDishes
            };
        }
    }
}