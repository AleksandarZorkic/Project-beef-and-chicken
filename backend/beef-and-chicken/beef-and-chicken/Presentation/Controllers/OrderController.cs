using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
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

        public OrderController(IOrderService orderService) => _orderService = orderService;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrderDetailsDto>>> GetMyOrders(CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var orders = await _orderService.GetCustomerOrders(userId, ct);

            return Ok(orders);
        }

        [HttpGet("{orderId:int}")]
        public async Task<ActionResult<OrderDetailsDto>> GetOrderById(int orderId, CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var order = await _orderService.GetOrderById(userId, orderId, ct);

            return Ok(order);
        }

        [HttpPost]
        public async Task<ActionResult<OrderDetailsDto>> CreateOrder([FromBody]CreateOrderRequestDto dto, CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var newOrder = await _orderService.CreateOrderAsync(userId, dto, ct);
            
            return CreatedAtAction(nameof(GetOrderById), new { orderId = newOrder.Id }, newOrder);
        }

        [Authorize(Roles = "Admin,Employee")]
        [HttpPatch("{orderId:int}/accept")]
        public async Task<ActionResult> AcceptOrder(int orderId, CancellationToken ct = default)
        {
            await _orderService.AcceptOrderAsync(orderId, ct);
            return NoContent();
        }

        [Authorize(Roles = "Admin,Employee")]
        [HttpPatch("{orderId:int}/reject")]
        public async Task<ActionResult> RejectOrder(int orderId, CancellationToken ct = default)
        {
            await _orderService.RejectOrderAsync(orderId, ct);
            return NoContent();
        }

        [Authorize(Roles = "Admin,Employee")]
        [HttpGet("pending")]
        public async Task<ActionResult<IEnumerable<OrderDetailsDto>>> GetPendingOrders(CancellationToken ct = default)
        {
            var orders = await _orderService.GetPendingOrdersAsync(ct);
            return Ok(orders);
        }

        private int GetCurrentUserId()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId) || !int.TryParse(userId, out var parsedUserId))
                throw new UnauthorizedAccessException("Nevažeći korisnički identitet.");

            return parsedUserId;
        }
    }
}
