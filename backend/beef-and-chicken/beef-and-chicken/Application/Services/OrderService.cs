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
        private readonly IAddressRepository _addressRepo;
        private readonly ILogger<OrderService> _logger;
        private readonly IMapper _mapper;


        public OrderService(IOrderRepository orderRepo, IMenuRepository menuRepo, IAddressRepository addressRepo, ILogger<OrderService> logger, IMapper mapper )
        {
            _orderRepo = orderRepo;
            _menuRepo = menuRepo;
            _addressRepo = addressRepo;
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

            if (orderDto.Items.Any(i => i.DishId <= 0))
                throw new ValidationException("Svaka stavka mora imati validan DishId.");

            if (orderDto.Items.Any(i => i.Quantity <= 0))
                throw new ValidationException("Količina mora biti veća od 0.");

            if (orderDto.CustomerAddressId <= 0)
                throw new ValidationException("Addresa za dostavu je obavezna.");

            const decimal deliveryFee = 200;

            // Ovo bi trebalo da se dobije iz konteksta autentifikacije, hardkodirano za primer
            int customerId = 1;            

            // Validacija adrese
            var address = await _addressRepo.GetCustomerAddressAsync(orderDto.CustomerAddressId, customerId, ct);
            if (address == null)
                throw new NotFoundException($"Adresa sa ID-jem {orderDto.CustomerAddressId} nije pronađena za korisnika sa ID-jem {customerId}.");

            // Izvlacenje svih DishId i povlacenje jela iz baze
            var dishIds = orderDto.Items.Select(x => x.DishId).Distinct().ToList();
            var dishes = (await _menuRepo.GetByIdsAsync(dishIds, ct)).ToList();

            if (dishes.Count != dishIds.Count)
            {
                var foundIds = dishes.Select(d => d.Id).ToHashSet();
                var missingIds = dishIds.Where(id => !foundIds.Contains(id)).ToList();
                throw new NotFoundException($"Neka jela ne postoje ili nisu aktivna. Missing DishId: {string.Join(", ", missingIds)}");
            }

            // Brz lookup jela po ID
            var dishById = dishes.ToDictionary(d => d.Id);

            // Napravi order * snapshot adresa
            var order = new Order
            {
                CustomerId = customerId,
                CustomerAddressId = orderDto.CustomerAddressId,
                CreatedAt = DateTime.UtcNow,
                DeliveryAddress = new OrderAddressSnapshot
                {
                    Street = address.Street,
                    HouseNumber = address.HouseNumber,
                    PostalCode = address.PostalCode,
                    City = address.City,
                },
                Status = OrderStatus.Na_Cekanju,
                DeliveryFee = deliveryFee
            };

            // Napravi OrderItems iz requesta * cena iz baze (dish.Price)
            order.OrderItems = orderDto.Items.Select(i =>
            {
                var dish = dishById[i.DishId];
                return new OrderItem
                {
                    DishId = i.DishId,
                    Quantity = i.Quantity,
                    UnitPrice = dish.Price
                };
            }).ToList();

            // Totals
            order.Subtotal = order.OrderItems.Sum(x => x.UnitPrice * x.Quantity);
            order.TotalAmount = order.Subtotal + order.DeliveryFee;

            // Snimi
            var createdOrder = await _orderRepo.CreateOrder(order, ct);
            var fullOrder = await _orderRepo.GetOrderById(createdOrder.Id, ct);
            if (fullOrder == null)
                throw new NotFoundException($"Porudžbina sa ID-jem {createdOrder.Id} nije pronađena nakon kreiranja.");

            _logger.LogInformation("Porudžbina sa ID-jem {OrderId} je uspešno kreirana.", createdOrder.Id);

            return _mapper.Map<OrderDetailsDto>(fullOrder);
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
