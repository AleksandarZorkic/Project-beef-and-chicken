using AutoMapper;
using beef_and_chicken.Application.DTOs;
using beef_and_chicken.Application.Exceptions;
using beef_and_chicken.Application.Interfaces.Repositories;
using beef_and_chicken.Application.Interfaces.Services;
using beef_and_chicken.Domain.Entities;
using beef_and_chicken.Domain.Enum;
using System.ComponentModel.DataAnnotations;

namespace beef_and_chicken.Application.Services
{
    public class OrderService : IOrderService
    {
        private readonly IOrderRepository _orderRepo;
        private readonly IMenuRepository _menuRepo;
        private readonly ILogger<OrderService> _logger;
        private readonly IMapper _mapper;


        public OrderService(IOrderRepository orderRepo, IMenuRepository menuRepo, ILogger<OrderService> logger, IMapper mapper )
        {
            _orderRepo = orderRepo;
            _menuRepo = menuRepo;
            _logger = logger; 
            _mapper = mapper;
        }


        public async Task<IEnumerable<OrderDetailsDto>> GetAllOrders(CancellationToken ct = default)
        {
            var orders = await _orderRepo.GetAllOrders(ct);
            return _mapper.Map<IEnumerable<OrderDetailsDto>>(orders);
        }

        public async Task<OrderDetailsDto> GetOrderById(int id, CancellationToken ct  = default)
        {
            var order = await _orderRepo.GetOrderById(id, ct);
            if (order == null)
            {
                _logger.LogInformation("Porudžbina sa ID-jem {OrderId} ne postoji!", id);
                throw new NotFoundException($"Porudžbina sa ID-jem {id} nije pronađena.");
            }

            return _mapper.Map<OrderDetailsDto>(order);
        }

        public async Task<OrderDetailsDto> CreateOrderAsync(CreateOrderRequestDto orderDto, CancellationToken ct = default)
        {
            if (orderDto is null) throw new ArgumentNullException(nameof(orderDto));

            if (orderDto.Items is null || !orderDto.Items.Any())
                throw new ValidationException("Porudžbina mora imati bar jednu stavku.");

            if (orderDto.CustomerAddressId == 0)
                throw new ValidationException("Addresa za dostavu je obavezna.");

            const int deliveryFee = 200;

            var order = _mapper.Map<Order>(orderDto);
            List<Dish> dishes = _menuRepo.GetByIdsAsync(orderDto.Items);


            order.Subtotal = order.OrderItems.Sum(i => i.UnitPrice * i.Quantity);
            order.DeliveryFee = deliveryFee;
            order.TotalAmount = order.Subtotal + order.DeliveryFee;
            order.Status = OrderStatus.Na_Cekanju;

            var createdOrder = await _orderRepo.CreateOrder(order, ct);
            _logger.LogInformation("Porudžbina sa ID-jem {OrderId} je uspešno kreirana.", createdOrder.Id);

            return _mapper.Map<OrderDetailsDto>(createdOrder);
        }

        public Task AcceptOrderAsync(int id, CancellationToken ct = default)
            => UpdateOrderStatus(id, OrderStatus.Prihvacena, ct);

        public Task RejectOrderAsync(int id, CancellationToken ct = default)
            => UpdateOrderStatus(id, OrderStatus.Odbijena, ct);

        private async Task UpdateOrderStatus(int id, OrderStatus newStatus, CancellationToken ct = default)
        {
            var order = await _orderRepo.GetOrderById(id, ct);
            if (order == null)
                throw new NotFoundException($"Porudžbina sa ID-jem {id} nije pronađena.");

            if (order.Status != OrderStatus.Na_Cekanju)
                throw new ValidationException("Status se može promeniti samo ako je porudžbina na čekanju.");

            var dto = new UpdateOrderStatusDto { Status = newStatus };
            await _orderRepo.UpdateOrder(id, dto, ct);
        }

        public async Task<IEnumerable<OrderDetailsDto>> GetPendingOrdersAsync(CancellationToken ct = default)
        {
            var pendingOrders = await _orderRepo.GetPendingOrders(ct);
            return _mapper.Map<IEnumerable<OrderDetailsDto>>(pendingOrders);
        }
    }
}
