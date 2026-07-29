using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace beef_and_chicken.Presentation.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/orders")]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public OrderController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        [Authorize(Roles = AppRoles.Customer)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrderDetailsDto>>> GetMyOrders(
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var orders = await _orderService.GetCustomerOrders(userId, ct);

            return Ok(orders);
        }

        [Authorize(Roles = AppRoles.Customer)]
        [HttpGet("{orderId:int}")]
        public async Task<ActionResult<OrderDetailsDto>> GetOrderById(
            int orderId,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var order = await _orderService.GetOrderById(userId, orderId, ct);

            return Ok(order);
        }

        [Authorize(Roles = AppRoles.Customer)]
        [HttpPost]
        public async Task<ActionResult<OrderDetailsDto>> CreateOrder(
            [FromBody] CreateOrderRequestDto dto,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var newOrder = await _orderService.CreateOrderAsync(userId, dto, ct);

            return CreatedAtAction(
                nameof(GetOrderById),
                new { orderId = newOrder.Id },
                newOrder
            );
        }

        [Authorize(Roles = AppRoles.AdminOrEmployee)]
        [HttpGet("pending")]
        public async Task<ActionResult<IEnumerable<OrderDetailsDto>>> GetPendingOrders(
            CancellationToken ct = default)
        {
            var orders = await _orderService.GetPendingOrdersAsync(ct);
            return Ok(orders);
        }

        [Authorize(Roles = AppRoles.AdminOrEmployee)]
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<OrderDetailsDto>>> GetActiveOrders(
            CancellationToken ct = default)
        {
            var orders = await _orderService.GetActiveOrdersAsync(ct);
            return Ok(orders);
        }

        [Authorize(Roles = AppRoles.AdminOrEmployee)]
        [HttpPatch("{orderId:int}/accept")]
        public async Task<IActionResult> AcceptOrder(
            int orderId,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            await _orderService.AcceptOrderAsync(orderId, userId, ct);

            return NoContent();
        }

        [Authorize(Roles = AppRoles.AdminOrEmployee)]
        [HttpPatch("{orderId:int}/reject")]
        public async Task<IActionResult> RejectOrder(
            int orderId,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            await _orderService.RejectOrderAsync(orderId, userId, ct);

            return NoContent();
        }

        [Authorize(Roles = AppRoles.AdminOrEmployee)]
        [HttpPatch("{orderId:int}/ready-for-pickup")]
        public async Task<ActionResult<OrderDetailsDto>> MarkReadyForPickup(
            int orderId,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            var order = await _orderService.MarkReadyForPickupAsync(orderId, userId, ct);

            return Ok(order);
        }

        [Authorize(Roles = AppRoles.AdminOrEmployee)]
        [HttpGet("history")]
        public async Task<ActionResult<PagedResultDto<OrderDetailsDto>>> GetOrderHistory(
            [FromQuery] OrderHistoryQueryDto query,
            CancellationToken ct = default)
        {
            var result = await _orderService.GetOrderHistoryAsync(query, ct);
            return Ok(result);
        }

        [Authorize(Roles = AppRoles.AdminOrEmployee)]
        [HttpGet("dashboard")]
        public async Task<ActionResult<OrderDashboardDto>> GetDashboard(
            [FromQuery] OrderDashboardQueryDto query,
            CancellationToken ct = default)
        {
            var dashboard = await _orderService.GetDashboardAsync(query, ct);
            return Ok(dashboard);
        }

        [Authorize(Roles = AppRoles.Courier)]
        [HttpGet("ready-for-pickup")]
        public async Task<ActionResult<IEnumerable<OrderDetailsDto>>> GetReadyForPickupOrders(
            CancellationToken ct = default)
        {
            var orders = await _orderService.GetReadyForPickupOrdersAsync(ct);
            return Ok(orders);
        }

        [Authorize(Roles = AppRoles.Courier)]
        [HttpGet("courier")]
        public async Task<ActionResult<IEnumerable<OrderDetailsDto>>> GetCourierOrders(
            CancellationToken ct = default)
        {
            var courierId = GetCurrentUserId();
            var orders = await _orderService.GetCourierOrdersAsync(courierId, ct);

            return Ok(orders);
        }

        [Authorize(Roles = AppRoles.Courier)]
        [HttpPatch("{orderId:int}/start-delivery")]
        public async Task<ActionResult<OrderDetailsDto>> StartDelivery(
            int orderId,
            CancellationToken ct = default)
        {
            var courierId = GetCurrentUserId();
            var order = await _orderService.StartDeliveryAsync(courierId, orderId, ct);

            return Ok(order);
        }

        [Authorize(Roles = AppRoles.Courier)]
        [HttpPatch("{orderId:int}/delivered")]
        public async Task<ActionResult<OrderDetailsDto>> MarkDelivered(
            int orderId,
            CancellationToken ct = default)
        {
            var courierId = GetCurrentUserId();
            var order = await _orderService.MarkDeliveredAsync(courierId, orderId, ct);

            return Ok(order);
        }

        [Authorize(Roles = AppRoles.Courier)]
        [HttpPatch("start-delivery-batch")]
        public async Task<ActionResult<IEnumerable<OrderDetailsDto>>> StartDeliveryBatch(
            [FromBody] StartDeliveryBatchRequestDto dto,
            CancellationToken ct = default)
        {
            var courierId = GetCurrentUserId();

            var orders = await _orderService.StartDeliveryBatchAsync(
                courierId,
                dto,
                ct
            );

            return Ok(orders);
        }

        [Authorize(Roles = AppRoles.Customer)]
        [HttpPatch("{orderId:int}/cancel")]
        public async Task<ActionResult<OrderDetailsDto>> CancelOrder(
            int orderId,
            CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();

            var order = await _orderService.CancelCustomerOrderAsync(
                userId,
                orderId,
                ct
            );

            return Ok(order);
        }

        private int GetCurrentUserId()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId) ||
                !int.TryParse(userId, out var parsedUserId))
            {
                throw new UnauthorizedAccessException("Nevažeći korisnički identitet.");
            }

            return parsedUserId;
        }
    }
}