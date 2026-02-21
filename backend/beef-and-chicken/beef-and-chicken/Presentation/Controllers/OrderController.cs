using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace beef_and_chicken.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public OrderController(IOrderService orderService) => _orderService = orderService;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrderDetailsDto>>> GetOrders(CancellationToken ct)
        {
            var orders = await _orderService.GetAllOrders(ct);
            return Ok(orders);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<OrderDetailsDto>> GetOrderById(int id, CancellationToken ct = default)
        {
            var order = await _orderService.GetOrderById(id, ct);
            return Ok(order);
        }

        [HttpPost]
        public async Task<ActionResult<OrderDetailsDto>> CreateOrder(CreateOrderRequestDto dto, CancellationToken ct = default)
        {
            var newOrder = await _orderService.CreateOrderAsync(dto, ct);
            return Ok(newOrder);
        }

        [HttpPatch("{id:int}/accept")]
        public async Task<ActionResult> AcceptOrder(int id, CancellationToken ct = default)
        {
            await _orderService.AcceptOrderAsync(id, ct);
            return NoContent();
        }

        [HttpPatch("{id:int}/reject")]
        public async Task<ActionResult> RejectOrder(int id, CancellationToken ct = default)
        {
            await _orderService.RejectOrderAsync(id, ct);
            return NoContent();
        }

        [HttpGet("peding")]
        public async Task<ActionResult<IEnumerable<OrderDetailsDto>>> GetPeddingOrders(CancellationToken ct = default)
        {
            var orders = await _orderService.GetPendingOrdersAsync(ct);
            return Ok(orders);
        }
    }
}
