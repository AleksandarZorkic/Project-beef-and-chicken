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
        private readonly IUnitOfWork _unitOfWork;


        public OrderService(IOrderRepository orderRepo, IMenuRepository menuRepo, IAddressRepository addressRepo, ILogger<OrderService> logger, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _orderRepo = orderRepo;
            _menuRepo = menuRepo;
            _addressRepo = addressRepo;
            _logger = logger; 
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<OrderDetailsDto>> GetCustomerOrders(int userId, CancellationToken ct = default)
        {
            var orders = await _orderRepo.GetAllCustomerOrders(userId, ct);
            return _mapper.Map<IEnumerable<OrderDetailsDto>>(orders);
        }

        /// OBAVEZNO: Vratiti se ovde pogledati metodu i prepraviti je
        public async Task<Order?> GetCustomerOrderById(int userId, int orderId, CancellationToken ct = default)
        {
            var order = await _orderRepo.GetCustomerOrderById(userId, orderId, ct);

            if (order == null)
            {
                _logger.LogInformation("Porudžbina sa ID-jem {OrderId} ne postoji!", orderId);
                throw new NotFoundException($"Porudžbina sa ID-jem {orderId} nije pronađena.");
            }

            return _mapper.Map<Order>(order);
        }

        public async Task<OrderDetailsDto> GetOrderById(int userId, int orderId, CancellationToken ct  = default)
        {
            var order = await _orderRepo.GetCustomerOrderById(userId, orderId, ct);
             
            if (order == null)
            {
                _logger.LogInformation("Porudžbina sa ID-jem {OrderId} ne postoji!", orderId);
                throw new NotFoundException($"Porudžbina sa ID-jem {orderId} nije pronađena.");
            }

            return _mapper.Map<OrderDetailsDto>(order);
        }

        public async Task<OrderDetailsDto> CreateOrderAsync(int userId, CreateOrderRequestDto orderDto, CancellationToken ct = default)
        {
            if (orderDto is null) throw new ArgumentNullException(nameof(orderDto));

            if (orderDto.Items is null || !orderDto.Items.Any())
                throw new ValidationException("Porudžbina mora imati bar jednu stavku.");

            if (orderDto.Items.Any(i => i.DishId <= 0))
                throw new ValidationException("Svaka stavka mora imati validan DishId.");

            if (orderDto.Items.Any(i => i.Quantity <= 0)) 
                throw new ValidationException("Količina mora biti veća od 0.");

            if (orderDto.CustomerAddressId <= 0)
                throw new ValidationException("Adresa za dostavu je obavezna.");

            const decimal deliveryFee = 200;          

            // Validacija adrese
            var address = await _addressRepo.GetCustomerAddressAsync(userId, orderDto.CustomerAddressId, ct);
            if (address == null)
                throw new NotFoundException($"Adresa sa ID-jem {orderDto.CustomerAddressId} nije pronađena za korisnika sa ID-jem {userId}.");

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
                CustomerId = userId,
                CustomerAddressId = orderDto.CustomerAddressId,
                CreatedAt = DateTime.UtcNow,
                DeliveryAddress = new OrderAddressSnapshot
                {
                    Street = address.Street,
                    HouseNumber = address.HouseNumber,
                    PostalCode = address.PostalCode,
                    City = address.City,
                    Label = address.Label,
                    Note = address.Note,
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
            await _unitOfWork.SaveChangesAsync();

            var fullOrder = await _orderRepo.GetCustomerOrderById(userId, createdOrder.Id, ct);
            if (fullOrder == null)
                throw new NotFoundException($"Porudžbina sa ID-jem {createdOrder.Id} nije pronađena nakon kreiranja.");

            _logger.LogInformation("Porudžbina sa ID-jem {OrderId} je uspešno kreirana.", createdOrder.Id);

            return _mapper.Map<OrderDetailsDto>(fullOrder);
        }

        public Task AcceptOrderAsync(int orderId, CancellationToken ct = default)
            => UpdateOrderStatus(orderId, OrderStatus.Prihvacena, ct);

        public Task RejectOrderAsync(int orderId, CancellationToken ct = default)
            => UpdateOrderStatus(orderId, OrderStatus.Odbijena, ct);

        private async Task UpdateOrderStatus(int orderId, OrderStatus newStatus, CancellationToken ct = default)
        {
            var order = await _orderRepo.GetOrderById(orderId, ct);
            if (order == null)
                throw new NotFoundException($"Porudžbina sa ID-jem {orderId} nije pronađena.");

            if (order.Status != OrderStatus.Na_Cekanju)
                throw new ValidationException("Status se može promeniti samo ako je porudžbina na čekanju.");

            var dto = new UpdateOrderStatusDto { Status = newStatus };

            await _orderRepo.UpdateOrder(orderId, dto, ct);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<IEnumerable<OrderDetailsDto>> GetPendingOrdersAsync(CancellationToken ct = default)
        {
            var pendingOrders = await _orderRepo.GetPendingOrders(ct);
            return _mapper.Map<IEnumerable<OrderDetailsDto>>(pendingOrders);
        }
    }
}
